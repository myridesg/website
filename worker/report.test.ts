import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleReportRequest } from './report.ts'

const env = { SUPABASE_URL: 'https://db.example', SUPABASE_PUBLISHABLE_KEY: 'public-key' }

const active = {
  status: 'active',
  generated_at: '2026-07-23T16:30:00Z',
  revoked_at: null,
  snapshot: {
    bike: { make: 'Honda', model: 'CB400', year: 2019, odometer_km: 62720 },
    months_tracked: 14,
    counts: { services: 6, fuel: 40 },
    odometer_consistent: true,
    receipts_attached: 3,
    promptly: { within_days: 7, logged_promptly: 4, total: 6 },
  },
}

function database(body: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify(body), { status })
  }
  return { calls, fetchFn: fetchFn as typeof fetch }
}

const visit = (path: string, fetchFn: typeof fetch, method = 'GET') =>
  handleReportRequest(new Request(`https://myridesg.com${path}`, { method }), env, fetchFn)

test('looks the code up with its capital letters intact', async () => {
  const db = database(active)
  await visit('/r/AbC123xYz0', db.fetchFn)
  assert.equal(db.calls[0].url, 'https://db.example/rest/v1/rpc/get_ownership_report')
  assert.deepEqual(JSON.parse(String(db.calls[0].init.body)), { p_short_code: 'AbC123xYz0' })
  assert.equal(new Headers(db.calls[0].init.headers).get('apikey'), 'public-key')
})

test('accepts the address with a trailing slash', async () => {
  const db = database(active)
  const res = await visit('/r/AbC123xYz0/', db.fetchFn)
  assert.equal(res.status, 200)
  assert.deepEqual(JSON.parse(String(db.calls[0].init.body)), { p_short_code: 'AbC123xYz0' })
})

test('shows what the paper can be checked against', async () => {
  const html = await (await visit('/r/AbC123xYz0', database(active).fetchFn)).text()
  for (const expected of ['Honda CB400', '2019', '6 services', '40 fuel logs', '14 months', '62,720 km',
    '3 receipts attached', '4 of 6 services logged within 7 days', 'Odometer consistent']) {
    assert.ok(html.includes(expected), `missing: ${expected}`)
  }
})

test('dates the record in Singapore time', async () => {
  const html = await (await visit('/r/AbC123xYz0', database(active).fetchFn)).text()
  assert.ok(html.includes('24 Jul 2026'))
})

test('claims only what the record can prove', async () => {
  const html = await (await visit('/r/AbC123xYz0', database(active).fetchFn)).text()
  assert.ok(html.includes('Real MyRideSG record.'))
  assert.ok(html.includes('not checked by anyone'))
  assert.ok(!html.includes('Genuine passport'))
})

test('says so when odometer readings conflict', async () => {
  const conflicted = { ...active, snapshot: { ...active.snapshot, odometer_consistent: false } }
  const html = await (await visit('/r/AbC123xYz0', database(conflicted).fetchFn)).text()
  assert.ok(html.includes('Odometer readings conflict'))
  assert.ok(!html.includes('Odometer consistent'))
})

test('leaves out a missing odometer rather than printing a bare unit', async () => {
  const bike = { ...active.snapshot.bike, odometer_km: null }
  const html = await (await visit('/r/AbC123xYz0', database({ ...active, snapshot: { ...active.snapshot, bike } }).fetchFn)).text()
  assert.ok(!html.includes('last odometer'))
})

test('hides the promptness line when no services were logged', async () => {
  const promptly = { within_days: 7, logged_promptly: 0, total: 0 }
  const html = await (await visit('/r/AbC123xYz0', database({ ...active, snapshot: { ...active.snapshot, promptly } }).fetchFn)).text()
  assert.ok(!html.includes('services logged within'))
})

test('escapes rider-entered text so it cannot become markup', async () => {
  const bike = { ...active.snapshot.bike, make: '<script>alert(1)</script>', model: 'A&B' }
  const html = await (await visit('/r/AbC123xYz0', database({ ...active, snapshot: { ...active.snapshot, bike } }).fetchFn)).text()
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('A&amp;B'))
})

test('tells the buyer a revoked passport is no longer valid', async () => {
  const res = await visit('/r/AbC123xYz0', database({ status: 'revoked', revoked_at: '2026-08-01T02:00:00Z' }).fetchFn)
  const html = await res.text()
  assert.equal(res.status, 200)
  assert.ok(html.includes('revoked by the owner on 1 Aug 2026'))
  assert.ok(!html.includes('Real MyRideSG record.'))
})

test('answers an unknown code with not found and sends the buyer to the seller', async () => {
  const res = await visit('/r/AbC123xYz0', database(null).fetchFn)
  const html = await res.text()
  assert.equal(res.status, 404)
  assert.ok(html.includes('No passport found for this code.'))
  assert.ok(html.includes('ask the seller'))
})

test('never reaches the database for something that cannot be a code', async () => {
  for (const path of ['/r/', '/r/abc-def', '/r/abc/def', '/r/%3Cscript%3E', `/r/${'a'.repeat(65)}`]) {
    const db = database(active)
    const res = await visit(path, db.fetchFn)
    assert.equal(res.status, 404, path)
    assert.equal(db.calls.length, 0, path)
  }
})

test('a database failure asks the buyer to retry and does not read as fake', async () => {
  const res = await visit('/r/AbC123xYz0', database({ message: 'down' }, 500).fetchFn)
  const html = await res.text()
  assert.equal(res.status, 503)
  assert.ok(html.includes('try again later'))
  assert.ok(html.includes('does not mean the document is fake'))
  assert.ok(!html.includes('No passport found'))
})

test('a network failure also asks the buyer to retry', async () => {
  const offline = (async () => { throw new Error('offline') }) as typeof fetch
  const res = await visit('/r/AbC123xYz0', offline)
  assert.equal(res.status, 503)
})

test('an unexpected database answer is treated as a failure', async () => {
  const res = await visit('/r/AbC123xYz0', database({ status: 'surprise' }).fetchFn)
  assert.equal(res.status, 503)
})

test('every answer stays out of search results and caches', async () => {
  for (const body of [active, null, { status: 'revoked', revoked_at: '2026-08-01T02:00:00Z' }]) {
    const res = await visit('/r/AbC123xYz0', database(body).fetchFn)
    const html = await res.text()
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow')
    assert.equal(res.headers.get('cache-control'), 'no-store')
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'))
  }
})

test('the code in the address is not leaked to other sites', async () => {
  const res = await visit('/r/AbC123xYz0', database(active).fetchFn)
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer')
  const csp = res.headers.get('content-security-policy') ?? ''
  assert.ok(csp.includes("default-src 'none'"))
  assert.ok(csp.includes("frame-ancestors 'none'"))
  assert.ok(!(await res.text()).includes('<script'))
})

test('answers HEAD without a body and refuses other methods', async () => {
  const head = await visit('/r/AbC123xYz0', database(active).fetchFn, 'HEAD')
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  const db = database(active)
  const post = await visit('/r/AbC123xYz0', db.fetchFn, 'POST')
  assert.equal(post.status, 405)
  assert.equal(post.headers.get('allow'), 'GET, HEAD')
  assert.equal(db.calls.length, 0)
})
