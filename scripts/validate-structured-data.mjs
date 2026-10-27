#!/usr/bin/env node
/**
 * Structured-data validator for the MyRideSG build output.
 *
 * Usage:
 *   node scripts/validate-structured-data.mjs [buildDir] [--vocab=<path>]
 *
 *   buildDir   defaults to "dist" — the directory Astro built to.
 *   --vocab    path to an already-downloaded schema.org vocabulary
 *              (schemaorg-current-https.jsonld). Without it the script
 *              downloads the vocabulary once and caches it in the OS temp
 *              directory (never inside the repo).
 *
 * Checks, per rendered HTML page:
 *   1. Exactly one <script type="application/ld+json"> block, and it parses.
 *   2. The graph is one connected @graph: every "@id" reference used anywhere
 *      in the page resolves to a node defined in the same page's graph.
 *   3. Every "@type" is a class in the schema.org vocabulary, and every
 *      property is a schema.org property whose domainIncludes covers the
 *      node's type or one of its supertypes (checked recursively into nested
 *      nodes: Offer, ContactPoint, ImageObject, Question, ListItem, …).
 *   4. Every FAQPage Question name and acceptedAnswer text appears verbatim in
 *      the page's visible text — schema and rendered FAQ cannot drift.
 *   5. Every indexable page declares a WebPage (or subtype) tied to the site's
 *      WebSite, whose url matches the canonical link and whose description
 *      matches the meta description (allowing the head's clamped variant).
 *      Pages carrying noindex (the 404) are exempt.
 *   6. No aggregateRating / review / ratingValue / reviewCount anywhere —
 *      AGENTS.md rule 6 forbids unevidenced ratings.
 *
 * Exit code 0 only when every page passes every check.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const VOCAB_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld'
const VOCAB_CACHE = join(tmpdir(), 'schemaorg-current-https.jsonld')
const SCHEMA = 'https://schema.org/'
/** The vocabulary file and the emitted JSON-LD both use this compact prefix. */
const SCHEMA_PREFIX = 'schema:'
/** The site emits the context without the trailing slash; accept both forms. */
const CONTEXTS = new Set([SCHEMA, 'https://schema.org'])
const FORBIDDEN_KEYS = new Set(['aggregateRating', 'review', 'ratingValue', 'reviewCount', 'reviewAspect'])
/** WebPage types that count as "the page" for check 5. */
const PAGE_TYPES = new Set(['WebPage', 'CollectionPage', 'ContactPage', 'AboutPage', 'ProfilePage', 'ItemPage', 'FAQPage', 'QAPage', 'SearchResultsPage'])

// --- CLI ---------------------------------------------------------------------

const args = process.argv.slice(2)
const buildDir = resolve(args.find((a) => !a.startsWith('--')) ?? 'dist')
const vocabArg = args.find((a) => a.startsWith('--vocab='))

if (!existsSync(buildDir) || !statSync(buildDir).isDirectory()) {
  console.error(`✗ Build directory not found: ${buildDir}`)
  console.error('  Build first, e.g.: pnpm exec astro build --outDir /tmp/build')
  process.exit(1)
}

// --- Vocabulary ---------------------------------------------------------------

/** Local name of a schema.org term id: 'https://schema.org/Thing' and 'schema:Thing' both -> 'Thing'. */
function localName(id) {
  const s = String(id)
  if (s.startsWith(SCHEMA_PREFIX)) return s.slice(SCHEMA_PREFIX.length)
  if (s.startsWith(SCHEMA)) return s.slice(SCHEMA.length)
  return s
}

