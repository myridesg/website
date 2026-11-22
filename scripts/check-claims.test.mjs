import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findBannedClaims } from './check-claims.mjs'

test('clean copy passes', () => {
  assert.deepEqual(findBannedClaims("Free to start. We'll remind you before it's due."), [])
  assert.deepEqual(findBannedClaims('MyRideSG does not book appointments.'), [])
})

test('banned claims are found', () => {
  for (const bad of [
    'Free forever', 'real-time prices', 'verified workshops', '1,251 riders', '4,800+ downloads',
    'rated 5.0', '5 stars', 'Book a slot', 'Join the Rider Club', 'earn rewards',
    'redeem a voucher', 'chop card', 'across Southeast Asia',
  ]) {
    assert.notDeepEqual(findBannedClaims(bad), [], bad)
  }
})
