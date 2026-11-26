/**
 * Every string the home page shows, in page order.
 *
 * Copy is from the approved design (docs/superpowers/specs/
 * 2026-11-21-home-page-one-app-design.md, section 5). The feature list in
 * DETAIL is section 5.1, owner-confirmed on 21 Nov 2026. home-content.test.ts
 * pins the wording and runs allHomeCopy() through the claim checker, so a
 * change here that breaks AGENTS.md rule 6 fails the tests.
 *
 * This module imports nothing so the tests can load it under plain Node.
 */

export const PROMISE = {
  eyebrow: 'Made in Singapore',
  headline: 'One app for Singapore riders.',
  line: 'What your bike needs and what you check before a ride, in one place.',
  note: 'Free to download and use',
} as const

export const STEPS = {
  headline: 'Three steps to get sorted.',
  steps: [
    { label: 'Add your bike', picture: 'bike' },
    { label: 'Snap as you go', picture: 'receipt' },
    { label: 'Get reminded', picture: 'next' },
  ],
} as const

export const NEVER_MISS = {
  headline: 'Always know what your bike needs next.',
  line: "Every job and every renewal. We'll remind you before it's due.",
  caption: 'Sample data',
  items: [
    { label: 'Chain lube', due: 'in 300 km', kind: 'job' },
    { label: 'Road tax', due: '21 days', kind: 'renewal' },
    { label: 'Oil change', due: 'in 3 weeks', kind: 'job' },
    { label: 'Brake pads', due: 'in 1,200 km', kind: 'job' },
    { label: 'Insurance', due: '2 months', kind: 'renewal' },
    { label: 'Tyres', due: 'in 4 months', kind: 'job' },
    { label: 'COE', due: '2 years', kind: 'renewal' },
  ],
} as const

export const COSTS = {
  headline: 'Know what your bike really costs.',
  line: 'Fuel, Johor fill-ups, parts and everything else, by month.',
} as const

export const SINGAPORE = {
  headline: 'Made for riding in Singapore.',
  tools: [
    { label: 'Petrol prices, SG + MY', href: '/rider-tools/#fuel-prices', icon: 'fuel-prices' },
    { label: 'Causeway cameras', href: '/rider-tools/#causeway-cams', icon: 'causeway-cams' },
    { label: 'COE calculator', href: '/motorcycle-coe-calculator/', icon: 'coe-calculator' },
    { label: 'Workshops', href: '/motorcycle-workshop-directory/', icon: 'workshops' },
  ],
} as const

export const HISTORY = {
  headline: 'A history a buyer can check.',
  line: 'Your records become a bike passport with a QR code.',
} as const

export const NEXT = {
  headline: "And we're not done.",
  badge: 'In the works',
  cards: [
    { title: 'Map', line: 'Petrol, parking and workshops on one map.' },
    { title: 'Community', line: 'Parking, routes and clubs, shared by riders.' },
    { title: 'Guides', line: 'Short how-tos for looking after your bike.' },
    { title: 'Weather', line: 'A rain check before you ride.' },
  ],
} as const

export const DETAIL = {
  featuresQuestion: 'What can the app do today?',
  faqHeading: 'Questions riders ask.',
  /** Questions shown after the features row; the rest fold under "Show N more questions". */
  questionsShown: 4,
  moreQuestions: (count: number) => `Show ${count} more questions`,
  groups: [
    {
      title: 'Servicing',
      items: [
        'Service log with 30 job types',
        'Reminders by kilometres or months, with a notification when a job falls due',
        'Snap a receipt or odometer to log',
        'Oil-change consistency chart',
        'The receipt photo kept with the record',
      ],
    },
    {
      title: 'Money',
      items: [
        'Fuel log with km per litre and monthly spend',
        'Johor fill-ups in ringgit',
        'Expenses by category',
        'Mileage log',
      ],
    },
    {
      title: 'Dates',
      items: [
        'COE, road tax and insurance',
        'Days-left countdown',
        'Notifications before each one expires',
        'The next thing due shown on Home',
      ],
    },
    {
      title: 'Your bike',
      items: [
        'More than one bike',
        'Bike passport with QR',
        'Import old history from photos, other apps or a spreadsheet',
        'Export to CSV',
      ],
    },
    {
      title: 'Tools',
      items: [
        'Petrol prices for Singapore and Malaysia, after your fuel cards',
        'Causeway cameras',
        'COE renewal calculator',
        'Workshop directory with call, WhatsApp and directions',
        'Saved contacts',
      ],
    },
    {
      title: 'Also',
      items: [
        'Promotions and events',
        'Face ID or fingerprint lock',
        'Light and dark mode',
        'Sign in with Apple, Google or an emailed code',
      ],
    },
  ],
} as const

export const ASK = {
  headline: 'Ride more. Worry less.',
  note: 'Free to download and use. Your records are yours.',
} as const

export const SECTION_IDS = [
  'promise',
  'how-it-works',
  'never-miss',
  'costs',
  'singapore',
  'history',
  'next',
  'detail',
  'download',
] as const

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

/** Every string in this module, one per line, for the claim checker. */
export function allHomeCopy(): string {
  return collectStrings([PROMISE, STEPS, NEVER_MISS, COSTS, SINGAPORE, HISTORY, NEXT, DETAIL, ASK, SECTION_IDS]).join('\n')
}
