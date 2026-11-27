import type { GuideEntry } from './guides.ts'
import { slugify } from './guides.ts'

/** A tag that has its own page: the guides that carry it, newest first. */
export interface GuideTag {
  slug: string
  label: string
  guides: GuideEntry[]
}

/**
 * A tag earns a page once two listed guides share it. A tag on one guide would
 * open a page listing only the guide the reader came from, so it gets no page
 * and no link. Tags match whatever their case or spacing ("Oil", "oil "), and
 * the first spelling met names the page.
 */
export const MIN_GUIDES_PER_TAG = 2

export function tagPath(slug: string): string {
  return `/guides/tag/${slug}/`
}

export function guideTags(listed: GuideEntry[]): GuideTag[] {
  const bySlug = new Map<string, GuideTag>()
  for (const guide of listed) {
    for (const raw of guide.article.tags) {
      const label = raw.trim()
      const slug = slugify(label)
      if (!slug) continue
      const tag = bySlug.get(slug) ?? { slug, label, guides: [] }
      if (!tag.guides.includes(guide)) tag.guides.push(guide)
      bySlug.set(slug, tag)
    }
  }
  return [...bySlug.values()]
    .filter((tag) => tag.guides.length >= MIN_GUIDES_PER_TAG)
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** The article's own tags that have a page, in the article's order. */
export function linkedTags(tags: string[], pages: GuideTag[]): GuideTag[] {
  const bySlug = new Map(pages.map((tag) => [tag.slug, tag]))
  const out: GuideTag[] = []
  for (const raw of tags) {
    const tag = bySlug.get(slugify(raw.trim()))
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out
}
