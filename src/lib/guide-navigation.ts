import type { ArticleSummary } from '@/content/entities'

export type GuideGroupId = 'maintenance' | 'troubleshooting' | 'ownership' | 'more'

export interface GuideGroup {
  id: GuideGroupId
  title: string
  intro: string
}

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: 'maintenance',
    title: 'Motorcycle maintenance',
    intro: 'Servicing, parts and routine care to keep a bike in good shape.',
  },
  {
    id: 'troubleshooting',
    title: 'Bike troubleshooting',
    intro: 'Common problems, what causes them and what to check.',
  },
  {
    id: 'ownership',
    title: 'Singapore ownership',
    intro: 'COE, road tax, insurance, licences and the costs of owning a bike here.',
  },
  {
    id: 'more',
    title: 'More guides',
    intro: 'Other guides for Singapore riders.',
  },
]

// Matched against whole words of the slug and tags, not substrings, so "coe"
// does not catch "coefficient" and "oil" does not catch "coil".
const KEYWORDS: Record<Exclude<GuideGroupId, 'more'>, string[]> = {
  troubleshooting: [
    'problem', 'issue', 'fault', 'troubleshooting', 'fix', 'repair',
    'wont', 'cant', 'stall', 'stalling', 'noise', 'leak', 'overheat', 'overheating',
    'electrical', 'electrics', 'humidity',
  ],
  ownership: [
    'coe', 'coes', 'tax', 'insurance', 'licence', 'license', 'class', 'erp',
    'parking', 'inspection', 'vicom', 'renewal', 'renew', 'transfer', 'ownership',
    'petrol', 'fuel', 'price', 'cost', 'costs', 'scrap', 'deregistration', 'ncd',
    'buying', 'selling', 'registration',
  ],
  maintenance: [
    'maintenance', 'service', 'servicing', 'oil', 'chain', 'tyre', 'tire', 'brake',
    'battery', 'coolant', 'spark', 'plug', 'filter', 'clean', 'wash', 'lube',
    'workshop', 'mechanic', 'schedule',
  ],
}

const ORDER: Array<Exclude<GuideGroupId, 'more'>> = [
  'troubleshooting',
  'ownership',
  'maintenance',
]

function words(guide: Pick<ArticleSummary, 'slug' | 'tags'>): Set<string> {
  const out = new Set<string>()
  for (const part of [guide.slug, ...guide.tags]) {
    for (const word of part.toLowerCase().split(/[^a-z0-9]+/)) {
      if (!word) continue
      out.add(word)
      if (word.endsWith('s')) out.add(word.slice(0, -1))
    }
  }
  return out
}

export function groupOf(guide: Pick<ArticleSummary, 'slug' | 'tags'>): GuideGroupId {
  // A guide's specific subject takes precedence over broad CMS tags such as
  // "Singapore" or "costs", which are shared by unrelated topics.
  const slugWords = words({ slug: guide.slug, tags: [] })
  const slugGroup = ORDER.find((id) => KEYWORDS[id].some((word) => slugWords.has(word)))
  if (slugGroup) return slugGroup
  const found = words(guide)
  return ORDER.find((id) => KEYWORDS[id].some((word) => found.has(word))) ?? 'more'
}

/** Each guide lands in exactly one group; empty groups are dropped. */
export function groupGuides<T extends Pick<ArticleSummary, 'slug' | 'tags'>>(
  guides: T[],
): Array<GuideGroup & { guides: T[] }> {
  return GUIDE_GROUPS.map((group) => ({
    ...group,
    guides: guides.filter((guide) => groupOf(guide) === group.id),
  })).filter((group) => group.guides.length > 0)
}

export function isMaintenanceGuide(guide: Pick<ArticleSummary, 'slug' | 'tags'>): boolean {
  return groupOf(guide) === 'maintenance'
}

/**
 * Up to `limit` other guides: the article's own relatedSlugs first, then guides
 * in the same group, then guides sharing a tag. Only slugs present in `all`
 * (the fetched guide list) can appear, so nothing links to a missing page.
 */
export function relatedGuides(
  current: Pick<ArticleSummary, 'slug' | 'tags'> & { relatedSlugs: string[] },
  all: ArticleSummary[],
  limit = 4,
): ArticleSummary[] {
  const others = all.filter((guide) => guide.slug !== current.slug)
  const bySlug = new Map(others.map((guide) => [guide.slug, guide]))
  const picked = new Map<string, ArticleSummary>()
  const add = (guide: ArticleSummary | undefined) => {
    if (guide && picked.size < limit) picked.set(guide.slug, guide)
  }

  for (const slug of current.relatedSlugs) add(bySlug.get(slug))

  const group = groupOf(current)
  const tags = new Set(current.tags.map((tag) => tag.toLowerCase()))
  const sameGroup = others.filter((guide) => groupOf(guide) === group)
  const sharedTag = others.filter((guide) =>
    guide.tags.some((tag) => tags.has(tag.toLowerCase())),
  )

  for (const guide of [...sharedTag.filter((g) => sameGroup.includes(g)), ...sameGroup, ...sharedTag]) {
    add(guide)
  }

  return [...picked.values()]
}
