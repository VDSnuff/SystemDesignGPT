# Release validation contract

This directory is the evidence contract for System Design Studio release
decisions. It keeps fast deterministic tests, mocked browser tests, hosted
checks, real identities, and bounded provider calls distinct so one kind of
evidence cannot silently stand in for another.

The machine-readable inventory is [`manifest.json`](./manifest.json). The
release record starts from [`release-report-template.md`](./release-report-template.md).
Every report pins the exact revision and records missing evidence as
`UNVERIFIED` or `BLOCKED`, never as a pass.

Dated domain evidence includes the
[`27 August 2026 SEO and link-health report`](./seo-link-health-2026-08-27.md)
and the
[`29 August 2026 product-journey report`](./product-journeys-2026-08-29.md).

## Evidence states

| State | Meaning | Release effect |
| --- | --- | --- |
| `PASS` | The declared check completed on the recorded revision and environment. | Satisfies only the boundary it actually exercised. |
| `FAIL` | The check completed and violated its contract or budget. | Blocks according to finding severity. |
| `BLOCKED` | A required dependency, credential, account, device, service, or decision was unavailable. | Remains release-blocking until resolved or explicitly narrowed. |
| `UNVERIFIED` | Evidence is mocked, skipped, missing, zero-step, timed out, or outside the run. | Cannot support a release claim for that boundary. |
| `NOT_APPLICABLE` | The matrix owner documented why the boundary does not apply. | Requires reviewer agreement; it is not a convenience skip. |

A retry does not erase the first failure. Record the initial failure, retry
count, cause, and final result. A flaky required check is `FAIL` until it is
fixed or explicitly quarantined with a blocking follow-up.

## Severity

| Severity | Definition | Gate |
| --- | --- | --- |
| P0 | Cross-user disclosure or mutation, secret exposure, destructive data loss, uncontrolled paid usage, or site-wide outage without recovery. | Always blocks. |
| P1 | Critical journey, authorization, accessibility, integrity, compatibility, or operational proof fails for a supported release claim. | Blocks unless the owner explicitly accepts the risk with review date and compensating control. |
| P2 | Material degradation with a safe workaround and bounded impact. | Must have an owner and target date. |
| P3 | Minor polish, documentation, or low-impact diagnostic gap. | Track; does not block by default. |

## Actors

| Actor | Purpose | Data rule |
| --- | --- | --- |
| `guest` | Public reading, workshop, chat status, and signed-out failure behavior. | Must never receive stored learning or owner data. |
| `user-a` | Primary synthetic authenticated learner. | May access only its own synthetic records. |
| `user-b` | Isolation control for every persisted resource. | Must not observe or mutate user A. |
| `owner` | Synthetic account matching the configured owner boundary. | May review comments but receives no undocumented privilege. |

Credentials live only in the platform secret or test-account store. Reports use
actor aliases, never user IDs, emails, tokens, comments, prompts, or record
payloads from real people.

## Environments and proof limits

| Environment | Proves | Does not prove |
| --- | --- | --- |
| `unit-component` | Pure contracts, parsing, state transitions, and component behavior. | HTTP wiring, browser engines, hosted bindings, or production identity. |
| `mocked-browser` | Integrated UI behavior in the declared Playwright engine and viewport. | Real D1/provider behavior, platform headers, or another engine/device. |
| `local-production` | Built assets, server startup, route classification, and client budgets. | Hosted edge behavior or production configuration. |
| `ci` | Reproducibility on the exact job runner and checked-out revision. | Deployment, real accounts, physical devices, or provider quality. |
| `hosted-production` | Public origin, deployed configuration, bindings, routing, and smoke behavior. | Cross-user isolation without real synthetic accounts. |
| `real-account` | Platform identity plus user/owner authorization and persistence. | Provider quality unless a bounded real call is included. |
| `bounded-provider` | Current model behavior, latency, usage, and failure mapping within a declared budget. | General model correctness outside the evaluation set. |

## Route inventory

`manifest.json` records every current route:

- 3 static UI pages: introduction, workshop, and owner comments;
- all 18 Quick Guide pages from `guidePages`;
- all 31 canonical handbook pages from `bookSections`;
- 4 API routes;
- intentional negative routes for 404 behavior.

