export type Store = 'ios' | 'android'

export type LinkLike = {
  href: string
  closest(selector: string): { dataset: { analyticsLocation?: string } } | null
}

const STORE_HOSTS: Record<string, Store> = {
  'apps.apple.com': 'ios',
  'testflight.apple.com': 'ios',
  'play.google.com': 'android',
}

export function storeFromHref(href: string): Store | null {
  try {
    return STORE_HOSTS[new URL(href).hostname] ?? null
  } catch {
    return null
  }
}

export function storeClickProps(link: LinkLike): { store: Store; location: string } | null {
  const store = storeFromHref(link.href)
  if (!store) return null
  const location = link.closest('[data-analytics-location]')?.dataset.analyticsLocation ?? 'page'
  return { store, location }
}

export function guideSlug(pathname: string): string | null {
  return pathname.match(/^\/guides\/([^/]+)\/?$/)?.[1] ?? null
}
