# Sites release, smoke, and recovery runbook

## Purpose and boundary

Use this runbook to map one tested Git revision to one saved Sites version,
deploy that exact version, verify the signed-out production contract, and
recover by rollback or forward deployment. It covers project
`appgprj_6a8cb22f54f88191a25aabef51dde422` and
`https://system-design-studio.v-dovnich.chatgpt.site`.

This procedure does not prove authenticated cross-user isolation, destructive
D1 restore, provider quality, or alert delivery. Keep those boundaries
`UNVERIFIED` until their dedicated real-account, recovery, and alert exercises
pass. Never use a route-only HTTP result as revision evidence.

## Prerequisites

- GitHub and Sites access for the project; credentials stay in their platform
  stores and must not appear in reports, shell history, or Git remotes.
- Node and npm versions accepted by `package.json`.
- A clean isolated checkout of the candidate revision.
- The last known-good Sites version, its Git SHA, and its D1 schema compatibility.
- No unresolved P0/P1 finding in the boundaries being released.

## Release record

Create a dated report from `docs/validation/release-report-template.md` before
building. Record the candidate SHA, CI run, previous live version, D1 migration
state, operator, and start time. A missing identifier is `UNVERIFIED`.

## Predeploy

1. Resolve the candidate from the remote, not a mutable local branch:

   ```bash
   git fetch origin main
   CANDIDATE_SHA="$(git rev-parse origin/main)"
   git switch --detach "$CANDIDATE_SHA"
   test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"
   git status --short
   ```

2. Install exactly the lockfile and run the blocking validation commands:

   ```bash
   npm ci --no-audit
   npm test
   npm run typecheck
   npm run lint
   npm run check:generated
   npm audit --omit=dev --audit-level=high
   npm audit --audit-level=high
   npm run check:supply-chain
   npm run build
   npm run check:performance
   npm run check:performance:d1
   npm run check:links
   npm run test:e2e
   git diff --check
   ```

3. Compare the candidate's migrations with the live version. Stop if the
   release deletes or renames a table/column, changes stored meaning, or makes
   the last known-good application unable to read current data. Prefer an
   additive expand/migrate/contract sequence.

Expected: every required command exits zero, the checkout stays clean, and the
record contains the exact SHA. Any skipped, zero-step, timed-out, or unavailable
check is `UNVERIFIED`, not a pass.

## Save and deploy the exact revision

1. In Sites, obtain a short-lived source-repository write credential. Push the
   detached candidate SHA to the Sites source repository without saving the
   credential in Git configuration.
2. Build the successful source and package it with the current Sites packaging
   helper. Do not package a stale local build.
3. Save a new site version with `commit_sha` equal to `CANDIDATE_SHA`. Record
   the returned version number and version identifier.
4. Read the saved version back and verify its source SHA equals
   `CANDIDATE_SHA`. Stop on any mismatch.
5. Deploy that exact version to the existing public site. Record deployment ID,
   version ID, version number, access mode, and timestamps.
6. Poll deployment status to a terminal success state. A timeout, missing
   version, or different version is a failed deployment.
7. Immediately after success, resolve the Site, saved version, and deployment
   again through the approved Sites API. Write only the allowlisted fields below
   to a temporary JSON file; never serialize the full responses because they can
   contain credentials or bypass tokens.

The authoritative revision proof is the complete chain:

```text
remote main SHA = tested SHA = saved-version source SHA = deployed version ID
```

## Postdeploy smoke

Run the committed fail-closed matrix with the identifiers verified above:

```bash
PRODUCTION_SMOKE_ORIGIN=https://system-design-studio.v-dovnich.chatgpt.site \
PRODUCTION_SMOKE_COMMIT_SHA="$CANDIDATE_SHA" \
PRODUCTION_SMOKE_SITES_VERSION="$SITES_VERSION" \
PRODUCTION_SMOKE_PROVENANCE_FILE="$SITES_PROVENANCE_FILE" \
npm run check:production-smoke
```

The temporary provenance file must be no more than 15 minutes old:

```json
{
  "lookupTime": "2026-09-04T12:00:00.000Z",
  "site": { "projectId": "...", "origin": "https://...chatgpt.site", "latestVersion": 49 },
  "version": { "id": "...", "number": 49, "commitSha": "40-character SHA" },
  "deployment": {
    "id": "...", "versionId": "...", "status": "succeeded",
    "origin": "https://...chatgpt.site", "updatedAt": "2026-09-04T11:59:00.000Z"
  }
}
```

Expected: JSON result `PASS` for home, guide, handbook, Mermaid source page,
workshop, owner page, signed-out chat and persistence APIs, browser/security
headers, API no-store/noindex headers, and both intentional 404s. Preserve the
output in the release record, then delete the temporary provenance file. The
command fails before route checks when origin, active version, source SHA,
deployment status, or cross-linked version IDs disagree. The Mermaid browser
test and synthetic authenticated persistence matrix remain separate gates.

After smoke, inspect sanitized worker logs for the deployment window. Record
request failures and platform anomalies without user IDs, emails, prompts,
comments, tokens, or record payloads. Observe for the declared report window.

## Rollback

Rollback changes the application version only; it does not rewind D1.

1. Stop writes or disable the affected feature if data compatibility is in
   doubt. Do not mutate or restore D1 as part of an application rollback.
2. Select the recorded last known-good Sites version and verify its source SHA
   and compatibility with the current D1 schema.
3. Deploy that exact saved version, preserving the site's current public access.
4. Poll to terminal success, then run production smoke using the rollback SHA
   and version.
5. Inspect sanitized logs and record the incident, impact window, and outcome.

If the old application cannot safely read the current schema, do not deploy it.
Use forward recovery. If data is damaged, freeze writes and follow the separately
approved D1 backup/restore procedure; never improvise destructive SQL.

## Forward recovery

1. Branch from the failed deployed SHA and make the minimum corrective change.
2. Repeat every predeploy gate and review the migration compatibility.
3. Save a new Sites version with the corrective commit SHA; never overwrite or
   relabel the failed version.
4. Deploy the new version, run production smoke, inspect logs, and observe.
5. Close the incident only after the public contract is stable and any
   synthetic fixtures are removed and verified absent.

## Failure handling

| Failure | Action |
| --- | --- |
| SHA/version mismatch | Stop. Rebuild and save from the verified candidate. |
| Packaging or save failure | Keep production unchanged; retain sanitized error output. |
| Deployment timeout/failure | Inspect deployment status and logs; rollback only if production changed. |
| Route, API, header, or 404 smoke failure | Treat as P1; rollback or forward-fix according to D1 compatibility. |
| Elevated 5xx or worker exceptions | Stop observation, preserve sanitized logs, and recover. |
| Suspected cross-user access, secret exposure, or data loss | Treat as P0; freeze writes, restrict access if needed, and escalate immediately. |

## Escalation and completion

The release operator owns first response. Escalate platform/deployment failures
to the Sites owner, identity/privacy failures to the security owner, D1 integrity
failures to the data owner, and provider failures to the Copilot owner. Record
one incident owner and the next decision time.

Completion requires a pinned SHA/version/deployment chain, terminal deployment
success, production smoke output, sanitized log review, observation timestamps,
and a known compatible rollback or forward path. Anything missing remains
`UNVERIFIED` in the release report.

## Change history

- 2026-09-01: Initial exact-revision release, smoke, rollback, and forward-recovery procedure.
