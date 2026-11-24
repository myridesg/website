// Pins the guide stylesheet's layout rules and the fixture build's output
// folder. These read source files, so they run in `pnpm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/guides.css', 'utf8')

test('guides.css: a grid of three goes back to rows of three at 56rem', () => {
  // The odd-count rule (first card on a row of its own) is for two-wide only.
  const wide = css.slice(css.indexOf('@media (width >= 56rem) {\n  .guide-grid > .guide-card'))
  assert.match(wide, /\.guide-grid--lead0 > \.guide-card:first-child \{\s*grid-column: span 2/)
})

test('guides.css: the large card is the grid\'s decision, not the card\'s class', () => {
  // A class-sized "feature" card is double height in a two-wide row.
  assert.ok(!css.includes('.guide-cover--feature'))
  assert.ok(!css.includes('.guide-card--feature .guide-card__title'))
})

test('guides.css: the download panel\'s links keep a visible focus ring', () => {
  assert.match(css, /\.guide-text \.guide-cta a:focus-visible \{[^}]*outline-color: var\(--color-on-dark\)/)
})

test('test:guides builds into its own folder, so fixtures never reach dist/', () => {
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts
  assert.match(scripts['test:guides'], /--outDir dist-guides/)
  assert.match(readFileSync('.gitignore', 'utf8'), /^dist-guides\/$/m)
})
