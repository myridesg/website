# Guides, calm layout — design

Date: 24 Nov 2026 · Status: **waiting for the owner's approval** · Supersedes the
guide parts of `2026-11-24-site-wide-studio-restyle-design.md` (§3–§4). Support,
delete account, privacy, terms and the 404 keep the look PR #13 already gives
them.

Canvas the owner reviewed: https://claude.ai/artifact/L4sDDpZcep9Wtbbe8aFT5K
(four boards: guide article desktop, guide article phone, guides home, topic
page). Where this document and the canvas disagree, this document wins.

## Why

The owner judged the first restyle of the guides (PR #13: a white panel on the
studio wall, heavy capitals on every heading, tinted boxes) as over-decorated,
and asked for the layout to follow established article pages. Wise's blog was
measured in a real browser at 1440 and 390 px (home, a topic page, two news
posts, three guide-style posts). What it does, and we adopt:

- A plain white page. No panel, no shadow, no wall behind the text.
- One picture first, then topic tags, the title, the author line.
- Two widths: the head 888 px, the text 733 px centred under it.
- The display face only for section names on list pages and the closing band.
- One box style (rounded, hairline border, tinted header) used for the
  contents list and for tables, and a thin line beside key rules.
- Questions as plain headings with their answers showing.
- A second bar under the header with the topics; a page per topic.

## Pages

| Route | What it is |
|---|---|
| `/guides/` | Guides home. Up to 5 newest guides per topic. |
| `/guides/topic/<id>/` | **New.** Every guide in one topic. `<id>` is `maintenance`, `troubleshooting`, `ownership` or `more`. Built only for topics that have guides. |
| `/guides/<slug>/` | Guide article. Address unchanged. |

## Shared parts

**Topic bar (`GuideNav`)** — under the site header on all three pages. A
hairline above and below. "Guides" (bold, links to `/guides/`), then one link
per topic that has guides, labelled `Maintenance`, `Troubleshooting`,
`Ownership`, `More`. The current page's link carries `aria-current="page"` and
an underline. Wraps on a phone.

**Cover (`GuideCover`)** — a rounded panel (`--radius-lg`) in the studio wall's
grey (`--studio-wall-low`) with one of the existing 3D objects centred on it.
No new renders. Sizes: hero 420 px high (240 px on a phone, square corners,
edge to edge), feature card 420 px, card 240 px. The object is about 62% of the
panel's height. Decorative: `alt=""`.

Which object: by the first match on a whole word of the guide's slug —
`oil` → `petrol`; `coe` → `coe`; `petrol`, `fuel` → `pump`; `workshop`,
`workshops` → `workshops`; `parking` → `map`; `insurance`, `tax`, `cost`,
`costs`, `price`, `prices` → `receipt`; `tyre`, `tyres` → `chart`. No match:
a stable pick from the topic's pool (the same guide always gets the same
object) — maintenance `workshops, receipt, chart`; troubleshooting
`workshops, guides, receipt, chart`; ownership `coe, receipt, map`; more
`map, guides, chart`. Keys are `ObjectKey`s from `feature/objects.ts`.

**Byline (`GuideByline`)** — a round picture (the app icon,
`src/assets/home/app-icon.png`), the author's name in bold (or `MyRideSG` when
the guide has no author), and one quiet line. Article: `12 May 2026 (updated
3 June 2026) · Read time 3 minutes`; the bracket only when the updated day
differs from the published day. Card: `12 May 2026 · Read time 3 minutes`.
Singular: `Read time 1 minute`.

Read time = words in the body (prose, questions and answers, table labels and
values, download notes) ÷ 200, rounded, at least 1.

**Card (`GuideCard`)** — the whole card is one link: cover, the topic label
(14 px, semibold, underlined), the title (Barlow 600, 24/30; feature 26/32),
the description (17/26, at most three lines), the byline (small). No border,
no shadow, no background.

**Card grid (`GuideGrid`)** — three across from 900 px, two from 600 px, one
below. So that no card sits alone in a last row, the first `n % 3` cards are
"lead" cards: 2 leads share a row two-to-one (the first is the feature card);
1 lead spans the row as a feature card; 0 leads means rows of three only.

## Guides home

Head: h1 `Motorcycle guides for Singapore riders` (Barlow 600, 36/42; phone
28/34), the existing lead and the existing "Keeping a service record?" line,
word for word.

Then one section per topic that has guides, in the existing order: the topic's
title as h2 in Barlow Condensed 700 capitals (the home page's part-title size,
`clamp(2.5rem, 1.35rem + 4.4vw, 4rem)`), and, when the topic has more than 5
guides, a link `See all 15 guides →` to its topic page. Under it a card grid of
the topic's 5 newest guides (all of them when it has 5 or fewer).

Empty (no Sanity): the existing sentence, `There are no guides published yet.
They will appear here as they go live.`, and no sections.

Ends with `FeatureAsk`, unchanged copy.

## Topic page

Head: h1 = the topic's title in Barlow Condensed 700 capitals
(`clamp(2.75rem, 1.4rem + 5.6vw, 5rem)`), the topic's existing intro line, a
count line (`15 guides`, `1 guide`), and the topic's object beside it from
900 px (maintenance `workshops`, troubleshooting `guides`, ownership `coe`,
more `map`). Then one card grid of every guide in the topic, newest first.
Ends with `FeatureAsk`.

