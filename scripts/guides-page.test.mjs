// Tests on the built guide pages. They read dist/, so they run after
// `GUIDES_FIXTURE=scripts/fixtures/guides.json astro build` (pnpm test:guides);
// every name starts "built page:" so `pnpm test` skips them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('built page: every fixture guide builds, the unlisted ones too', () => {
  assert.ok(existsSync('dist/guides/motorcycle-oil-change-singapore/index.html'))
  assert.ok(existsSync('dist/guides/honda-cb400-problems/index.html'))
  assert.ok(existsSync('dist/guides/fixture-long-values/index.html'))
  assert.ok(existsSync('dist/guides/fixture-one-heading/index.html'))
})

test('built page: a card is one link with its picture, topic, title and read time', () => {
  const home = readFileSync('dist/guides/index.html', 'utf8')
  const card =
    home.match(
      /<a[^>]+class="[^"]*guide-card[^"]*"[^>]+href="\/guides\/motorcycle-oil-change-singapore\/"[\s\S]*?<\/a>/,
    )?.[0] ?? ''
  assert.match(card, /<img[^>]+ alt[ >]/)
  assert.match(card, /Maintenance/)
  assert.match(card, /Motorcycle Oil Change Singapore/)
  assert.match(card, /Read time \d+ minutes?/)
  assert.match(card, /Hidayah/)
  assert.match(card, /12 May 2026/)
})

const read = (path) => readFileSync(path, 'utf8')
const cards = (html) => html.match(/<a class="guide-card[ "]/g)?.length ?? 0

test('built page: the home lists only indexable guides', () => {
  assert.ok(!read('dist/guides/index.html').includes('/guides/fixture-long-values/'))
  assert.ok(!read('dist/guides/index.html').includes('/guides/fixture-one-heading/'))
})

test('built page: the home has the topic bar, one section per topic, five cards at most', () => {
  const home = read('dist/guides/index.html')
  assert.match(home, /<nav[^>]+aria-label="Guide topics"[\s\S]*?href="\/guides\/topic\/troubleshooting\/"/)
  assert.match(home, /<h1[^>]*>Motorcycle guides for Singapore riders<\/h1>/)
  assert.match(home, /See all 14 guides/)
  assert.ok(!/See all \d+ guides/.test(home.match(/<section[^>]+id="maintenance"[\s\S]*?<\/section>/)[0]))
  assert.equal(cards(home.match(/<section[^>]+id="troubleshooting"[\s\S]*?<\/section>/)[0]), 5)
  assert.equal(cards(home.match(/<section[^>]+id="ownership"[\s\S]*?<\/section>/)[0]), 5)
  assert.match(home, /Keeping a service record\? Explore the/)
})

test('built page: a topic page lists all its guides with its own head', () => {
  const page = read('dist/guides/topic/troubleshooting/index.html')
  assert.match(page, /<title>Bike troubleshooting guides for Singapore riders/)
  assert.match(page, /<h1[^>]*>Bike troubleshooting<\/h1>/)
  assert.match(page, />14 guides</)
  assert.equal(cards(page), 14)
  assert.match(page, /<a[^>]+aria-current="page"[^>]*>\s*Troubleshooting\s*<\/a>/)
  assert.match(read('dist/sitemap-0.xml'), /\/guides\/topic\/troubleshooting\//)
  assert.ok(!existsSync('dist/guides/topic/nothing/index.html'))
})

test('built page: a four-guide topic leads with one full-width card', () => {
  const page = read('dist/guides/topic/more/index.html')
  assert.equal(page.match(/<a class="guide-card guide-card--feature"/g)?.length, 1)
  assert.equal(cards(page), 4)
  assert.match(page, />4 guides</)
})
