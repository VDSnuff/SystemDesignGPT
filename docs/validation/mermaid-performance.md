# Pre-rendered handbook diagrams

The handbook contains nine fixed Mermaid diagrams. Rendering them on a phone
previously loaded the parser and layout engine, then ran a long chain of SVG
layout microtasks on the main thread. Mobile blocking time sometimes exceeded
the existing 500 ms diagram budget, including on the unchanged base.

The server now passes the matching generated SVG to the reader. The browser
keeps the existing lazy reveal, accessible diagram description, and current-page
style nonce, without importing Mermaid. The generated SVG remains server data;
the collection is not included in the client JavaScript bundle. Missing generated
content retains a readable source fallback.

## Updating diagrams

After changing a Mermaid block, the dependency lockfile, stylesheet, or rendering
configuration, run:

```sh
npm run generate:diagrams
npm run check:generated
```

Generation uses the pinned Playwright Linux image, the checked-in stylesheet,
and Mermaid's strict sanitizer and neutral theme. On macOS the command creates
an isolated container from tracked and non-ignored source files, installs the
locked dependencies, copies back only the generated JSON, and removes its owned
container and dependency volume. Linux runners need the pinned Chromium browser
installed. No browser is needed for ordinary builds or freshness checks.

The checked-in collection records the normalized chart sources, lockfile and
stylesheet digests, rendering options, and each SVG's digest. Both build and
generated-content checks reject stale inputs or missing, duplicate, or modified
SVGs. Regeneration is explicit; deployment does not silently reuse stale artwork.

## Regression coverage

The normal performance suite measures five additional cold mobile diagram loads,
using fresh browser contexts and the existing route budgets. The parser-detection
check now inspects actual script URLs and rejects browser Mermaid imports. No
performance threshold, throttling profile, visual baseline, or retry count was
relaxed. All nine authored diagrams retain browser CSP and accessibility coverage.
