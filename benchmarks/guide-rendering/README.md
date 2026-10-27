# Local guide-rendering benchmark

Measured on 14 October 2026 on an Apple M4 Pro, Node 26.7.0 and Astro 7.2.4.
The production site remains static. The benchmark builds an isolated on-demand
copy in a temporary directory and uses the existing guide template, layouts,
Portable Text components, Sanity mappers and security policy.

## Results

Each row has 20 warm-up requests followed by 200 sequential uncached requests.
Node timings await the entire generated HTML body. Worker timings also include
the local HTTP client, loopback connection and Wrangler proxy.

| Page | Local Node median | Local Node 95th percentile | Local Worker median | Local Worker 95th percentile |
| --- | ---: | ---: | ---: | ---: |
| Short article | 0.56 ms | 1.22 ms | 1.94 ms | 2.83 ms |
| Typical article | 0.67 ms | 1.90 ms | 1.93 ms | 2.84 ms |
| Long article | 1.14 ms | 2.87 ms | 2.45 ms | 8.71 ms |
| Index with 29 sample guides | 0.28 ms | 0.39 ms | 1.45 ms | 2.28 ms |

Five fresh Node processes took 17–19 ms to import the built entry, then 19–22 ms
for the first short-article response. Observed peak Node resident memory was
about 220 MiB. Resident memory is not the allocated memory used for billing.

With 200 ms of **simulated** upstream delay, the mean typical-article response
was approximately 205.6 ms. With a 1 GB function allocation and 95% of HTML
requests served by the CDN cache, that models:

| Assumed monthly guide views | Estimated compute |
| --- | ---: |
| 10,000 | 0.029 GB-hours |
| 100,000 | 0.286 GB-hours |

These estimates exclude cold starts, platform/adapter overhead, other
functions, bandwidth, requests and deployment credits. The cache-hit rate is
an assumption, not a measured or guaranteed CDN hit rate. The benchmark
prototype intentionally has no HTML response cache, so every timed request
renders the page.

## Limits of these results

- The current Sanity credentials returned HTTP 401. The successful timing runs
  use explicitly synthetic articles: approximately 14, 30 and 80 KB of Portable
  Text, including headings, paragraphs, a specification table and FAQ blocks.
  The guide index contains 29 sample entries. No synthetic content is added to
  the website source or CMS.
- Data parsing and the existing Sanity mappers are exercised, but timed loops
  use local fixtures. The 200/500 ms waits are scenarios, not actual Sanity
  response measurements.
- The Node test uses a small benchmark-only adapter around Astro's production
  `App`. It is not the Netlify adapter or a Lambda execution environment.
- Cloudflare's local `workerd` successfully served every benchmark route and
  returned 404 for an unknown slug. It used Wrangler 4.127.1 with the installed
  runtime's supported compatibility date, 2026-09-04.
- Local HTTP duration and Node process CPU are not Cloudflare's metered CPU.
  Local V8 CPU sampling was unavailable. No result establishes that the
  deployed application fits Cloudflare Free's 10 ms CPU budget. A deployed
  preview with real articles and Cloudflare CPU metrics is the next check.
- Images, static asset downloads, production CDN behaviour, concurrency and
  production billing have not been benchmarked.

The rendering results support testing cached on-demand guides. They do not
require a hosting migration: modeled compute is small at the stated cache
rates, while Netlify's bandwidth and shared credit usage still need tracking.

## Repeat the Node benchmark

From the website repository:

```sh
node scripts/benchmark-guides.mjs
```

To attempt a snapshot of actual published guides with the existing local
Sanity configuration, then retain the isolated copy for Worker tests:

```sh
node scripts/benchmark-guides.mjs --sanity --keep
```

The runner falls back to synthetic fixtures if the CMS cannot be read. It
prints only a sanitized failure status, never credentials. With working CMS
access, it selects the shortest, middle and longest guide by Portable Text
payload size. Results overwrite `latest.json`.

## Repeat the local Worker test

Use the retained directory printed by the previous command:

```sh
node scripts/benchmarks/prepare-cloudflare.mjs <retained-directory>
```

Inside that temporary directory, build and start the local runtime:

```sh
node node_modules/astro/bin/astro.mjs build --config astro.cloudflare.config.mjs
node node_modules/wrangler/bin/wrangler.js dev --config dist-cloudflare/server/wrangler.json --local --ip 127.0.0.1 --port 8789 --inspector-port 9235
```

From a second terminal in the original website repository:

```sh
node scripts/benchmarks/cloudflare-local.mjs <retained-directory>/cases.json benchmarks/guide-rendering/cloudflare-local.json
```

Stop the local Worker after the test. These commands build/run the temporary
fixture copy; they do not deploy it. The optional V8 sampler may be unavailable
in the installed runtime. Where available, its aggregate estimate is still
not production CPU metering.

## References

- [Netlify compute calculation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- [Cloudflare CPU and request limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare local runtime](https://developers.cloudflare.com/workers/local-development/)

Raw results: `latest.json` and `cloudflare-local.json`.
