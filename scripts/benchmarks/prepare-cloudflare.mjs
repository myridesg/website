import assert from 'node:assert/strict'
import { realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Prepare only a retained benchmark copy, never the actual website checkout.
const sandbox = await realpath(process.argv[2])
assert.ok(path.basename(sandbox).startsWith('myridesg-guide-benchmark-'))
const root = fileURLToPath(new URL('../../', import.meta.url))
assert.notEqual(sandbox, await realpath(root))
// Pin a date supported by the installed adapter's local workerd. Compatibility
// dates select runtime behaviour; a fixed baseline keeps repeat runs comparable.
const date = '2026-08-28'
await writeFile(path.join(sandbox, 'wrangler.json'), JSON.stringify({
  name: 'myridesg-local-benchmark', compatibility_date: date,
  compatibility_flags: ['nodejs_compat'], assets: { binding: 'ASSETS' },
}, null, 2) + '\n')
await writeFile(path.join(sandbox, 'astro.cloudflare.config.mjs'), `import base from ${JSON.stringify(new URL('../../astro.config.mjs', import.meta.url).href)}
import cloudflare from '@astrojs/cloudflare'
export default {
  ...base, root: new URL('./', import.meta.url).pathname, output: 'server', session: false,
  outDir: './dist-cloudflare', cacheDir: './.astro-cache-cloudflare', integrations: [],
  adapter: cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
  vite: { ...base.vite, cacheDir: './.vite-cache-cloudflare' },
}
`)
console.log(`Prepared local Cloudflare copy (${date} compatibility): ${sandbox}`)
