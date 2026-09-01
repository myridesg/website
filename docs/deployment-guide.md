# Deploying to Cloudflare Pages

Production for this site is **Cloudflare Pages**, building from source on every
push. This document covers that path only.

The `Dockerfile` and `config/nginx.conf` in this repo are **not** production.
They build the Coolify tester preview at `mrs.itzmaniss.dev`, which serves a
`noindex` copy of the site for review. Nothing in this guide touches them.

## What Pages needs to know

| Setting | Value |
|---|---|
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | repository root |

Everything else is environment variables, below.

## Pin the toolchain first — the default will fail

This is the one setting that is not optional and not obvious.

The Cloudflare build image (build system v3) defaults to **pnpm 10.11.1**. This
repo requires **pnpm 11**: install-script policy lives in `pnpm-workspace.yaml`
under `allowBuilds`, which is a pnpm 11 key. On pnpm 10 that policy is not
understood, so at best the `esbuild: false` decision recorded there is silently
ignored and at worst the install fails outright.

Set both as environment variables on the Pages project:

```
PNPM_VERSION = 11.20.0
NODE_VERSION = 22.16.0
```

`PNPM_VERSION` must match `packageManager` in `package.json` and the pnpm pin in
`.mise.toml`. If you bump one, bump all three.

`NODE_VERSION` is less critical — the image default already satisfies the
`>=22.12.0` in `package.json` — but pinning it stops a future image update from
moving Node underneath a build that was working.

## Environment variables

Set these in **Settings → Environment variables**. Pages keeps Production and
Preview separate, and **variables do not inherit from one to the other** — a
variable set only on Production gives you a Preview build with no Sanity content
and no warning loud enough to notice. Set them on both.

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `PNPM_VERSION` | `11.20.0` | `11.20.0` | See above. Required. |
| `NODE_VERSION` | `22.16.0` | `22.16.0` | Recommended. |
| `SANITY_PROJECT_ID` | set | set | Required for `/guides`. |
| `SANITY_DATASET` | set | set | Required for `/guides`. |
| `SANITY_API_READ_TOKEN` | set, **encrypted** | set, **encrypted** | See below. |
| `SANITY_API_VERSION` | omit | omit | Defaults to the date pinned in `src/lib/content.ts`. |
| `SITE_URL` | omit | omit | Defaults to `https://myridesg.com`. See below. |

Values live in `.env.example`; the real ones are in `.env`, which is
gitignored and must never be committed.

### The Sanity read token is load-bearing

The dataset is public, but every article was migrated with a dotted `_id`
(`article.<slug>`), and Sanity's default public grant is `_id in path("*")`,
where `*` matches a single segment. The guides are therefore **not** anonymously
readable and the token is required to build them.

Mark it as **encrypted** in the Pages dashboard so it is not readable back.

Widening the Sanity grant to `path("**")` would remove the need for the token
entirely, and would also re-enable Sanity's CDN, because `src/content/sanity/client.ts`
sets `useCdn: !cfg.token`. That is the better long-term fix.

### SITE_URL, and why Preview should not set it

`SITE_URL` sets the canonical origin for `<link rel="canonical">`, the sitemap
and RSS. It defaults to `https://myridesg.com`, which is already correct for
production, so **leave it unset on both environments**.

Leaving it unset on Preview is deliberate, not an oversight: a preview build then
emits canonicals pointing at production, which is exactly what you want. A
preview that declares itself canonical is a duplicate of the whole marketing site
competing with production in the index.

## Sanity is optional, and that is a trap

The build **succeeds** with `SANITY_PROJECT_ID` / `SANITY_DATASET` unset. It
renders an empty `/guides` index and moves on, so a fresh checkout and a preview
deploy need no credentials.

That means a misconfigured deploy is green. The only signal is a line in the
build log from `src/lib/content.ts`:

```
[content] SANITY_PROJECT_ID / SANITY_DATASET are not set — /guides will build empty.
```

**After any deploy that touches configuration, check that `/guides/` lists
articles.** A green build is not evidence that it does.

## First-time setup

1. Cloudflare dashboard → **Workers & Pages** → **Create application** →
   **Pages** → **Import an existing Git repository**.
2. Pick the repo, **Begin setup**.
3. Build command `pnpm build`, output directory `dist`.
4. Add the environment variables above **before the first build**, for both
   Production and Preview. Pages detects `pnpm-lock.yaml` and uses pnpm
   automatically; it is the *version* you have to pin.
5. **Save and Deploy.**
6. When it finishes, open `/guides/` and confirm articles are listed.

After this, every push to the default branch deploys to production, and every
pull request gets its own preview URL.

## Response headers

`public/_headers` is copied verbatim into `dist/` and read by Pages. It carries
the framing rule, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and
the immutable cache policy for `/_astro/*`.

The bulk of the Content-Security-Policy is **not** there. Astro generates it per
page as a `<meta http-equiv>`, because every script on this site is inlined into
the document and only the build knows their hashes — see `security.csp` in
`astro.config.mjs`. `_headers` carries only `frame-ancestors`, which a `<meta>`
CSP cannot express. Both policies apply to a page and it must satisfy both.

`config/nginx.conf` mirrors `public/_headers` for the Docker preview. **Change
one, change the other.**

## Verifying a deploy

```bash
# Headers, including the ones _headers is responsible for.
curl -sI https://myridesg.com/ | grep -iE 'strict-transport|content-security|x-frame|referrer|permissions'

# The generated CSP lives in the HTML, not the headers.
curl -s https://myridesg.com/ | grep -o '<meta http-equiv="content-security-policy"[^>]*>' | head -c 200

# Guides actually built — expect ~29, not 0. Note `grep -o | wc -l`, not
# `grep -c`: Astro emits minified HTML, so every link is on the same line and
# `grep -c` would report 1 no matter how many there are.
curl -s https://myridesg.com/guides/ | grep -o 'href="/guides/[a-z]' | wc -l

# Internal links must not redirect. Anything but 200 is a regression of
# trailingSlash: 'always' — see astro.config.mjs.
curl -s -o /dev/null -w '%{http_code} %{num_redirects}\n' https://myridesg.com/guides/
```

## Rolling back

Pages keeps every deployment. **Workers & Pages → the project → Deployments**,
find the last good one, **Manage deployment → Rollback**. This is instant and
does not rebuild, which makes it the right first move during an incident —
diagnose afterwards.

## Building the same thing locally

```bash
pnpm install
pnpm check     # must be 0 errors
pnpm build     # → dist/
pnpm preview   # serve dist/ exactly as built
```

`pnpm build` reads `.env`. `pnpm check` is not part of `pnpm build`; if you want
Pages to refuse a deploy that fails type checking, set the build command to
`pnpm check && pnpm build`.
