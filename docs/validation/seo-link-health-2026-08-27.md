# SEO and link-health validation — 27 August 2026

Application revision `3854069c6a423aebccad4292f546459fa5d4eadc` was
checked with deterministic Node tests, Playwright Chromium, and local vinext
development and production servers. The target production origin is
`https://system-design-studio.v-dovnich.chatgpt.site`.

## Policy and results

Home, workshop, 18 guides, and 30 handbook sections are indexable and
self-canonical. Owner and API routes are excluded by robots and response
headers; unknown routes are noindex without a canonical. Introduction and
workshop aliases plus trailing slashes redirect to one canonical route.

| Evidence | Result |
| --- | --- |
| 50 unique sitemap routes, titles, descriptions, canonicals, H1s | PASS |
| Absolute Open Graph/Twitter data; valid 1731×909 PNG | PASS |
| Robots, private/API exclusions, aliases, malformed routes, 404s | PASS |
| Rendered internal routes, anchors, favicon, and social image | PASS |
| Owner SSR contains no comment, email, or API-key data | PASS |
| 97 external sources: 94 pass, 0 fail, 3 HTTP 403 | PASS WITH LIMITATION |
| 114 unit/component and 68 browser/accessibility tests | PASS |
| Local production route and metadata smoke | PASS |

The ISO pages S1/S46 and OpenAI guide S63 remain `UNVERIFIED` by automation
because of bot protection, not classified as broken. Structured data was not
added: the site has no crawlable search-results URL or reviewed rich-result
schema contract, so adding markup would be speculative.

Commands: `npm test`, `npm run lint`, `npm run check:generated`, production
dependency audit, `npm run build`, `npm run test:e2e`, and
`npm run check:external-links`. Production dependencies have zero known
vulnerabilities. The known development-toolchain audit findings remain owned by
issue #68. Public-origin proof remains pending merge and pinned Sites deploy.
