# PostHog Analytics and Heatmaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The marketing site reports page views, heatmaps and two named events to the PostHog project the mobile app already uses, with no cookies and no clutter.

**Architecture:** `posthog-js` is bundled into the site's own JavaScript (its "no-external" build), so the browser loads no script from another origin and the CSP only gains two `connect-src` hosts. One client module, loaded from `BaseLayout`, starts PostHog only in a production build that has a key; with no key the build ships no analytics code at all. Event names and properties are decided by small pure functions that are unit-tested; the module that touches the DOM only wires them up.

**Tech Stack:** Astro 7 (static), `posthog-js` 1.455.x, `node --test`, pnpm.

**Spec:** There is no separate spec. The decisions are in "Decisions" below; the picture of the result is the canvas at https://claude.ai/artifact/5SdoTZmf4a9QXmSn8Zthk3 (dashboard, tracking plan, heatmap).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Region and project | EU (`https://eu.i.posthog.com`), the app's existing project | `privacy.astro` already says PostHog is hosted in the EU; `apps/mobile/.env.example` in `myridesg-v2` uses the same host |
| Cookies | `cookieless_mode: 'always'`, `person_profiles: 'never'` | Stores nothing in the browser, so no consent banner; visitors are counted by a hash made on PostHog's servers |
| Session replay | Off, and not bundled | Highest privacy risk, not asked for, and unavailable in cookieless mode anyway |
| Autocapture | Off | It is the source of the clutter; the app also runs with `autocapture={false}` |
| Heatmaps | On (`enable_heatmaps: true`), with page-leave events for scroll depth | Works in cookieless mode |
| Custom events | Exactly two: `store_button_clicked`, `guide_finished` | See `docs/tracking-plan.md` (Task 1) |
| Script loading | `posthog-js/dist/module.no-external` + `disable_external_dependency_loading: true` | Nothing is fetched from PostHog's CDN, so `script-src` stays `'self'` |
| Key | `PUBLIC_POSTHOG_KEY`, build-time env var, production only | Unset means analytics is off: fresh checkouts, tests and preview deploys send nothing |
| Reverse proxy | Not built | It would be a new live route (AGENTS.md rule 1). Ad blockers will hide some visitors; accepted |

A consequence to be honest about: cookieless visitors have no lasting identity, so a website visit cannot be joined to the same person's app sign-up. Site and app are compared as totals, not as one person's journey.

## Global Constraints

- AGENTS.md rule 2: `.astro` only, no React, no component library.
- AGENTS.md rule 1: no new live route. Do not add a proxy to `worker/`.
- Do not edit `src/pages/privacy.astro` or `terms.astro` (legal copy; flag only).
- `pnpm check` must report 0 errors; `pnpm test` must pass.
- Events are lowercase `object_action`, past tense. Every event carries `platform: 'web'`.
- The PostHog host is written in two places only: `src/consts.ts` and the CSP in `astro.config.mjs`. A test holds them together.
- Analytics must never break the page: a blocked or failed request shows nothing to the reader.

## Review Focus

1. **No key at build time** (fresh checkout, preview deploy, CI): the reader's browser downloads no analytics code and makes no request. Pinned in Task 3, Step 1.
2. **Header "Get the app" on a desktop** (its `href` is `/#download`, not a store): no `store_button_clicked`, because nobody went to a store. Pinned in Task 1.
3. **The TestFlight fallback link** (`IOS_LIVE` false): counts as `store: 'ios'`. Pinned in Task 1.
4. **Guide index, topic and tag pages** (`/guides/`, `/guides/topic/x/`, `/guides/tag/x/`): never send `guide_finished`. Pinned in Task 1.
5. **A tap that leaves the page at once** (store badges open another site): the event still arrives, because it is sent with `sendBeacon`. Checked by hand in Task 4.

## File Structure

| File | Responsibility |
|---|---|
| `docs/tracking-plan.md` (new) | The list of every event the site sends. The source of truth |
| `src/lib/analytics-events.ts` (new) | Pure functions: which store a link goes to, the props for a click, a guide's slug |
| `src/lib/analytics-events.test.ts` (new) | Unit tests for the above |
| `src/scripts/analytics.ts` (new) | Starts PostHog and attaches the click listener and the end-of-guide observer |
| `scripts/analytics-guard.test.mjs` (new) | Holds the privacy settings and the host in place, in the style of `scripts/one-red.test.mjs` |
| `src/consts.ts` | Gains `POSTHOG_HOST` |
| `src/layouts/BaseLayout.astro` | Loads `analytics.ts` |
| `astro.config.mjs` | `connect-src` gains the two PostHog hosts; comments updated |
| Seven components + `GuideLayout.astro` + `get.astro` | Gain `data-analytics-location` / `data-guide-end` |
| `.env.example`, `docs/deployment-guide.md`, `AGENTS.md` | Document the key and the rules |

