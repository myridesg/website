const SEEN_AFTER = 0.12

/** 0 when the element's top edge is at the bottom of the viewport, 1 when its bottom edge reaches the top. */
export function progressFor(top: number, height: number, viewport: number): number {
  const progress = (viewport - top) / (viewport + height)
  return Math.min(1, Math.max(0, progress))
}

/** 0 while the element's top edge is at or below the top of the viewport, 1 once all of it has scrolled above. */
export function leaveFor(top: number, height: number): number {
  if (height <= 0) return top < 0 ? 1 : 0
  return Math.min(1, Math.max(0, -top / height))
}

/**
 * Writes `--p` on every `[data-progress]` element as the page scrolls, and marks each `data-seen` once it is under way.
 * An element that also carries `data-leave` gets `--leave` too: how much of it has scrolled off the top. The opening
 * part needs it because it starts on screen, where `--p` is already part-way and depends on the part's height.
 * Reduced motion writes no `--leave`, so anything driven by it stays where it rests.
 */
export function mountScrollProgress(root: ParentNode = document): void {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-progress]')]

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const el of elements) {
      el.style.setProperty('--p', '1')
      el.setAttribute('data-seen', '')
    }
    return
  }

  let queued = false

  function update() {
    queued = false
    const viewport = innerHeight
    const rects = elements.map((el) => el.getBoundingClientRect())
    elements.forEach((el, i) => {
      const { top, height } = rects[i]
      const progress = progressFor(top, height, viewport)
      el.style.setProperty('--p', progress.toFixed(4))
      if (el.hasAttribute('data-leave')) el.style.setProperty('--leave', leaveFor(top, height).toFixed(4))
      if (progress > SEEN_AFTER && !el.hasAttribute('data-seen')) el.setAttribute('data-seen', '')
    })
  }

  function queueUpdate() {
    if (queued) return
    queued = true
    requestAnimationFrame(update)
  }

  addEventListener('scroll', queueUpdate, { passive: true })
  addEventListener('resize', queueUpdate)
  queueUpdate()
}
