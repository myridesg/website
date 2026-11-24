# Guide Post Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the article form in the content system (Sanity Studio) tell a writer what to enter and hold every post to one standard.

**Architecture:** The form is `apps/admin/src/sanity/schemas/article.ts` in the **`myridesg-v2`** repository, not this website. Phase 1 changes only that repository: guidance, validation and three new fields, all optional for existing posts so nothing already published breaks. Phase 2 is a small website PR that reads the new fields. Phase 3 (new kinds of post) waits for the Blog.

**Tech Stack:** Sanity v5 schema (`defineType`/`defineField`), TypeScript, vitest (`apps/admin`, `packages/data`, `packages/domain`).

**Spec:** this document's "The standard" and "Fields" sections are the spec. Context: `docs/superpowers/specs/2026-11-24-guides-calm-layout-design.md` ("Not in this change").

**Where it runs:** a new session in `/Users/hid/Developer/myridesg-v2`, in its own worktree cut from `origin/main` (the main checkout is on `research/stampede-replica` with untracked files; do not touch it). One PR.

## Global Constraints

- No existing article may become invalid: every new field is optional or raises a **warning**, never an error, on documents written before this change. The one exception, `topic`, is an error only after the backfill (Task 4) has run.
- Do not rename or remove any existing field or block: the website and the app read them.
- No new block types in Phase 1. A block the website has no component for is rendered as nothing (see `src/components/ui/guide/GuideBody.astro` in the website), so a block and its renderer ship together (Phase 3).
- The claim rules are the website's (`AGENTS.md` rule 6; patterns in the website's `scripts/check-claims.mjs`). Copy the patterns, with a comment naming that file as the source.
- Writing to the production dataset (the backfill) is the owner's action: the script's default is a dry run, and applying needs the owner's explicit yes and their write token.
- Before finishing: `pnpm --filter @myridesg/admin typecheck`, `lint`, `test`; `pnpm --filter @myridesg/data test`; `pnpm --filter @myridesg/domain test` all pass.

## The standard (what the form will ask of a writer)

| Part | Rule | Enforced as |
|---|---|---|
| Title | What a rider would type into a search box. 80 characters at most. No year unless the facts are tied to it. | Error over 80; help text |
| Summary (`description`) | One or two sentences: what the reader will learn. 200 characters at most. Shown as the first paragraph and in search results. | Error over 200; help text |
| Kind (`category`) | Guide, Bike model or News. | Required (as today) |
| Topic | Maintenance, Troubleshooting, Ownership or More. | Required for a Guide |
| Cover picture | A real photograph, landscape, at least 1776 × 900 px, no words in the picture. | Warning when missing or too small |
| Picture description | What the picture shows, for blind readers and search. | Required when a picture is set |
| Author | A person with a name and picture. | Required (as today) |
| Body | Headings are H2 and H3 only. A guide has at least two H2s. Prices and comparisons go in a table. Three to six questions in one FAQ block near the end. One download block. | Styles limited; warnings |
| Facts checked on | The day every price and rule in the post was last checked. | Warning when a Guide has none |
| Sources | Where each price and rule came from. | Optional list |
| Claims | No rider or workshop counts, ratings, "verified", "free forever", "real-time", testimonials, or booking promises. | Warning naming the phrase |
| Related posts | Up to 6. | As today |

## Fields

| Field | Type | Notes |
|---|---|---|
| `topic` | `string`, list `maintenance` "Maintenance", `troubleshooting` "Troubleshooting", `ownership` "Ownership", `more` "More" | Hidden unless `category == 'guide'` |
| `heroImage.alt` | `string` field on the existing image | |
| `factsCheckedAt` | `date` | |
| `sources` | `array` of `{ label: string, url: url }`, at most 20 | |
| Field groups | `content` (title, slug, description, heroImage, body), `details` (category, topic, author, tags, relatedSlugs, factsCheckedAt, sources, publishedAt, updatedAt), `seo` | Order as listed |

## Review Focus

1. **Opening an old article** (no topic, no checked date, no picture) shows warnings only and can still be published with a one-word edit — until the backfill has run.
2. **A News or Bike-model article** is never asked for a topic.
3. **A claim phrase inside a table cell or an FAQ answer**, not only in paragraphs, is caught.
4. **A picture with no description** blocks publishing; **no picture at all** only warns.
5. **The backfill run twice** changes nothing the second time, and never overwrites a topic a writer chose.

---

### Task 1: Guidance and limits on the existing fields

**Files:** Modify `apps/admin/src/sanity/schemas/article.ts`. Test: `apps/admin/src/__tests__/article-schema.test.ts` (new; follow `studio-layout.test.tsx` for setup).

- [ ] **Step 1: Failing test:** every field in the article schema has a non-empty `description`; `body`'s block member allows exactly the styles `normal`, `h2`, `h3`; the three groups exist and every field belongs to one.
- [ ] **Step 2:** Run `pnpm --filter @myridesg/admin test` → FAIL.
- [ ] **Step 3:** Add the help text (the wording of "The standard" above, one sentence per field), the groups, and `styles: [Normal, Heading (H2), Sub-heading (H3)]` on the body's `block`.
- [ ] **Step 4:** Run → PASS. Commit.