---

### Task 1: Tracking plan and event helpers

**Files:**
- Create: `docs/tracking-plan.md`
- Create: `src/lib/analytics-events.ts`
- Test: `src/lib/analytics-events.test.ts`

**Interfaces:**
- Produces:
  - `type Store = 'ios' | 'android'`
  - `storeFromHref(href: string): Store | null`
  - `type LinkLike = { href: string; closest(selector: string): { dataset: { analyticsLocation?: string } } | null }`
  - `storeClickProps(link: LinkLike): { store: Store; location: string } | null`
  - `guideSlug(pathname: string): string | null`

- [ ] **Step 1: Write `docs/tracking-plan.md`**

Three rows, copied from the canvas's second board:

| Event | Sent when | Properties |
|---|---|---|
| `$pageview` (automatic) | Any page loads | built in |
| `store_button_clicked` | A tap on a link that goes to the App Store, TestFlight or Google Play | `store`: `ios` \| `android`; `location`: `header` \| `footer` \| `hero` \| `finale` \| `guide` \| `get` \| `page` |
| `guide_finished` | The end of a guide's text scrolls into view, once per page view | `slug` |

Under the table: the naming rule, "autocapture is off", "every event carries `platform: 'web'`", and the four steps for adding an event (question, row here, dashboard tile, then code). Also one line under "Known gaps": a phone that scans the QR code lands on `/get/` and is redirected before any event can be sent, so QR scans are not counted.

- [ ] **Step 2: Write the failing tests**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storeFromHref, storeClickProps, guideSlug } from './analytics-events.ts'

const link = (href: string, location?: string) => ({
  href,
  closest: () => (location ? { dataset: { analyticsLocation: location } } : null),
})

test('a store link names its store', () => {
  assert.equal(storeFromHref('https://apps.apple.com/sg/app/myridesg/id6788268752'), 'ios')
  assert.equal(storeFromHref('https://testflight.apple.com/join/abc'), 'ios')
  assert.equal(storeFromHref('https://play.google.com/store/apps/details?id=app.myridesg.android'), 'android')
})

test('a link that is not a store names none', () => {
  assert.equal(storeFromHref('https://myridesg.com/#download'), null)
  assert.equal(storeFromHref('mailto:hello@myridesg.com'), null)
  assert.equal(storeFromHref('not a url'), null)
})

test('a store click carries the store and where the button sits', () => {
  assert.deepEqual(storeClickProps(link('https://apps.apple.com/sg/app/x/id1', 'hero')), { store: 'ios', location: 'hero' })
})

test('a store button with no marked section reports "page"', () => {
  assert.deepEqual(storeClickProps(link('https://play.google.com/store/apps/details?id=x')), { store: 'android', location: 'page' })
})

test('the desktop header button scrolls the page, so it is not a store click', () => {
  assert.equal(storeClickProps(link('https://myridesg.com/#download', 'header')), null)
})

test('only an article has a guide slug', () => {
  assert.equal(guideSlug('/guides/coe-renewal/'), 'coe-renewal')
  assert.equal(guideSlug('/guides/'), null)
  assert.equal(guideSlug('/guides/topic/maintenance/'), null)
  assert.equal(guideSlug('/guides/tag/coe/'), null)
  assert.equal(guideSlug('/'), null)
})
```

- [ ] **Step 3: Run them and see them fail**

Run: `pnpm test`
Expected: FAIL, cannot find `./analytics-events.ts`.

- [ ] **Step 4: Implement the three functions in `src/lib/analytics-events.ts`**

`storeFromHref` parses with `new URL` inside a `try` and compares `hostname` exactly: `apps.apple.com` and `testflight.apple.com` are `ios`, `play.google.com` is `android`. `storeClickProps` reads `link.closest('[data-analytics-location]')`.

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/tracking-plan.md src/lib/analytics-events.ts src/lib/analytics-events.test.ts
git commit -m "Add the tracking plan and the functions that name its events"
```

---

### Task 2: Mark where each store button sits, and where a guide ends

