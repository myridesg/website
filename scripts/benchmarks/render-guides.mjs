import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'

// Runs in its own process, after compilation, so build/Vite work is excluded.
const [entry, casesFile, output, mode = 'warm'] = process.argv.slice(2)
const cases = JSON.parse(await readFile(casesFile, 'utf8'))
const bootStart = performance.now()
const { render } = await import(pathToFileURL(entry).href)
const bootstrapMs = performance.now() - bootStart
const samples = []
let peakRssBytes = process.memoryUsage().rss

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const percentile = (p) => sorted[Math.ceil(p * sorted.length) - 1]
  return {
    mean: values.reduce((total, value) => total + value, 0) / values.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    max: sorted.at(-1),
  }
}

async function request(testCase, delayMs = 0) {
  globalThis.__guideBenchmarkDelayMs = delayMs
  const cpuStart = process.cpuUsage()
  const start = performance.now()
  const response = await render(new Request(`https://myridesg.com${testCase.path}`))
  const html = await response.text() // Include complete body generation, not just headers.
  const wallMs = performance.now() - start
  const usage = process.cpuUsage(cpuStart)
  const cpuMs = (usage.user + usage.system) / 1000
  peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
  // Reject fast errors and empty responses before they can look like good results.
  assert.equal(response.status, 200, `${testCase.path} returned ${response.status}`)
  assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'))
  assert.match(html, /<h1[\s>]/)
  assert.match(html, /application\/ld\+json/)
  assert.ok(html.includes(testCase.expected), `${testCase.path} omitted its content`)
  return { wallMs, cpuMs, htmlBytes: Buffer.byteLength(html) }
}

if (mode === 'cold') {
  samples.push({ ...cases[0], ...await request(cases[0]), bootstrapMs })
} else {
  for (const testCase of cases) {
    const first = await request(testCase)
    for (let i = 0; i < 20; i++) await request(testCase)
    const results = []
    for (let i = 0; i < 200; i++) results.push(await request(testCase))
    samples.push({
      ...testCase,
      count: results.length,
      firstRequest: first,
      wallMs: summarize(results.map((result) => result.wallMs)),
      cpuMs: summarize(results.map((result) => result.cpuMs)),
      htmlBytes: results[0].htmlBytes,
    })
    console.log(`Measured ${testCase.label}: ${results.length} uncached renders`)
  }
  // Synthetic I/O delay, not an assertion about current Sanity latency. Both
  // article and index queries run concurrently in this isolated prototype.
  const typical = cases.find((testCase) => testCase.label === 'typical article') ?? cases[0]
  for (const delayMs of [200, 500]) {
    const results = []
    for (let i = 0; i < 12; i++) results.push(await request(typical, delayMs))
    samples.push({
      label: `typical article + ${delayMs} ms simulated upstream delay`,
      path: typical.path,
      simulatedUpstreamMs: delayMs,
      count: results.length,
      wallMs: summarize(results.map((result) => result.wallMs)),
      cpuMs: summarize(results.map((result) => result.cpuMs)),
      htmlBytes: results[0].htmlBytes,
    })
    console.log(`Measured ${delayMs} ms simulated upstream latency`)
  }
}

await writeFile(output, JSON.stringify({
  mode, bootstrapMs, peakRssBytes,
  processMaxRssBytes: process.resourceUsage().maxRSS * 1024,
  samples,
}, null, 2))
