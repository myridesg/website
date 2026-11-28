import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const client = readFileSync('src/scripts/analytics.ts', 'utf8')
const config = readFileSync('astro.config.mjs', 'utf8')
const consts = readFileSync('src/consts.ts', 'utf8')

test('analytics loads no script from another origin', () => {
  assert.match(client, /posthog-js\/dist\/module\.no-external/)
  assert.doesNotMatch(client, /from 'posthog-js'/)
  assert.match(client, /disable_external_dependency_loading: true/)
})

test('analytics keeps its privacy settings', () => {
  for (const setting of [
    "cookieless_mode: 'always'",
    "person_profiles: 'never'",
    'autocapture: false',
    'disable_session_recording: true',
  ]) assert.ok(client.includes(setting), setting)
})

test('the CSP allows the host the site sends to, and only PostHog', () => {
  const host = consts.match(/POSTHOG_HOST = '([^']+)'/)[1]
  const connect = config.match(/"connect-src ([^"]+)"/)[1]
  assert.equal(connect, `'self' ${host} ${host.replace('://eu.', '://eu-assets.')}`)
})