### Task 2: New fields

**Files:** Modify `article.ts`; `packages/domain/src/content/entities.ts`; `packages/data/src/sanity/mappers.ts`, `content-repository.ts` (GROQ projections). Tests: the existing `__tests__/entities.test.ts`, `mappers.test.ts`, `content-repository.test.ts`, plus `article-schema.test.ts`.

**Interfaces — Produces:**
```ts
// packages/domain: Article and ArticleSummary gain
topic: 'maintenance' | 'troubleshooting' | 'ownership' | 'more' | null
// Article gains
factsCheckedAt: Date | null
sources: Array<{ label: string; url: string }>
heroImageAlt: string | null
```
- [ ] **Step 1: Failing tests:** mapper tests for a doc with all four present and a doc with none (→ `null`, `null`, `[]`, `null`); schema test that `topic` is hidden for `category: 'news'`, and that `heroImage` with an asset and no `alt` fails validation while no `heroImage` passes.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Add the fields per the "Fields" table and the mapping. **Step 4:** Run all three packages' tests → PASS. Commit.

### Task 3: Warnings that hold the standard

**Files:** Create `packages/sanity-contract/src/shared/claims.ts` (+ test beside it); modify `article.ts`.

**Interfaces — Produces:** `findBannedClaims(text: string): string[]` (same behaviour as the website's `scripts/check-claims.mjs`); `articleText(doc): string` flattening title, description and every string in the body (paragraphs, table labels and values, questions and answers, callouts, download notes).

- [ ] **Step 1: Failing tests:** `findBannedClaims('Join 4,800 riders') → ['4,800 riders']`; `'does not book'` → `[]`; `articleText` includes a table value and an FAQ answer; document-level validation returns a **warning** (not an error) naming the phrase; a Guide with one H2 warns "A guide needs at least two headings"; a Guide with no `factsCheckedAt` warns; a `heroImage` narrower than 1776 px warns.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement as `validation: (rule) => rule.custom(...).warning()` at document level. **Step 4:** Run → PASS. Commit.

### Task 4: Give the 30 existing guides a topic

**Files:** Create `apps/admin/src/scripts/backfill-article-topic.ts` (+ test for its pure part).

**Interfaces — Produces:** `topicFor(slug: string, tags: string[]): Topic` — a port of the website's `groupOf` in `src/lib/guide-navigation.ts` (same keyword lists, same order), so today's grouping is what gets saved.

- [ ] **Step 1: Failing test:** `topicFor` on the 30 live slugs gives 5 maintenance, 15 troubleshooting, 6 ownership, 4 more (the split on the live `/guides/` page).
- [ ] **Step 2:** Implement `topicFor` and the script: by default it prints `slug → topic` for every guide with no topic and writes nothing; with `--apply` it patches only documents whose `topic` is unset.
- [ ] **Step 3:** Run the dry run against production with a read token; give the owner the list to check.
- [ ] **Step 4:** After the owner's yes, the owner (or the session with the owner's token and explicit go-ahead) runs `--apply`; run the dry run again → prints nothing.
- [ ] **Step 5:** Make `topic` an error-level requirement for Guides in `article.ts`. Commit.

### Task 5: The writer's guide

**Files:** Create `docs/content/writing-a-guide.md`; modify `article.ts` (the document's description links to it).

- [ ] **Step 1:** Write it from "The standard", in plain words, with one worked example (the oil-change guide) and a ten-line checklist to run before publishing.
- [ ] **Step 2:** Open the Studio locally (`pnpm --filter @myridesg/admin dev`), create a throwaway draft, and confirm by eye: groups, help text, the hidden topic for News, each warning. Delete the draft. Screenshot the form for the PR.
- [ ] **Step 3:** Open the PR. It changes no published content by itself.

---

## Phase 2 — website (separate small PR, after Phase 1 is live and the backfill has run)

In this repository, after the guides plan has merged:

- Vendor the new fields into `src/content/entities.ts` and `src/content/sanity/mappers.ts` (kept in step with the monorepo, `AGENTS.md` rule 5).
- Topic comes from `article.topic`, falling back to `groupOf()` when it is null.
- Show `Details correct as of <date>` under the article's byline when `factsCheckedAt` is set, and a numbered `Sources` list at the end.
- Cover pictures and author pictures from the CMS need a decision first: `AGENTS.md` rule 3 says images go through `astro:assets` from `src/assets/`, and a remote Sanity image does not. Raise it with the owner; until then the objects stay.

## Phase 3 — with the Blog (not planned here)

New kinds (App update, Comparison, Review, Story, Event, Deal), their page layouts on the website, and the blocks they need (multi-column table, pros and cons, steps). Each kind's form fields and its website template ship in the same change.
