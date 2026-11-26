import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { GuideEntry } from './guides.ts'
import { guideTags, linkedTags, tagPath } from './guide-tags.ts'

const entry = (slug: string, tags: string[]) => ({ article: { slug, tags } }) as unknown as GuideEntry

test('a tag gets a page once two guides share it, whatever its case or spacing', () => {
  const a = entry('a', ['Honda', 'Chain lube'])
  const b = entry('b', ['honda ', 'COE'])
  const c = entry('c', ['HONDA', 'Honda'])
  const tags = guideTags([a, b, c])
  assert.deepEqual(
    tags.map((t) => [t.slug, t.label, t.guides.map((g) => g.article.slug)]),
    [['honda', 'Honda', ['a', 'b', 'c']]],
  )
})

test('a tag with no letters or digits gets no page', () => {
  assert.deepEqual(guideTags([entry('a', ['—']), entry('b', ['—'])]), [])
})

test('tags with pages sort by name', () => {
  const tags = guideTags([entry('a', ['Yamaha', 'Costs']), entry('b', ['costs', 'yamaha'])])
  assert.deepEqual(tags.map((t) => t.label), ['Costs', 'Yamaha'])
})

test("an article links only its tags that have a page, in the article's order", () => {
  const pages = guideTags([entry('a', ['Honda', 'Costs']), entry('b', ['Costs', 'Honda'])])
  assert.deepEqual(
    linkedTags(['costs', 'Only here', 'Honda', 'COSTS'], pages).map((t) => t.slug),
    ['costs', 'honda'],
  )
})

test('a tag page lives under /guides/tag/', () => {
  assert.equal(tagPath('chain-lube'), '/guides/tag/chain-lube/')
})