`tests/validation-manifest.test.ts` compares the committed route arrays with the
source registries. Adding or removing a guide, handbook section, API, or test
without updating the validation contract fails the deterministic suite.

## Test pyramid and current risk coverage

The manifest maps every current automated test file exactly once:

| Layer | Current groups | Primary risks | Boundary still owned elsewhere |
| --- | --- | --- | --- |
| Unit | canonical content, API contracts, model and persistence logic | Content drift, parsing, identity/origin rules, state migration, provider error mapping | Hosted D1, platform header trust, distributed limits |
| Component | chat, diagrams, progress, Mermaid, quiz UI | Interaction, recovery messaging, semantics, client persistence | Browser-engine and physical-device differences |
| E2E | accessibility, reader/search/quiz, guide routes, workshop | Chromium journeys, responsive contracts, axe checks, route behavior | Firefox/WebKit, real accounts/provider, production rollback |
| Hosted/manual | planned issues #60-#69 | Security, data, provider, devices, performance, SEO, supply chain, operations | Nothing may be inferred before that evidence exists |

The exact file-to-risk mapping is intentionally data, not prose, so the test
suite detects unmapped new files.

## Risk ownership

| Domain | Owner issue |
| --- | --- |
| Security and privacy | #60 |
| D1 persistence and integrity | #61 |
| Copilot/provider behavior | #62 |
| Content and complete user journeys | #63 |
| Accessibility | #64 |
| Browser, device, and visual compatibility | #65 |
| Performance and load | #66 |
| SEO and link health | #67 |
| CI, supply chain, and merge governance | #68 |
| Deployment, restore, rollback, and observability | #69 |

Issue #70 owns the final independent run and launch verdict. A missing command
or boundary in `manifest.json` must name its owner issue; it cannot appear green
because no executable check exists yet.

## Synthetic fixture lifecycle

1. Record the candidate SHA, environment, Sites version when applicable, and
   actor aliases before creating data.
2. Create only the minimum synthetic notes, diagrams, quiz answers, progress,
   and comments required by the matrix.
3. Use distinct marker prefixes for the run without encoding emails, tokens, or
   other credentials in committed files or artifacts.
4. Capture redacted IDs or hashes only when needed to prove isolation.
5. Delete synthetic records through the supported application or documented D1
   procedure after evidence capture.
6. Verify cleanup by actor and resource count. Record cleanup failure as a
   finding; never delete broad tables or user-owned data to make a run clean.

Provider evaluation uses a declared maximum request count and token/cost budget.
Load tests use local or staging synthetic targets unless a production ceiling is
explicitly approved in the owning issue.

## Canonical commands

The manifest distinguishes executable commands from planned release gaps. The
available foundation is:

```bash
npm ci
npm test
npm run lint
npm run check:generated
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
npm run build
npm run check:links
npm run test:e2e
git diff --check
```

Client-JS measurement requires a built production server on port 4173. The
manifest records the measurement command separately so server startup and
shutdown remain observable. Accessibility has a focused Playwright command in
addition to the full browser suite.

Link health is executable under #67. It checks the canonical source URLs,
route/anchor contracts, server-rendered metadata, robots, sitemap, aliases,
errors, internal links, and public images. HTTP 401, 403, 429, 5xx responses,
and network failures remain `UNVERIFIED` instead of being mislabeled as broken;
other terminal 4xx responses fail the gate. Production smoke remains `planned`
under #69 and is `UNVERIFIED` until that issue ships its executable contract.

## Report workflow

1. Copy `release-report-template.md` to a dated, revision-specific report.
2. Fill metadata before running commands.
3. Record every required command, test count, artifact, retry, and limitation.
4. Link each finding to a reproducible issue and severity.
5. Record accepted P1 risks only with explicit owner, reason, compensating
   control, and review date.
6. Map the exact tested SHA to the deployed Sites version before a final verdict.
7. State `READY`, `READY WITH ACCEPTED RISKS`, or `BLOCKED`; never infer a
   broader claim than the actor/environment matrix proves.
