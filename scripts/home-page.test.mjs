import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'

const html = () => readFileSync('dist/index.html', 'utf8')
const jsonLd = () => [...html().matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('')

test('built page: is the home page, open to search', () => {
  assert.doesNotMatch(html(), /<meta name="robots"[^>]*noindex/)
  assert.match(readFileSync('dist/sitemap-0.xml', 'utf8'), /<loc>https?:\/\/[^/<]+\/<\/loc>/, 'the sitemap lists /')
  assert.ok(!existsSync('dist/lab'), 'no lab pages are built')
})

test('built page: keeps the home page title', () => {
  assert.ok(html().includes('<title>Motorcycle App Singapore | Service, Fuel &amp; COE — MyRideSG</title>'))
})

test('built page: the JSON-LD carries the FAQPage, once', () => {
  assert.equal((jsonLd().match(/"FAQPage"/g) ?? []).length, 1)
})

test('built page: the footer invites workshops to get listed', () => {
  const footer = html().split('<footer')[1].split('</footer>')[0]
  assert.match(footer, /<a\b[^>]*>[^<]*Get listed[^<]*<\/a>/)
})

test('built page: the header carries Get the app, and nothing is fixed to the bottom', () => {
  const header = html().split('<header')[1].split('</header>')[0]
  assert.match(header, /aria-label="Primary"/)
  assert.match(header, /data-store-link[^>]*>Get the app<\/a>/)
  assert.doesNotMatch(html(), /data-home-bar/)
})

test('built page: part 1 says the promise', () => {
  const h = html()
  assert.match(h, /<section[^>]*id="promise"/)
  assert.equal((h.match(/<h1/g) ?? []).length, 1)
  assert.ok(h.includes('One app for Singapore riders.'))
  assert.ok(h.includes('>Made in Singapore<'))
})

test('built page: store buttons come before the opening picture', () => {
  const part = html().split('id="promise"')[1].split('</section>')[0]
  assert.ok(part.indexOf('apps.apple.com') < part.indexOf('data-stage'))
  assert.ok(part.indexOf('play.google.com') < part.indexOf('data-stage'))
})

test('built page: no heavy images', () => {
  for (const src of html().matchAll(/(?:src|srcset)="(\/_astro\/[^" ,]+)/g)) {
    const file = `dist${src[1]}`
    if (existsSync(file)) assert.ok(statSync(file).size <= 200_000, `${src[1]} is over 200 KB`)
  }
})

test('built page: images reserve their space', () => {
  for (const img of html().matchAll(/<img\b[^>]*>/g)) assert.match(img[0], /\bwidth="\d+"[^>]*\bheight="\d+"|\bheight="\d+"[^>]*\bwidth="\d+"/)
})

test('built page: part 2 is three steps, in order, between parts 1 and 3', () => {
  const h = html()
  assert.ok(h.indexOf('id="promise"') < h.indexOf('id="how-it-works"'))
  assert.ok(h.indexOf('id="how-it-works"') < h.indexOf('id="never-miss"'))
  const part = h.split('id="how-it-works"')[1].split('</section>')[0]
  assert.ok(part.includes('Three steps to get sorted.'))
  const items = [...part.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1])
  assert.equal(items.length, 3)
  ;['Add your bike', 'Snap as you go', 'Get reminded'].forEach((label, i) => assert.ok(items[i].includes(label), `step ${i + 1} is "${label}"`))
})

const partThree = () => html().split('id="never-miss"')[1].split('</section>')[0]

test('built page: part 3 is the lead', () => {
  const part = partThree()
  assert.ok(part.includes('Always know what your bike needs next.'))
  assert.match(part, /remind you before it/)
  assert.ok(part.includes('Sample data'))
})

test('built page: part 3 is one ordered list of all seven, nearest due first', () => {
  const part = partThree()
  assert.equal((part.match(/<ol\b/g) ?? []).length, 1)
  assert.match(part, /<ol[^>]*class="needs"[^>]*role="list"|<ol[^>]*role="list"[^>]*class="needs"/)
  assert.equal((part.match(/<li[^>]*data-kind=/g) ?? []).length, 7)
  const order = ['Chain lube', 'Road tax', 'Oil change', 'Brake pads', 'Insurance', 'Tyres', 'COE']
  const at = order.map((label) => part.indexOf(`>${label}<`))
  at.forEach((i, n) => assert.ok(i > 0, `${order[n]} is in the list`))
  assert.deepEqual([...at].sort((a, b) => a - b), at)
})

test('built page: part 3 tells jobs from renewals by shape and in words', () => {
  const part = partThree()
  const items = [...part.matchAll(/<li[^>]*data-kind="(job|renewal)"[^>]*>([\s\S]*?)<\/li>/g)]
  assert.equal(items.length, 7)
  for (const [, kind, inner] of items) {
    assert.match(inner, new RegExp(`need__mark--${kind === 'job' ? 'round' : 'square'}`))
    assert.match(inner, new RegExp(`class="sr-only"[^>]*>${kind}:`))
  }
  assert.equal(items.filter(([, kind]) => kind === 'job').length, 4)
})

