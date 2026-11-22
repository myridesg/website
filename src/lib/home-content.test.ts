import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as c from './home-content.ts'
import { FAQ_ITEMS } from './faq-items.ts'
import { findBannedClaims } from '../../scripts/check-claims.mjs'

test('copy matches the approved design', () => {
  assert.equal(c.PROMISE.eyebrow, 'Made in Singapore')
  assert.equal(c.PROMISE.headline, 'One app for Singapore riders.')
  assert.equal(c.PROMISE.line, 'What your bike needs and what you check before a ride, in one place.')
  assert.equal(c.PROMISE.note, 'Free to start')
  assert.equal(c.STEPS.headline, 'Three steps to get sorted.')
  assert.deepEqual(c.STEPS.steps.map((s) => s.label), ['Add your bike', 'Snap as you go', 'Get reminded'])
  assert.equal(c.NEVER_MISS.headline, 'Always know what your bike needs next.')
  assert.equal(c.NEVER_MISS.line, "Every job and every renewal. We'll remind you before it's due.")
  assert.deepEqual(c.NEVER_MISS.items.map((i) => `${i.label}|${i.due}|${i.kind}`), [
    'Chain lube|in 300 km|job', 'Road tax|21 days|renewal', 'Oil change|in 3 weeks|job', 'Brake pads|in 1,200 km|job',
    'Insurance|2 months|renewal', 'Tyres|in 4 months|job', 'COE|2 years|renewal',
  ])
  assert.equal(c.NEVER_MISS.caption, 'Sample data')
  assert.equal(c.COSTS.headline, 'Know what your bike really costs.')
  assert.equal(c.COSTS.line, 'Fuel, Johor fill-ups, parts and everything else, by month.')
  assert.equal(c.SINGAPORE.headline, 'Made for riding in Singapore.')
  assert.deepEqual(c.SINGAPORE.tools.map((t) => `${t.label}|${t.href}`), [
    'Petrol prices, SG + MY|/rider-tools/#fuel-prices', 'Causeway cameras|/rider-tools/#causeway-cams',
    'COE calculator|/motorcycle-coe-calculator/', 'Workshops|/motorcycle-workshop-directory/',
  ])
  assert.equal(c.HISTORY.headline, 'A history a buyer can check.')
  assert.equal(c.HISTORY.line, 'Your records become a bike passport with a QR code.')
  assert.equal(c.NEXT.headline, "And we're not done.")
  assert.equal(c.NEXT.badge, 'In the works')
  assert.deepEqual(c.NEXT.cards.map((x) => `${x.title}|${x.line}`), [
    'Map|Petrol, parking and workshops on one map.', 'Community|Parking, routes and clubs, shared by riders.',
    'Guides|Short how-tos for looking after your bike.', 'Weather|A rain check before you ride.',
  ])
  assert.equal(c.DETAIL.featuresQuestion, 'What can the app do today?')
  assert.equal(c.DETAIL.faqHeading, 'Questions riders ask.')
  assert.deepEqual(c.DETAIL.groups.map((g) => g.title), ['Servicing', 'Money', 'Dates', 'Your bike', 'Tools', 'Also'])
  assert.equal(c.ASK.headline, 'Ride more. Worry less.')
  assert.equal(c.ASK.note, 'Free to start. Your records are yours.')
  assert.deepEqual(c.SECTION_IDS, [
    'promise', 'how-it-works', 'never-miss', 'costs', 'singapore', 'history', 'next', 'detail', 'download',
  ])
})

test('every word on the page passes the claim rules', () => {
  const copy = c.allHomeCopy()
  for (const line of [c.ASK.note, c.DETAIL.featuresQuestion]) assert.ok(copy.includes(line), `checked: ${line}`)
  assert.deepEqual(findBannedClaims(copy), [])
  assert.deepEqual(findBannedClaims(FAQ_ITEMS.map((f) => `${f.q} ${f.a}`).join('\n')), [])
})

test('the feature list leaves out what the owner chose not to promote', () => {
  const all = c.DETAIL.groups.flatMap((g) => g.items).join(' ').toLowerCase()
  for (const banned of ['club', 'reward', 'voucher', 'wallet', 'book', 'region']) assert.ok(!all.includes(banned), banned)
})

test('the FAQ says import is live and how the workshop directory is browsed', () => {
  const importAnswer = FAQ_ITEMS.find((f) => f.q === 'Can I import existing records from a spreadsheet?')
  assert.ok(importAnswer, 'the import question is in the FAQ')
  assert.ok(!importAnswer.a.includes('Not yet'))
  for (const f of FAQ_ITEMS) assert.ok(!f.a.includes('by region'), f.q)
})
