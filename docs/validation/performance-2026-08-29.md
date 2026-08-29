# Performance validation — 29 August 2026

## Verdict

`PASS` for the issue #66 boundaries: local production rendering and bundle
budgets, bounded browser interaction costs, isolated local D1 concurrency and
rate limiting, and repeatable hosted public/signed-out measurement. The final
merge SHA, CI artifacts, two hosted runs, Sites version, and postdeploy result
are recorded in the issue closeout because they do not exist until after merge.

This report does not claim authenticated production D1 isolation, real-provider
latency/cost, or multi-instance saturation. Those boundaries remain owned by
#61 and #62 and are not replaced by synthetic or signed-out evidence.

## Method and blocking rules

The machine-readable thresholds are in
[`performance-budgets.json`](./performance-budgets.json). The browser gate uses
a fresh Chromium context per route against a Vinext production build. Desktop
is 1440×900 at 1× CPU, 20 ms latency, and 40 Mbps. Mobile is 390×844 at 4× CPU,
40 ms latency, and 20 Mbps. Both disable the browser cache.

The gate blocks on any route above its LCP, CLS, TBT, TTFB, raw-JS, or gzip-JS
budget; a Mermaid parser request on a non-diagram route; any interaction above
its declared wall-time budget; any unexpected status; non-zero error rate; API
or D1 p95 above its threshold; a non-atomic comment limit; or failed synthetic
cleanup/recovery. LCP and CLS use buffered PerformanceObserver entries. TBT is
the sum of long-task time above 50 ms. Script execution comes from Chrome's
Performance domain. Transferred bytes use Resource Timing. Raw and gzip JS sum
actual script response bodies.

Hosted browser runs block Cloudflare's injected
`/cdn-cgi/challenge-platform/` bot-detection script so platform-owned headless
detection work is not attributed to application TBT, JS, or interaction costs.
TTFB and the HTTP API load measurements still include the real edge and Worker.
The platform-inclusive warm probe is retained separately in the release
closeout so the exclusion remains visible rather than silently discarded.
Each instrumented route gets one unthrottled HTTP warm-up before its browser
budget; the API gate records the un-warmed cold request separately. This keeps
cold-start evidence explicit without mixing idle Worker startup into warm
rendering regression thresholds.

Browser lab measurements are intentionally one run in CI because hard budgets
are padded above the measured baseline. Hosted release evidence uses two runs
to expose production noise. Interaction wall times include lazy loading and
rendering; quiz, workshop, and copilot actions are the lab proxy for INP. Search
first-use and Mermaid rendering include network/parse work and are tracked as
separate user-perceived costs rather than mislabeled as INP.

## Blocking budgets

| Boundary | Desktop | Mobile |
| --- | ---: | ---: |
| LCP | ≤ 2,000 ms | ≤ 2,500 ms |
| CLS | ≤ 0.10 | ≤ 0.10 |
| TBT | ≤ 250 ms | ≤ 400 ms; Mermaid route ≤ 500 ms |
| TTFB | ≤ 600 ms | ≤ 800 ms |
| Non-diagram route JS | ≤ 610,000 raw / 190,000 gzip | same |
| Mermaid route JS | ≤ 1,450,000 raw / 415,000 gzip | same |
| API and public-read load | p95 ≤ 1,500 ms, 0% errors, concurrency 8 | same |
| Local D1 load | p95 ≤ 1,000 ms, 0% errors, concurrency 8 | same |

Interaction budgets are search first-use 500 ms, mobile copilot open 200 ms,
Mermaid approach/render 1,500 ms, quiz answer 200 ms, workshop manipulation
200 ms, and mocked save/reload 1,000 ms.

## Local production evidence

The run used Node 22.22.3, Chromium, the current working tree based on
`c368ca943c397fc146cea1b64578f08262fa8657`, and a freshly generated Vinext
production build. The final exact revision is pinned in the closeout.

| Profile | Worst LCP | Worst CLS | Worst TBT | Worst TTFB |
| --- | ---: | ---: | ---: | ---: |
| Desktop, six routes | 156 ms | 0.0132 | 0 ms | 41 ms |
| Mobile, six routes | 316 ms | 0.00052 | 237 ms | 33 ms |

The six routes were home, requirements guide, handbook without Mermaid,
handbook with Mermaid, workshop, and owner comments. The lazy Mermaid parser
measured 441 ms TBT on a shared Linux CI runner; the route-specific 500 ms
ceiling retains 13% runner-noise headroom while all other mobile routes keep the
400 ms ceiling and measured no more than 158 ms in CI. Non-diagram routes stayed
between 574,509–579,300 raw JS bytes and 177,573–179,882 gzip bytes. The Mermaid
route used 1,371,051 raw / 389,344 gzip bytes on desktop and 1,370,668 raw /
389,063 gzip bytes on mobile. Only the Mermaid route fetched the parser.

| Interaction | Measured wall time | Budget |
| --- | ---: | ---: |
| Search first-use | 153 ms | 500 ms |
| Mobile copilot open | 71 ms | 200 ms |
| Mermaid approach/render | 306 ms | 1,500 ms |
| Quiz answer | 51 ms | 200 ms |
| Workshop manipulation | 84 ms | 200 ms |
| Mocked save/reload | 125 ms | 1,000 ms |

The local public-read burst recorded home p50 102 ms, p95 135 ms, p99 136 ms,
0% errors, and successful recovery. Cloudflare-bound API modules are not loaded
through Vinext's Node production server; those APIs are measured in the hosted
run and exercised separately through local Miniflare.

## Isolated D1 and rate-limit evidence

`npm run check:performance:d1` creates a temporary Miniflare persistence path,
applies all three D1 migrations, starts the built Worker through Wrangler, and
uses synthetic Sites identity headers. Eight concurrent writes to distinct valid
learning pages had p50 56 ms, p95/p99 57 ms, and 0 errors. Eight matching
reads had p50/p95/p99 27 ms, returned every marker, and had 0 errors.

Six concurrent comment submissions produced exactly five HTTP 201 responses
and one HTTP 429 from the atomic D1 quota. Their p50 was 37 ms and p95/p99 was
38 ms. The harness deleted every created comment through the API, deleted the
synthetic learning state, verified a subsequent empty read in 4 ms, stopped
the server, and removed only its temporary database.

This proves bounded single-user local D1 concurrency and the atomic quota
contract. It does not prove two-user hosted isolation or distributed production
capacity; #61 owns that terminal evidence.

## Finding and remediation

The first mobile run found workshop CLS 0.170: the 690 px editor was inserted
after persistence loading. A CI trace then found handbook CLS 0.157 from its
mobile navigation grid row collapsing during streaming. The implementation now
reserves the editor size, keeps mobile book content in stable block flow, and
reserves progress-control width across loading and resolved labels.
Five repeated mobile runs measured all 30 routes at CLS ≤ 0.00052 without
weakening the ≤ 0.10 budget. No unresolved
P0/P1 performance, capacity, or cost finding remains inside this workstream's
declared boundary.

## Reproduce

```bash
npm ci
npm run build
npm run check:performance
npm run check:performance:d1
PERFORMANCE_BASE_URL=https://system-design-studio.v-dovnich.chatgpt.site \
  PERFORMANCE_RUNS=2 npm run check:performance
```

CI uploads `performance-results/` for 30 days. Failure traces and the JSON route,
interaction, API, D1, rate-limit, and recovery measurements remain attached to
the exact workflow run.
