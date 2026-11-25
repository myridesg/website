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

test('guides.css: the download prompt is a centred line, not a dark card', () => {
  const block = css.match(/\n\.guide-cta \{[^}]*\}/)[0]
  assert.ok(!block.includes('--color-black'))
  assert.ok(!block.includes('border-radius'))
  assert.match(block, /text-align: center/)
})

test('guides.css: the brand colour is an underline, not a wash', () => {
  // No tinted panels, no coloured bullets, no red text: links and tags are
  // ink with the accent under them.
  assert.ok(!css.includes('var(--color-rose)'))
  assert.match(css, /\.guide-text a \{[^}]*color: var\(--studio-headline\)[^}]*text-decoration-color: var\(--color-red\)/)
  assert.ok(!/li::marker \{[^}]*--studio-dot/.test(css))
})

test('test:guides builds into its own folder, so fixtures never reach dist/', () => {
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts
  assert.match(scripts['test:guides'], /--outDir dist-guides/)
  assert.match(readFileSync('.gitignore', 'utf8'), /^dist-guides\/$/m)
})

test('guides.css: a question keeps its own gap above the answer', () => {
  // The rule that pulls text up under a heading must not reach the FAQ's h3.
  assert.match(css, /\.guide-text > :is\(h2, h3\) \{\s*margin-block-end: -1rem/)
})

test('guides.css: "More guides" is as wide as the card rows, not the article head', () => {
  assert.match(css, /\.guide-more \{[^}]*inline-size: min\(71\.75rem, 100% - 2\.5rem\)/)
})

test('guides.css: one red, the brand red of the wordmark', () => {
  // Every red on the guide pages is --color-red (the "SG" of the logo). No
  // ember, no second accent token, and never as a text colour: as a line it
  // clears 3:1 in both themes, as text it would not in dark.
  assert.ok(!/ember|--home-accent|--studio-dot/.test(css))
  // The one red glyph is the large full stop after a topic title.
  const redText = [...css.matchAll(/([^{}]+)\{[^{}]*\n  color: var\(--color-red\)/g)].map((m) => m[1].trim())
  assert.deepEqual(redText, ['.topic-head__dot'])
  assert.ok(css.match(/var\(--color-red\)/g).length >= 6)
})

test('guides.css: the topic bar is the page\'s own ground with a red marker', () => {
  const bar = css.match(/\n\.guide-nav \{[^}]*\}/)[0]
  assert.ok(!bar.includes('background'))
  assert.match(bar, /border-block: 1px solid var\(--studio-rule\)/)
  assert.match(css, /\.guide-nav a\[aria-current='page'\],\s*\.guide-nav a\.is-within \{[^}]*text-decoration-color: var\(--color-red\)/)
})
