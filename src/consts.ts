/**
 * Site-wide constants. Anything that appears in more than one place, or that
 * differs between environments, belongs here rather than inline in a page.
 */

export const SITE = {
  name: 'MyRideSG',
  /** Used for <title> suffixes and og:site_name. */
  tagline: 'Your bike, sorted.',
  // Meta-description budget is 160 chars (BaseLayout); this is 154.
  description:
    'MyRideSG is a motorcycle app for Singapore riders: a maintenance tracker, fuel and expense log, and COE, road tax and service reminders on iOS and Android.',
  locale: 'en_SG',
} as const

// The web app at app.myridesg.com is switched off — the domain now serves a
// page whose only advice is to install from a store. The APP constant that
// used to live here is gone rather than left unused, so nothing can quietly
// link a reader back into a dead end. Downloads go through STORE below.

/**
 * Store links. Identifiers read from myridesg-v2:
 *   iOS      — apps/mobile/eas.json → submit.production.ios.ascAppId
 *   Android  — apps/mobile/app.config.ts → android.package
 */
export const STORE = {
  /**
   * Storefront-qualified. The bare apps.apple.com/app/id… form 404s — it needs
   * a country segment — so this is not merely the prettier of two working
   * URLs.
   */
  ios: 'https://apps.apple.com/sg/app/myridesg/id6788268752',
  android: 'https://play.google.com/store/apps/details?id=app.myridesg.android',
} as const

/**
 * The listings do not share a flag, because they have not moved together —
 * though as of the App Store approval both are true. iOS was routed to the
 * public TestFlight build while its listing was in review. The flags stay so
 * either platform can be pulled back to that state, from one place, without
 * restructuring every call to action.
 */
export const ANDROID_LIVE = true
export const IOS_LIVE = true

/**
 * Public TestFlight link — the iOS destination whenever IOS_LIVE is false.
 * Unused while the App Store listing is up, kept because it is what a rollback
 * needs and because the beta outlives the launch.
 */
export const TESTFLIGHT = 'https://testflight.apple.com/join/AQwehSsW'

/**
 * Testing-community invites, deliberately not the hello@ support inbox — these
 * are issued by hand against a store account, not answered as support tickets.
 */
export const EARLY_ACCESS_EMAIL = 'myridesingapore@gmail.com'

/**
 * The iOS testing request, pre-filled — only needed when the TestFlight build
 * is full or closed. mailto bodies need percent-encoding, because a raw
 * newline or & truncates the body in some clients.
 *
 * All three fields are asked for because the store email is what a hand-issued
 * invite is actually made out to, and it is routinely NOT the address someone
 * signed up with.
 */
export const IOS_TESTING_HREF =
  `mailto:${EARLY_ACCESS_EMAIL}` +
  `?subject=${encodeURIComponent('iOS testing community')}` +
  `&body=${encodeURIComponent(
    [
      'Hi MyRideSG team,',
      '',
      'I am on iPhone and the TestFlight build is not accepting testers.',
      'Please add me to the testing community.',
      '',
      '--- Please fill in all three ---',
      '',
      '1. Login email:',
      '2. Device OS (iOS or Android):',
      '3. App Store / Play Store email:',
      '   (often different from your login email)',
      '',
      'Thanks!',
    ].join('\n'),
  )}`

/**
 * Primary navigation. Kept flat — the marketing site is deliberately shallow.
 */
// TODO: add these back as each page lands — linking before then ships nav items
// that 404:
//   { label: 'Catalog', href: '/catalog' }  — needs the catalog index page
//   { label: 'Demo',    href: '/demo' }     — lives on feat/demo
export const NAV = [
  { label: 'Maintenance app', href: '/motorcycle-maintenance-app/' },
  { label: 'Features', href: '/#features' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Guides', href: '/guides/' },
] as const
