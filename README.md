# System Design Studio

An interactive edition of the System Design Checklist Book. All 31 top-level sections are generated directly from the canonical Markdown, including tables, checklists, code, Mermaid diagrams, evidence references, and source links. Every handbook page includes a contextual design copilot that knows the current section and complete site map. The diagram workshop lets readers place components, connect dependencies, and reason about boundaries and failure paths.

The product, handbook, and support contract are currently English-only.
Localization is possible future work, not a committed requirement; the boundary
and implications are documented in [the localization policy](docs/localization-policy.md).

The product does not use page-view or behavioral analytics. Learning-outcome
decisions and the privacy gate for any future measurement are defined in the
[product metrics policy](docs/product-metrics.md).

Significant runtime, trust, data, generation, provider, and rendering choices
are preserved in the [architecture decision records](docs/adr/README.md).

## Run locally

Requirements: Node.js 22.13 or newer. Install the exact dependency versions
from `package-lock.json`, then start the development server:

```bash
npm ci --no-audit
npm run dev
```

The reader and deterministic tests work without provider credentials. To enable
the live design copilot or owner-only comment review, put the applicable
variables below in an ignored `.env.local` file. Never commit real values.

### Configuration

Application configuration is server-only:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Only for live copilot calls | Authenticates the server-side Responses API request. It is never sent to the browser. |
| `OPENAI_MODEL` | No | Overrides the copilot model; the default is defined in the server route. |
| `SITE_OWNER_EMAIL` | Only for owner review | Grants the matching authenticated Sites user access to owner comment review. |

Command-scoped verification variables are not application secrets:

| Variable | Purpose |
| --- | --- |
| `CLIENT_MEASURE_BASE_URL` | Changes the origin measured by `measure:client-js`; defaults to the local production server. |
| `PERFORMANCE_BASE_URL` | Runs performance checks against an already-hosted origin instead of starting a local server. |
| `PERFORMANCE_ARTIFACT_PATH` | Changes the browser-performance JSON output path. |
| `PERFORMANCE_RUNS` | Sets the bounded performance sample count. |
| `PRODUCTION_SMOKE_ORIGIN` | Declares the HTTPS origin for production smoke. |
| `PRODUCTION_SMOKE_COMMIT_SHA` | Declares the exact 40-character Git revision expected in production. |
| `PRODUCTION_SMOKE_SITES_VERSION` | Declares the numeric saved Sites version expected to be active. |
| `PRODUCTION_SMOKE_PROVENANCE_FILE` | Points to the recent, sanitized Sites control-plane snapshot required by production smoke. |
| `EVIDENCE_CHECK_DATE` | Overrides the date used by evidence-freshness tests; normally leave unset. |

The remaining environment names are managed by the repository's tools. `PORT`
selects the temporary built-Worker port; `CI` and `TEST_WORKER_INDEX` are set by
the CI/Playwright runners; `CODEX_SANDBOX` enables polling in that sandbox; and
`WRANGLER_WRITE_LOGS`, `WRANGLER_LOG_PATH`, and `MINIFLARE_REGISTRY_PATH` keep
Wrangler state project-local. Normal development should use their defaults.

### Local D1

The Sites configuration binds D1 as `DB`; local Vinext development persists its
Cloudflare state under the ignored `.wrangler/` directory. The ordered migration
source is `drizzle/meta/_journal.json`, with SQL files in `drizzle/`.

After building, run both isolated D1 contracts:

```bash
npm run build
npm run check:performance:d1
npm run check:recovery:d1
```

The load check applies every migration to a temporary local database, exercises
synthetic writes, conflicts, rate limits, and cleanup, then removes that
database. The recovery check creates separate temporary source and restore
databases, exports only synthetic fixtures, verifies their digest, and removes
the raw backup. These commands never validate or modify hosted D1. See the
[D1 persistence and recovery contract](docs/validation/d1-persistence-recovery.md)
for the protocol, outputs, and the real-account/hosted evidence boundary.

## Verify

Install the relevant Playwright browsers before browser checks. The blocking
local release matrix is:

```bash
npx playwright install chromium firefox webkit
npm test
npm run typecheck
npm run lint
npm run check:generated
npm run check:evidence-freshness
npm run check:copilot-evaluation
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
npm run check:supply-chain
npm run build
npm run check:performance
npm run check:performance:d1
npm run check:recovery:d1
npm run check:links
npm run test:e2e
git diff --check
```

