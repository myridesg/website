import { SITE, STORE } from '@/consts'

type Entity = Record<string, unknown>

export const ORGANIZATION_PATH = '/#organization'
export const WEBSITE_PATH = '/#website'
/** The app entity's @id. Feature pages reference this exact id so their page
 * entities link to one canonical app definition rather than repeating it. */
export const APP_PATH = '/#app'

/**
 * The support address. Taken from the page the store listings point at
 * (src/pages/support.astro) and from myridesg-v2 apps/mobile/store.config.json
 * — not invented here.
 */
export const SUPPORT_EMAIL = 'hello@myridesg.com'

/**
 * What the app can do today, and nothing else. Kept in step with the FAQ copy
 * in src/lib/faq-items.ts and AGENTS.md rule 6: import, booking, rewards and
 * "verified" workshops are NOT live, so they must not appear here either.
 */
export const APP_FEATURES = [
  'Maintenance and service records',
  'Fuel, mileage and expense logging',
  'Push service and renewal reminders',
  'Road tax, COE and insurance expiry dates',
  'Export and share of the bike report',
  'Workshop directory and search',
  'Causeway camera images',
  'Fuel price comparison',
  'COE renewal calculator',
] as const

/** Serialises JSON-LD for an inline <script>: `<` and line separators cannot end it early. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** Absolute URL for a root-relative path (+ fragment) against the site origin. */
export function entityId(site: URL, path: string): string {
  return new URL(path, site).href
}

/** Root-relative "@id path" for a page's breadcrumb entity, e.g. '/guides/#breadcrumb'. */
export function breadcrumbPath(pagePath: string): string {
  return `${pagePath}#breadcrumb`
}

/** Root-relative "@id path" for a page's WebPage entity, e.g. '/guides/#webpage'. */
export function webPagePath(pagePath: string): string {
  return `${pagePath}#webpage`
}

/**
 * A BreadcrumbList for a page. The last crumb may omit href — it is the page
 * itself; the entity always points the final ListItem at the page URL so the
 * trail never dead-ends.
 */
export function breadcrumbEntity(
  site: URL,
  pagePath: string,
  crumbs: Array<{ name: string; href?: string }>,
): Entity {
  const items = crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: new URL(crumb.href ?? pagePath, site).href,
  }))
  return {
    '@type': 'BreadcrumbList',
    '@id': entityId(site, breadcrumbPath(pagePath)),
    itemListElement: items,
  }
}

/**
 * A FAQPage that hangs off the page whose visible FAQ it mirrors. It gets its
 * own @id under the page path and declares isPartOf that page's WebPage — the
 * FAQ is a section of the page here, not the page's main entity (that is the
 * app or tool), so isPartOf is the correct edge; mainEntityOfPage would claim
 * the whole page is primarily a FAQ.
 *
 * Callers must pass the same array they render, so the schema cannot drift
 * from the visible text.
 */
