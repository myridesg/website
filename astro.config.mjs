// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  // Canonical origin. Required for <link rel="canonical">, sitemap and RSS.
  // Override per environment with SITE_URL (preview deploys, staging).
  site: process.env.SITE_URL ?? 'https://myridesg.com',

  // Fully static: every route is prerendered at build time. There is no server
  // at runtime, so no route may fetch on request. See AGENTS.md.
  output: 'static',

  // Pages are emitted as directories (/guides/index.html), so /guides/ is the
  // canonical address and /guides only reaches it through a 308. Every internal
  // link was written without the slash, which meant every internal navigation
  // on the site paid a redirect round trip and the canonical URL itself had no
  // inbound links — an SEO audit read all 32 pages as orphans behind 32 Critical
  // redirects. The links are fixed; this stops them regressing, by making the
  // dev server refuse the slashless form instead of quietly serving it.
  //
  // The redirect in config/nginx.conf stays regardless: it is what catches
  // inbound links from elsewhere, which we do not control.
  trailingSlash: 'always',

  // Content Security Policy. Astro hashes every inline script and style it
  // emits and writes them into a <meta http-equiv> on each page. That is the
  // only mechanism that works here: the site has no external script files at
  // all — every script is small enough that Astro inlines it into the document
  // — so a fixed `script-src 'self'` header would block the theme toggle, the
  // menu and the scroll handler, and a hand-maintained hash list would go stale
  // on the next build.
  //
  // The site loads nothing off-origin: images come from astro:assets, fonts are
  // @fontsource (bundled), and Sanity is read at build time only. Hence 'self'
  // everywhere and 'none' for the things nothing uses — there are no forms, no
  // fetch calls, no workers and no manifest.
  //
  // Two directives a <meta> CSP cannot carry — frame-ancestors, which every
  // browser ignores there, and HSTS, which is not CSP at all — live in
  // config/nginx.conf and public/_headers instead. Keep those in sync with this.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      // PhoneFrame computes --pf-width/--pf-scale/--pf-bezel per instance from
      // its `variant` and `width` props, so its custom properties can only ride
      // on a style attribute — there is no fixed set of values to hoist into a
      // class. A hash is no help either: CSP ignores hashes for style
      // attributes unless 'unsafe-hashes' is present, and the hash would change
      // whenever a caller passes a different width.
      //
      // Scoped to `attribute` on purpose. This relaxes style-src-attr only;
      // <style> and <link rel=stylesheet> stay on style-src-elem with Astro's
      // generated hashes, so an injected stylesheet is still refused.
      styleDirective: {
        resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },

  // No React. Nothing on the site is an island — the accordions and the menu
  // are <details>, the theme toggle and the phone screens are .astro — and the
  // integration emitted a ~190 KB client runtime into dist/_astro/ that no page
  // ever referenced. Add it back the day something genuinely needs it:
  //
  //   pnpm add @astrojs/react react react-dom
  //   pnpm add -D @types/react @types/react-dom
  //
  // then re-add react() here and the jsx options to tsconfig.json. Note that
  // the feat/demo branch DOES have an island (DemoGarage.tsx), so it needs all
  // of the above restored before it can build against this config.
  integrations: [sitemap()],

  // Nothing on this site is authored in Markdown today — guides arrive as
  // Portable Text and every page is .astro — so this highlighter never runs.
  // It is set anyway because Shiki, the default, styles tokens with inline
  // `style` attributes that the CSP above cannot hash, and it warns about that
  // on every build. Prism emits class names instead, so the warning goes and a
  // Markdown page added later still gets highlighted (it would need a Prism
  // theme in global.css to be coloured).
  markdown: {
    syntaxHighlight: 'prism',
  },

  // Images: WebP is the delivery standard for this site. <Image> already emits
  // WebP by default, so there is no format config here — set `format` on the
  // component only when a specific page needs to differ.
  //
  // Sources MUST live in src/assets/ so astro:assets can process them. Anything
  // placed in public/ is copied byte-for-byte with NO optimisation, which on a
  // 2.7 MB hero is a silent performance regression.

  // Local dev and `astro preview` only. There is no server in production, so
  // nothing here ships — it exists so the site can be shared for review.
  //
  // allowedHosts is the part that matters. Vite rejects any request whose Host
  // header it does not recognise (DNS-rebinding protection), and a Cloudflare
  // quick tunnel arrives as a randomly generated *.trycloudflare.com hostname.
  // Without this, the tunnel URL returns a bare "Blocked request" page instead
  // of the site, which looks like the tunnel is broken when it is not.
  //
  // A leading dot matches the domain and all its subdomains.
  server: {
    // Bind 0.0.0.0 so a phone on the same network, or a container, can reach
    // the dev server. cloudflared itself only needs localhost.
    host: true,
    port: 4321,
    allowedHosts: [
      '.trycloudflare.com', // quick tunnels: pnpm tunnel
      '.cfargotunnel.com', // named tunnels, default hostname
      // Named tunnel on a real domain, or any other host, without editing this
      // file: DEV_ALLOWED_HOSTS=preview.myridesg.com pnpm dev
      ...(process.env.DEV_ALLOWED_HOSTS?.split(',')
        .map((host) => host.trim())
        .filter(Boolean) ?? []),
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
