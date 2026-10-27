import type { APIRoute, GetStaticPaths } from 'astro'

/**
 * IndexNow key file: Bing (and the other IndexNow engines) confirm ownership
 * of a submitted key by fetching /<key>.txt and matching its body exactly.
 *
 * The key is a build-time env var, read the same way src/lib/content.ts reads
 * the Sanity vars: shell first, import.meta.env second. With INDEXNOW_KEY
 * unset the route emits nothing and the build is unaffected, so no key is
 * ever committed here.
 */
function env(name: string): string | undefined {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name]
}

export const getStaticPaths = (() => {
  const key = env('INDEXNOW_KEY')?.trim()
  return key ? [{ params: { key } }] : []
}) satisfies GetStaticPaths

export const GET: APIRoute = ({ params }) =>
  new Response(params.key ?? '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