The [release validation contract](docs/validation/README.md) is authoritative
for command ownership and evidence limits. In particular:

- `npm test`, type checking, linting, generated-content checks, audits, and the
  build prove deterministic repository contracts on the tested revision. Unit
  and component tests mock OpenAI and persistence; they make no paid call and do
  not prove hosted bindings, identity, or cross-user isolation.
- `check:performance:d1` and `check:recovery:d1` prove only isolated local
  migrations, data-integrity behavior, cleanup, and backup shape.
- `test:e2e` uses Chromium and mocked authenticated/provider boundaries against
  the local app. It does not prove another engine, a physical device, a real
  account, hosted D1, or a real provider.
- `check:links` uses the network. HTTP 401, 403, 429, 5xx, and network failures
  remain `UNVERIFIED` and require browser review; other terminal 4xx responses
  fail the gate.

Run boundary-specific checks when their evidence is required:

| Command | Evidence boundary |
| --- | --- |
| `CLIENT_MEASURE_BASE_URL=http://127.0.0.1:4173 npm run measure:client-js` | Measures client JavaScript for an already-running production build; it is not a hosted latency result. |
| `npx playwright test tests/e2e/accessibility.spec.ts` | Runs automated axe and keyboard contracts; it does not replace assistive-technology review. |
| `npm run test:e2e:cross-browser` | Exercises the built Worker in Chromium, Firefox, and WebKit; it is not physical-device proof. |
| `npm run test:e2e:visual` | Compares stable Linux Chromium screenshots in CI; other platforms are diagnostic only. |
| `npm run check:production-smoke` | Verifies the declared Sites revision and public/signed-out production contract; it requires fresh control-plane provenance. |

`check:generated` regenerates the canonical handbook modules and fails when the
committed output has drifted. The source handbook remains
`docs/System_Design_Checklist_Book.md`.

The quiz suite validates all 31 canonical section policies, authored answer contracts, handbook anchors, deterministic scoring, retry behavior, and the versioned invalidation of legacy generated answers. Quiz content lives outside the generated handbook module in `app/quiz-content*.ts`.

The diagram workshop also has real-browser coverage at mobile, tablet, and
desktop widths:

```bash
npx playwright install chromium
npm run test:e2e
```

Browser tests start the local app, mock authenticated persistence and provider
requests, and cover representative handbook routes, the mobile copilot, quizzes,
and the workshop at mobile, tablet, and desktop widths. CI runs the same commands
on pull requests and pushes to `main`; failed browser runs retain screenshots,
traces, and an HTML report without production secrets or user content.

The production-build cross-browser matrix runs Chromium, Firefox, and WebKit
with zero retries:

```bash
npm run build
npm run test:e2e:cross-browser
```

Stable visual snapshots are committed for Linux Chromium. The blocking visual
result comes from the Linux CI runner; a different OS is useful for diagnosis
but may render fonts and pixels differently and must not overwrite the canonical
baselines:

```bash
npm run build
npm run test:e2e:visual
```

## Deploy and recover

Deployment is an exact-revision operation, not an inference from a successful
build. Follow the [Sites release runbook](docs/operations/sites-release-runbook.md)
to establish the remote-main SHA, tested SHA, saved-version source SHA, and
deployed version ID chain. Its [postdeploy smoke](docs/operations/sites-release-runbook.md#postdeploy-smoke)
requires all four `PRODUCTION_SMOKE_*` variables and a recent sanitized
provenance file. Public and signed-out smoke does not prove authenticated
isolation, destructive restore, provider quality, or alert delivery.

```bash
PRODUCTION_SMOKE_ORIGIN=https://system-design-studio.v-dovnich.chatgpt.site \
PRODUCTION_SMOKE_COMMIT_SHA="$CANDIDATE_SHA" \
PRODUCTION_SMOKE_SITES_VERSION="$SITES_VERSION" \
PRODUCTION_SMOKE_PROVENANCE_FILE="$SITES_PROVENANCE_FILE" \
npm run check:production-smoke
```

Use the same runbook's [rollback procedure](docs/operations/sites-release-runbook.md#rollback)
only after checking D1 schema compatibility. Application rollback does not
rewind D1; data recovery requires the separately approved hosted backup/restore
procedure.
