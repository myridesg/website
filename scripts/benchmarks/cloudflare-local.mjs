import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import path from 'node:path'

// Run against the built benchmark copy under `wrangler dev --local`.
// HTTP timings include loopback/proxy overhead and are NOT Cloudflare billing
// measurements. V8 sampling, when available, is only an aggregate diagnostic.
const [casesFile, reportFile, base = 'http://127.0.0.1:8789', inspector = 'http://127.0.0.1:9235'] = process.argv.slice(2)
for (const address of [base, inspector]) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(address).hostname), 'This runner is for localhost only.')
}
const cases = JSON.parse(await readFile(casesFile, 'utf8'))
const workerConfig = JSON.parse(await readFile(path.join(path.dirname(casesFile), 'dist-cloudflare/server/wrangler.json'), 'utf8'))
const wranglerVersion = JSON.parse(await readFile(new URL('../../node_modules/wrangler/package.json', import.meta.url), 'utf8')).version
let socket
const pending = new Map()
let nextId = 1

async function connectProfiler() {
  const targets = await (await fetch(`${inspector}/json`)).json()
  socket = new WebSocket(targets[0].webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    clearTimeout(waiter.timeout)
    if (message.error) waiter.reject(new Error(message.error.message))
    else waiter.resolve(message.result)
  })
  await command('Profiler.enable')
  await command('Profiler.setSamplingInterval', { interval: 100 })
}

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)) }, 10000)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    mean: values.reduce((total, value) => total + value, 0) / values.length,
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted.at(-1),
  }
}

const results = []
let profilerAvailable = false
let profilerFailure = null
try {
  try { await connectProfiler(); profilerAvailable = true } catch (error) {
    profilerFailure = error.message
    console.log(`Local V8 sampling unavailable (${profilerFailure}); collecting HTTP timings only.`)
  }
  for (const testCase of cases) {
    async function request() {
      const start = performance.now()
      const response = await fetch(`${base}${testCase.path}`)
      const html = await response.text()
      const wallMs = performance.now() - start
      assert.equal(response.status, 200)
      assert.ok(html.includes(testCase.expected))
      assert.match(html, /<h1[\s>]/)
      assert.match(html, /application\/ld\+json/)
      return { wallMs, htmlBytes: Buffer.byteLength(html) }
    }
    const firstObserved = await request()
    for (let i = 0; i < 20; i++) await request()
    const observations = []
    for (let i = 0; i < 200; i++) observations.push(await request())
    let sampling = null
    if (profilerAvailable) {
      // Separate profiled requests so sampling doesn't contaminate HTTP timing.
      await command('Profiler.start')
      for (let i = 0; i < 200; i++) await request()
      const { profile } = await command('Profiler.stop')
      const names = new Map(profile.nodes.map((node) => [node.id, node.callFrame.functionName]))
      const excluded = new Set(['(idle)', '(program)', '(root)'])
      let activeUs = 0
      let gcUs = 0
      for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
        const name = names.get(profile.samples[i])
        const duration = profile.timeDeltas?.[i] ?? 0
        if (!excluded.has(name)) activeUs += duration
        if (name === '(garbage collector)') gcUs += duration
      }
      sampling = {
        requests: 200, intervalMicroseconds: 100,
        estimatedActiveMsPerRequest: activeUs / 1000 / 200,
        estimatedGcMsPerRequest: gcUs / 1000 / 200,
        profileDurationMs: (profile.endTime - profile.startTime) / 1000,
        caveat: 'V8 sample-duration estimate, excluding idle/program/root samples. Not metered CPU, not per-request percentiles, and not a production free-plan pass/fail.',
      }
    }
    results.push({ ...testCase, firstObserved, count: observations.length, wallMs: summarize(observations.map((item) => item.wallMs)), htmlBytes: observations[0].htmlBytes, sampling })
    console.log(`Local workerd: ${testCase.label}, HTTP p50 ${results.at(-1).wallMs.p50.toFixed(2)} ms`)
  }
  const invalid = await fetch(`${base}/guides/nonexistent-benchmark-guide/`)
  assert.equal(invalid.status, 404, 'Unknown slugs must not become successful empty pages.')
  await writeFile(reportFile, JSON.stringify({
    generatedAt: new Date().toISOString(), runtime: `Cloudflare workerd via Wrangler ${wranglerVersion} --local`,
    compatibilityDate: workerConfig.compatibility_date, source: 'same synthetic/captured fixtures as the Node benchmark',
    profilerAvailable, profilerFailure,
    cachedResponses: false, warmupPerCase: 20, results, missingSlugStatus: invalid.status,
    limitations: 'Local emulator on the Mac; upstream data is in memory. The local runtime does not establish deployed CPU metering, CDN hit rate or production quotas.',
  }, null, 2) + '\n')
} finally {
  socket?.close()
}