const part = (id) => html().split(`id="${id}"`)[1].split('</section>')[0]
const textOf = (fragment) => fragment.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

test('built page: parts 4 to 6 follow part 3, in order', () => {
  const h = html()
  const at = ['never-miss', 'costs', 'singapore', 'history'].map((id) => h.indexOf(`id="${id}"`))
  at.forEach((i, n) => assert.ok(i > 0, `part ${n + 3} is on the page`))
  assert.deepEqual([...at].sort((a, b) => a - b), at)
})

test('built page: part 4 shows six months of sample costs', () => {
  const p = part('costs')
  assert.ok(p.includes('Know what your bike really costs.'))
  assert.ok(p.includes('Fuel, Johor fill-ups, parts and everything else, by month.'))
  assert.equal((p.match(/data-month=/g) ?? []).length, 6)
  assert.ok(p.includes('Sample data'))
  const h = html()
  assert.ok(!h.includes('Cheapest RON95 nearby'))
  assert.ok(!h.includes('>Soon<'))
})

test('built page: part 5 is the four Singapore tools, in order', () => {
  const p = part('singapore')
  assert.ok(p.includes('Made for riding in Singapore.'))
  const links = [...p.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  assert.deepEqual(
    links.map((m) => m[1]),
    ['/rider-tools/#fuel-prices', '/rider-tools/#causeway-cams', '/motorcycle-coe-calculator/', '/motorcycle-workshop-directory/'],
  )
  // The build writes an empty alt as a bare `alt`.
  for (const [, href, inner] of links) assert.match(inner, /<img\b[^>]*\salt(?:="")?[\s>]/, `${href} has a decorative icon`)
})

test('built page: part 6 shows the bike passport', () => {
  const p = part('history')
  assert.ok(p.includes('A history a buyer can check.'))
  assert.ok(p.includes('Your records become a bike passport with a QR code.'))
  assert.match(p, /data-passport/)
})

test('built page: the words drawn in parts 4 to 6 pass the claim rules', async () => {
  const { findBannedClaims } = await import('./check-claims.mjs')
  for (const id of ['costs', 'singapore', 'history']) assert.deepEqual(findBannedClaims(textOf(part(id))), [], id)
})

test('built page: parts 7 to 9 follow part 6, in order, and the trust band is gone', () => {
  const h = html()
  const at = ['history', 'next', 'detail', 'download'].map((id) => h.indexOf(`id="${id}"`))
  at.forEach((i, n) => assert.ok(i > 0, `part ${n + 6} is on the page`))
  assert.deepEqual([...at].sort((a, b) => a - b), at)
  assert.doesNotMatch(h, /\bid="trust"/)
})

// Owner decision, 22 Nov 2026: four things in the works, not two.
test('built page: part 7 is four things in the works, with no dates', async () => {
  const { findBannedClaims } = await import('./check-claims.mjs')
  const p = part('next')
  assert.ok(p.includes("And we&#39;re not done.") || p.includes("And we're not done."))
  assert.equal((p.match(/<li\b[^>]*data-card=/g) ?? []).length, 4)
  const cards = [...p.matchAll(/<li\b[^>]*data-card="([^"]+)"[^>]*>([\s\S]*?)<\/li>\s*(?=<li\b[^>]*data-card=|<\/ul>)/g)]
  assert.deepEqual(cards.map((m) => m[1]), ['Map', 'Community', 'Guides', 'Weather'])
  for (const [, title, inner] of cards) {
    assert.match(inner, new RegExp(`<h3[^>]*>${title}</h3>`))
    assert.ok(inner.includes('In the works'), `${title} says it is in the works`)
  }
  assert.doesNotMatch(textOf(p), /\b20\d\d\b|\bsoon\b|Q[1-4]\b/i)
  assert.deepEqual(findBannedClaims(textOf(p)), [])
})

// Owner decision, 22 Nov 2026: the open feature list was too many words. It
// is now the first row of the questions, closed like the others, and not
// part of the FAQ data.
const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
// The question rows only: the "Show more" fold is a <details> of its own.
const accordion = (p) => [...p.matchAll(/<details\b([^>]*\bclass="faq"[^>]*)>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
// The fold: its opening tag's attributes, its summary text, and what follows.
const fold = (p) => p.match(/<details\b([^>]*\bfaqs__more\b[^>]*)>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*)/)

test('built page: part 8 has no open feature list; its first row holds every feature', async () => {
  const { DETAIL } = await import('../src/lib/home-content.ts')
  const p = part('detail')
  // part() starts inside the section's own tag: drop the rest of it.
  const outside = p
    .replace(/^[^>]*>/, '')
    .replace(/<details\b[^>]*\bclass="faq"[\s\S]*?<\/details>/g, '')
    .replace(/<summary\b[^>]*\bfaqs__more-q\b[\s\S]*?<\/summary>/, '')
  assert.equal(unescape(textOf(outside)).trim(), DETAIL.faqHeading, 'only the heading is outside the accordion')
  assert.doesNotMatch(outside, /<(ul|h3)\b/, 'no feature grid outside the accordion')
  const [first] = accordion(p)
  assert.equal(unescape(textOf(first[2])).trim(), DETAIL.featuresQuestion)
  const body = unescape(textOf(first[3]))
  for (const group of DETAIL.groups) {
    assert.match(first[3], new RegExp(`<h3[^>]*>${group.title}</h3>`), group.title)
    for (const item of group.items) assert.ok(body.includes(item), item)
  }
})

test('built page: part 8 is one accordion, all closed, one name, each question in its own row', async () => {
  const { DETAIL } = await import('../src/lib/home-content.ts')
  const { FAQ_ITEMS } = await import('../src/lib/faq-items.ts')
  const p = part('detail')
  const rows = accordion(p)
  assert.equal(rows.length, FAQ_ITEMS.length + 1)
  assert.equal((p.match(/<details\b/g) ?? []).length, FAQ_ITEMS.length + 2, 'the rows and the fold')
  const names = new Set()
  rows.forEach(([, attrs], i) => {
    assert.doesNotMatch(attrs, /\bopen\b/, `row ${i + 1} is closed`)
    const name = attrs.match(/\bname="([^"]+)"/)
    assert.ok(name, `row ${i + 1} has a name`)
    names.add(name[1])
  })
  assert.equal(names.size, 1, 'every row shares one name')
  rows.slice(1).forEach(([, , summary, body], i) => {
    assert.equal(unescape(textOf(summary)).trim(), FAQ_ITEMS[i].q)
    assert.equal(unescape(textOf(body)).trim(), FAQ_ITEMS[i].a)
  })
  const ld = jsonLd()
  assert.ok(ld.includes('FAQPage'), 'the FAQPage data is there')
  assert.ok(!ld.includes(DETAIL.featuresQuestion), 'the features row is not FAQPage data')
})

test('built page: part 9 asks for the download, with the one quiet note', () => {
  const p = part('download')
  assert.ok(p.includes('Ride more. Worry less.'))
  assert.ok(textOf(p).includes('Free to download and use. Your records are yours.'))
  assert.ok(p.includes('apps.apple.com'))
  assert.ok(p.includes('play.google.com'))
})

test('built page: the words drawn in parts 7 to 9 pass the claim rules', async () => {
  const { findBannedClaims } = await import('./check-claims.mjs')
  for (const id of ['next', 'detail', 'download']) assert.deepEqual(findBannedClaims(textOf(part(id))), [], id)
})

// Owner decision, 27 Nov 2026: thirteen rows ran past a screen.
test('built page: part 8 shows the first rows and folds the rest under one closed row', async () => {
  const { DETAIL } = await import('../src/lib/home-content.ts')
  const { FAQ_ITEMS } = await import('../src/lib/faq-items.ts')
  const p = part('detail')
  const more = fold(p)
  assert.ok(more, 'there is a fold')
  const [, attrs, label, after] = more
  const before = p.slice(0, more.index)
  assert.equal(accordion(before).length, DETAIL.questionsShown + 1, 'the features row, then the shown questions')
  const hidden = FAQ_ITEMS.length - DETAIL.questionsShown
  assert.equal(accordion(after).length, hidden)
  assert.doesNotMatch(attrs, /\bopen\b/, 'the fold starts closed')
  assert.equal(unescape(textOf(label)).trim(), DETAIL.moreQuestions(hidden))
  assert.ok(jsonLd().includes(FAQ_ITEMS.at(-1).q), 'folded questions stay in the FAQPage data')
})

test('built page: every store button sits in a named place', () => {
  for (const place of ['header', 'hero', 'finale', 'footer']) {
    assert.match(html(), new RegExp(`data-analytics-location="${place}"`), place)
  }
})

test('built page: with no key, no analytics code is shipped', () => {
  // This site inlines its scripts, so dist/_astro alone could stay clean while
  // the code rode in the HTML. Check both. The CSP <meta> is set aside: it names
  // the PostHog hosts on every build, key or no key.
  const shipped = readdirSync('dist/_astro').filter((f) => f.endsWith('.js'))
  for (const file of shipped) {
    assert.doesNotMatch(readFileSync(`dist/_astro/${file}`, 'utf8'), /posthog/i, file)
  }
  assert.doesNotMatch(html().replace(/<meta http-equiv="content-security-policy"[^>]*>/i, ''), /posthog/i)
})
