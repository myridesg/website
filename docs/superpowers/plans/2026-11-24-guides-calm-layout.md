# Guides, Calm Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the guides home, a new page per topic, and the guide article as plain white article pages that follow the canvas the owner reviewed.

**Architecture:** Pure helpers in `src/lib/guides.ts` turn an article into what the pages show (topic, cover object, read time, contents list, questions). A small card kit (`GuideCover`, `GuideByline`, `GuideCard`, `GuideGrid`) is shared by all three pages. Articles get their own `GuideLayout`; `ProseLayout` and `PageHead` go back to serving only support, delete account, privacy, terms and the 404. Styles live in a new `guides.css`.

**Tech Stack:** Astro 7 (static, `.astro` only), Tailwind v4 tokens via plain CSS, `astro-portabletext`, `node:test` with `--experimental-strip-types`, headless Chrome via `scripts/shot.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-24-guides-calm-layout-design.md` (read it first; every size, colour token and string is there). Canvas: https://claude.ai/artifact/L4sDDpZcep9Wtbbe8aFT5K

**Branch / PR:** continue on `claude/restyle-reading-pages-ee2806` (PR myridesg/website#13, open, mergeable). Its Cloudflare preview builds with the real Sanity content: `https://claude-restyle-reading-pages-ee2806-website.myridesg-pte-ltd.workers.dev`.

## Global Constraints

- `.astro` only. No React, no new dependencies, no component library (`AGENTS.md` rule 2).
- Every route prerenders (`AGENTS.md` rule 1). Guide addresses stay `/guides/<slug>/`.
- Do **not** edit: `src/content/**` (vendored), `src/styles/feature.css`, `studio.css`, `home.css`, any `src/components/ui/feature/*`, `StoreButtons.astro`, `SiteNav.astro`, `SiteFooter.astro`, `BaseLayout.astro`, `guide/CoeCalculator.astro`, `privacy.astro`, `terms.astro`, `AGENTS.md`. PRs #12 and #14 are open and touch several of these.
- Images only from `src/assets/` through `astro:assets` (`AGENTS.md` rule 3).
- No colour literals: tokens only (`global.css`, `studio.css`). Both themes must work.
- New visible strings are exactly the spec's: `In this guide`, `Read time N minutes` / `Read time 1 minute`, `See all N guides →`, `N guides` / `1 guide`, `Guides`, `Maintenance`, `Troubleshooting`, `Ownership`, `More`, `MyRideSG` (byline fallback), `Warning`, `Related guides`, `More guides`. No other new copy. Claim guardrails apply (`AGENTS.md` rule 6).
- Modules that a `node:test` file loads use `@/…` only in `import type`; value imports between them are relative with the `.ts` extension (node cannot resolve the alias).
- Before finishing: `pnpm check` 0 errors, `pnpm test` passing, `pnpm test:guides` passing, `node scripts/check-claims.mjs` clean, `node scripts/validate-structured-data.mjs` PASS on the fixture build.
- Nothing is pushed without the owner's go-ahead for this plan; commits are local until Task 9.

## Review Focus

1. **A guide with fewer than two h2 headings** gets no contents box (and no empty frame). Test: Task 1 (`anchorHeadings`), Task 6 (built page).
2. **Two h2 headings with the same words** get different ids, and each contents link reaches its own heading. Test: Task 1.
3. **A topic with 1, 2 or 4 guides** never leaves one card alone in a last row; a topic with none has no section, no bar link and no page. Test: Task 1 (`leadCount`), Task 5 (built page).
4. **A `noIndex` guide** still builds its page but is absent from the home, its topic page and every "More guides" row. Test: Task 2 (`loadGuides` + built page).
5. **A long unbroken table value or an 80-character title at 375 px** never makes the page scroll sideways. Test: Task 8 (measured in the browser at every size).

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/guides.ts` (new) | Pure: read time, heading anchors, questions, cover pick, lead count, `toGuideEntry` |
| `src/lib/guides.test.ts` (new) | Unit tests for the above |
| `src/lib/guide-navigation.ts` | + short `label` per topic, `topicPath()` |
| `src/lib/guide-data.ts` (new) | `loadGuides(repo)`: fetch every guide once per build |
| `src/lib/content-fixture.ts` (new) | A `ContentRepository` over a JSON file, for tests and local review |
| `src/lib/content.ts` | Use the fixture when `GUIDES_FIXTURE` is set |
| `scripts/fixtures/guides.json` (new) | 30 guide docs in Sanity's shape |
| `scripts/guides-page.test.mjs` (new) | Built-page tests on `dist/guides/**` |
| `package.json` | + `test:guides` script |
| `src/styles/guides.css` (new) | Everything the three guide pages draw |
| `src/components/ui/guide/GuideNav.astro` (new) | Topic bar |
| `…/guide/GuideCover.astro` (new) | Object on a panel |
| `…/guide/GuideByline.astro` (new) | Picture, name, date, read time |
| `…/guide/GuideCard.astro`, `GuideGrid.astro` (new) | Card and the lead-card grid |
| `…/guide/GuideContents.astro`, `GuideH2.astro` (new) | Contents box; h2 with its anchor |
| `src/layouts/GuideLayout.astro` (new) | The article page shell |
| `src/pages/guides/topic/[topic].astro` (new) | Topic pages |
| `src/pages/guides/index.astro`, `[slug].astro` | Rewritten on the kit |
| `…/guide/Callout, SpecsTable, CtaBlock, FaqBlock, RelatedLinks, RelatedGuides, GuideBody` | Restyled per the spec's table |
| `src/layouts/ProseLayout.astro`, `src/styles/reading.css` | Guide-only code removed |

---

### Task 1: Guide helpers

**Files:**
- Create: `src/lib/guides.ts`, `src/lib/guides.test.ts`
- Modify: `src/lib/guide-navigation.ts` (the `GuideGroup` interface and `GUIDE_GROUPS`; add `topicPath`)

**Interfaces:**
- Consumes: `groupOf`, `GuideGroupId` from `./guide-navigation.ts`; `Article` (type) from `@/content/entities`; `ObjectKey` (type) from `@/components/ui/feature/objects`.
- Produces:

```ts
// guide-navigation.ts
interface GuideGroup { id: GuideGroupId; title: string; label: string; intro: string }
// labels: maintenance 'Maintenance', troubleshooting 'Troubleshooting', ownership 'Ownership', more 'More'
export function topicPath(id: GuideGroupId): string            // '/guides/topic/maintenance/'

// guides.ts
export interface GuideEntry { article: Article; topic: GuideGroupId; cover: ObjectKey; readMinutes: number; listed: boolean }
export const TOPIC_OBJECT: Record<GuideGroupId, ObjectKey>      // spec "Topic page"
export function readMinutes(blocks: unknown): number
export function readTimeLabel(minutes: number): string
export function anchorHeadings<T extends object>(blocks: T[]): { blocks: T[]; contents: Array<{ id: string; text: string }> }
export function faqItemsOf(blocks: unknown[]): Array<{ q: string; a: string }>
export function coverFor(guide: { slug: string; topic: GuideGroupId }): ObjectKey
export function leadCount(count: number): 0 | 1 | 2
export function toGuideEntry(article: Article): GuideEntry      // listed = !article.seo.noIndex
```

- [ ] **Step 1: Write the failing tests** in `src/lib/guides.test.ts` (import from `./guides.ts` and `./guide-navigation.ts`). Helper in the test file: `const p = (text, style = 'normal') => ({ _type: 'block', style, children: [{ _type: 'span', text }] })`.

```ts
test('readMinutes counts prose, questions, table rows and notes at 200 a minute', () => {
  assert.equal(readMinutes([]), 1)
  assert.equal(readMinutes([p('word '.repeat(400))]), 2)
  assert.equal(readMinutes([{ _type: 'faq', items: [{ question: 'a b', answer: [p('word '.repeat(298))] }] }]), 2)
  assert.equal(readMinutes([{ _type: 'specsTable', rows: [{ _key: 'ignored words here', label: 'x', value: 'y' }] }]), 1)
})
test('readTimeLabel', () => {
  assert.equal(readTimeLabel(1), 'Read time 1 minute')
  assert.equal(readTimeLabel(3), 'Read time 3 minutes')
})
test('anchorHeadings gives each h2 a unique id and lists them', () => {
  const { blocks, contents } = anchorHeadings([p('Oil Grades', 'h2'), p('text'), p('Oil grades', 'h2'), p('Sub', 'h3'), p('  ', 'h2')])
  assert.deepEqual(contents, [{ id: 'oil-grades', text: 'Oil Grades' }, { id: 'oil-grades-2', text: 'Oil grades' }])
  assert.equal(blocks[0].anchor, 'oil-grades'); assert.equal(blocks[2].anchor, 'oil-grades-2')
  assert.equal(blocks[1].anchor, undefined); assert.equal(blocks.length, 5)
})
test('faqItemsOf flattens every faq block, skipping unanswered questions', () => {
  const faq = (items) => ({ _type: 'faq', items })
  assert.deepEqual(
    faqItemsOf([faq([{ question: 'Q1', answer: [p('A1'), p('more')] }, { question: 'Q2', answer: [] }]), p('x'), faq([{ question: 'Q3', answer: [p('A3')] }])]),
    [{ q: 'Q1', a: 'A1\n\nmore' }, { q: 'Q3', a: 'A3' }])
})
test('coverFor: slug keywords first, then a stable pick from the topic pool', () => {
  assert.equal(coverFor({ slug: 'motorcycle-oil-change-singapore', topic: 'maintenance' }), 'petrol')
  assert.equal(coverFor({ slug: 'motorcycle-coe-singapore', topic: 'ownership' }), 'coe')
  assert.equal(coverFor({ slug: 'singapore-petrol-prices', topic: 'ownership' }), 'pump')
  assert.equal(coverFor({ slug: 'best-motorcycle-workshops-singapore', topic: 'maintenance' }), 'workshops')
  assert.equal(coverFor({ slug: 'motorcycle-coil-problems', topic: 'troubleshooting' }) === 'petrol', false) // whole words only
  const a = coverFor({ slug: 'honda-cb400-common-problems', topic: 'troubleshooting' })
  assert.ok(['workshops', 'guides', 'receipt', 'chart'].includes(a))
  assert.equal(coverFor({ slug: 'honda-cb400-common-problems', topic: 'troubleshooting' }), a)
})
test('leadCount keeps a lone card out of the last row', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 15].map(leadCount), [0, 1, 2, 0, 1, 2, 0, 0])
})
test('topics have short labels and paths', () => {
  assert.deepEqual(GUIDE_GROUPS.map((g) => g.label), ['Maintenance', 'Troubleshooting', 'Ownership', 'More'])
  assert.equal(topicPath('ownership'), '/guides/topic/ownership/')
})
```

Also one `toGuideEntry` test: an `Article` literal with slug `motorcycle-oil-change-singapore`, `bodySource: JSON.stringify([p('word '.repeat(400))])`, `seo.noIndex: true` → `{ topic: 'maintenance', cover: 'petrol', readMinutes: 2, listed: false }` (compare those four fields).

- [ ] **Step 2: Run** `pnpm test` → the new tests FAIL (module not found).
- [ ] **Step 3: Implement.** `readMinutes` is the word counter now inlined in `src/pages/guides/[slug].astro` (keys `text`, `question`, `label`, `value`, `note`); move it, do not duplicate it. `faqItemsOf`'s plain-text flattening is `toPlainText` from `FaqBlock.astro`; move it. `anchorHeadings` copies each h2 block with an added `anchor` field (id = lower-cased text, runs of non-alphanumerics → `-`, trimmed; repeats get `-2`, `-3`) and skips h2s whose text is blank. `coverFor` matches whole slug words in the spec's order; the fallback index is the sum of the slug's char codes modulo the pool length. `toGuideEntry` parses `bodySource` only when `bodyFormat === 'portable-text-v1'`.
- [ ] **Step 4: Run** `pnpm test` → all pass. `pnpm check` → 0 errors.
- [ ] **Step 5: Commit** `git commit -m "Add guide helpers: read time, contents, covers, card layout"`

### Task 2: Guides without Sanity, and one loader

**Files:**
- Create: `src/lib/content-fixture.ts`, `src/lib/guide-data.ts`, `scripts/fixtures/guides.json`, `scripts/guides-page.test.mjs`
- Modify: `src/lib/content.ts`, `package.json` (scripts only), `.env.example`

**Interfaces:**
- Consumes: `mapArticleDoc`, `mapArticleSummaryDoc`, `ArticleDoc` from `@/content/sanity/mappers`; `listGuideArticles`, `getGuideArticle`; `toGuideEntry`.
- Produces:

```ts
// content-fixture.ts
export function fixtureContentRepository(docs: ArticleDoc[]): ContentRepository
// guide-data.ts — every guide, newest first, fetched once per build per repo
export function loadGuides(repo: ContentRepository): Promise<GuideEntry[]>
```
`package.json`: `"test:guides": "GUIDES_FIXTURE=scripts/fixtures/guides.json astro build && node --test scripts/guides-page.test.mjs"`.

- [ ] **Step 1: Write the fixture.** `scripts/fixtures/guides.json`: an array of 30 `ArticleDoc`s whose `slug`, `title`, `description` are the 30 guides on the live `/guides/` page (5 maintenance, 15 troubleshooting, 6 ownership, 4 more), `category: "guide"`, `author: { slug: { current: "hidayah" }, name: "Hidayah" }`, `publishedAt: "2026-05-12T00:00:00.000Z"`. Four carry full bodies copied from the live pages: `motorcycle-oil-change-singapore` (callout `success`, two specs tables, `cta` with a note, `faq` ×5, `relatedLinks`), `motorcycle-coe-singapore` (includes a `coeCalculator` block), `honda-cb400-common-problems-singapore` (h2/h3/lists, a `warn` callout), and one "more" guide. The other 26 have a one-paragraph body (their description). Add two edge docs, both `seo.noIndex: true` so they never change a topic's count: `fixture-long-values` (an 80-character title, a 60-character unbroken table value, three h2s of which two have the same text) and `fixture-one-heading` (exactly one h2; `updatedAt` a different day from `publishedAt`; no `author`).
- [ ] **Step 2: Write the failing built-page tests** in `scripts/guides-page.test.mjs`, every name starting `built page:` (so `pnpm test` skips them):

```js
test('built page: all 32 fixture guides build, and the home lists only indexable ones', () => {
  assert.ok(existsSync('dist/guides/motorcycle-oil-change-singapore/index.html'))
  assert.ok(existsSync('dist/guides/fixture-long-values/index.html'))
  const home = readFileSync('dist/guides/index.html', 'utf8')
  assert.ok(!home.includes('/guides/fixture-long-values/'))
})
```
- [ ] **Step 3: Run** `pnpm test:guides` → FAIL (no fixture wiring; `dist/guides/` has only `index.html`).
- [ ] **Step 4: Implement.** `content.ts`: when `env('GUIDES_FIXTURE')` is set, read that JSON with `node:fs` and export `fixtureContentRepository(docs)` as `contentRepo`, logging one line that fixtures are in use; otherwise unchanged. `fixtureContentRepository.listArticles` maps with `mapArticleSummaryDoc`, `getArticle` with `mapArticleDoc`. `loadGuides` = `listGuideArticles` then `getGuideArticle` for each, `toGuideEntry`, memoised in a `WeakMap<ContentRepository, Promise<GuideEntry[]>>`. Document `GUIDES_FIXTURE` in `.env.example` ("tests and local review only; never set in a deploy").
- [ ] **Step 5: Run** `pnpm test:guides` → PASS. `pnpm build` (no env) still builds 13 pages with the empty guides state.
- [ ] **Step 6: Commit** `git commit -m "Build guides from a fixture for tests and local review"`

### Task 3: Card kit

**Files:**
- Create: `src/styles/guides.css`, `src/components/ui/guide/GuideCover.astro`, `GuideByline.astro`, `GuideCard.astro`, `GuideGrid.astro`

**Interfaces:**
- Consumes: `GuideEntry`, `leadCount`, `readTimeLabel`; `OBJECTS`, `objectWidths` from `feature/objects`; `GUIDE_GROUPS`, `topicPath`.
- Produces:

```astro
<GuideCover cover={ObjectKey} size="hero" | "feature" | "card" eager?={boolean} />
<GuideByline name={string | null} published={Date} updated?={Date} readMinutes={number} size="article" | "card" />
<GuideCard guide={GuideEntry} feature?={boolean} showDescription?={boolean} />   {/* one <a> */}
<GuideGrid guides={GuideEntry[]} />                                             {/* lead rule from leadCount */}
```
`guides.css` starts with `@import './feature.css';` (for the studio tokens and `FeatureAsk`) and defines `.guides-page` on `<main>` alongside `feature-page`.

Class names the built-page tests rely on (keep them exact): `guide-card`, `guide-card--feature`, `guide-byline`, `guide-contents`, `callout callout--<tone>` on the `<blockquote>`, `guide-cta` on the `<aside>`.

- [ ] **Step 1:** Add to `scripts/guides-page.test.mjs` (fails until Task 4 uses the kit; write it now so the kit has a contract):

```js
test('built page: a card is one link with its picture, topic, title and read time', () => {
  const home = readFileSync('dist/guides/index.html', 'utf8')
  const card = home.match(/<a[^>]+class="[^"]*guide-card[^"]*"[^>]+href="\/guides\/motorcycle-oil-change-singapore\/"[\s\S]*?<\/a>/)?.[0] ?? ''
  assert.match(card, /<img[^>]+alt=""/); assert.match(card, /Maintenance/)
  assert.match(card, /Motorcycle Oil Change Singapore/); assert.match(card, /Read time \d+ minutes?/)
  assert.match(card, /Hidayah/); assert.match(card, /12 May 2026/)
})
```
- [ ] **Step 2:** Implement the four components and their CSS from the spec's "Shared parts" (sizes, tokens, the 600/900 px grid breakpoints, three-line clamp on the description, focus ring `2px solid var(--studio-headline)`). Dates use the existing `Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })` inside `<time datetime>`. The byline picture is `src/assets/home/app-icon.png` through `<Image>`.
- [ ] **Step 3:** `pnpm check` → 0 errors. Commit `git commit -m "Add the guide card kit"`.

### Task 4: Topic bar and guides home

**Files:**
- Create: `src/components/ui/guide/GuideNav.astro`
- Modify: `src/pages/guides/index.astro`, `src/styles/guides.css`

**Interfaces:**
- Consumes: Task 3's kit; `loadGuides(contentRepo)`; `groupGuides`.
- Produces: `<GuideNav topics={GuideGroupId[]} current?={GuideGroupId | 'home'} />` — links only the topics passed.

- [ ] **Step 1: Failing tests** (append):

```js
test('built page: the home has the topic bar, one section per topic, five cards each', () => {
  const home = readFileSync('dist/guides/index.html', 'utf8')
  assert.match(home, /<nav[^>]+aria-label="Guide topics"[\s\S]*?href="\/guides\/topic\/troubleshooting\/"/)
  assert.match(home, /<h1[^>]*>Motorcycle guides for Singapore riders<\/h1>/)
  assert.match(home, /See all 15 guides/); assert.ok(!/See all 5 guides/.test(home))
  const section = home.match(/<section[^>]+id="troubleshooting"[\s\S]*?<\/section>/)[0]
  assert.equal(section.match(/class="[^"]*guide-card/g).length, 5)
  assert.match(home, /Keeping a service record\? Explore the/)
})
```
- [ ] **Step 2:** Run `pnpm test:guides` → FAIL.
- [ ] **Step 3:** Implement per the spec's "Guides home". Keep the page's existing `title`, `description`, structured data and empty-state sentence byte for byte; the `ItemList` lists every listed guide, not only the five shown. Replace `import '@/styles/reading.css'` with `guides.css`; `<main class="feature-page guides-page">`. Drop `PageHead` from this page.
- [ ] **Step 4:** `pnpm test:guides` → PASS; `pnpm build` (no fixture) shows the empty state. Commit `git commit -m "Lay the guides home out as topic sections of cards"`.

### Task 5: Topic pages

**Files:**
- Create: `src/pages/guides/topic/[topic].astro`
- Modify: `src/styles/guides.css`

**Interfaces:**
- Consumes: `loadGuides`, `GUIDE_GROUPS`, `TOPIC_OBJECT`, `GuideNav`, `GuideGrid`, `webPageEntity`, `breadcrumbEntity`, `FeatureAsk`.
- Produces: routes `/guides/topic/<id>/` for each topic with at least one listed guide.

- [ ] **Step 1: Failing tests:**

```js
test('built page: a topic page lists all its guides, newest first, with its own head', () => {
  const page = readFileSync('dist/guides/topic/troubleshooting/index.html', 'utf8')
  assert.match(page, /<title>Bike troubleshooting guides for Singapore riders/)
  assert.match(page, /<h1[^>]*>Bike troubleshooting<\/h1>/); assert.match(page, /15 guides/)
  assert.equal(page.match(/class="[^"]*guide-card/g).length, 15)
  assert.match(page, /aria-current="page"[^>]*>Troubleshooting|>Troubleshooting<[^>]*aria-current/)
  assert.match(readFileSync('dist/sitemap-0.xml', 'utf8'), /\/guides\/topic\/troubleshooting\//)
})
test('built page: a four-guide topic leads with one full-width card', () => {
  const page = readFileSync('dist/guides/topic/more/index.html', 'utf8')
  assert.equal(page.match(/guide-card--feature/g)?.length, 1)
})
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement per the spec's "Topic page" (`getStaticPaths` from `loadGuides`, skipping empty topics; `CollectionPage` + breadcrumb Home / Riding guides / topic title + `ItemList`). **Step 4:** Run → PASS; `node scripts/validate-structured-data.mjs` → PASS. Commit `git commit -m "Add a page for each guide topic"`.

