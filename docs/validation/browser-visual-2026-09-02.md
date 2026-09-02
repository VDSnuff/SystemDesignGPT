# Browser, responsive, and visual validation — 2 September 2026

## Decision

The code-owned browser boundary is `PASS` for the candidate branch based on
main revision `5e7d36b55b671c9538114894611c17f7d11e3eaa`. Final pull-request checks
and the issue closeout own the exact merged revision.

Physical iOS Safari and Android Chrome remain `BLOCKED`. They are tracked in
#95 and must not be inferred from Playwright device descriptors, browser-engine
coverage, simulators, or responsive viewport changes. That blocker keeps the
physical-device release claim open for #70.

## Automated evidence

| Boundary | Environment | Result | Evidence |
| --- | --- | --- | --- |
| Responsive templates | Local production Worker, Chromium | `PASS` | Six tests covering 320×720, 390×844, 768×1024, 1024×768, 1440×900, and phone rotation |
| Visual baselines | Ubuntu CI, production Worker, Chromium | `PASS` | 14 stable snapshots for home, guide, handbook, Mermaid, workshop, owner, search, and mobile copilot |
| Cross-engine journeys | Ubuntu CI, production Worker | `PASS` | 81 Firefox and 81 WebKit tests with zero retries in workflow run `33668121353` |
| Chromium flake detection | Ubuntu CI, production Worker | `PASS` | 23 critical tests repeated three times, 69 passes, zero retries in workflow run `33668121353` |
| Failure artifacts | GitHub Actions | `PASS` | Traces, screenshots, reports, visual references, and diffs retained by the scheduled workflow |

The responsive matrix visits the home, Requirements guide, Mermaid handbook,
workshop, and owner templates at every declared width. Each visit fails on a
non-200 response, missing primary heading, page-level horizontal overflow,
console error, uncaught page exception, or failed resource. The orientation
check also opens and closes the mobile copilot before rotating and verifies the
search and launcher controls remain usable.

Visual references are generated and compared on Ubuntu so CI never compares
Linux rendering against a macOS baseline. Animations, transitions, and carets
are disabled for the snapshot only; dynamic API boundaries use deterministic
fixtures. The 0.2% pixel budget catches meaningful template drift while
tolerating isolated raster noise.

## Finding and correction

The first 1024×768 workshop run failed because the page grid declared a fixed
360-pixel copilot column while the shared copilot rendered at its 380-pixel
default. That contradiction expanded the document beyond the viewport. The
workshop now lets the grid's `auto` column follow the copilot's actual resizable
width. The same five-breakpoint matrix then passed without page overflow.

## Physical-device boundary

The local Apple device inventory reported the available iOS-class hardware as
offline. No Android Debug Bridge executable or connected Android device was
available. Therefore these checks remain `BLOCKED`:

- physical iOS Safari and Android Chrome rendering;
- real touch, momentum scroll, and selection behavior;
- software-keyboard collision and focus visibility;
- device rotation, safe-area, and browser-chrome behavior; and
- physical workshop dragging plus its keyboard alternative.

Issue #95 owns the sanitized device/OS/browser matrix, exact deployed
revision, synthetic test data, cleanup, and any focused defects. No physical
device identifier or personal content belongs in that evidence.

## Limitations

These tests use mocked account, persistence, owner, and provider boundaries.
They do not prove hosted identity, two-user isolation, provider behavior,
physical assistive technology, or production deployment provenance. Those
claims remain with #92, #93, #64, and #69 respectively.
