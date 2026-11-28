import { POSTHOG_HOST } from '@/consts'
import { guideSlug, storeClickProps } from '@/lib/analytics-events'

// Both halves of the condition are build-time constants: a build with no key
// drops the whole block, including the import, so nothing of PostHog ships.
// See docs/tracking-plan.md before adding an event.
if (import.meta.env.PROD && import.meta.env.PUBLIC_POSTHOG_KEY) {
  // module.no-external is the build that never injects a <script> from another
  // origin (heatmaps are in it), which the CSP's script-src 'self' relies on.
  const { default: posthog } = await import('posthog-js/dist/module.no-external')

  posthog.init(import.meta.env.PUBLIC_POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-08-30',
    cookieless_mode: 'always',
    person_profiles: 'never',
    autocapture: false,
    capture_pageleave: true,
    enable_heatmaps: true,
    disable_session_recording: true,
    disable_external_dependency_loading: true,
  })
  posthog.register({ platform: 'web' })

  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      'a[data-store], a[data-store-link]',
    )
    const props = link && storeClickProps(link)
    if (props) posthog.capture('store_button_clicked', props, { transport: 'sendBeacon' })
  })

  const guideEnd = guideSlug(location.pathname) && document.querySelector('[data-guide-end]')
  if (guideEnd) {
    const slug = guideSlug(location.pathname)
    const watcher = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      posthog.capture('guide_finished', { slug })
      watcher.disconnect()
    })
    watcher.observe(guideEnd)
  }
}