### Task 6: The guide article

**Files:**
- Create: `src/layouts/GuideLayout.astro`, `src/components/ui/guide/GuideContents.astro`, `GuideH2.astro`
- Modify: `src/pages/guides/[slug].astro`, `src/components/ui/guide/GuideBody.astro`, `FaqBlock.astro`, `RelatedGuides.astro`, `src/styles/guides.css`

**Interfaces:**
- Consumes: `loadGuides`, `anchorHeadings`, `faqItemsOf`, `relatedGuides`, `faqPageEntity`, the card kit.
- Produces:

```astro
<GuideLayout guide={GuideEntry} topics={GuideGroupId[]} structuredData={…}>  {/* default slot = body; slot "after" = bands under the text */}
<GuideContents items={Array<{ id: string; text: string }>} />               {/* renders nothing for fewer than 2 */}
<RelatedGuides guides={GuideEntry[]} />                                      {/* up to 3 GuideCards under "More guides" */}
```
`GuideBody` maps `block: { h2: GuideH2 }`; `GuideH2` renders `<h2 id={node.anchor}><slot /></h2>` (block components receive `node`: see `node_modules/astro-portabletext/components/Block.astro`).

- [ ] **Step 1: Failing tests:**

```js
const guide = (slug) => readFileSync(`dist/guides/${slug}/index.html`, 'utf8')
test('built page: the article opens with picture, tags, title and byline', () => {
  const html = guide('motorcycle-oil-change-singapore')
  assert.match(html, /<h1[^>]*>Motorcycle Oil Change Singapore — Best Oils, Costs &amp; Intervals \(2025\)<\/h1>/)
  assert.match(html, /href="\/guides\/topic\/maintenance\/"[^>]*>Maintenance</)
  assert.match(html, /Read time \d+ minutes?/); assert.ok(!/\(updated/.test(html.match(/guide-byline[\s\S]*?<\/div>/)[0]))
})
test('built page: the contents box links to each h2, and only when there are two or more', () => {
  const html = guide('motorcycle-oil-change-singapore')
  assert.match(html, /In this guide/)
  for (const id of [...html.matchAll(/class="[^"]*guide-contents[\s\S]*?<\/nav>/g)][0][0].matchAll(/href="#([^"]+)"/g)) assert.match(html, new RegExp(`<h2[^>]+id="${id[1]}"`))
  assert.ok(!guide('fixture-one-heading').includes('In this guide'))
  assert.match(guide('fixture-one-heading'), /\(updated /); assert.match(guide('fixture-one-heading'), /MyRideSG<\/span>/)
})
test('built page: questions show their answers and sit in the one JSON-LD graph', () => {
  const html = guide('motorcycle-oil-change-singapore')
  assert.equal(html.match(/application\/ld\+json/g).length, 1)
  assert.match(html, /"@type":"FAQPage"/); assert.ok(!/<details/.test(html.match(/<article[\s\S]*<\/article>/)[0]))
  assert.match(html, /<h3[^>]*>How often should I change motorcycle oil in Singapore\?<\/h3>/)
})
test('built page: an unlisted guide is in no "More guides" row', () => {
  for (const slug of ['motorcycle-oil-change-singapore', 'honda-cb400-common-problems-singapore']) assert.ok(!guide(slug).includes('/guides/fixture-long-values/'))
})
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement per the spec's "Guide article". `[slug].astro`: `getStaticPaths` from `loadGuides` (one path per entry, listed or not; props `guide`, `guides` = listed entries); keep the repeated-introduction rule, canonical handling and the `Article` entity exactly as they are; "More guides" = `relatedGuides(guide.article, listed.map((e) => e.article), 3)` mapped back to their entries by slug (an `Article` has every `ArticleSummary` field), or none when the body has a `relatedLinks` block; add the topic level to the breadcrumb and `faqPageEntity(site, canonical, faqItemsOf(blocks))` when it has items. `FaqBlock` renders `<h3>` + answer and no `<script>`. The maintenance closing line becomes a plain paragraph. **Step 4:** Run → PASS; validator PASS; `pnpm check` 0 errors. Commit `git commit -m "Give guide articles their own article layout"`.

### Task 7: Body blocks

**Files:**
- Modify: `src/components/ui/guide/Callout.astro`, `SpecsTable.astro`, `CtaBlock.astro`, `RelatedLinks.astro`, `src/styles/guides.css`

**Interfaces:** Consumes the Sanity nodes each already takes; no prop changes.

- [ ] **Step 1: Failing tests:**

```js
test('built page: callouts are quotes, a warning says so in words', () => {
  assert.match(guide('motorcycle-oil-change-singapore'), /<blockquote class="callout callout--success"/)
  assert.match(guide('honda-cb400-common-problems-singapore'), /<blockquote class="callout callout--warn"[\s\S]*?<strong[^>]*>Warning<\/strong>/)
})
test('built page: the download block keeps the store links and the note', () => {
  const html = guide('motorcycle-oil-change-singapore')
  const block = html.match(/<aside class="guide-cta"[\s\S]*?<\/aside>/)[0]
  assert.match(block, /Log your oil change/); assert.match(block, /apps\.apple\.com|play\.google\.com/)
})
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Restyle the four blocks per the spec's body-elements table; remove their old rules from `reading.css` in Task 8, not here. `CtaBlock`'s object is `OBJECTS.receipt` through `<Image>`, hidden under 600 px. **Step 4:** Run → PASS. Commit `git commit -m "Quiet the guide body blocks"`.

