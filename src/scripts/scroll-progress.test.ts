import { test } from 'node:test'
import assert from 'node:assert/strict'
import { progressFor, leaveFor, mountScrollProgress } from './scroll-progress.ts'

test('progress runs from entering to leaving', () => {
  assert.equal(progressFor(800, 400, 800), 0)     // top edge at the bottom of the screen
  assert.equal(progressFor(-400, 400, 800), 1)    // bottom edge at the top
  assert.equal(progressFor(200, 400, 800), 0.5)   // centred
  assert.equal(progressFor(2000, 400, 800), 0)    // far below: clamped
  assert.equal(progressFor(-2000, 400, 800), 1)   // far above: clamped
})

test('a zero-height element does not divide by zero', () => {
  assert.equal(progressFor(0, 0, 800), 1)
})

test('leave runs from resting at the top to scrolled off it', () => {
  assert.equal(leaveFor(0, 800), 0)       // top edge at the top of the screen
  assert.equal(leaveFor(300, 800), 0)     // still below the top: clamped
  assert.equal(leaveFor(-200, 800), 0.25) // a quarter scrolled away
  assert.equal(leaveFor(-800, 800), 1)    // all of it above the screen
  assert.equal(leaveFor(-2000, 800), 1)   // far above: clamped
})

test('a zero-height element is left once it is above the top', () => {
  assert.equal(leaveFor(0, 0), 0)
  assert.equal(leaveFor(-1, 0), 1)
})

function fakeSection(top: number, height: number, initialAttrs: string[] = []) {
  const props = new Map<string, string>()
  const attrs = new Set<string>(initialAttrs)
  return {
    top,
    props,
    attrs,
    style: { setProperty: (name: string, value: string) => void props.set(name, value) },
    hasAttribute: (name: string) => attrs.has(name),
    setAttribute: (name: string) => void attrs.add(name),
    getBoundingClientRect() { return { top: this.top, height } },
  }
}

function fakeWindow(reducedMotion: boolean) {
  const listeners: { type: string; fn: () => void; options: unknown }[] = []
  const frames: (() => void)[] = []
  return {
    innerHeight: 800,
    listeners,
    matchMedia: (query: string) => ({ matches: reducedMotion && query === '(prefers-reduced-motion: reduce)' }),
    addEventListener: (type: string, fn: () => void, options?: unknown) => void listeners.push({ type, fn, options }),
    requestAnimationFrame: (fn: () => void) => frames.push(fn),
    fire(type: string) { listeners.filter((l) => l.type === type).forEach((l) => l.fn()) },
    flush() { frames.splice(0).forEach((fn) => fn()) },
  }
}

function mount(sections: ReturnType<typeof fakeSection>[], reducedMotion: boolean) {
  const win = fakeWindow(reducedMotion)
  Object.assign(globalThis, {
    innerHeight: win.innerHeight,
    matchMedia: win.matchMedia,
    addEventListener: win.addEventListener,
    requestAnimationFrame: win.requestAnimationFrame,
  })
  const root = { querySelectorAll: (selector: string) => (selector === '[data-progress]' ? sections : []) }
  mountScrollProgress(root as unknown as ParentNode)
  return win
}

test('writes --p to four decimals and marks a section seen once it passes 0.12', () => {
  const below = fakeSection(780, 400)  // progress 20/1200, under the threshold
  const centred = fakeSection(200, 400)
  const win = mount([below, centred], false)
  win.flush()

  assert.equal(below.props.get('--p'), '0.0167')
  assert.equal(below.hasAttribute('data-seen'), false)
  assert.equal(centred.props.get('--p'), '0.5000')
  assert.equal(centred.hasAttribute('data-seen'), true)

  below.top = 500  // scrolled: progress 0.25
  win.fire('scroll')
  win.fire('scroll')  // two events, one frame
  win.flush()
  assert.equal(below.props.get('--p'), '0.2500')
  assert.equal(below.hasAttribute('data-seen'), true)

  below.top = 800  // scrolled back: progress 0, but seen stays
  win.fire('resize')
  win.flush()
  assert.equal(below.props.get('--p'), '0.0000')
  assert.equal(below.hasAttribute('data-seen'), true)
})

test('writes --leave only on sections marked data-leave', () => {
  const opening = fakeSection(0, 800, ['data-leave'])
  const other = fakeSection(200, 400)
  const win = mount([opening, other], false)
  win.flush()
  assert.equal(opening.props.get('--leave'), '0.0000')
  assert.equal(other.props.has('--leave'), false)

  opening.top = -200
  win.fire('scroll')
  win.flush()
  assert.equal(opening.props.get('--leave'), '0.2500')
  assert.equal(opening.props.get('--p'), '0.6250')  // (800 + 200) / 1600
})

test('listens for scroll passively and for resize', () => {
  const win = mount([fakeSection(200, 400)], false)
  assert.deepEqual(win.listeners.map((l) => [l.type, l.options]), [
    ['scroll', { passive: true }],
    ['resize', undefined],
  ])
})

test('with reduced motion, shows every section finished and attaches no listeners', () => {
  const sections = [fakeSection(2000, 400), fakeSection(0, 800, ['data-leave'])]
  const win = mount(sections, true)

  for (const s of sections) {
    assert.equal(s.props.get('--p'), '1')
    assert.equal(s.hasAttribute('data-seen'), true)
  }
  assert.equal(sections.some((s) => s.props.has('--leave')), false)
  assert.equal(win.listeners.length, 0)
})
