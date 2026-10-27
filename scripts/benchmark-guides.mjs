import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@sanity/client'

const root = fileURLToPath(new URL('../', import.meta.url))
const sandbox = await mkdtemp(path.join(os.tmpdir(), 'myridesg-guide-benchmark-'))
const artifactDir = path.join(root, 'benchmarks', 'guide-rendering')
const useSanity = process.argv.includes('--sanity')
const keepSandbox = process.argv.includes('--keep')
const runner = path.join(root, 'scripts/benchmarks/render-guides.mjs')
const startedAt = new Date().toISOString()

function run(command, args, cwd = sandbox) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd, stdio: 'inherit',
      // This copy uses captured fixtures. Never bake the real credentials into
      // the temporary server build or include them in benchmark output.
      env: { ...process.env, SANITY_PROJECT_ID: '', SANITY_DATASET: '', SANITY_API_READ_TOKEN: '' },
    })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)))
  })
}

function paragraph(text, key, style = 'normal') {
  return { _type: 'block', _key: key, style, markDefs: [], children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }] }
}

function syntheticDocuments() {
  // These are benchmark fixtures only, never published or copied into src/.
  const description = 'Synthetic benchmark content for measuring the MyRideSG article renderer.'
  const text = 'This paragraph is synthetic benchmark data. It exercises the existing Portable Text renderer, page layout, metadata, typography and structured data without changing any published article or making claims about motorcycle maintenance.'
  return Array.from({ length: 29 }, (_, i) => {
    const count = [20, 60, 180][i] ?? 3
    const body = []
    for (let block = 0; block < count; block++) {
      if (block % 6 === 0) body.push(paragraph(`Benchmark section ${block / 6 + 1}`, `heading-${block}`, 'h2'))
      body.push(paragraph(text, `paragraph-${block}`))
    }
    body.push({ _type: 'specsTable', _key: 'table', rows: Array.from({ length: i < 3 ? 12 : 2 }, (_, row) => ({ label: `Benchmark row ${row + 1}`, value: text })) })
    body.push({ _type: 'faq', _key: 'faq', items: Array.from({ length: i < 3 ? 6 : 1 }, (_, item) => ({ question: `Benchmark question ${item + 1}?`, answer: [paragraph(text, `answer-${item}`)] })) })
    return {
      _id: `benchmark-${i}`, title: `Synthetic benchmark article ${i + 1}`,
      slug: { current: `motorcycle-maintenance-benchmark-${i + 1}` },
      category: 'guide', description, body, tags: ['maintenance'],
      author: { name: 'Benchmark fixture', slug: { current: 'benchmark' } },
      publishedAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
      relatedSlugs: [], seo: {},
    }
  })
}

