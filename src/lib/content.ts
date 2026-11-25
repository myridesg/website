/**
 * Wires the vendored Sanity repository to this site's environment. Mirrors
 * apps/web/lib/sanity-client.ts + repositories.ts in myridesg-v2, minus the
 * Next-specific parts (no `server-only`, no lazy Proxy — a static build reads
 * env once, at build time, and there is no request to defer to).
 *
 * Env vars — the v2 names without the NEXT_PUBLIC_ prefix, which only meant
 * something to Next. Set them in .env for local work, or in the build
 * environment for a deploy. See .env.example.
 *
 *   SANITY_PROJECT_ID      required   v2: NEXT_PUBLIC_SANITY_PROJECT_ID
 *   SANITY_DATASET         required   v2: NEXT_PUBLIC_SANITY_DATASET
 *   SANITY_API_VERSION     optional   defaults to the v2 pin below
 *   SANITY_API_READ_TOKEN  optional   only for a private dataset or drafts
 *
 * Sanity is OPTIONAL. With nothing configured the build still succeeds and
 * /guides renders its empty state — preview deploys and fresh checkouts are
 * first-class, exactly as they are in the monorepo.
 */

import { makeSanityClient } from '@/content/sanity/client'
import {
  SanityContentRepository,
  emptyContentRepository,
} from '@/content/sanity/content-repository'
import type { ContentRepository } from '@/content/entities'
import type { ArticleDoc } from '@/content/sanity/mappers'
import { readFileSync } from 'node:fs'
import { fixtureContentRepository } from './content-fixture'

/**
 * Shell environment first so CI can inject secrets without writing a file;
 * import.meta.env second so a local .env still works. Astro loads .env into
 * import.meta.env but does not copy arbitrary shell vars there.
 */
function env(name: string): string | undefined {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name]
}

const projectId = env('SANITY_PROJECT_ID')
const dataset = env('SANITY_DATASET')

/** Both are required; a project without a dataset cannot resolve a query. */
export const isSanityConfigured = Boolean(projectId && dataset)

// Tests and local review only: build the guides from a JSON file instead of
// Sanity. Never set in a deploy.
const fixturePath = env('GUIDES_FIXTURE')

export const contentRepo: ContentRepository = fixturePath
  ? fixtureContentRepository(JSON.parse(readFileSync(fixturePath, 'utf8')) as ArticleDoc[])
  : isSanityConfigured
  ? new SanityContentRepository(
      makeSanityClient({
        projectId: projectId!,
        dataset: dataset!,
        // Pinned in v2 as SANITY_API_VERSION's default. A GROQ API version is
        // a date, and floating it would let Sanity change query semantics
        // under a build that nobody touched.
        apiVersion: env('SANITY_API_VERSION') ?? '2025-05-24',
        token: env('SANITY_API_READ_TOKEN'),
      }),
    )
  : emptyContentRepository

if (fixturePath) {
  console.warn(`[content] GUIDES_FIXTURE is set — building guides from ${fixturePath}, not Sanity.`)
} else if (!isSanityConfigured) {
  // Loud on purpose. An empty /guides that nobody notices in the build log is
  // how a site ships with its content silently missing.
  console.warn(
    '[content] SANITY_PROJECT_ID / SANITY_DATASET are not set — /guides will build empty.',
  )
}
