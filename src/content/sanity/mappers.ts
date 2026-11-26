/**
 * VENDORED from myridesg-v2 @ packages/data/src/sanity/mappers.ts.
 *
 * Differences from the monorepo, both deliberate:
 *
 *   - heroImage maps to an ArticleImage (url, size, alt, credit) rather than
 *     v2's `heroImageUrl` string. The GROQ projects it through the asset, so
 *     no @sanity/image-url: there is no crop or hotspot to apply, only a URL.
 *   - No `avatar` on the author ref: nothing here shows one.
 *
 * Everything else — field names, the publishedAt/updatedAt fallback, the
 * 'unknown' author null-object — matches, so guides read identically on both
 * sites.
 */

import type {
  Article,
  ArticleAuthorRef,
  ArticleImage,
  ArticleSeo,
  ArticleSummary,
} from '../entities'

/** heroImage as content-repository.ts projects it: the asset's fields. */
export interface ArticleImageDoc {
  url: string
  width: number
  height: number
  alt?: string | null
  credit?: string | null
  sourceUrl?: string | null
}

interface ArticleAuthorRefDoc {
  slug?: { current?: string } | null
  name?: string | null
}

export interface ArticleDoc {
  _id: string
  title: string
  slug: { current: string }
  category: 'guide' | 'bike-model' | 'news'
  description: string
  heroImage?: ArticleImageDoc | null
  author?: ArticleAuthorRefDoc | null
  body: unknown[]
  publishedAt: string
  updatedAt?: string | null
  tags?: string[] | null
  relatedSlugs?: Array<{ slug?: { current?: string } | null } | null> | null
  seo?: {
    metaTitle?: string | null
    metaDescription?: string | null
    canonicalUrl?: string | null
    noIndex?: boolean | null
  } | null
}

export interface ArticleSummaryDoc {
  slug: { current: string }
  title: string
  description: string
  category: 'guide' | 'bike-model' | 'news'
  author?: ArticleAuthorRefDoc | null
  publishedAt: string
  updatedAt?: string | null
  tags?: string[] | null
}

function mapSeo(doc: ArticleDoc): ArticleSeo {
  const s = doc.seo ?? {}
  return {
    metaTitle: s.metaTitle ?? null,
    metaDescription: s.metaDescription ?? null,
    canonicalUrl: s.canonicalUrl ?? null,
    noIndex: Boolean(s.noIndex),
  }
}

export function mapArticleImage(doc: ArticleImageDoc | null | undefined): ArticleImage | null {
  if (!doc?.url) return null
  return {
    url: doc.url,
    width: doc.width,
    height: doc.height,
    alt: doc.alt ?? '',
    credit: doc.credit ?? null,
    sourceUrl: doc.sourceUrl ?? null,
  }
}

export function mapArticleAuthorRef(
  raw: ArticleAuthorRefDoc | null | undefined,
): ArticleAuthorRef {
  if (!raw) return { slug: 'unknown', name: 'Unknown' }
  return {
    slug: raw.slug?.current ?? 'unknown',
    name: raw.name ?? 'Unknown',
  }
}

export function mapArticleDoc(doc: ArticleDoc): Article {
  return {
    slug: doc.slug.current,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    heroImage: mapArticleImage(doc.heroImage),
    author: mapArticleAuthorRef(doc.author),
    publishedAt: new Date(doc.publishedAt),
    updatedAt: new Date(doc.updatedAt ?? doc.publishedAt),
    tags: doc.tags ?? [],
    relatedSlugs: (doc.relatedSlugs ?? [])
      .map((r) => r?.slug?.current)
      .filter((s): s is string => Boolean(s)),
    bodySource: JSON.stringify(doc.body),
    bodyFormat: 'portable-text-v1',
    seo: mapSeo(doc),
  }
}

export function mapArticleSummaryDoc(doc: ArticleSummaryDoc): ArticleSummary {
  return {
    slug: doc.slug.current,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    author: mapArticleAuthorRef(doc.author),
    publishedAt: new Date(doc.publishedAt),
    updatedAt: new Date(doc.updatedAt ?? doc.publishedAt),
    tags: doc.tags ?? [],
  }
}