**Files:**
- Modify: `src/components/ui/SiteNav.astro:41` (`<header class="site-header">`) → `data-analytics-location="header"`
- Modify: `src/components/ui/SiteFooter.astro:48` (`<footer class="site-footer">`) → `"footer"`
- Modify: `src/components/ui/home/HomePromise.astro:55` and `src/components/ui/feature/FeatureHero.astro:28` (the `<section>`) → `"hero"`
- Modify: `src/components/ui/home/HomeAsk.astro:32` and `src/components/ui/feature/FeatureAsk.astro:28` (the `<section>`) → `"finale"`
- Modify: `src/components/ui/guide/CtaBlock.astro` (its root element) → `"guide"`
- Modify: `src/pages/get.astro` (`<section class="ask">`) → `"get"`
- Modify: `src/layouts/GuideLayout.astro:109` (`<footer class="guide-end">`) → add `data-guide-end`
- Test: `scripts/home-page.test.mjs`, `scripts/guides-page.test.mjs`

**Interfaces:**
- Produces: the attributes `data-analytics-location="<value>"` and `data-guide-end`, which Task 3's script reads.

- [ ] **Step 1: Write the failing tests**

In `scripts/home-page.test.mjs`:

```js
test('built page: every store button sits in a named place', () => {
  for (const place of ['header', 'hero', 'finale', 'footer']) {
    assert.match(html(), new RegExp(`data-analytics-location="${place}"`), place)
  }
})
```

In `scripts/guides-page.test.mjs`, following that file's own way of reading an article page from `dist-guides/`: assert an article page contains exactly one `data-guide-end`, and that the guides index page contains none.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm test:page` then `pnpm test:guides`
Expected: both new tests FAIL.

- [ ] **Step 3: Add the nine attributes listed under Files**

- [ ] **Step 4: Run the tests and see them pass**

Run: `pnpm test:page && pnpm test:guides`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components src/layouts/GuideLayout.astro src/pages/get.astro scripts/home-page.test.mjs scripts/guides-page.test.mjs
git commit -m "Mark where each store button sits and where a guide ends"
```

---

### Task 3: Start PostHog and send the two events

**Files:**
- Modify: `package.json` (`pnpm add posthog-js`)
- Modify: `src/consts.ts` — add `export const POSTHOG_HOST = 'https://eu.i.posthog.com'`
- Create: `src/scripts/analytics.ts`
- Modify: `src/layouts/BaseLayout.astro` — a `<script>import '@/scripts/analytics.ts'</script>` as the last child of `<body>`
- Modify: `astro.config.mjs:62` — `"connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com"`, and rewrite the two comment paragraphs above it that say the site loads nothing off-origin and makes no fetch calls
- Modify: `src/env.d.ts` if it exists — type `PUBLIC_POSTHOG_KEY?: string`
- Modify: `.env.example`, `docs/deployment-guide.md`, `AGENTS.md`
- Test: `scripts/analytics-guard.test.mjs` (new), `scripts/home-page.test.mjs`

**Interfaces:**
- Consumes: `storeClickProps`, `guideSlug` from Task 1; the attributes from Task 2.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing tests**

`scripts/analytics-guard.test.mjs` reads source files as text:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const client = readFileSync('src/scripts/analytics.ts', 'utf8')
const config = readFileSync('astro.config.mjs', 'utf8')
const consts = readFileSync('src/consts.ts', 'utf8')

test('analytics loads no script from another origin', () => {
  assert.match(client, /posthog-js\/dist\/module\.no-external/)
  assert.doesNotMatch(client, /from 'posthog-js'/)
  assert.match(client, /disable_external_dependency_loading: true/)
})

test('analytics keeps its privacy settings', () => {
  for (const setting of [
    "cookieless_mode: 'always'",
    "person_profiles: 'never'",
    'autocapture: false',
    'disable_session_recording: true',
  ]) assert.ok(client.includes(setting), setting)
})

test('the CSP allows the host the site sends to, and only PostHog', () => {
  const host = consts.match(/POSTHOG_HOST = '([^']+)'/)[1]
  const connect = config.match(/"connect-src ([^"]+)"/)[1]
  assert.equal(connect, `'self' ${host} ${host.replace('://eu.', '://eu-assets.')}`)
})
```

In `scripts/home-page.test.mjs` (add `readdirSync` to its `node:fs` import). That build has no key as long as `.env` does not set one, so keep `PUBLIC_POSTHOG_KEY` out of `.env` and pass it on the command line when it is needed (Task 4):

```js
test('built page: with no key, no analytics code is shipped', () => {
  const shipped = readdirSync('dist/_astro').filter((f) => f.endsWith('.js'))
  for (const file of shipped) {
    assert.doesNotMatch(readFileSync(`dist/_astro/${file}`, 'utf8'), /posthog/i, file)
  }
})
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm test`
Expected: FAIL, `src/scripts/analytics.ts` does not exist.

