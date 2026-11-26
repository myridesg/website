import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILD_IMAGE_MAX_WIDTH, forBuild } from './build-image.ts'

const photo = (width: number, height: number) => ({
  url: `https://cdn.sanity.io/images/p/d/abc-${width}x${height}.jpg`,
  width,
  height,
  alt: '',
  caption: null,
  credit: null,
  sourceUrl: null,
})

test('a photo wider than the cap is fetched at the cap, keeping its shape', () => {
  const { src, width, height } = forBuild(photo(4000, 3000))
  assert.equal(src, `https://cdn.sanity.io/images/p/d/abc-4000x3000.jpg?w=${BUILD_IMAGE_MAX_WIDTH}`)
  assert.equal(width, BUILD_IMAGE_MAX_WIDTH)
  assert.equal(height, 1200)
})

test('a smaller photo is fetched at its own size', () => {
  assert.deepEqual(forBuild(photo(1200, 800)), {
    src: 'https://cdn.sanity.io/images/p/d/abc-1200x800.jpg?w=1200',
    width: 1200,
    height: 800,
  })
})
