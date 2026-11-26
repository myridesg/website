import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FEATURE_LINKS, NAV, TOOL_LINKS } from './consts.ts'

test('nav: one Features menu holds the features and the tools, tools last', () => {
  assert.deepEqual(NAV.map((item) => item.label), ['Features', 'Guides', 'Support'])
  const features = NAV[0]
  assert.ok('children' in features)
  assert.deepEqual(features.children, [...FEATURE_LINKS, ...TOOL_LINKS])
  assert.deepEqual(TOOL_LINKS.map((link) => link.href), ['/rider-tools/', '/motorcycle-coe-calculator/'])
})
