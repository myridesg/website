/**
 * A ContentRepository over a list of Sanity-shaped documents, for tests and
 * local review. It uses the same mappers as the Sanity repository, so a
 * fixture guide goes through exactly the code a real one does.
 */
import type { ContentRepository } from '@/content/entities'
import { mapArticleDoc, mapArticleSummaryDoc, type ArticleDoc } from '@/content/sanity/mappers'

export function fixtureContentRepository(docs: ArticleDoc[]): ContentRepository {
  const newestFirst = [...docs].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  return {
    async getArticle(slug) {
      const doc = docs.find((d) => d.slug.current === slug)
      return doc ? mapArticleDoc(doc) : null
    },
    async listArticles() {
      return newestFirst.map((doc) => mapArticleSummaryDoc(doc))
    },
  }
}
