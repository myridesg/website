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
