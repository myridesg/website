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
