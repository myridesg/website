// What a buyer sees after scanning the QR code on a bike passport PDF. Printed
// codes last for years, so every /r/<code> address must keep answering. It reads
// the database on each visit because a rider can revoke a passport at any time,
// which is why this page cannot be prerendered like the rest of the site.

export type ReportEnv = { SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string }

type ActiveReport = {
  status: 'active'
  generated_at: string
  snapshot: {
    bike: { make: string | null; model: string | null; year: number | null; odometer_km: number | null }
    months_tracked: number
    counts: { services: number; fuel: number }
    odometer_consistent: boolean
    receipts_attached: number
    promptly: { within_days: number; logged_promptly: number; total: number }
  }
}
type RevokedReport = { status: 'revoked'; revoked_at: string }
type Report = ActiveReport | RevokedReport | null

// Codes are case-sensitive base62 (app.gen_report_code), so case must survive.
// The length allows for longer codes later without letting junk reach the database.
const REPORT_PATH = /^\/r\/([A-Za-z0-9]{1,64})\/?$/

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  // Revoking has to take effect at once.
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  // The code is the only thing protecting the page, so it must not travel in a Referer.
  'Referrer-Policy': 'no-referrer',
  // public/_headers covers static assets only, so the same set is repeated here.
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
}

export async function handleReportRequest(
  request: Request,
  env: ReportEnv,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, HEAD' } })
  }
  const code = REPORT_PATH.exec(new URL(request.url).pathname)?.[1]
  const { status, body } = code ? await answerFor(code, env, fetchFn) : { status: 404, body: notFound() }
  return new Response(request.method === 'HEAD' ? null : page(body), { status, headers: HEADERS })
}

async function answerFor(code: string, env: ReportEnv, fetchFn: typeof fetch) {
  try {
    const report = await fetchReport(code, env, fetchFn)
    if (report === null) return { status: 404, body: notFound() }
    return { status: 200, body: report.status === 'revoked' ? revoked(report) : active(report) }
  } catch (error) {
    console.error('report lookup failed', error)
    return { status: 503, body: unavailable() }
  }
}

async function fetchReport(code: string, env: ReportEnv, fetchFn: typeof fetch): Promise<Report> {
  const response = await fetchFn(`${env.SUPABASE_URL}/rest/v1/rpc/get_ownership_report`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_short_code: code }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`get_ownership_report answered ${response.status}`)
  const report = (await response.json()) as Report
  if (report !== null && report.status !== 'active' && report.status !== 'revoked') {
    throw new Error('get_ownership_report returned an unknown status')
  }
  return report
}

function active({ generated_at, snapshot: s }: ActiveReport): string {
  const name = [s.bike.make, s.bike.model].filter(Boolean).join(' ')
  const facts = [
    count(s.counts.services, 'service'),
    count(s.counts.fuel, 'fuel log'),
    `tracked ${count(s.months_tracked, 'month')}`,
    ...(s.bike.odometer_km == null ? [] : [`last odometer ${s.bike.odometer_km.toLocaleString('en-SG')} km`]),
  ]
  const { logged_promptly, total, within_days } = s.promptly
  const checks = [
    s.odometer_consistent ? 'Odometer consistent' : 'Odometer readings conflict',
    `${count(s.receipts_attached, 'receipt')} attached`,
    ...(total > 0 ? [`${logged_promptly} of ${total} services logged within ${within_days} days`] : []),
    'Owner-logged data',
  ]
  return `<div class="notice"><strong>Real MyRideSG record.</strong> Unchanged since ${date(generated_at)}. Entered by the owner and not checked by anyone.</div>
    <h1>${escapeHtml(name)}${s.bike.year == null ? '' : ` · ${s.bike.year}`}</h1>
    <p>${facts.join(' · ')}</p>
    <ul>${checks.map((check) => `<li>${check}</li>`).join('')}</ul>
    <p class="small">Owner-logged records, not an independently attested history. Verify COE and inspection status on OneMotoring, and consider a neutral workshop inspection before purchase.</p>`
}

function revoked({ revoked_at }: RevokedReport): string {
  return `<div class="notice warn">This passport was revoked by the owner on ${date(revoked_at)}. It is no longer valid.</div>`
}

function notFound(): string {
  return `<p><strong>No passport found for this code.</strong></p>
    <p>Check the address matches the paper exactly, including capital letters, then ask the seller.</p>`
}

function unavailable(): string {
  return `<p><strong>We couldn't check this passport right now.</strong></p>
    <p>Please try again later. This does not mean the document is fake.</p>`
}

function page(body: string): string {
  return `<!doctype html>
<html lang="en-SG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Bike passport | MyRideSG</title>
<style>
  body { margin: 0; background: #ffffff; color: #202126; font: 16px/1.6 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 520px; margin: 0 auto; padding: 24px 16px; }
  .brand { margin: 0 0 16px; font-weight: 700; }
  .notice { margin-bottom: 16px; padding: 12px; border-radius: 10px; background: #f0f1f3; }
  .warn { background: #f4e9e7; color: #9b0f06; }
  h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.25; }
  .small { color: #6f7178; font-size: 13px; }
</style>
</head>
<body>
<main>
  <p class="brand">MyRideSG</p>
  ${body}
</main>
</body>
</html>`
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function date(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
