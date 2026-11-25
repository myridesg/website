import type { ContentRepository } from '@/content/entities'
import { getGuideArticle, listGuideArticles } from '@/content/usecases'
import { toGuideEntry, type GuideEntry } from './guides.ts'

const cache = new WeakMap<ContentRepository, Promise<GuideEntry[]>>()

async function fetchGuides(repo: ContentRepository): Promise<GuideEntry[]> {
  const summaries = await listGuideArticles(repo)
  const articles = await Promise.all(summaries.map((s) => getGuideArticle(repo, s.slug)))
  return articles.flatMap((article) => (article ? [toGuideEntry(article)] : []))
}

/**
 * Every guide, newest first, fetched once per build however many pages ask:
 * the home, each topic page and every article all read the same list.
 */
export function loadGuides(repo: ContentRepository): Promise<GuideEntry[]> {
  let guides = cache.get(repo)
  if (!guides) {
    guides = fetchGuides(repo)
    cache.set(repo, guides)
  }
  return guides
}
