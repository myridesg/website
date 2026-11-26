import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NAV } from './consts.ts'

test('nav: one Features menu holds the features and the tools, tools last', () => {
  assert.deepEqual(NAV.map((item) => item.label), ['Features', 'Guides', 'Support'])
  const features = NAV[0]
  assert.ok('children' in features)
  assert.deepEqual(features.children.map((link) => link.href).slice(-2), ['/rider-tools/', '/motorcycle-coe-calculator/'])
  assert.equal(features.children.length, 6)
})
