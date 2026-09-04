# Client bundle performance

Measured on 2026-08-25 with Node 22, Vinext 1.0.0-beta.8, Vite 8.0.13,
and headless Chromium at 1440x900. Each route uses a fresh browser context. The
measurement waits 2.5 seconds after `load` and for the representative Mermaid
diagram to render, sums JavaScript response bodies, and also gzips each response
body locally for a comparable compressed estimate. API calls are fulfilled with
empty local responses so hosted bindings and provider state cannot skew results.

## Reproduce

```bash
npm run build
npm run start -- --port 4173
npm run measure:client-js
```

Set `CLIENT_MEASURE_BASE_URL` when the production server uses another origin.

## Before and after

Baseline: `785c4e5` (`origin/main` before this change).

| Representative route | Before raw | After raw | Before gzip | After gzip | Raw change |
|---|---:|---:|---:|---:|---:|
| Introduction `/` | 676,852 B | 569,298 B | 207,222 B | 175,689 B | -15.9% |
| Requirements | 676,852 B | 569,298 B | 207,222 B | 175,689 B | -15.9% |
| Mermaid workflow | 1,468,603 B | 1,361,049 B | 416,649 B | 385,145 B | -7.3% |
| Workshop | 674,653 B | 566,733 B | 206,176 B | 174,458 B | -16.0% |

The 109,934-byte generated search corpus previously entered the initial
`AppHeader` dependency graph. Search now loads that corpus and its ranker on
first focus or input, with explicit preparation and failure states. Search
results, keyboard navigation, exact heading anchors, and all source content are
unchanged.

Chat and the section learning lab were also measured. Their direct chunks are
10,376 B and 6,845 B raw, respectively. Both stay immediate because chat is an
above-the-fold desktop surface and the learning lab is an expected page feature;
deferring them would add interaction delay for a much smaller initial saving.

## Mermaid behavior and remaining warning

A non-diagram route requests no Mermaid runtime. A source-authored diagram loads
Mermaid only when its stable 18rem placeholder approaches the viewport. All nine
handbook diagrams render in Chromium, while invalid input retains a readable
source fallback.

The production build still reports one chunk above 500 KiB:

| Emitted chunk | Raw | Gzip | Initial on non-diagram routes |
|---|---:|---:|---|
| `@mermaid-js/parser` shared module | 662,707 B | 142,286 B | No |

This is a single compiled dependency module used by optional Mermaid diagram
definitions. A measured Rolldown `codeSplitting.maxSize` experiment at 400 KiB
could not subdivide the module, so that ineffective configuration was reverted
instead of raising the warning threshold. The follow-up boundary is a Mermaid
release that splits the parser upstream; reassess on dependency upgrade. A
private deep-import renderer would couple the app to versioned Mermaid internals
and is not justified while the module stays off non-diagram initial loads.

## Upstream boundary review — 4 September 2026

The installed Mermaid `11.17.2` and `@mermaid-js/parser` `1.2.1` releases are
still the latest registry versions. The parser's
[tagged package manifest](https://github.com/mermaid-js/mermaid/blob/%40mermaid-js%2Fparser%401.2.1/packages/parser/package.json)
publishes only its root entry point, backed by one compiled core module. The
upstream [package-splitting request](https://github.com/mermaid-js/mermaid/issues/4120)
also remains open. There is therefore no supported diagram-specific parser
entry point to adopt in this review.

A clean Vinext production build with Vite `8.2.2` reproduced the warning. The
largest chunk was 662,152 B raw / 142,201 B gzip, only 555 B raw / 85 B gzip
below the earlier measurement. This is not a material improvement.

| Representative boundary | Requests | Raw JS | Gzip JS | Parser fetched |
|---|---:|---:|---:|:---:|
| Introduction `/` | 25 | 580,811 B | 180,364 B | No |
| Requirements handbook | 25 | 580,811 B | 180,364 B | No |
| Mermaid workflow | 52 | 1,369,797 B | 388,749 B | Yes |
| Workshop | 24 | 576,478 B | 178,345 B | No |

The complete performance gate passed for desktop and mobile. The measured
Mermaid approach/render interaction was 160 ms against the 1,500 ms budget;
the Mermaid route stayed within its raw and gzip budgets, and every
non-diagram route in both profiles reported no parser fetch.

The warning remains an accepted lazy-route risk. Do not raise the warning
threshold or import Mermaid's private internals. Review again when Mermaid or
the parser publishes a new release, when the public export map changes, or as
part of a Mermaid, Vite, or Vinext upgrade.