async function loadDocuments() {
  if (!useSanity) return { documents: syntheticDocuments(), source: 'synthetic fixtures', upstream: null }
  try { process.loadEnvFile(path.join(root, '.env')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset, SANITY_API_READ_TOKEN: token } = process.env
  if (!projectId || !dataset) return { documents: syntheticDocuments(), source: 'synthetic fixtures; Sanity not configured', upstream: null }
  const repoSource = await readFile(path.join(root, 'src/content/sanity/content-repository.ts'), 'utf8')
  const articleQuery = repoSource.match(/const ARTICLE_BY_SLUG = [\s\S]*?`([\s\S]*?)`/)[1]
  const query = articleQuery.replace(' && slug.current == $slug', ' && defined(slug.current)').replace('][0]{', ']{')
  const client = createClient({ projectId, dataset, token, apiVersion: process.env.SANITY_API_VERSION ?? '2025-05-24', perspective: 'published', useCdn: !token, timeout: 10000, maxRetries: 0 })
  try {
    const start = performance.now()
    const documents = (await client.fetch(query)).filter((doc) => doc.category === 'guide' && Array.isArray(doc.body))
    if (!documents.length) return { documents: syntheticDocuments(), source: 'synthetic fixtures; no accessible published guides', upstream: null }
    return { documents, source: 'published Sanity article snapshot', upstream: { snapshotFetchWallMs: performance.now() - start, count: documents.length } }
  } catch (error) {
    // Never log the SDK error object, headers, URL or token.
    const failure = { httpStatus: error.statusCode ?? null, networkCode: error.code ?? error.cause?.code ?? null }
    console.log(`Sanity snapshot unavailable (${JSON.stringify(failure)}); using synthetic fixtures.`)
    return { documents: syntheticDocuments(), source: 'synthetic fixtures; Sanity read failed', upstream: failure }
  }
}

try {
  const data = await loadDocuments()
  console.log(`Benchmark source: ${data.source}. Building an isolated on-demand prototype.`)
  await Promise.all([
    cp(path.join(root, 'src'), path.join(sandbox, 'src'), { recursive: true }),
    cp(path.join(root, 'public'), path.join(sandbox, 'public'), { recursive: true }),
    cp(path.join(root, 'package.json'), path.join(sandbox, 'package.json')),
    cp(path.join(root, 'tsconfig.json'), path.join(sandbox, 'tsconfig.json')),
    symlink(path.join(root, 'node_modules'), path.join(sandbox, 'node_modules')),
  ])
  const guidePagePath = path.join(sandbox, 'src/pages/guides/[slug].astro')
  const guidePage = await readFile(guidePagePath, 'utf8')
  const start = guidePage.indexOf('export const getStaticPaths =')
  const end = guidePage.indexOf('const { article, guides } = Astro.props')
  assert.ok(start >= 0 && end > start, 'The guide route changed; update the benchmark transformation.')
  await writeFile(guidePagePath, guidePage.slice(0, start) + `export const prerender = false
const [article, guides] = await Promise.all([
  getGuideArticle(contentRepo, Astro.params.slug ?? ''),
  listGuideArticles(contentRepo),
])
if (!article) return new Response('Guide not found', { status: 404 })
` + guidePage.slice(end + 'const { article, guides } = Astro.props'.length))
  // Benchmark only the two CMS routes. All product/legal source stays unchanged.
  const pages = await import('node:fs/promises').then((fs) => fs.readdir(path.join(sandbox, 'src/pages')))
  for (const page of pages) if (page !== 'guides') await rm(path.join(sandbox, 'src/pages', page), { recursive: true, force: true })
  const fixtureDir = path.join(sandbox, 'src/benchmark')
  await mkdir(fixtureDir)
  await writeFile(path.join(fixtureDir, 'articles.json'), JSON.stringify(data.documents))
  await writeFile(path.join(sandbox, 'src/lib/content.ts'), `import rawDocuments from '../benchmark/articles.json'
import { mapArticleDoc, mapArticleSummaryDoc } from '@/content/sanity/mappers'
import type { ArticleDoc } from '@/content/sanity/mappers'
const docs = rawDocuments as unknown as ArticleDoc[]
const articles = new Map(docs.map(doc => [doc.slug.current, JSON.stringify(doc)]))
const summaries = JSON.stringify(docs.map(({ body, ...doc }) => doc))
async function waitForUpstream() {
  const delay = (globalThis as typeof globalThis & { __guideBenchmarkDelayMs?: number }).__guideBenchmarkDelayMs ?? 0
  if (delay) await new Promise(resolve => setTimeout(resolve, delay))
}
export const isSanityConfigured = true
export const contentRepo = {
  async getArticle(slug: string) {
    await waitForUpstream()
    const json = articles.get(slug)
    return json ? mapArticleDoc(JSON.parse(json)) : null
  },
  async listArticles() {
    await waitForUpstream()
    return (JSON.parse(summaries) as ArticleDoc[]).map(mapArticleSummaryDoc)
  },
}
`)
  await writeFile(path.join(sandbox, 'benchmark-entry.mjs'), `import { createApp } from 'astro/app/entrypoint'
const app = createApp()
export const render = (request) => app.render(request)
export default { fetch: render }
`)
  await writeFile(path.join(sandbox, 'astro.config.mjs'), `import base from ${JSON.stringify(pathToFileURL(path.join(root, 'astro.config.mjs')).href)}
export default {
  ...base, root: new URL('./', import.meta.url).pathname, output: 'server', session: false,
  cacheDir: new URL('./.astro-cache/', import.meta.url).pathname,
  integrations: [], adapter: { name: 'local-benchmark-only', hooks: {
    'astro:config:done': ({ setAdapter }) => setAdapter({
      name: 'local-benchmark-only', entrypointResolution: 'auto',
      serverEntrypoint: new URL('./benchmark-entry.mjs', import.meta.url),
      supportedAstroFeatures: { serverOutput: 'stable', hybridOutput: 'stable', staticOutput: 'stable', sharpImageService: 'stable' },
    }),
  }},
  vite: { ...base.vite, cacheDir: new URL('./.vite-cache/', import.meta.url).pathname },
}
`)
  const bySize = [...data.documents].sort((a, b) => JSON.stringify(a.body).length - JSON.stringify(b.body).length)
  const pick = useSanity && data.upstream?.count
    ? [bySize[0], bySize[Math.floor(bySize.length / 2)], bySize.at(-1)]
    : data.documents.slice(0, 3)
  const cases = pick.map((doc, i) => ({
    label: ['short article', 'typical article', 'long article'][i],
    path: `/guides/${doc.slug.current}/`, expected: doc.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    portableTextBytes: Buffer.byteLength(JSON.stringify(doc.body)), bodyBlocks: doc.body.length,
  }))
  cases.push({ label: 'guide index', path: '/guides/', expected: 'Motorcycle guides for Singapore riders', guideCount: data.documents.length })
  const casesFile = path.join(sandbox, 'cases.json')
  await writeFile(casesFile, JSON.stringify(cases))
  await run(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build'])
  const entry = path.join(sandbox, 'dist/server/entry.mjs')
  const warmFile = path.join(sandbox, 'warm.json')
  await run(process.execPath, [runner, entry, casesFile, warmFile])
  const warm = JSON.parse(await readFile(warmFile, 'utf8'))
  const cold = []
  // Five fresh processes expose lazy loading and startup costs separately.
  for (let i = 0; i < 5; i++) {
    const coldFile = path.join(sandbox, `cold-${i}.json`)
    await run(process.execPath, [runner, entry, casesFile, coldFile, 'cold'])
    cold.push(JSON.parse(await readFile(coldFile, 'utf8')))
  }
  const delayed = warm.samples.find((sample) => sample.simulatedUpstreamMs === 200)
  const meanSeconds = delayed.wallMs.mean / 1000
  const projections = [10000, 100000].flatMap((monthlyViews) => [0, 0.95, 0.99].map((hitRate) => ({
    monthlyGuideViews: monthlyViews, assumedCdnHtmlHitRate: hitRate,
    uncachedRenders: monthlyViews * (1 - hitRate),
    assumedAllocatedMemoryGB: 1,
    modeledGBHours: monthlyViews * (1 - hitRate) * meanSeconds / 3600,
  })))
  const report = {
    generatedAt: new Date().toISOString(), startedAt,
    source: data.source, upstream: data.upstream,
    machine: { cpu: os.cpus()[0]?.model, architecture: os.arch(), platform: os.platform(), node: process.version,
      astro: JSON.parse(await readFile(path.join(root, 'node_modules/astro/package.json'), 'utf8')).version },
    methodology: {
      renderer: 'Production-compiled Astro App with a benchmark-only Node adapter, copied guide template, layouts, Portable Text components and CSP.',
      scope: 'HTML responses only. No image optimization, client asset downloads, CDN, Netlify adapter, platform billing or deployed Worker measurement.',
      warmupPerCase: 20, measuredSequentialRendersPerCase: 200,
      simulatedDelaySamples: 12,
      fixtureReads: 'Parse captured/synthetic JSON and use the existing vendored Sanity mappers. No upstream calls in timed render loop.',
      cpu: 'process.cpuUsage user + system; whole local Node process CPU including GC/background work. Not Cloudflare CPU metering.',
      wall: 'Await complete HTML response; includes synthetic I/O delay where explicitly labeled.',
      cold: 'Fresh Node process imports compiled entry, then renders the short article; excludes OS process-launch time.',
      memory: 'Resident memory is observed, not allocated memory billed by Netlify.',
      projections: 'Illustrative 1 GB allocation, measured mean wall time with 200 ms simulated upstream latency, assumed CDN HTML hit rates. Excludes cold starts, other functions, requests, bandwidth and deploy credits.',
    },
    warm, cold, projections,
    sandbox: keepSandbox ? sandbox : null,
    references: {
      netlifyCompute: 'https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/',
      cloudflareCpu: 'https://developers.cloudflare.com/workers/platform/limits/',
      localWorkerd: 'https://developers.cloudflare.com/workers/local-development/',
    },
  }
  await mkdir(artifactDir, { recursive: true })
  await writeFile(path.join(artifactDir, 'latest.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`Saved benchmark results: ${path.join(artifactDir, 'latest.json')}`)
  console.log(JSON.stringify(warm.samples.map(({ label, wallMs, cpuMs }) => ({ label, wallP50Ms: wallMs.p50, wallP95Ms: wallMs.p95, cpuP50Ms: cpuMs.p50, cpuP95Ms: cpuMs.p95 })), null, 2))
} finally {
  if (!keepSandbox) await rm(sandbox, { recursive: true, force: true })
  else console.log(`Retained isolated prototype: ${sandbox}`)
}
