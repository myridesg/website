import type { APIRoute } from 'astro'
import { SITE, STORE } from '@/consts'

/**
 * /llms.txt — the answer-engine summary convention (llmstxt.org). A short
 * markdown map of the site for crawlers that quote sources. Only claims the
 * rest of the site already makes are repeated here: no counts, no ratings,
 * no booking or rewards, no "free forever" (AGENTS.md rule 6).
 */
export const GET: APIRoute = ({ site }) => {
  const path = (p: string) => new URL(p, site).href

  const body = `# MyRideSG

> ${SITE.description} Core tracking is free. Made in Singapore, for Singapore riders.

## The app

MyRideSG is a native motorcycle-ownership app for Singapore riders, on iOS and
Android. Riders can:

- keep a service history for each bike and export it as a shareable bike report
- log fuel fill-ups, mileage and expenses in SGD, with cost per kilometre
- store road tax, insurance and COE expiry dates, with push reminders before each falls due
- compare listed petrol prices across stations
- check Causeway camera conditions before crossing the causeway
- browse a directory of Singapore motorcycle workshops by region and speciality
- work through COE figures in the built-in COE calculator
- read guides on maintenance, COE, road tax and insurance

Download: [App Store](${STORE.ios}) · [Google Play](${STORE.android})

## Pages

- [Home](${path('/')}) — what the app does, pricing and FAQ
- [Motorcycle maintenance app](${path('/motorcycle-maintenance-app/')})
- [Motorcycle expense tracker](${path('/motorcycle-expense-tracker/')})
- [Motorcycle renewal reminders](${path('/motorcycle-renewal-reminders/')})
- [Motorcycle workshop directory](${path('/motorcycle-workshop-directory/')})
- [Motorcycle COE calculator](${path('/motorcycle-coe-calculator/')})
- [Rider tools](${path('/rider-tools/')})
- [Guides](${path('/guides/')})
- [Privacy policy](${path('/privacy/')})
- [Terms of use](${path('/terms/')})
- [Support](${path('/support/')})

## For crawlers

- Sitemap: ${new URL('sitemap-index.xml', site).href}
- robots.txt: ${path('/robots.txt')}
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
