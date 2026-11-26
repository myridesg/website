// Pins the site tidy-up rules: one spacing ladder, text sized by role, one
// card for links and one line for points.
// Spec: docs/superpowers/specs/2026-11-26-site-tidy-up-design.md
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')

/** The declarations of the first top-level-looking rule whose selector is exactly `selector`. */
function rule(css, selector) {
  const lines = css.split('\n')
  const at = lines.findIndex((l) => l.trim() === `${selector} {`)
  assert.notEqual(at, -1, `no rule for ${selector}`)
  const end = lines.findIndex((l, i) => i > at && l.startsWith('}'))
  return lines.slice(at + 1, end).join('\n')
}

const global = read('src/styles/global.css')
const studio = read('src/styles/studio.css')
const home = read('src/styles/home.css')
const feature = read('src/styles/feature.css')
const guides = read('src/styles/guides.css')
const reading = read('src/styles/reading.css')

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

test('tidy: every section uses the one section padding', () => {
  for (const [css, sel] of [[home, '.steps'], [home, '.never'], [home, '.costs'], [home, '.sg'], [home, '.history'], [home, '.next'], [studio, '.detail']])
    assert.match(rule(css, sel), /padding-block: var\(--section-pad\);/, sel)
  assert.ok(!/padding-block: clamp\(3\.5rem, 2rem \+ 5vw, 7rem\)/.test(home + feature), 'old 7rem section padding is gone')
})

test('tidy: text takes its size from a role', () => {
  assert.match(rule(studio, '.home-title'), /font-size: var\(--type-title\);/)
  for (const [css, sel] of [[studio, '.tool__label'], [home, '.step__label'], [home, '.soon__title'], [feature, '.feature-label'], [feature, '.feature-step__label']])
    assert.match(rule(css, sel), /font-size: var\(--type-label\);/, sel)
  for (const [css, sel] of [[home, '.soon__line'], [home, '.costs__line'], [home, '.history__line'], [feature, '.feature-text'], [feature, '.feature-point__body'], [feature, '.feature-step__body'], [feature, '.feature-related__line']])
    assert.match(rule(css, sel), /font-size: var\(--type-body\);/, sel)
  for (const [css, sel] of [[home, '.never__line'], [studio, '.faq__text']])
    assert.match(rule(css, sel), /font-size: var\(--type-lead\);/, sel)
})

test('tidy: non-links get a line, links get one flat card, nothing gets a shadow', () => {
  assert.match(rule(feature, '.feature-step'), /border-top: 1px solid var\(--studio-rule\);/)
  const card = rule(studio, '.studio-card')
  assert.match(card, /border-radius: var\(--radius-card\);/)
  assert.match(card, /padding: var\(--card-pad\);/)
  assert.ok(!/box-shadow/.test(card), 'the card is flat')
  // Every card on the site is that one card.
  for (const [path, item] of [
    ['src/components/ui/home/HomeSingapore.astro', 'sg__tool'],
    ['src/components/ui/home/HomeNext.astro', 'soon'],
    ['src/components/ui/feature/FeatureExplain.astro', 'feature-card'],
    ['src/components/ui/feature/FeatureRelated.astro', 'feature-related__item'],
    ['src/components/ui/FeaturedGuides.astro', 'feature-guide'],
  ]) assert.match(read(path), new RegExp(`class="${item} studio-card"`), path)
  assert.ok(!/text-align: center|justify-self: center/.test(rule(home, '.sg__title')), 'tools headline starts at the left')
})

test('tidy: guides and reading pages hold no spacing or radius of their own', () => {
  for (const [path, css] of [['guides.css', guides], ['reading.css', reading]]) {
    assert.ok(!/border-radius: \d/.test(css.replace(/border-radius: (50%|2px|0);/g, '')), `${path}: radius comes from a token`)
    assert.ok(!/(^|\s)gap: clamp\(/m.test(css), `${path}: gaps come from the ladder`)
  }
})

test('tidy (review): the home hero line and the bike stay as they were', () => {
  // The hero (.promise) is frozen: its line keeps its own size on phones.
  assert.match(rule(home, '.promise__line'), /font-size: clamp\(0\.96875rem, 0\.85rem \+ 0\.45vw, 1\.3125rem\);/)
  // The bike keeps its size; its part keeps the tighter laptop top so the
  // headline, bike and tags still share one laptop screen.
  assert.match(home, /--fit: 28\.5rem;/)
  assert.match(home, /\.never \{\s*padding-block-start: clamp\(3rem, 1rem \+ 3vw, 4\.5rem\);/)
})

test('tidy (review): the guides red bar has a white focus ring', () => {
  assert.match(global, /:focus-visible \{\s*outline: 2px solid var\(--focus-ring, var\(--color-red\)\);/)
  assert.match(rule(guides, ":root[data-header='deep'] .site-header"), /--focus-ring: var\(--color-on-dark\);/)
})

test('tidy (review): the reading panel is a flat card', () => {
  assert.ok(!/box-shadow/.test(rule(reading, '.reading__panel')))
})

test('tidy: the FAQ headline column is never narrower than its longest word', () => {
  // At 80px, "MAINTENANCE" ran into the questions in a 0.8fr column at 1280.
  assert.match(studio, /grid-template-columns: minmax\(min-content, 0\.8fr\) minmax\(0, 2\.2fr\);/)
})
