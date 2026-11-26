/**
 * A Sanity photo as the build should fetch it. astro:assets downloads each
 * remote source to make its WebP sizes and the share card, and a Wikimedia
 * original can be 6000px and 10 MB; asking the Sanity CDN for at most this
 * width keeps every download small. Every caller uses the same src, so each
 * photo is downloaded once per build.
 */
import type { ArticleImage } from '@/content/entities'

/** The widest any page shows a photo: the guide hero, 55.5rem at 2x. */
export const BUILD_IMAGE_MAX_WIDTH = 1600

export function forBuild(image: ArticleImage): { src: string; width: number; height: number } {
  const width = Math.min(image.width, BUILD_IMAGE_MAX_WIDTH)
  return {
    src: `${image.url}?w=${width}`,
    width,
    height: Math.round((image.height * width) / image.width),
  }
}
