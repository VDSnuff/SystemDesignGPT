# Vinext lifecycle policy

[ADR-0001](../adr/0001-use-vinext-for-the-sites-runtime.md) chose Vinext as
the App Router adapter for the OpenAI Sites Vite and Cloudflare Worker
toolchain. This policy manages the risk of running production on a beta
adapter. The machine-readable record is
[`vinext-lifecycle-policy.json`](./vinext-lifecycle-policy.json); a test keeps
its pinned version equal to `package.json`, so an upgrade cannot merge without
reviewing this policy.

## Why the beta adapter is acceptable

- Production has run the pinned beta through the full release gate and the
  hosted smoke matrix, and the rollback path to the last known-good Sites
  version is documented and exercised in the
  [release runbook](./sites-release-runbook.md).
- The exact version is pinned as a build-time devDependency in `package.json`
  and the lockfile; Dependabot proposes upgrades but cannot merge them past
  the required checks.
- The adapter is composed at one boundary in [`vite.config.ts`](../../vite.config.ts).
  Application code uses App Router conventions only, so a future adapter change
  does not touch routes, handlers, or components.
- No supported non-beta adapter exists for this toolchain today.

## Critical runtime behaviors

An upgrade is acceptable only when these behaviors are unchanged:

| Behavior | Where it is proven |
| --- | --- |
| App Router routing, RSC/SSR rendering, and the `vinext/server/app-router-entry` Worker entry | `npm run build`, `npm run test:e2e` |
| D1 binding through the Cloudflare plugin, migrations, and optimistic concurrency | `npm run check:performance:d1`, `npm run check:recovery:d1` |
| Server-derived identity from Sites headers (ADR-0002) | Unit route tests, hosted smoke `*-auth` routes |
| Nonce-based CSP and required browser/API headers (ADR-0006) | `tests/security-contracts.test.ts`, hosted smoke header checks |
| Responsive contracts on Chromium, Firefox, and WebKit | `npm run test:e2e:cross-browser` |
| Approved visual baselines | `npm run test:e2e:visual` |
| Signed-out production route matrix and provenance chain | `npm run check:production-smoke` |

## Owner and review cadence

- Owner: `@VDSnuff`.
- Review the policy monthly (`reviewBy` in the JSON record) and on every
  upstream release, Dependabot proposal, or Sites toolchain change.
- Each review records the latest observed upstream version, whether the exit
  criteria are met, and the next review date.

## Upgrade procedure

1. Read the upstream release notes for every version between the pin and the
   candidate. Stop if routing, RSC, Worker entry, or Vite plugin contracts
   changed without a documented migration.
2. Change only the `vinext` pin and lockfile on a dedicated branch.
3. Run every command in the `upgradeMatrix` locally on the exact candidate SHA
   and let the required CI checks run on the pull request. A skipped, timed-out,
   or platform-mismatched command is `UNVERIFIED`, not a pass.
4. Update `pinnedVersion`, `lastReviewed`, `reviewBy`, and
   `latestObservedUpstream` in the JSON record in the same pull request.
5. Deploy through the release runbook and run hosted smoke. Keep the previous
   Sites version identifier in the release record as the rollback target.

## Rollback boundary

Rollback changes the application version only and follows the runbook
[rollback section](./sites-release-runbook.md#rollback). It never rewinds D1.
Any `rollbackTriggers` condition observed before merge reverts the branch;
observed after deployment, it deploys the previous Sites version and reverts
the pin on `main`. Because Vinext does not own the schema, an adapter rollback
is always schema-compatible; a release that combines an adapter upgrade with a
migration must ship the migration first in its own release.

## Upstream tracking and exit from beta

Track [cloudflare/vinext](https://github.com/cloudflare/vinext) releases. The
beta phase ends when a stable 1.x release exists, or when the Sites toolchain
documents a supported App Router adapter that is not Vinext. Either event
triggers the ADR-0001 supersession review. Migration options remain the ones
recorded in ADR-0001; none is adopted without a superseding ADR and a proven
rollback path.
