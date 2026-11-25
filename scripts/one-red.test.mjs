// The site has one red: the app's brand red (brandEmber #D6321C in
// myridesg-v2/packages/tokens). These tests pin that, and the one rule that
// keeps it readable: it is a fill, a line, a dot or large type; small text is
// only red on plain white.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RED = '#d6321c'
const read = (path) => readFileSync(path, 'utf8')
const global = read('src/styles/global.css')

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(css|astro)$/.test(name) ? [path] : []
  })

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('one red: --color-red is the app brand red, in both themes', () => {
  assert.match(global, /--color-red: #d6321c;/)
  // No theme remaps it, and no second or third red is declared.
  assert.equal(global.match(/--color-red:/g).length, 1)
  assert.ok(!/#9b0f06|#f57c67|#d33722|#e55540/i.test(global.replace(/--app-[a-z-]+:[^;]+;/g, '')))
  assert.ok(!/--ramp-red|--ramp-ember/.test(global))
})

test('one red: the old names are aliases, kept only for branches still in review', () => {
  assert.match(global, /--color-ember: var\(--color-red\);/)
  // What used to be a lighter red for small text on black is plain white now.
  assert.match(global, /--color-ember-on-dark: var\(--color-on-dark\);/)
})

test('one red: nothing on main still asks for an old red by name', () => {
  const stale = files('src')
    // The drawings of the app keep the app's own colours.
    .filter((path) => !path.includes('/ui/app/'))
    .flatMap((path) =>
      read(path)
        .split('\n')
        .map((line, i) => ({ path, line, n: i + 1 }))
        .filter(({ line }) => /var\(--color-ember|var\(--ramp-red|var\(--ramp-ember|ember-on-dark\)/.test(line))
        .filter(({ line }) => !/^\s*--color-ember(-on-dark)?:/.test(line)),
    )
    // Pages and components other open pull requests rewrite are left to them.
    .filter(({ path }) => !/rider-tools\.astro/.test(path))
  assert.deepEqual(stale.map((s) => `${s.path}:${s.n}`), [])
})

test('one red: it is readable where it is used', () => {
  // Small text: plain white only.
  assert.ok(contrast(RED, '#ffffff') >= 4.5)
  // Lines, dots, fills and large type: every ground the site has.
  for (const ground of ['#f0f1f3', '#f4e9e7', '#e4e6ea', '#080808', '#171110', '#201513', '#1d1817']) {
    assert.ok(contrast(RED, ground) >= 3, `${ground}: ${contrast(RED, ground).toFixed(2)}`)
  }
  // White text on a red button.
  assert.ok(contrast('#ffffff', RED) >= 4.5)
})

test('one red: small red text turns to the foreground where red would not pass', () => {
  // Dark theme, and the tinted light bands.
  assert.match(global, /\[data-theme='dark'\] \.text-red,[^{]*\{\s*color: var\(--color-ink\);/)
  assert.match(global, /\.bg-soft \.text-red,\s*\.bg-rose \.text-red \{\s*color: var\(--color-ink\);/)
  assert.ok(!/need__due \{[^}]*color: var\(--(home-accent|color-red)\)/.test(read('src/styles/home.css')))
})

test('one red: the deep red exists once, as the guides header surface only', () => {
  const uses = files('src')
    // The drawings of the app keep the app's own colours, its header red included.
    .filter((path) => !path.includes('/ui/app/'))
    .flatMap((path) => read(path).split('\n').filter((l) => /#9b0f06|#7d0c05/i.test(l)).map(() => path))
  assert.deepEqual([...new Set(uses)], ['src/styles/guides.css'])
  assert.ok(contrast('#ffffff', '#9b0f06') >= 7)
})
