# Visual baseline contract

`npm run test:e2e:visual` is the visual regression gate. It compares
`tests/e2e/visual-regression.spec.ts` against the committed PNG baselines in
`tests/e2e/visual-regression.spec.ts-snapshots/` with a 0.2% pixel budget.
The baselines are valid for exactly one environment; this document is the
contract for reproducing it and for changing them.

## Canonical environment

| Dimension | Value | Source |
| --- | --- | --- |
| Operating system | Ubuntu 24.04 (noble) | GitHub `ubuntu-latest` runner; `mcr.microsoft.com/playwright:v<version>-noble` locally |
| Browser | Chromium bundled with the installed `@playwright/test` release | `package-lock.json` |
| Fonts | The packages installed by `npx playwright install --with-deps chromium` on Ubuntu | Playwright image and CI step |
| Device profile | Playwright `Desktop Chrome`, light color scheme, `en-US`, UTC, reduced motion | `playwright.visual.config.ts` |
| Application | Built Worker started by `npm run start:built-worker` with mocked account, persistence, owner, and provider boundaries | `tests/e2e/browser-boundaries.ts` |

The container tag is derived from the installed Playwright version, so a
Playwright upgrade moves the local environment and CI together. Baseline
drift after such an upgrade is reviewed like any other baseline change.

## Running the gate

`scripts/run-visual-regression.mjs` chooses the runtime:

| Platform | `VISUAL_RUNTIME` | Behavior |
| --- | --- | --- |
| Linux | `auto` (default) or `native` | Runs Playwright directly against the Worker from a prior `npm run build`; this is the CI path and the only one that produces release evidence natively. |
| Linux | `container` | Uses the pinned container anyway, for example when the host distribution or fonts differ from Ubuntu noble. |
| macOS, Windows | `auto` (default) or `container` | Copies the tracked and untracked-but-not-ignored workspace files into the pinned container, installs dependencies from the lockfile, builds, runs the comparison, and copies `test-results/visual-regression/` and `playwright-report/` back. Requires a running Docker daemon. |
| macOS, Windows | `native` | Diagnostic only. Runs the host Chromium with `--update-snapshots=none`, prints a warning, and refuses any update flag. Mismatches are expected because text metrics differ; use the diffs to reason about layout, never as a verdict. |

Loading `playwright.visual.config.ts` directly on a non-Linux host fails
unless `VISUAL_RUNTIME=native` is set, so a plain `npx playwright test` cannot
silently compare or rewrite Linux baselines from another platform.

Container runs keep `node_modules` and the npm cache in named Docker volumes
(`system-design-visual-node-modules`, `system-design-visual-npm-cache`) so
repeated runs skip reinstalling while the lockfile is unchanged. Remove those
volumes to reset the environment.

## Failure artifacts

A failed comparison writes, per test, the `*-expected.png`, `*-actual.png`,
and `*-diff.png` images, a trace, and the HTML report under
`test-results/visual-regression/` and `playwright-report/`. The container
runtime copies both directories back to the host. The `Quality` workflow
uploads the same directories as `playwright-failure-<run id>`; the scheduled
`Cross-browser evidence` workflow uploads the baselines, report, and diffs as
`visual-regression-<run id>` on every run.

## Baseline changes

1. Generate new baselines only in the canonical environment: on Linux run
   `npm run test:e2e:visual -- --update-snapshots`; on macOS or Windows the
   same command runs in the container and copies the updated PNGs back into
   `tests/e2e/visual-regression.spec.ts-snapshots/`. A `workflow_dispatch` of
   `Cross-browser evidence` regenerates them on the CI runner and publishes
   them as the `visual-regression-<run id>` artifact for the same purpose.
2. Commit the PNGs in the pull request that causes the intended visual change,
   and state in the description which surfaces changed and why.
3. The reviewer compares each changed baseline with its predecessor and the
   `*-diff.png` evidence before approval. A baseline change with no matching
   product, content, or dependency change is a finding, not a refresh.
4. Never update a baseline to make a platform, font, or browser mismatch pass.
   If the canonical environment itself changes (for example a Playwright or
   Ubuntu upgrade), record the environment change in the pull request and
   regenerate all baselines in one reviewed commit.
5. Do not loosen `maxDiffPixelRatio` or mask regions to hide a real diff;
   fix the rendering or fixture instead.
