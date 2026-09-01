/**
 * Site-wide constants. Anything that appears in more than one place, or that
 * differs between environments, belongs here rather than inline in a page.
 */

export const SITE = {
  name: 'MyRideSG',
  /** Used for <title> suffixes and og:site_name. */
  tagline: 'Your bike, sorted.',
  description:
    'Track servicing, running costs and renewal dates. Find trusted workshops when it is time to act. Built for Singapore riders.',
  locale: 'en_SG',
} as const

/**
 * Store links. Identifiers read from myridesg-v2:
 *   iOS      — apps/mobile/eas.json → submit.production.ios.ascAppId
 *   Android  — apps/mobile/app.config.ts → android.package
 */
export const STORE = {
  ios: 'https://apps.apple.com/app/id6788268752',
  android: 'https://play.google.com/store/apps/details?id=app.myridesg.android',
} as const

/**
 * Primary navigation. Kept flat — the marketing site is deliberately shallow.
 */
// TODO: add these back as each page lands — linking before then ships nav items
// that 404:
//   { label: 'Catalog', href: '/catalog' }  — needs the catalog index page
//   { label: 'Demo',    href: '/demo' }     — lives on feat/demo
export const NAV = [
  { label: 'Features', href: '/#features' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Guides', href: '/guides/' },
] as const
