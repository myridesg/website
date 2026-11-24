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