### Task 8: Remove what the guides no longer use, and review at every size

**Files:**
- Modify: `src/layouts/ProseLayout.astro` (drop the `article` prop and its two class hooks), `src/styles/reading.css` (delete: `.page-head--article*`, `.reading--article`, `.guide-topics`, `.guide-groups`, `.guide-group*`, `.guide-rows`, `.guide-row*`, `.guide-empty`, `.link-rows*`, `.reading-back`, `.callout*`, `.spec-rows*`, `.guide-cta`, `.prose-body .faqs/.faq__*`; keep everything support, delete account, privacy, terms and the 404 use)

- [ ] **Step 1:** Before deleting, shoot `/support/`, `/delete-account/`, `/privacy/`, `/terms/` and the 404 at the five sizes, light and dark (`node scripts/shot.mjs <url> <dir>` against `pnpm preview --port 4332`). **Step 2:** Delete. **Step 3:** Shoot again; the ten pairs per page must be pixel-identical (compare file hashes; any difference is a regression to fix). `grep -rn "page-head--article\|reading--article\|link-rows\|guide-row" src` → no hits.
- [ ] **Step 4: Guide review loop** on the fixture build (`GUIDES_FIXTURE=… pnpm build`): `/guides/`, `/guides/topic/troubleshooting/`, `/guides/topic/more/`, the four full-body guides and both edge fixtures, at 375×667, 390×844, 768×1024, 1280×800, 1440×900, light and `--dark`. At each size evaluate `document.documentElement.scrollWidth <= innerWidth` (must be true on every page: Review Focus 5). Compare side by side with the canvas boards. At least three critique rounds; fix and reshoot until a round finds nothing.
- [ ] **Step 5:** `pnpm check`, `pnpm test`, `pnpm test:guides`, `node scripts/check-claims.mjs`, `node scripts/validate-structured-data.mjs` → all clean. Commit `git commit -m "Drop the first guide restyle from the reading styles"`.

### Task 9: Real guides, owner review, PR

- [ ] **Step 1:** Show the owner before/after screenshots (update the existing review Artifact `https://claude.ai/artifact/SBFNxLLi2vh6u1fz6DLLSG`, guide sections only) and ask for the go-ahead to push.
- [ ] **Step 2:** On the go-ahead, `git push`. Wait for the Cloudflare preview check on PR #13, then shoot from the preview URL, with real content: `/guides/`, all four topic pages, `/guides/motorcycle-coe-singapore/` (calculator), `/guides/motorcycle-oil-change-singapore/`, one per-model guide and one "more" guide, phone and desktop, light and dark. Check every one of the 30 guide pages returns 200 and has `scrollWidth <= innerWidth` at 375 px. Fix anything real content breaks; repeat.
- [ ] **Step 3:** Update PR #13's title to `Restyle the reading pages; lay guides out as articles` and its description (what changed, the new `/guides/topic/*` routes, checks run, what is not included: the spec's "Not in this change"). Update the shared status note `batch-2-reading-pages-status.md`.
- [ ] **Step 4:** Tell the owner: PR #13 now conflicts with nothing on `main` today; PR #12 also edits `package.json` (scripts), so whichever merges second needs a one-line merge there.
