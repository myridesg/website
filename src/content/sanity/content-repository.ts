/**
 * VENDORED from myridesg-v2 @ packages/data/src/sanity/content-repository.ts.
 *
 * The GROQ is copied verbatim apart from two projections. Keep it that way — if
 * a query drifts, the two sites start disagreeing about what a guide is.
 *
 *   1. `heroImage` is projected through its asset to { url, width, height,
 *      alt, credit, sourceUrl } (see ./mappers.ts). v2 fetches the raw image
 *      and builds a URL with @sanity/image-url; this site needs the asset's
 *      size and credit line as well, and the asset document already has both.
 *      Author avatars and seo.ogImage are still not fetched.
 *   2. `body[]` dereferences the references inside a `relatedLinks` block to
 *      { slug, title, category }. Unprojected they arrive as bare _ref strings
 *      and the block cannot render a link, which is exactly the state v2 is in:
 *      packages/ui/src/patterns/PortableBody.tsx passes `slugs={[]}` under a
 *      TODO saying this projection is what it needs. Neither of these changes
 *      which documents are guides or how they are ordered — the two sites still
 *      agree about that — but the fix is worth porting back to the monorepo.
 *
 * The monorepo's `next: { tags: [...] }` fetch options are gone: those drive
 * Next's on-demand revalidation, and there is no server here to revalidate. A
 * rebuild is how this site picks up new content.
 */

import type { SanityClient } from '@sanity/client'
import type { Article, ArticleSummary, ContentRepository } from '../entities'
import {
  mapArticleDoc,
  mapArticleSummaryDoc,
  type ArticleDoc,
  type ArticleSummaryDoc,
} from './mappers'

const ARTICLE_BY_SLUG = /* groq */ `
  *[_type == "article" && slug.current == $slug][0]{
    _id, title, slug, category, description,
    "heroImage": heroImage.asset->{
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height,
      "alt": altText,
      "credit": creditLine,
      "sourceUrl": source.url
    },
    body[]{
      ...,
      _type == "relatedLinks" => {
        ...,
        "slugs": slugs[]->{ "slug": slug.current, title, category }
      }
    },
    publishedAt, updatedAt, tags,
    "author": author->{ slug, name },
    "relatedSlugs": relatedSlugs[]->{ slug },
    seo
  }
`

const ARTICLE_SUMMARIES = /* groq */ `
  *[_type == "article" && defined(slug.current)] | order(publishedAt desc) {
    slug, title, description, category, publishedAt, updatedAt, tags,
    "author": author->{ slug, name }
  }
`

export class SanityContentRepository implements ContentRepository {
  constructor(private readonly client: SanityClient) {}

  async getArticle(slug: string): Promise<Article | null> {
    const doc = await this.client.fetch<ArticleDoc | null>(ARTICLE_BY_SLUG, { slug })
    return doc ? mapArticleDoc(doc) : null
  }

  async listArticles(): Promise<ArticleSummary[]> {
    const docs = await this.client.fetch<ArticleSummaryDoc[]>(ARTICLE_SUMMARIES, {})
    return docs.map(mapArticleSummaryDoc)
  }
}

/**
 * Stands in when Sanity is not configured. Mirrors the null-object fallback in
 * apps/web/lib/repositories.ts: a CMS-less environment is a supported one, so
 * `pnpm build` must succeed on a machine with no credentials and simply produce
 * an empty /guides index rather than failing the build.
 */
export const emptyContentRepository: ContentRepository = {
  async getArticle() {
    return null
  },
  async listArticles() {
    return []
  },
}
