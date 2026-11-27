/**
 * What the guide pages show, worked out from an article: its topic, the 3D
 * object on its cover, its read time, the contents list and the questions.
 * Pure, so the pages stay thin and the rules are tested without a build.
 *
 * Imports between lib modules are relative with the .ts extension so node's
 * test runner can load them; the alias is for types only.
 */
import type { Article } from '@/content/entities'
import type { ObjectKey } from '@/components/ui/feature/objects'
import { groupOf, topicPath, type GuideGroupId } from './guide-navigation.ts'

export interface GuideEntry {
  article: Article
  topic: GuideGroupId
  cover: ObjectKey
  readMinutes: number
  /** False for an article marked noIndex: it builds, but no list shows it. */
  listed: boolean
}

/** The object beside a topic page's headline. */
export const TOPIC_OBJECT: Record<GuideGroupId, ObjectKey> = {
  maintenance: 'workshops',
  troubleshooting: 'guides',
  ownership: 'coe',
  more: 'map',
}

const WORDS_PER_MINUTE = 200

// The strings a reader actually reads, by the key they sit under in the
// Portable Text: prose and table cells, questions, download notes.
const READ_KEYS = new Set(['text', 'question', 'label', 'value', 'note'])

function countWords(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((sum: number, item) => sum + countWords(item), 0)
  if (!node || typeof node !== 'object') return 0
  return Object.entries(node).reduce((sum, [key, value]) => {
    if (typeof value === 'string') {
      return sum + (READ_KEYS.has(key) ? value.split(/\s+/).filter(Boolean).length : 0)
    }
    return sum + countWords(value)
  }, 0)
}

export function readMinutes(blocks: unknown): number {
  return Math.max(1, Math.round(countWords(blocks) / WORDS_PER_MINUTE))
}

export function readTimeLabel(minutes: number): string {
  return `Read time ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

function plainText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((block: any) =>
      block?._type === 'block' && Array.isArray(block.children)
        ? block.children.map((child: any) => child?.text ?? '').join('')
        : '',
    )
    .filter(Boolean)
    .join('\n\n')
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Gives every h2 an `anchor` (unique within the article) and lists them for
 * the contents box. An h2 with no words is left alone and not listed.
 */
export function anchorHeadings<T extends object>(
  blocks: T[],
): { blocks: T[]; contents: Array<{ id: string; text: string }> } {
  const contents: Array<{ id: string; text: string }> = []
  const used = new Set<string>()
  const out = blocks.map((block) => {
    const b = block as Record<string, any>
    if (b._type !== 'block' || b.style !== 'h2') return block
    const text = plainText([b]).trim()
    const base = slugify(text)
    if (!base) return block
    // "costs", then "costs-2", "costs-3"…, skipping any id a heading already
    // took by its own words ("Costs 2").
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    contents.push({ id, text })
    return { ...block, anchor: id }
  })
  return { blocks: out, contents }
}

/** Every answered question in the article's FAQ blocks, as plain text. */
export function faqItemsOf(blocks: unknown[]): Array<{ q: string; a: string }> {
  return blocks.flatMap((block: any) =>
    block?._type === 'faq' && Array.isArray(block.items)
      ? block.items
          .map((item: any) => ({ q: item?.question as string, a: plainText(item?.answer) }))
          .filter((item: { q: string; a: string }) => item.q && item.a)
      : [],
  )
}

// First match wins, in this order, on whole words of the slug.
const COVER_BY_WORD: Array<[string[], ObjectKey]> = [
  [['oil'], 'petrol'],
  [['coe'], 'coe'],
  [['petrol', 'fuel'], 'pump'],
  [['workshop', 'workshops'], 'workshops'],
  [['parking'], 'map'],
  [['insurance', 'tax', 'cost', 'costs', 'price', 'prices'], 'receipt'],
  [['tyre', 'tyres'], 'chart'],
]

const COVER_POOL: Record<GuideGroupId, ObjectKey[]> = {
  maintenance: ['workshops', 'receipt', 'chart'],
  troubleshooting: ['workshops', 'guides', 'receipt', 'chart'],
  ownership: ['coe', 'receipt', 'map'],
  more: ['map', 'guides', 'chart'],
}

export function coverFor(guide: { slug: string; topic: GuideGroupId }): ObjectKey {
  const words = new Set(guide.slug.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  for (const [keys, object] of COVER_BY_WORD) {
    if (keys.some((key) => words.has(key))) return object
  }
  const pool = COVER_POOL[guide.topic]
  const sum = [...guide.slug].reduce((total, char) => total + char.charCodeAt(0), 0)
  return pool[sum % pool.length]
}

/**
 * How many cards at the front of a grid are "lead" cards, so the last row of
 * a three-wide grid is never one card on its own: 1 spans the row, 2 share
 * it two to one.
 */
export function leadCount(count: number): 0 | 1 | 2 {
  return (count % 3) as 0 | 1 | 2
}

/**
 * The trail for a guide's structured data: Home / Riding guides / topic /
 * title. The topic level is left out when the topic has no page: a topic
 * page is built only for topics that have a listed guide, so an unlisted
 * guide in an otherwise empty topic would point at a 404.
 */
export function guideBreadcrumbs(
  topic: { id: GuideGroupId; title: string },
  title: string,
  hasTopicPage: boolean,
): Array<{ name: string; href?: string }> {
  return [
    { name: 'Home', href: '/' },
    { name: 'Riding guides', href: '/guides/' },
    ...(hasTopicPage ? [{ name: topic.title, href: topicPath(topic.id) }] : []),
    { name: title },
  ]
}

export function toGuideEntry(article: Article): GuideEntry {
  const topic = groupOf(article)
  const blocks = article.bodyFormat === 'portable-text-v1' ? JSON.parse(article.bodySource) : []
  return {
    article,
    topic,
    cover: coverFor({ slug: article.slug, topic }),
    readMinutes: readMinutes(blocks),
    listed: !article.seo.noIndex,
  }
}