async function loadVocabulary() {
  const path = vocabArg ? resolve(vocabArg.slice('--vocab='.length)) : VOCAB_CACHE
  if (!existsSync(path)) {
    if (vocabArg) {
      console.error(`✗ --vocab file not found: ${path}`)
      process.exit(1)
    }
    console.log(`Downloading schema.org vocabulary to ${path} …`)
    const res = await fetch(VOCAB_URL, { headers: { 'user-agent': 'myridesg-schema-validator' } })
    if (!res.ok) {
      console.error(`✗ Could not download ${VOCAB_URL} (HTTP ${res.status}). Re-run when online, or pass --vocab=<file>.`)
      process.exit(1)
    }
    const body = await res.text()
    JSON.parse(body) // Fail fast on a truncated download rather than mis-validating.
    const { writeFileSync } = await import('node:fs')
    writeFileSync(path, body)
  }
  const vocab = JSON.parse(readFileSync(path, 'utf8'))
  const classes = new Map() // local name -> Set of supertype local names
  const properties = new Map() // local name -> Set of domain local names (empty set = any type)
  for (const node of vocab['@graph'] ?? []) {
    const id = String(node['@id'] ?? '')
    // Vocabulary nodes use compact ids ('schema:Thing'); accept the expanded
    // form too, in case schema.org serves that shape one day.
    if (!(id.startsWith(SCHEMA_PREFIX) || id.startsWith(SCHEMA))) continue
    const name = localName(id)
    // '@type' can be a string or an array, and neither rdfs:Class nor
    // rdf:Property is guaranteed on the nodes we need: enumeration members and
    // typed enumerations (e.g. schema:MedicalSpecialty) carry other @types.
    // Any node that declares a superclass is a class, so treat it as one.
    const types = [node['@type']].flat().map(String)
    const supers = [node['rdfs:subClassOf']]
      .flat()
      .filter(Boolean)
      .map((s) => localName(s['@id'] ?? s))
    if (types.includes('rdf:Property')) {
      const domains = new Set(
        [node['schema:domainIncludes']].flat().filter(Boolean).map((d) => localName(d['@id'] ?? d)),
      )
      properties.set(name, domains)
    } else if (types.includes('rdfs:Class') || supers.length > 0) {
      classes.set(name, new Set(supers))
    }
  }
  return { classes, properties }
}

function supertypeClosure(type, classes, seen = new Set()) {
  if (seen.has(type)) return seen
  seen.add(type)
  for (const parent of classes.get(type) ?? []) supertypeClosure(parent, classes, seen)
  return seen
}

// --- HTML helpers -------------------------------------------------------------

const LD_SCRIPT_RE = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g
const ANY_SCRIPT_RE = /<script\b[\s\S]*?<\/script>/g

function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' }
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m)
}

function visibleText(html) {
  return decodeEntities(
    html
      .replace(ANY_SCRIPT_RE, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function metaContent(html, selector) {
  const re =
    selector === 'description'
      ? /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i
      : /<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']\s*\/?>/i
  const m = html.match(re)
  return m ? decodeEntities(m[1]) : undefined
}

function isNoindex(html) {
  return /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)
}

/** Collect nodes and "@id" references from a graph, recursively. */
function walk(node, out, visit) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, out, visit)
    return
  }
  if (node && typeof node === 'object') {
    visit(node, out)
    for (const value of Object.values(node)) walk(value, out, visit)
  }
}

// --- Checks -------------------------------------------------------------------

const failures = []
const notes = []
let pagesChecked = 0
let faqEntitiesChecked = 0

function fail(page, message) {
  failures.push(`  ✗ ${page}\n    ${message}`)
}