export function faqPageEntity(
  site: URL,
  pagePath: string,
  questions: ReadonlyArray<{ q: string; a: string }>,
): Entity {
  return {
    '@type': 'FAQPage',
    '@id': entityId(site, `${pagePath}#faq`),
    isPartOf: { '@id': entityId(site, webPagePath(pagePath)) },
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}

/**
 * The page's own WebPage (or a subtype — CollectionPage, ContactPage, …):
 * stable @id, canonical url, meta-matching name/description, language, a link
 * up to the WebSite, and — on every page except home — a breadcrumb ref.
 * `about`/`mainEntity` connect the page to the entities it describes.
 */
export function webPageEntity(
  site: URL,
  options: {
    path: string
    /** WebPage subtype, e.g. 'CollectionPage' or 'ContactPage'. */
    type?: string
    name: string
    description: string
    /** The entity the page is about (app, calculator, organization…). */
    about?: Entity
    /** The entity the page's main content IS (e.g. the web COE calculator). */
    mainEntity?: Entity
    /** primaryImageOfPage — only for pages with a real main image. */
    image?: Entity
    /** Only when the page itself states a modification date (legal pages). */
    dateModified?: string
  },
): Entity {
  const { path, type = 'WebPage', name, description, about, mainEntity, image, dateModified } = options
  return {
    '@type': type,
    '@id': entityId(site, webPagePath(path)),
    url: new URL(path, site).href,
    name,
    description,
    inLanguage: 'en-SG',
    isPartOf: { '@id': entityId(site, WEBSITE_PATH) },
    ...(path === '/' ? {} : { breadcrumb: { '@id': entityId(site, breadcrumbPath(path)) } }),
    ...(about ? { about } : {}),
    ...(mainEntity ? { mainEntity } : {}),
    ...(image ? { primaryImageOfPage: image } : {}),
    ...(dateModified ? { dateModified } : {}),
  }
}

/**
 * One @graph of the shared entities plus the page's own. A page entity with the
 * same @id as a shared one is dropped, so the shared definition stays canonical.
 */
export function buildGraph(site: URL, pageEntities: Entity[] = []) {
  const organizationId = new URL(ORGANIZATION_PATH, site).href
  const websiteId = new URL(WEBSITE_PATH, site).href
  const appId = new URL(APP_PATH, site).href

  const storeUrls = [STORE.ios, STORE.android]

  const shared: Entity[] = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE.name,
      // The publisher of record on /support/ and in the Terms.
      legalName: 'MYRIDESG PTE. LTD.',
      url: new URL('/', site).href,
      logo: {
        '@type': 'ImageObject',
        url: new URL('/myride-logo.png', site).href,
        // Verified against the file: public/myride-logo.png is 1024x1024.
        width: 1024,
        height: 1024,
      },
      description:
        'The company behind MyRideSG, a motorcycle app for Singapore riders: a maintenance tracker, fuel and expense log, and COE, road tax and service reminders on iOS and Android.',
      email: SUPPORT_EMAIL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SUPPORT_EMAIL,
        areaServed: 'SG',
        availableLanguage: 'en',
      },
      areaServed: { '@type': 'Country', name: 'Singapore' },
      // Only destinations that verifiably exist: the two store listings. There
      // are no company social profiles in either repo, so none are claimed.
      sameAs: storeUrls,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: SITE.name,
      url: new URL('/', site).href,
      inLanguage: 'en-SG',
      publisher: { '@id': organizationId },
    },
    {
      '@type': 'MobileApplication',
      '@id': appId,
      name: SITE.name,
      description: SITE.description,
      url: new URL('/', site).href,
      operatingSystem: 'iOS, Android',
      // applicationCategory takes a schema.org value. UtilitiesApplication is
      // the primary App Store category for this app (store.config.json in
      // myridesg-v2 lists UTILITIES first, then LIFESTYLE), and the product —
      // an ownership record-keeper — is a utility first.
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'Motorcycle maintenance',
      // Both store listings, under every property crawlers look for.
      installUrl: STORE.ios,
      downloadUrl: STORE.android,
      sameAs: storeUrls,
      // Core tracking is free today. States current pricing without "free
      // forever" (AGENTS.md rule 6). No aggregateRating and no reviews: those
      // are forbidden without verifiable evidence, which also means the app
      // will not qualify for Google's SoftwareApplication rich result —
      // accepted trade-off.
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'SGD',
        description:
          'Core tracking is free — servicing history, renewal dates, fuel logs and running costs. No payment details are required to create an account.',
      },
      publisher: { '@id': organizationId },
      author: { '@id': organizationId },
      inLanguage: 'en-SG',
      countriesSupported: 'SG',
      // The shipped app icon (public/icon-512x512.png, 512x512). There are no
      // screenshot image assets — the phone previews on the site are rendered
      // markup — so no screenshot property is claimed.
      image: {
        '@type': 'ImageObject',
        url: new URL('/icon-512x512.png', site).href,
        width: 512,
        height: 512,
      },
      // Live features only — see APP_FEATURES above.
      featureList: [...APP_FEATURES],
    },
  ]

  const taken = new Set(shared.map((entity) => entity['@id']))
  const own = pageEntities
    .filter((entity) => !taken.has(entity['@id']))
    .map(({ '@context': _context, ...entity }) => entity)

  return { '@context': 'https://schema.org', '@graph': [...shared, ...own] }
}