Title tag: `<Topic title> guides for Singapore riders`. Description: the topic
intro. Structured data: `CollectionPage` + `BreadcrumbList` (Home / Riding
guides / topic title) + `ItemList`, as the home has.

## Guide article

Top block, 888 px: hero cover; two tags (`Guides` → `/guides/`, the topic label
→ its topic page); h1 in Barlow 600, 36/42 (phone 28/34), normal case, no ember
full stop; the byline.

Text column, 733 px, 18/28 (phone 17/27), 32 px between blocks (phone 28):

1. The description as the first paragraph (plain weight).
2. **Contents box** `In this guide`, when the body has two or more h2
   headings: a rounded box (hairline, `--radius-lg`), a tinted header
   (`--color-soft`), a list of links to each h2.
3. The body.

Body elements:

| Element | Look |
|---|---|
| h2 | Barlow 700, 26/32 (phone 24/30), normal case. Carries the id its contents link points at. |
| h3 | Barlow 600, 21/28 |
| Paragraph, list | 18/28, `--studio-text`; bullets in ink |
| Link | Ink, semibold, underlined (unchanged from PR #13) |
| Callout | A `<blockquote>` with a 2 px line on the left: ember (`--studio-dot`) for a warning, `--studio-numeral` for a note or tip. No fill. A warning keeps a bold `Warning` lead-in so the meaning never rests on colour alone. |
| Specs table | The contents box's frame (rounded, hairline), one row per pair, hairlines between; label in bold ink left, value right; stacked on a phone. No small capitals. |
| Download block (`cta`) | One black panel (`--color-black`, `--radius-lg`): the note in white, 22/30 semibold; the store buttons (`tone="light"`); the receipt object at the right from 600 px. With an authored link: the link as a white button instead of the store buttons. A hairline border so it reads on the dark theme. |
| Questions (`faq`) | Each question an h3, its answer under it, all showing. No accordion. |
| Related links (in body) | A plain bulleted list of links under a bold `Related guides` line. |
| COE calculator | Untouched (batch 1 owns it). |

After the text: `More guides` (h2, 26/32) over up to 3 cards (the existing
`relatedGuides` pick, or nothing when the body has its own related-links
block); then `FeatureAsk`; then the footer.

The maintenance guides' closing line ("Keep the date, mileage and cost…") stays,
as a plain paragraph.

Structured data: unchanged, plus (a) the breadcrumb gains the topic level
(Home / Riding guides / topic / title) and (b) the questions join the page's
one JSON-LD graph as a `FAQPage`; `FaqBlock` stops emitting a second
`<script>`, which the site's validator rejects.

## Colour and theme

Revised twice on 25 Nov 2026. The first build was "grey and white"; a second
pass washed the pages in the brand's rose and red, which the owner rejected as
template-looking. What stands, taken from where Wise's blog puts its colour
and using our own palette only (`global.css`; `AGENTS.md` rule 4):

| Rule (Wise) | Ours |
|---|---|
| Colour in the frame: the topic bar in the brand's dark colour | Topic bar on `--color-black`, white links, the current topic underlined in `--color-ember-on-dark` |
| Links and tags are dark text, underlined | Ink (`--studio-headline`) with a 2px underline in `--home-accent` (brand red on light, the lightened ember on dark): links in the text, topic tags, "See all", a card's title on hover |
| One bright accent for markers | `--studio-dot` (ember): the callout's line (every tone) and the full stop after a topic page's h1. Bullets stay grey. |
| Tints are quiet | The contents box's header on `--color-soft` |
| The reading column stays white | Page ground `--color-paper`; text `--studio-text`; headings `--studio-headline`; quiet text `--studio-note`; hairlines `--studio-rule` |

**Picture panels are stand-ins.** Until guides carry photographs, a panel is
the studio grey the objects were lit against (`--studio-wall-low`; the floor's
grey in dark), deliberately neutral. A real picture replaces the panel and its
colour (post-form plan, phase 2).

Three components were redrawn after the same review, each taking Wise's own
device in place of a template one:

- **Byline:** name and one quiet line. No picture: Wise shows the author's
  photograph, we have none, and a stand-in repeated on every card is noise.
- **Download block (`cta`):** the note in bold ink over the store buttons,
  centred in the column, no box (Wise's centred sign-up line). An authored
  link is the header's black button.
- **Lists:** grey bullets, not ember.

Both themes come from the tokens' own `light-dark()` values.

Other departures from the sections above, settled in the build: card titles
are h2 on a topic page (straight under its h1) and h3 elsewhere; "More guides"
is as wide as the list pages' card rows; card pictures are 14rem high.

## Not in this change

- Real photographs, cover images from the CMS, author pictures.
- "Details correct as of" dates, source lists, disclaimers (need CMS fields:
  see the post-form plan).
- News, app updates, stories, a "Latest" row, renaming the menu to "Blog".
- Support, delete account, privacy, terms, 404: unchanged.
- `AGENTS.md` (PR #12 edits it): the new `guides.css` and components are
  listed there in a follow-up once #12 merges.
