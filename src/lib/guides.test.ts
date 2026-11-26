import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Article } from '@/content/entities'
import {
  anchorHeadings,
  coverFor,
  faqItemsOf,
  guideBreadcrumbs,
  leadCount,
  readMinutes,
  readTimeLabel,
  toGuideEntry,
} from './guides.ts'
import { GUIDE_GROUPS, topicPath } from './guide-navigation.ts'

const p = (text: string, style = 'normal'): Record<string, any> => ({
  _type: 'block',
  style,
  children: [{ _type: 'span', text }],
})

test('readMinutes counts prose, questions, table rows and notes at 200 a minute', () => {
  assert.equal(readMinutes([]), 1)
  assert.equal(readMinutes([p('word '.repeat(400))]), 2)
  assert.equal(
    readMinutes([{ _type: 'faq', items: [{ question: 'a b', answer: [p('word '.repeat(298))] }] }]),
    2,
  )
  assert.equal(
    readMinutes([{ _type: 'specsTable', rows: [{ _key: 'ignored words here', label: 'x', value: 'y' }] }]),
    1,
  )
})

test('readTimeLabel says minute once and minutes otherwise', () => {
  assert.equal(readTimeLabel(1), 'Read time 1 minute')
  assert.equal(readTimeLabel(3), 'Read time 3 minutes')
})

test('anchorHeadings gives each h2 a unique id and lists them', () => {
  const { blocks, contents } = anchorHeadings([
    p('Oil Grades', 'h2'),
    p('text'),
    p('Oil grades', 'h2'),
    p('Sub', 'h3'),
    p('  ', 'h2'),
  ])
  assert.deepEqual(contents, [
    { id: 'oil-grades', text: 'Oil Grades' },
    { id: 'oil-grades-2', text: 'Oil grades' },
  ])
  assert.equal(blocks[0].anchor, 'oil-grades')
  assert.equal(blocks[2].anchor, 'oil-grades-2')
  assert.equal(blocks[1].anchor, undefined)
  assert.equal(blocks.length, 5)
})

test('faqItemsOf flattens every faq block, skipping unanswered questions', () => {
  const faq = (items: unknown[]) => ({ _type: 'faq', items })
  assert.deepEqual(
    faqItemsOf([
      faq([
        { question: 'Q1', answer: [p('A1'), p('more')] },
        { question: 'Q2', answer: [] },
      ]),
      p('x'),
      faq([{ question: 'Q3', answer: [p('A3')] }]),
    ]),
    [
      { q: 'Q1', a: 'A1\n\nmore' },
      { q: 'Q3', a: 'A3' },
    ],
  )
})

test('coverFor: slug keywords first, then a stable pick from the topic pool', () => {
  assert.equal(coverFor({ slug: 'motorcycle-oil-change-singapore', topic: 'maintenance' }), 'petrol')
  assert.equal(coverFor({ slug: 'motorcycle-coe-singapore', topic: 'ownership' }), 'coe')
  assert.equal(coverFor({ slug: 'singapore-petrol-prices', topic: 'ownership' }), 'pump')
  assert.equal(coverFor({ slug: 'best-motorcycle-workshops-singapore', topic: 'maintenance' }), 'workshops')
  assert.notEqual(coverFor({ slug: 'motorcycle-coil-problems', topic: 'troubleshooting' }), 'petrol')
  const first = coverFor({ slug: 'honda-cb400-common-problems', topic: 'troubleshooting' })
  assert.ok(['workshops', 'guides', 'receipt', 'chart'].includes(first))
  assert.equal(coverFor({ slug: 'honda-cb400-common-problems', topic: 'troubleshooting' }), first)
})

test('leadCount keeps a lone card out of the last row', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 15].map(leadCount), [0, 1, 2, 0, 1, 2, 0, 0])
})

test('topics have short labels and paths', () => {
  assert.deepEqual(GUIDE_GROUPS.map((g) => g.label), ['Maintenance', 'Troubleshooting', 'Ownership', 'More'])
  assert.equal(topicPath('ownership'), '/guides/topic/ownership/')
})

test('toGuideEntry reads topic, cover, read time and whether the guide is listed', () => {
  const article: Article = {
    slug: 'motorcycle-oil-change-singapore',
    title: 'Oil change',
    description: 'd',
    category: 'guide',
    heroImage: null,
    author: { slug: 'hidayah', name: 'Hidayah' },
    publishedAt: new Date('2026-05-12'),
    updatedAt: new Date('2026-05-12'),
    tags: [],
    relatedSlugs: [],
    bodySource: JSON.stringify([p('word '.repeat(400))]),
    bodyFormat: 'portable-text-v1',
    seo: { metaTitle: null, metaDescription: null, canonicalUrl: null, noIndex: true },
  }
  const entry = toGuideEntry(article)
  assert.equal(entry.topic, 'maintenance')
  assert.equal(entry.cover, 'petrol')
  assert.equal(entry.readMinutes, 2)
  assert.equal(entry.listed, false)
})

test('guideBreadcrumbs only links a topic page that exists', () => {
  const group = { id: 'more', title: 'More guides' } as const
  assert.deepEqual(guideBreadcrumbs(group, 'A guide', true), [
    { name: 'Home', href: '/' },
    { name: 'Riding guides', href: '/guides/' },
    { name: 'More guides', href: '/guides/topic/more/' },
    { name: 'A guide' },
  ])
  assert.deepEqual(guideBreadcrumbs(group, 'A guide', false), [
    { name: 'Home', href: '/' },
    { name: 'Riding guides', href: '/guides/' },
    { name: 'A guide' },
  ])
})

test('anchorHeadings never repeats an id, even when a heading already ends in a number', () => {
  const { contents } = anchorHeadings([p('Costs', 'h2'), p('Costs', 'h2'), p('Costs 2', 'h2')])
  const ids = contents.map((c) => c.id)
  assert.equal(new Set(ids).size, 3)
  assert.deepEqual(ids.slice(0, 2), ['costs', 'costs-2'])
})
