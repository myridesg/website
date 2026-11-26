import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shareLinks } from './share-links.ts'

const url = 'https://myridesg.com/guides/motorcycle-coe-singapore/'
const title = 'Motorcycle COE in Singapore: prices & bidding'

test('WhatsApp gets one text: the title, then the address', () => {
  const link = new URL(shareLinks(url, title).whatsapp)
  assert.equal(link.origin + link.pathname, 'https://wa.me/')
  assert.equal(link.searchParams.get('text'), `${title} ${url}`)
})

test('Telegram gets the address and the title as separate fields', () => {
  const link = new URL(shareLinks(url, title).telegram)
  assert.equal(link.origin + link.pathname, 'https://t.me/share/url')
  assert.equal(link.searchParams.get('url'), url)
  assert.equal(link.searchParams.get('text'), title)
})

test('the title is escaped, so an ampersand cannot cut the link short', () => {
  assert.ok(!shareLinks(url, title).telegram.includes('& '))
})

test('spaces are %20, never "+"', () => {
  const { whatsapp, telegram } = shareLinks(url, title)
  for (const link of [whatsapp, telegram]) {
    assert.ok(!link.includes('+'), link)
    assert.ok(link.includes('%20'), link)
  }
})
