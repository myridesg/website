import { readFile, writeFile } from 'node:fs/promises'

// One-to-one aliases from the former public site's router. Bike catalog pages
// have no equivalent here yet and must not redirect to an unrelated guide.
const LEGACY_GUIDES = {
  'motorcycle-workshops-singapore': 'workshops-singapore',
  'singapore-petrol-prices': 'petrol-prices-singapore',
  'motorcycle-engine-problems-singapore': 'motorcycle-engine-problems',
  'motorcycle-brake-problems-singapore': 'motorcycle-brakes-problems-singapore',
  'honda-cb400-problems-singapore': 'honda-cb400-problems',
  'honda-pcx-problems-singapore': 'honda-pcx-problems',
  'yamaha-mt07-problems-singapore': 'yamaha-mt07-problems',
  'yamaha-nmax-problems-singapore': 'yamaha-nmax-problems',
  'kawasaki-ninja-problems-singapore': 'kawasaki-ninja-problems',
  'royal-enfield-problems-singapore': 'royal-enfield-problems',
  'vespa-problems-singapore': 'vespa-problems',
  'honda-wave-problems-singapore': 'honda-wave-problems',
  'yamaha-y15zr-problems-singapore': 'yamaha-y15zr-problems',
}

const UNCHANGED_GUIDE_SLUGS = [
  'motorcycle-maintenance-singapore', 'free-motorcycle-parking-singapore',
  'motorcycle-wont-start-singapore', 'motorcycle-chain-maintenance-singapore',
  'motorcycle-tyres-singapore', 'motorcycle-insurance-singapore',
  'motorcycle-coe-singapore', 'motorcycle-licence-singapore',
  'motorcycle-electrical-problems-singapore', 'motorcycle-oil-change-singapore',
  'motorcycle-accident-singapore', 'motorcycle-suspension-singapore',
  'motorcycle-modification-singapore', 'motorcycle-scratch-repair-singapore',
  'best-motorcycles-singapore', 'motorcycle-road-tax-singapore',
]

/** @returns {import('astro').AstroIntegration} */
export default function legacyGuideRedirects() {
  return {
    name: 'legacy-guide-redirects',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const aliases = [
          ...Object.entries(LEGACY_GUIDES),
          ...UNCHANGED_GUIDE_SLUGS.map((slug) => [slug, slug]),
        ]
        const rules = []
        for (const [old, slug] of aliases) {
          let html
          try {
            html = await readFile(new URL(`guides/${slug}/index.html`, dir), 'utf8')
          } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue
            throw error
          }
          if (/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html)) continue
          rules.push(`/${old} /guides/${slug}/ 301`, `/${old}/ /guides/${slug}/ 301`)
        }
        // Netlify reads this file natively. Rules only target pages emitted by
        // this build, so CMS-less previews never redirect into absent guides.
        await writeFile(new URL('_redirects', dir), `# Legacy guide URLs; generated from built pages.\n${rules.join('\n')}\n`)
      },
    },
  }
}
