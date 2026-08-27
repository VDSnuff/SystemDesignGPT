# SEO and link-health validation — 27 August 2026

## Evidence identity

| Field | Value |
| --- | --- |
| Application revision | `b69f0b012a650b367cfb1b794ad60229516c1ec9` |
| Environment | Local vinext development server and deterministic Node checks |
| Production origin | `https://system-design-studio.v-dovnich.chatgpt.site` |
| Browser engine | Playwright Chromium |
| Scope | Issue #67 SEO, metadata, crawlability, sharing, and link health |

The evidence below applies to the application revision above. This report-only
commit does not change runtime behavior.

## Indexability policy

| Route family | Policy | Canonical behavior |
| --- | --- | --- |
| `/` | Index and follow | Canonical handbook introduction |
| 18 `/chapter/*` guides | Index and follow | Self-canonical |
| 30 `/book/*` handbook sections | Index and follow | Self-canonical |
| `/workshop` | Index and follow | Self-canonical |
| `/owner/*` | Noindex, nofollow, robots disallow, `X-Robots-Tag` | Self-canonical for navigation consistency |
| `/api/*` | Robots disallow and `X-Robots-Tag: noindex, nofollow` | Not included in sitemap |
| Unknown or malformed routes | HTTP 404 and noindex | Not included in sitemap |

The legacy aliases `/book/introduction` and `/chapter/diagram-workshop`
redirect to `/` and `/workshop`. Trailing-slash requests redirect to the
single slashless path, preventing duplicate route variants.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Canonical inventory | PASS | 50 unique indexable URLs: home, workshop, 18 guides, and 30 handbook sections |
| Server-rendered content | PASS | Every indexable URL returned HTTP 200 with one H1 and meaningful HTML without client JavaScript |
| Titles and descriptions | PASS | All 50 pages had unique titles, non-empty descriptions, and self-canonical URLs |
| Social metadata | PASS | Open Graph and Twitter metadata resolved to absolute URLs; `/og.png` is a valid 1731×909 PNG |
| Robots and sitemap | PASS | Private/API exclusions matched the sitemap and route inventory |
| Internal routes and anchors | PASS | Every authored and rendered internal target resolved; one stale Scale/Performance anchor was corrected |
| Public assets | PASS | Favicon and social image returned HTTP 200 |
| Error and alias behavior | PASS | Canonical redirects, trailing slash, malformed slug, and intentional 404 contracts passed |
| Sensitive SSR content | PASS | Owner HTML contained no comment data, email address, or API-key marker |
| External sources | PASS WITH LIMITATION | 97 checked: 94 PASS, 0 FAIL, 3 UNVERIFIED due HTTP 403 bot protection |

The three automated external checks left unverified were the two ISO standard
pages and OpenAI's practical agent guide. Their exact URLs remain in the source
register; HTTP 403 is classified as bot protection, not as a broken link.

## Structured-data decision

No structured data was added. The site does not currently expose a crawlable
search-results URL for `SearchAction`, and the interactive section pages do not
yet have a reviewed schema contract that would qualify them for a specific rich
result. Canonical metadata, sitemap coverage, and social cards provide the
current discoverability contract without speculative markup.

## Commands

```bash
npx vitest run tests/seo-links.test.ts tests/validation-manifest.test.ts
npm run lint
npm run check:generated
npm run build
npm run test:e2e:seo
npm run check:external-links
```

Production metadata and route behavior remain unverified until this revision is
merged, deployed as a pinned Sites version, and checked at the public origin.
