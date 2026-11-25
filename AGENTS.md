# MyRideSG — marketing site

Standalone marketing and content site for MyRideSG, split out of the
`myridesg-v2` monorepo. Astro, fully static, no backend, apart from the one
exception in rule 1.

The product is a **native iOS/Android app**. This site markets it and hosts the
SEO content. There is no web app here, no auth, and no user accounts.

## Stack (locked)

| | |
|---|---|
| Framework | Astro 7 — static output, MPA |
| Interactivity | None installed — see rule 2 before reaching for React |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Content | Sanity (guides) + local TS data (bike catalog) |
| Images | `astro:assets` → WebP |
| Package manager | pnpm · Node >= 22.12 |
| TypeScript | **pinned to 6.x** — `astro check` cannot use 7.x (the native compiler drops the programmatic API the language server needs) |

Do not add: `react-router` (routing is file-based), a component library, or any
CSS-in-JS. If you think one is needed, raise it rather than adding it.

## Commands

```bash
pnpm dev        # dev server
pnpm build      # static build → dist/
pnpm preview    # serve dist/
pnpm check      # astro check — must be 0 errors before you finish
pnpm test       # unit tests: worker/, src/, scripts/ (never reads dist/)
pnpm test:page  # builds, then tests the built home page in dist/
```

## Layout

```
src/
  pages/        file-based routes; each one prerenders
  layouts/      BaseLayout (html + head/SEO) · ProseLayout (long-form)
  components/
    ui/         .astro — zero JS. Default choice.
      home/     the home page's nine parts (copy in lib/home-content.ts)
      feature/  the four feature pages' parts, in the home page's look
      app/      app screens drawn in markup (status bar, tab bar, home screen)
      guide/    blocks a guide's body can use (callouts, FAQ, specs, CTA)
    islands/    .tsx — React, hydrated. Exception, not default.
  content/      vendored data layer from myridesg-v2 (see below)
  lib/          home-content.ts (every home page string), faq-items.ts, seo.ts
  scripts/      client modules; scroll-progress.ts drives the home page motion
  assets/       images processed by astro:assets
  styles/       global.css — Tailwind entry + @theme tokens, incl. the one list of
                spacing (--space-*, --section-pad), type roles (--type-*) and cards;
                a line on top means "read", a flat card (no shadow) means "press"
                studio.css — what home and feature pages share (wall, floor, finale)
                home.css · feature.css — each imports studio.css first
  consts.ts     site config, store URLs, nav
```

## Rules

**1. Every route prerenders.** `output: 'static'`. There is no server at
runtime, so no route may fetch on request. Data is fetched at build time in
frontmatter or a prebuild script.

The one exception is `/r/<code>`, the page a bike passport's QR code opens. A
rider can revoke a passport at any time, so it can't be prerendered. It isn't an
Astro route: `worker/report.ts` answers it, and `assets.run_worker_first` in
`wrangler.jsonc` limits that code to `/r/*`. It loads no scripts and reads one
public database function. Printed codes last for years, so this address must
keep working through any rebuild of the site. Raise any new live route rather
than adding it here.

**2. `.astro` only — React is not installed.** Nothing on the site has ever
needed an island: accordions and menus use `<details>`, the theme toggle is a
dozen lines of inline script, and the phone mockups on the home page are
rendered markup. `@astrojs/react` was emitting a ~190 KB client runtime into
`dist/_astro/` that no page referenced, so it came out.

Put it back only for something that genuinely cannot be done without client
state, and put it back deliberately:

```bash
pnpm add @astrojs/react react react-dom
pnpm add -D @types/react @types/react-dom
```

then re-add `react()` to `astro.config.mjs` and `jsx`/`jsxImportSource` to
`tsconfig.json`. Use `client:visible` unless it must run sooner. Note that the
`feat/demo` branch still has an island (`DemoGarage.tsx`) and needs all of the
above restored before it will build against `main`.

**3. Images go in `src/assets/`, never `public/`.** Only `src/assets/` is
processed by `astro:assets`. Files in `public/` are copied byte-for-byte — a
3 MB hero dropped there is a silent performance regression. Use `<Image>` and
give the LCP image `loading="eager"` + `fetchpriority="high"`.

**4. Brand comes from the monorepo.** Colours and fonts are lifted verbatim from
`myridesg-v2/apps/web/app/(marketing)/` — Barlow + Barlow Condensed, and the
nine-token palette declared on `.page` in `page.module.css`. They live in the
`@theme` block of `src/styles/global.css`. Do not invent brand values.

**The site has one red: `--color-red`, `#d6321c`**, the app's brand red
(`brandEmber` in `myridesg-v2/packages/tokens`), the same value in both themes.
Use it for fills, rules, marks and large type. As small text it passes AA only
on plain white, so small red text elsewhere takes the foreground colour and the
red goes under it as a line. `--color-ember` and `--color-ember-on-dark` are old
names kept as aliases for branches in review: do not use them in new work. The
drawings of the app (`components/ui/app/`, the `--app-*` tokens) keep the app's
own colours, including its deep header red.

**One named exception: the guides header.** On `/guides/`, `/guides/topic/*`
and `/guides/<slug>/` (BaseLayout `headerTone="deep"`) the site header stands on
the app's deep header red, `--guide-bar: #9b0f06`, with the topic bar under it
on `--guide-bar-low: #7d0c05`. It is a surface colour only: never text, never
on any other page, declared once in `src/styles/guides.css`.
`scripts/one-red.test.mjs` holds it to that.

**5. `src/content/` is vendored.** It mirrors `@myridesg/{domain,data}` from the
monorepo. Keep it in sync; do not refactor it, and do not put presentation
there.

**6. Claim guardrails — do not publish these without current evidence.**
From `myridesg-v2/docs/marketing-site-creative-brief.md`:

- Rider, bike or workshop **counts**
- App-store **ratings** or review counts
- "Verified" workshop claims
- "**Free forever**" (stating current pricing is fine)
- **Real-time** data claims when the feed cadence is not real-time
- **Testimonials** inherited from v1
- Working **booking**, partner rewards or push reminders unless production
  verification confirms them

This matters most when writing marketing copy: it is very easy to generate a
plausible "4,800 riders" and ship a false advertising claim. If a number is
needed and not verifiable, leave it out.

Related: never attach invented ratings or reviews to a **named real business**.

## Known gaps

- `/catalog` is not built yet. It is absent from the nav on purpose; do not
  link it until it exists.
- `/guides` is built and linked, but its content is empty until
  `SANITY_PROJECT_ID` and `SANITY_DATASET` are set — see `.env.example`. The
  build deliberately succeeds without them and renders an empty index, so a
  fresh checkout and a preview deploy need no credentials.
- The demo garage lives on the `feat/demo` branch, not `main`.
- `src/pages/privacy.astro` and `terms.astro` are ported **verbatim** from v2
  and still describe a *web application*. They need legal review for the native
  pivot. Do not edit legal copy — flag it.
- The og:image, `src/assets/og-default.png`, is a flat picture of the home
  page's headline and art. It does not follow the page: change the headline or
  the rider and it needs redrawing by hand.
- The Docker/nginx tester preview doesn't run the Worker, so `/r/*` is a 404
  there. Use `pnpm wrangler dev` after `pnpm build` to try it locally.
