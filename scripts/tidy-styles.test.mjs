// Pins the site tidy-up rules: one spacing ladder, text sized by role, one
// card for links and one line for points.
// Spec: docs/superpowers/specs/2026-11-26-site-tidy-up-design.md
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

test('tidy: every section uses the one section padding', () => {
  const home = read('src/styles/home.css'), studio = read('src/styles/studio.css'), feature = read('src/styles/feature.css')
  for (const [css, sel] of [[home, '.steps'], [home, '.never'], [home, '.costs'], [home, '.sg'], [home, '.history'], [home, '.next'], [studio, '.detail']])
    assert.match(rule(css, sel), /padding-block: var\(--section-pad\);/, sel)
  assert.ok(!/padding-block: clamp\(3\.5rem, 2rem \+ 5vw, 7rem\)/.test(home + feature), 'old 7rem section padding is gone')
})

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
