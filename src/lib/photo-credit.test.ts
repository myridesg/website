import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePhotoCredit } from './photo-credit.ts'

test('a Wikimedia credit splits into author, licence and the rest', () => {
  assert.deepEqual(parsePhotoCredit('Rainmaker47, CC BY-SA 3.0, via Wikimedia Commons'), {
    author: 'Rainmaker47',
    licence: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' },
    rest: ', via Wikimedia Commons',
  })
})

test('every licence the guides use links to its own deed', () => {
  const url = (credit: string) => parsePhotoCredit(credit).licence?.url
  assert.equal(url('Malsa, CC BY-SA 1.0, via Wikimedia Commons'), 'https://creativecommons.org/licenses/by-sa/1.0/')
  assert.equal(url('Terence Ong, CC BY 2.5, via Wikimedia Commons'), 'https://creativecommons.org/licenses/by/2.5/')
  assert.equal(url('Trougnouf, CC BY 4.0, via Wikimedia Commons'), 'https://creativecommons.org/licenses/by/4.0/')
  assert.equal(url('Someone, CC0 1.0'), 'https://creativecommons.org/publicdomain/zero/1.0/')
})

test('a credit with no CC licence stays whole', () => {
  for (const credit of ['Lucas T. on Unsplash', 'Joel Diller, U.S. Navy, public domain, via Wikimedia Commons']) {
    assert.deepEqual(parsePhotoCredit(credit), { author: credit, licence: null, rest: '' })
  }
})

test('a CC credit in a form the site cannot link fails rather than losing its licence', () => {
  assert.throws(() => parsePhotoCredit('Someone, CC-BY-SA 3.0'), /cannot link/)
  assert.throws(() => parsePhotoCredit('Someone, Creative Commons Attribution'), /cannot link/)
})
