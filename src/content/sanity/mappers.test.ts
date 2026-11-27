import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapArticleImage } from './mappers.ts'

const asset = 'https://cdn.sanity.io/images/p/d/abc-4000x3000.jpg'

test('a hero image maps through with its real size, alt, caption and credit', () => {
  assert.deepEqual(
    mapArticleImage({
      url: asset,
      width: 4000,
      height: 3000,
      alt: 'A CB400 Super Four, side on',
      caption: 'A Honda CB400 Super Four parked in Tokyo',
      credit: 'Rainmaker47, CC BY-SA 3.0, via Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg',
    }),
    {
      url: asset,
      width: 4000,
      height: 3000,
      alt: 'A CB400 Super Four, side on',
      caption: 'A Honda CB400 Super Four parked in Tokyo',
      credit: 'Rainmaker47, CC BY-SA 3.0, via Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg',
    },
  )
})

test('no hero image, or one without a credit, maps to null fields rather than failing', () => {
  assert.equal(mapArticleImage(null), null)
  assert.equal(mapArticleImage(undefined), null)
  const bare = mapArticleImage({ url: asset, width: 800, height: 600 })
  assert.equal(bare?.alt, '')
  assert.equal(bare?.credit, null)
  assert.equal(bare?.caption, null)
  assert.equal(mapArticleImage({ url: asset, width: 1, height: 1, caption: '  ' })?.caption, null)
  assert.equal(bare?.sourceUrl, null)
})
