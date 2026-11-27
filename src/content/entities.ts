/**
 * VENDORED from myridesg-v2 @ packages/domain/src/content/entities.ts.
 *
 * Trimmed to the article types, because guides are the only content this site
 * renders — topic pages, bike pages and the sitemap summaries stay in the
 * monorepo until /catalog lands here. Field names and shapes are otherwise
 * identical, so a diff against the monorepo file stays readable.
 *
 * Do not add presentation concerns here. See AGENTS.md rule 5.
 */

export type BodyFormat = 'mdx-v1' | 'portable-text-v1'

export interface ArticleSeo {
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  noIndex: boolean
}

export interface ArticleAuthorRef {
  slug: string
  name: string
}

/**
 * A picture stored in Sanity. v2 carries only `heroImageUrl`; this site also
 * needs the size (for astro:assets), a caption and the credit its licence
 * asks for.
 */
export interface ArticleImage {
  url: string
  width: number
  height: number
  alt: string
  /** One line on what the photo shows: the Sanity asset's `description`. */
  caption: string | null
  /** e.g. "Rainmaker47, CC BY-SA 3.0, via Wikimedia Commons" */
  credit: string | null
  /** The page the credit links to: where the picture and its licence live. */
  sourceUrl: string | null
}

export interface Article {
  slug: string
  title: string
  description: string
  category: 'guide' | 'bike-model' | 'news'
  heroImage: ArticleImage | null
  author: ArticleAuthorRef
  publishedAt: Date
  updatedAt: Date
  tags: string[]
  relatedSlugs: string[]
  bodySource: string
  bodyFormat: BodyFormat
  seo: ArticleSeo
}

export interface ArticleSummary {
  slug: string
  title: string
  description: string
  category: 'guide' | 'bike-model' | 'news'
  author: ArticleAuthorRef
  publishedAt: Date
  updatedAt: Date
  tags: string[]
}

/** The subset of ContentRepository this site actually calls. */
export interface ContentRepository {
  getArticle(slug: string): Promise<Article | null>
  listArticles(): Promise<ArticleSummary[]>
}