function checkGraph(page, graph, pageText, html) {
  // 1. One block, parsed — enforced by the caller; here: shape.
  if (!CONTEXTS.has(graph['@context']))
    return fail(page, `@context is ${JSON.stringify(graph['@context'])}, expected one of ${[...CONTEXTS].join(' or ')}`)
  const nodes = (graph['@graph'] ?? []).filter((n) => n && typeof n === 'object' && (n['@id'] || n['@type']))
  if (!Array.isArray(graph['@graph']) || nodes.length === 0) return fail(page, 'no usable @graph array')

  // 6. Forbidden rating/review keys — anywhere in the tree.
  walk(graph['@graph'], null, (node) => {
    for (const key of Object.keys(node)) {
      if (FORBIDDEN_KEYS.has(key)) fail(page, `forbidden key "${key}" (AGENTS.md rule 6 — no unevidenced ratings/reviews)`)
    }
  })

  // Definitions vs references.
  const definedIds = new Map()
  for (const node of nodes) if (node['@id']) definedIds.set(node['@id'], node)

  const refErrors = []
  const propChecks = [] // {node}
  const typeChecks = [] // {node}
  walk(graph['@graph'], null, (node) => {
    const keys = Object.keys(node)
    if ('@id' in node) {
      if (keys.length === 1) {
        // A pure reference node.
        if (!definedIds.has(node['@id'])) refErrors.push(`dangling @id reference: ${node['@id']}`)
        return
      }
      definedIds.set(node['@id'], node)
    }
    if ('@type' in node) {
      typeChecks.push({ node })
      propChecks.push({ node })
    }
  })
  for (const err of refErrors) fail(page, err)

  // 2/3. Vocabulary checks.
  for (const { node } of typeChecks) {
    for (const type of [node['@type']].flat()) {
      if (!V.classes.has(type)) fail(page, `unknown @type: ${type} (node @id: ${node['@id'] ?? '(none)'})`)
    }
  }
  for (const { node } of propChecks) {
    for (const key of Object.keys(node)) {
      if (key.startsWith('@')) continue
      if (FORBIDDEN_KEYS.has(key)) continue // already reported above
      if (!V.properties.has(key)) {
        fail(page, `unknown property "${key}" on @type ${node['@type']} (@id: ${node['@id'] ?? '(none)'})`)
        continue
      }
      const domains = V.properties.get(key)
      if (domains.size === 0) continue // property valid on any type
      const types = [node['@type']].flat()
      const ok = types.some((type) => [...supertypeClosure(type, V.classes)].some((t) => domains.has(t)))
      if (!ok) {
        fail(
          page,
          `property "${key}" is not defined for @type ${node['@type']} or its supertypes (@id: ${node['@id'] ?? '(none)'})`,
        )
      }
    }
  }

  // 4. FAQ text must match the visible page.
  for (const node of nodes) {
    if (![node['@type']].flat().includes('FAQPage')) continue
    faqEntitiesChecked++
    const questions = node.mainEntity ?? []
    if (!Array.isArray(questions) || questions.length === 0) fail(page, 'FAQPage has no mainEntity questions')
    for (const question of questions) {
      const name = String(question?.name ?? '').replace(/\s+/g, ' ').trim()
      const answer = String(question?.acceptedAnswer?.text ?? '').replace(/\s+/g, ' ').trim()
      if (name && !pageText.includes(name)) fail(page, `FAQ question not found in visible page text: "${name.slice(0, 80)}…"`)
      if (answer && !pageText.includes(answer)) fail(page, `FAQ answer not found in visible page text: "${answer.slice(0, 80)}…"`)
    }
  }

  // 5. The page's own WebPage (or subtype), unless noindex.
  if (isNoindex(html)) {
    notes.push(`  ~ ${page}: noindex — WebPage requirement skipped`)
  } else {
    const pageNodes = nodes.filter((n) => [n['@type']].flat().some((t) => PAGE_TYPES.has(t)) && n['isPartOf'])
    if (pageNodes.length === 0) {
      fail(page, 'no WebPage (or subtype) entity tied to the WebSite via isPartOf')
    } else {
      const pageNode = pageNodes[0]
      const canonical = metaContent(html, 'canonical')
      if (canonical && pageNode.url !== canonical) {
        fail(page, `WebPage url ${pageNode.url} != canonical ${canonical}`)
      }
      const metaDesc = metaContent(html, 'description')
      if (metaDesc && typeof pageNode.description === 'string') {
        const looseMeta = metaDesc.replace(/…\s*$/, '')
        const matches = pageNode.description === metaDesc || pageNode.description.startsWith(looseMeta)
        if (!matches) fail(page, 'WebPage.description does not match the meta description')
      }
      // Breadcrumb: every page except home.
      const isHome = new URL(pageNode.url).pathname === '/'
      const breadcrumbRef = pageNode.breadcrumb?.['@id']
      if (!isHome && !breadcrumbRef) {
        fail(page, 'non-home page WebPage has no breadcrumb reference')
      } else if (breadcrumbRef) {
        const target = definedIds.get(breadcrumbRef)
        if (!target) fail(page, `breadcrumb reference does not resolve: ${breadcrumbRef}`)
        else if (![target['@type']].flat().includes('BreadcrumbList')) fail(page, `breadcrumb @id is not a BreadcrumbList: ${breadcrumbRef}`)
      }
    }
  }
}

// --- Main ---------------------------------------------------------------------

const V = await loadVocabulary()

const htmlFiles = readdirSync(buildDir, { recursive: true })
  .map((f) => String(f))
  .filter((f) => f.endsWith('.html'))
  .sort()

for (const file of htmlFiles) {
  const fullPath = join(buildDir, file)
  const page = `/${file.replace(/\\/g, '/')}`
  pagesChecked++
  const html = readFileSync(fullPath, 'utf8')

  const blocks = [...html.matchAll(LD_SCRIPT_RE)]
  if (blocks.length !== 1) {
    fail(page, `expected exactly 1 application/ld+json block, found ${blocks.length}`)
    continue
  }
  let graph
  try {
    graph = JSON.parse(blocks[0][1])
  } catch (err) {
    fail(page, `JSON-LD does not parse: ${err.message}`)
    continue
  }
  checkGraph(page, graph, visibleText(html), html)
}

// --- Report -------------------------------------------------------------------

console.log(`Validated ${pagesChecked} HTML pages in ${buildDir}`)
console.log(`schema.org vocabulary: ${V.classes.size} classes, ${V.properties.size} properties`)
console.log(`FAQ entities text-checked against visible page content: ${faqEntitiesChecked}`)
if (notes.length) console.log(notes.join('\n'))

if (failures.length) {
  console.error(`\nFAILED — ${failures.length} problem(s):\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('\nPASS — one connected, vocabulary-valid @graph per page; all FAQ text matches; no rating/review keys.')