- [ ] **Step 3: Install the SDK**

Run: `pnpm add posthog-js`

- [ ] **Step 4: Write `src/scripts/analytics.ts`**

The whole module sits inside `if (import.meta.env.PROD && import.meta.env.PUBLIC_POSTHOG_KEY) { … }`, and PostHog arrives by `await import('posthog-js/dist/module.no-external')` inside it. Both halves matter: the condition is a build-time constant, so a build with no key drops the import and ships nothing.

Inside, in this order:

```ts
posthog.init(import.meta.env.PUBLIC_POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  defaults: '2026-08-30',
  cookieless_mode: 'always',
  person_profiles: 'never',
  autocapture: false,
  capture_pageleave: true,
  enable_heatmaps: true,
  disable_session_recording: true,
  disable_external_dependency_loading: true,
})
posthog.register({ platform: 'web' })
```

Then one `click` listener on `document`: find `event.target.closest('a[data-store], a[data-store-link]')`, pass it to `storeClickProps`, and if that returns props, `posthog.capture('store_button_clicked', props, { transport: 'sendBeacon' })`.

Then, if `guideSlug(location.pathname)` and `document.querySelector('[data-guide-end]')` both exist, one `IntersectionObserver` that sends `guide_finished` with `{ slug }` the first time the element is on screen and then disconnects.

Check `defaults` and `transport` against the installed package's types; if a name differs in 1.455.x, use the installed name and keep the behaviour.

- [ ] **Step 5: Load it from `BaseLayout.astro`, add `POSTHOG_HOST`, and widen `connect-src`**

- [ ] **Step 6: Run everything**

Run: `pnpm test && pnpm check && pnpm test:page`
Expected: all PASS, `astro check` 0 errors.

- [ ] **Step 7: Document it**

- `.env.example`: a `PUBLIC_POSTHOG_KEY=` entry. Say that unset means analytics is off, that the key is public by design (it ships in the page), and that preview deploys leave it unset.
- `docs/deployment-guide.md`: add the variable to the production environment only.
- `AGENTS.md`: a Stack row (`Analytics | PostHog, EU, cookieless — see docs/tracking-plan.md`), `analytics.ts` in the Layout tree, and a new rule 7: every event is in `docs/tracking-plan.md` before it is in code; autocapture, session replay and cookies stay off; `scripts/analytics-guard.test.mjs` holds that. Correct the opening line "no backend" only as far as it is now untrue (the site still has none of its own).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Send page views, heatmaps and two named events to PostHog"
```

---

### Task 4: Check it against the real project

This task needs the owner's PostHog project key, so it cannot run until the checklist below reaches item 1.

- [ ] **Step 1: Build with the key and serve it**

Run: `PUBLIC_POSTHOG_KEY=<key> pnpm build && pnpm wrangler dev`

- [ ] **Step 2: In a browser, with the console open**

Expected on the home page: no CSP violation in the console; requests go to `eu.i.posthog.com` (and possibly `eu-assets.i.posthog.com`) and nowhere else; `document.cookie` and `localStorage` hold nothing from PostHog.

- [ ] **Step 3: Send each event once and find it in PostHog's Activity view**

A `$pageview`; a `store_button_clicked` from a hero badge with `store`, `location: 'hero'` and `platform: 'web'`; a `guide_finished` with the guide's `slug`. Then click the header's "Get the app" on a desktop and confirm no store event appears.

- [ ] **Step 4: Open the home page in PostHog's Heatmaps view**

The site refuses to be shown inside another site (`X-Frame-Options: DENY` in `public/_headers`), and the bundled SDK has no toolbar. Confirm the Heatmaps view can show the page from a screenshot. If it can only show it in a frame, stop and raise it with the owner: loosening that header is their decision, not a step in this plan.

- [ ] **Step 5: Rebuild with no key before finishing**

Run: `pnpm build`, so `dist/` does not carry the key into anything else.

---

## Owner checklist (not code)

1. Give the build the **project key** of the app's existing EU PostHog project, and set `PUBLIC_POSTHOG_KEY` on the production environment in Cloudflare only.
2. In PostHog project settings: turn on **cookieless server hash mode** (events sent in cookieless mode are dropped without it), turn on **heatmaps**, and turn on **filter out internal and test users**.
3. Build the one dashboard from the canvas: six tiles, each named after its question.
4. **Legal review of `privacy.astro`.** Section 5 describes analytics in the app only, and Section 14 still describes website cookies for a login that no longer exists. Neither mentions website analytics. The site's analytics also has no opt-out, because cookieless mode ignores one. A lawyer should decide the wording before the key goes into production.
