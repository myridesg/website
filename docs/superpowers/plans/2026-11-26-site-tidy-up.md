# Site Tidy-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page takes its spacing, text sizes, corners and list layouts from one short set of tokens, and the guides get a deep red header, with no change to fonts, pictures, colours or copy.

**Architecture:** Add role tokens to the `@theme` block in `src/styles/global.css`, then point the existing rules in `home.css`, `feature.css`, `studio.css`, `guides.css` and `reading.css` at them. No new components and no markup changes except one attribute on `<html>` for the guides header. One source-level test file pins the rules.

**Tech Stack:** Astro 7 static, Tailwind v4 `@theme` tokens, plain CSS, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-26-site-tidy-up-design.md`

## Global Constraints

- **Start only after PRs #12, #13, #14 and #15 are merged into `main`.** Branch `claude/site-tidy-up` from that `main`. Every stylesheet below is edited by one of those PRs.
- `.astro` only; no React, no new dependency (AGENTS.md rules 1–2).
- No copy changes anywhere. `privacy.astro` and `terms.astro`: do not change one word.
- One red, `--color-red: #d6321c`, except the single exception added in Task 6.
- Do not touch: `.promise` (home hero), `.feature-hero`, `.ask`, anything under `src/components/ui/app/`, `.passport*`, `.spend*`, `.need*`, `.phone*`, `.notice*`.
- Token values, verbatim from the spec:
  `--space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem; --space-5: 1.5rem; --space-6: 2rem; --space-7: 3rem;`
  `--section-pad: clamp(3.5rem, 2rem + 5vw, 6rem);`
  `--type-small: 0.875rem; --type-body: 1rem; --type-reading: 1.0625rem; --type-lead: 1.25rem; --type-label: 1.5rem; --type-title: clamp(2.5rem, 1.35rem + 4.4vw, 5rem);`
  `--radius-card: var(--radius-lg); --card-pad: var(--space-6);`
- Before finishing: `pnpm check` 0 errors, `pnpm test`, `pnpm test:page`, `pnpm test:guides`, `node scripts/check-claims.mjs` all pass.
- Nothing is committed or pushed without the owner's go-ahead.

## Review Focus

1. **Phone widths (375, 390).** `--section-pad` floors at 56px; a section that had a smaller phone padding (home `.steps`, 59.2px/74.4px at desktop) must not grow so much that its art is pushed off the first screen.
2. **Dark mode cards.** A paper card on a studio band flips to near-black on near-black; the card must still be visible (use `--studio-wall-low`/`--studio-floor` contrast, check by eye in dark).
3. **`.tool__label` two-line height.** It reserves `min-block-size: 2lh` so four labels align; at 24px with left alignment inside a card the reserve must go, or cards get a blank line.
4. **Scroll-driven home sections.** `scripts/scroll-progress.ts` reads section tops; a padding change must not break `pnpm test:page`.
5. **Guides header in the phone menu.** The open menu sheet must stay readable when the bar is deep red (white sheet, ink text), and the theme toggle icon must be white on the bar.

---

### Task 1: Tokens

**Files:**
- Modify: `src/styles/global.css` (`@theme` block)
- Create: `scripts/tidy-styles.test.mjs`

**Interfaces:**
- Produces: the custom properties in Global Constraints; the test helper `rule(css, selector)` that returns the declaration text of the first rule whose selector list equals `selector` exactly, and `read(path)`.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

export const read = (path) => readFileSync(path, 'utf8')
export function rule(css, selector) {
  const at = css.split('\n').findIndex((l) => l.trim() === `${selector} {`)
  assert.notEqual(at, -1, `no rule for ${selector}`)
  const rest = css.split('\n').slice(at + 1)
  return rest.slice(0, rest.findIndex((l) => l.startsWith('}'))).join('\n')
}
const global = read('src/styles/global.css')

