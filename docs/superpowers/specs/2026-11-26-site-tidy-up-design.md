# Site tidy-up — design

**Date:** 2026-11-26 · **Owner decision:** "yes plan it" after seeing the before/after of the
maintenance page and the home page on the design canvas
(https://claude.ai/artifact/L4sDDpZcep9Wtbbe8aFT5K, page "Tidy-up before and after").

## Goal

Make every page pick its sizes, spacing and shapes from one short list, the way Wise does, without
changing the look the owner likes. Fonts, 3D objects, the grey studio, the one red and every word of
copy stay exactly as they are.

## What was measured (merged build of PRs #12–#15, 1440px wide, drawings excluded)

| | Today | Wise allows itself |
|---|---|---|
| Section padding, top/bottom | 8 combinations on home; 104px and 89.6px mixed on feature pages | 1 |
| Section headline sizes | 64, 71, 80, 85, 87.4px across pages | 1 per level |
| Small display labels | 18, 18.6, 20.2, 21.8, 23.8, 27.5, 27.8, 29, 33.6, 36.5px | 1 |
| Body text | 15, 16, 17, 18px | 1 (+1 lead) |
| Card corners | 26, 28, 52px | 1 |
| Card shadows | on the example card of every feature page | none |
| List layouts | 4 on a feature page | 2 |

## Rules

1. **One spacing ladder.** 4, 8, 12, 16, 24, 32, 48px, plus one section padding.
   Section padding is `clamp(3.5rem, 2rem + 5vw, 6rem)`: 96px on desktop, 56px on a phone.
2. **Text by role, not by number.**
   | Role | Size | Used for |
   |---|---|---|
   | small | 14px | notes, captions, meta |
   | body | 16px | every paragraph in a section or card |
   | reading | 17px | long-form only: guides body, support, legal |
   | lead | 20px | the one line under a hero or section headline |
   | label | 24px display | card titles, step titles, point titles |
   | title | `clamp(2.5rem, 1.35rem + 4.4vw, 5rem)` display | every section headline (80px at desktop) |
   Hero headlines keep their own sizes.
3. **A line on top means "read". A card means "press".**
   Items that are not links (benefit points, steps) get a hairline on top and no box.
   Items that are links (tools, guides, coming-next) get one card: flat, `--radius-lg` (28px),
   32px padding, paper on a studio band or studio wall on a paper band.
4. **No card shadows.** The shade behind a card lifts it. Shadows inside the drawings stay.
5. **Every section starts at the left edge.** No centred section headline.
6. **Red means "press here"** (already rule 4 in AGENTS.md; unchanged).

## Left alone on purpose

- The home hero (`.promise`), the feature hero and the dark download band (`.ask`).
- Every drawing: the phone, the bike passport, the cost chart, the bike diagram, `components/ui/app/`.
- Guide article body layout (approved 2026-11-24) — it only swaps to the shared tokens.
- `privacy.astro` and `terms.astro` copy. CSS only.

## Deep red header on guides only

Owner, 2026-11-26: the deep red header should apply "only in blogs page".

- `/guides/`, `/guides/topic/*` and `/guides/<slug>/` get a `#9B0F06` header bar (the app's own
  `homeHeader.surface`) and a `#7D0C05` topic bar. Every other page keeps the white header.
- White text on `#9B0F06` is 8.52:1.
- This is a **second red**, which AGENTS.md rule 4 and `scripts/one-red.test.mjs` forbid today.
  It is admitted as one named exception: a surface colour, guides header only, never text, never
  anywhere else. The rule and the test are changed to say exactly that.
- Inside the red bar the "SG" of the logo and the current-page marker turn white; "Get the app"
  becomes a white button with deep red text.

## Not in scope

Phone-only redesigns, new components, copy changes, the red-header on any non-guide page,
Barlow Condensed 800 (the "Wise rules" sample used it; the owner kept the current fonts).