test('tidy: the token ladder exists with the agreed values', () => {
  for (const decl of [
    '--space-1: 0.25rem;', '--space-2: 0.5rem;', '--space-3: 0.75rem;', '--space-4: 1rem;',
    '--space-5: 1.5rem;', '--space-6: 2rem;', '--space-7: 3rem;',
    '--section-pad: clamp(3.5rem, 2rem + 5vw, 6rem);',
    '--type-small: 0.875rem;', '--type-body: 1rem;', '--type-reading: 1.0625rem;',
    '--type-lead: 1.25rem;', '--type-label: 1.5rem;',
    '--type-title: clamp(2.5rem, 1.35rem + 4.4vw, 5rem);',
    '--radius-card: var(--radius-lg);', '--card-pad: var(--space-6);',
  ]) assert.ok(global.includes(decl), decl)
})
```

- [ ] **Step 2:** Run `node --test scripts/tidy-styles.test.mjs`. Expected: FAIL, `--space-1: 0.25rem;`.
- [ ] **Step 3:** Add the declarations to `@theme` in `global.css` under two new comment headings, "Spacing ladder" and "Type by role".
- [ ] **Step 4:** Run the test. Expected: PASS. Run `pnpm check`. Expected: 0 errors.
- [ ] **Step 5:** Commit: `Add the spacing ladder and type roles`.

### Task 2: One section height

**Files:**
- Modify: `src/styles/home.css` (rules at the `padding-block` lines for `.steps`, `.never`, `.costs`, `.sg`, `.history`, `.next`), `src/styles/studio.css` (`.detail`), `src/styles/feature.css` (line 25 shared feature section rule), `src/styles/guides.css` (the guides home, topic and article section rules that use a two-value `clamp` pair)
- Test: `scripts/tidy-styles.test.mjs`

**Interfaces:** Consumes `--section-pad`.

- [ ] **Step 1: Write the failing test**

```js
test('tidy: every section uses the one section padding', () => {
  const home = read('src/styles/home.css'), studio = read('src/styles/studio.css'), feature = read('src/styles/feature.css')
  for (const [css, sel] of [[home, '.steps'], [home, '.never'], [home, '.costs'], [home, '.sg'], [home, '.history'], [home, '.next'], [studio, '.detail']])
    assert.match(rule(css, sel), /padding-block: var\(--section-pad\);/, sel)
  assert.ok(!/padding-block: clamp\(3\.5rem, 2rem \+ 5vw, 7rem\)/.test(home + feature), 'old 7rem section padding is gone')
})
```

- [ ] **Step 2:** Run it. Expected: FAIL on `.steps`.
- [ ] **Step 3:** Replace each section's `padding-block` with `var(--section-pad)`. Leave `.promise`, `.feature-hero` (feature.css:105) and `.ask` (studio.css:452) as they are. If a selector in the test is a grouped rule in the source, split it so the test's exact selector exists.
- [ ] **Step 4:** Run the test, then `pnpm test:page`. Expected: PASS both.
- [ ] **Step 5:** Commit: `Give every section the same height`.

### Task 3: Text by role

**Files:**
- Modify: `src/styles/studio.css` (`.home-title`, `.tool__label`, `.faq__text`), `src/styles/home.css` (`.step__label`, `.soon__title`, `.soon__line`, `.costs__line`, `.history__line`, `.promise__line`, `.never__line`), `src/styles/feature.css` (`.feature-label`, `.feature-step__label`, `.feature-text`, `.feature-point__body`, `.feature-step__body`, `.feature-related__line`, `.feature-related__more`), `src/styles/guides.css` and `src/styles/reading.css` (section headlines and card text only)
- Test: `scripts/tidy-styles.test.mjs`

**Interfaces:** Consumes `--type-*`.

- [ ] **Step 1: Write the failing test**

```js
test('tidy: text takes its size from a role', () => {
  const studio = read('src/styles/studio.css'), home = read('src/styles/home.css'), feature = read('src/styles/feature.css')
  assert.match(rule(studio, '.home-title'), /font-size: var\(--type-title\);/)
  for (const [css, sel] of [[studio, '.tool__label'], [home, '.step__label'], [home, '.soon__title'], [feature, '.feature-label'], [feature, '.feature-step__label']])
    assert.match(rule(css, sel), /font-size: var\(--type-label\);/, sel)
  for (const [css, sel] of [[home, '.soon__line'], [home, '.costs__line'], [home, '.history__line'], [feature, '.feature-text'], [feature, '.feature-point__body'], [feature, '.feature-step__body'], [feature, '.feature-related__line']])
    assert.match(rule(css, sel), /font-size: var\(--type-body\);/, sel)
  for (const [css, sel] of [[home, '.promise__line'], [home, '.never__line'], [studio, '.faq__text']])
    assert.match(rule(css, sel), /font-size: var\(--type-lead\);/, sel)
})
```

- [ ] **Step 2:** Run it. Expected: FAIL on `.home-title`.
- [ ] **Step 3:** Set each `font-size` as the test names. Line heights: title `0.9`, label `1.08`, body `1.5`, lead `1.5`. Remove any per-page override of `.home-title` size (`.feature-title`, `.detail__title`, guides topic/home headline) so there is one section headline size; hero titles keep theirs. In `guides.css`/`reading.css` use `--type-reading` for article and long-form body, `--type-body` for cards and meta. Remove `min-block-size: 2lh` from `.tool__label`.
- [ ] **Step 4:** Run `pnpm test` and `pnpm test:guides`. Expected: PASS.
- [ ] **Step 5:** Commit: `Size text by role`.

### Task 4: A line means read, a card means press

**Files:**
- Modify: `src/styles/feature.css` (`.feature-step`, `.feature-related__item`, `.feature-guides > .feature-point`, `.feature-card`, the three list `gap`s), `src/styles/home.css` (`.sg__title`, `.sg__tools`, `.sg__tool`, `.soon`, `.next__cards`), `src/styles/studio.css` (`.tool` alignment)
- Test: `scripts/tidy-styles.test.mjs`

**Interfaces:** Consumes `--radius-card`, `--card-pad`, `--space-*`.

- [ ] **Step 1: Write the failing test**

```js
test('tidy: non-links get a line, links get one flat card, nothing gets a shadow', () => {
  const feature = read('src/styles/feature.css'), home = read('src/styles/home.css')
  assert.match(rule(feature, '.feature-step'), /border-top: 1px solid var\(--studio-rule\);/)
  for (const [css, sel] of [[feature, '.feature-related__item'], [feature, '.feature-guides > .feature-point'], [home, '.sg__tool'], [home, '.soon']]) {
    const r = rule(css, sel)
    assert.match(r, /border-radius: var\(--radius-card\);/, sel)
    assert.match(r, /padding: var\(--card-pad\);/, sel)
  }
  assert.ok(!/box-shadow/.test(rule(feature, '.feature-card')), 'example card is flat')
  assert.ok(!/text-align: center|justify-self: center/.test(rule(home, '.sg__title')), 'tools headline starts at the left')
})
```

- [ ] **Step 2:** Run it. Expected: FAIL on `.feature-step`.
- [ ] **Step 3:** Implement. Card ground: `var(--color-paper)` where the section is a studio band (`.sg`, `.feature-related`), `var(--next-panel)` stays for `.soon`. Cards are `display: flex; flex-direction: column; align-items: flex-start; text-align: left`. `.tool` inside a card: `justify-items: start; text-align: left; padding: 0`. `.feature-guides > .feature-point` drops its top border. Lists: `gap: var(--space-6) var(--space-5)`. `.feature-card`: no `box-shadow`, no border, `padding: var(--card-pad)`. Reference: `docs/superpowers/plans/2026-11-26-site-tidy-up-reference/` holds the exact preview overrides the owner approved (`feature-page-overrides.css`, `home-page-overrides.css`). They are a reference for values, not code to paste: they use fixed pixels and forced specificity.
- [ ] **Step 4:** Run `pnpm test`, `pnpm test:page`. Expected: PASS.
- [ ] **Step 5:** Commit: `One card for links, one line for points`.

### Task 5: Guides and reading pages on the same tokens

**Files:**
- Modify: `src/styles/guides.css` (card radius, card padding, grid gaps), `src/styles/reading.css` (section gaps)
- Test: `scripts/tidy-styles.test.mjs`, `scripts/guides-styles.test.mjs` (existing, must stay green)

- [ ] **Step 1: Write the failing test**

```js
test('tidy: guides and reading pages hold no spacing or radius of their own', () => {
  for (const path of ['src/styles/guides.css', 'src/styles/reading.css']) {
    const css = read(path)
    assert.ok(!/border-radius: \d/.test(css.replace(/border-radius: (50%|2px)/g, '')), `${path}: radius comes from a token`)
    assert.ok(!/(^|\s)gap: clamp\(/m.test(css), `${path}: gaps come from the ladder`)
  }
})
```

- [ ] **Step 2:** Run it. Expected: FAIL (`guides.css` has literal radii).
- [ ] **Step 3:** Swap literals for `--radius-card`, `--radius-xs`, `--radius-pill` and `--space-*`. Where a value sits between two steps, take the nearer step.
- [ ] **Step 4:** Run `pnpm test`, `pnpm test:guides`. Expected: PASS.
- [ ] **Step 5:** Commit: `Put the guides on the shared ladder`.

### Task 6: Deep red header on guides only

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (new optional prop `headerTone?: 'deep'`, written as `data-header="deep"` on `<html>`), `src/layouts/GuideLayout.astro` and `src/pages/guides/index.astro`, `src/pages/guides/topic/[topic].astro` (pass `headerTone="deep"`), `src/components/ui/SiteNav.astro` (styles under `:global(:root[data-header='deep'])`), `src/styles/guides.css` (`--guide-bar: #9b0f06; --guide-bar-low: #7d0c05;` and the topic bar), `scripts/one-red.test.mjs`, `AGENTS.md` rule 4
- Test: `scripts/guides-page.test.mjs`, `scripts/one-red.test.mjs`

**Interfaces:**
- Produces: `data-header="deep"` on `<html>` of every guides page and of no other page.

- [ ] **Step 1: Write the failing tests**

In `scripts/guides-page.test.mjs`:

```js
test('built page: guides pages ask for the deep header, and only they do', () => {
  for (const page of ['guides/index.html', 'guides/topic/maintenance/index.html', 'guides/honda-cb400-problems/index.html'])
    assert.match(readBuilt(page), /<html[^>]* data-header="deep"/, page)
  for (const page of ['index.html', 'support/index.html', 'rider-tools/index.html'])
    assert.ok(!/data-header=/.test(readBuilt(page)), page)
})
```

In `scripts/one-red.test.mjs`:

```js
test('one red: the deep red exists once, as the guides header surface only', () => {
  const uses = files('src').flatMap((path) => read(path).split('\n').filter((l) => /#9b0f06|#7d0c05/i.test(l)).map(() => path))
  assert.deepEqual([...new Set(uses)], ['src/styles/guides.css'])
  assert.ok(contrast('#ffffff', '#9b0f06') >= 7)
})
```

(`readBuilt` is the existing helper in that file that reads from `dist-guides/`; reuse it under whatever name it has.)

- [ ] **Step 2:** Run `pnpm test:guides` and `pnpm test`. Expected: both new tests FAIL.
- [ ] **Step 3:** Implement. Under the deep tone: bar background `var(--guide-bar)`; links, brand, theme-toggle icon `var(--color-on-dark)`; `.site-header__sg` white; `.site-header__cta` white ground with `var(--guide-bar)` text; current-item marker white; the scrolled/slim state keeps the same ground; the open phone menu sheet keeps its normal paper ground. Topic bar (`GuideNav`) ground `var(--guide-bar-low)`, white text, white marker for the current topic. Same colours in dark mode. Rewrite AGENTS.md rule 4's one-red sentence to name the exception exactly as the spec words it.
- [ ] **Step 4:** Run `pnpm test`, `pnpm test:guides`, `pnpm check`. Expected: PASS, 0 errors.
- [ ] **Step 5:** Commit: `Deep red header on the guides`.

### Task 7: Whole-site check and docs

**Files:**
- Modify: `AGENTS.md` (Layout section: name the token ladder and the read/press rule in two lines)

- [ ] **Step 1:** `pnpm build`, then screenshot home, one feature page, `rider-tools`, `support`, `guides/`, one guide, at 375, 390, 768, 1280, 1440, light and dark, **one screenshot per section** (long full-page captures drop pictures below ~4000px). Compare against `main`.
- [ ] **Step 2:** For each of the five Review Focus lines, record what was seen.
- [ ] **Step 3:** Run every command in Global Constraints. Expected: all pass.
- [ ] **Step 4:** Commit: `Document the tidy-up rules`. Show the owner the before/after before opening a PR.
