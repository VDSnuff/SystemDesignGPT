# Production incident runbooks

**Accountable owner:** repository maintainer `@VDSnuff`; the release operator
coordinates response until the owner assigns a named incident lead.
**Frequency:** as needed. **Updated:** 2026-11-08. **Last hosted exercise:**
UNVERIFIED. These procedures document response; they do not prove monitoring,
alert delivery, hosted isolation, backup/restore, or recovery time.

## Purpose and prerequisites

Use these procedures for the existing System Design Studio production Site.
Start with the [Sites release runbook](sites-release-runbook.md) to resolve its
project, origin, live saved version, deployment status and exact source SHA.
Record incident start time, affected journey, severity, operator, last known-good
version, and the next update time in the existing incident or release record.
Use the [release report](../validation/release-report-template.md) for evidence.

Required access is incident-specific: Sites control-plane read access for
deployment and runtime diagnosis; approved synthetic accounts for authenticated
verification; and separately established authority and an isolated target for
hosted D1 recovery. Missing access is BLOCKED. A local test cannot replace it.

## First response and communication

1. Classify suspected cross-user disclosure, secret exposure or data loss as P0.
   A reproducible unavailable critical journey is P1 under the
   [release severity policy](../validation/README.md#severity).
2. Capture only timestamps, route templates, status/error codes, counts, version
   IDs and SHAs. Keep credentials in platform stores. Do not attach browser
   storage, full request/response bodies, prompts, notes or comments.
3. Inspect a bounded failure window in Sites Worker logs. Persistence handlers
   currently include user IDs, and comment-update logs can include comment IDs;
   redact these before retaining or sharing any excerpt. Raw logs are not a
   sanitized incident artifact.
4. Stop synthetic traffic on unexpected cost, disclosure or data loss. There is
   no application-wide write-freeze switch. Ask the Site owner to select an
   available platform containment control or a reviewed corrective deployment;
   do not claim that stopping tests freezes other users' writes.
5. Notify the accountable owner through the existing incident channel. Record
   impact, evidence, containment, blocked access and the next decision time.
   Assign provider, data, security or frontend diagnosis to an explicit person;
   a role name alone is not an acknowledged escalation.

No paging destination, delivery receipt, retention guarantee or response-time
commitment is established by this document. Keep alert/escalation proof BLOCKED
until an owner-selected destination receives and acknowledges a bounded
synthetic alert. Never send a test alert to an invented contact.

## Signals and diagnostic limits

These are operator triage signals, not claims of configured production alerts.

| Signal | Inspect | Limit |
| --- | --- | --- |
| Route/API 5xx or failed resource | Exact route, timestamp, status, deployment and sanitized Worker errors | An HTML 200 does not prove hydration or an authenticated journey. |
| Persistence unavailable | `learning_state.*_failed`, `handbook_progress.*_failed`, `learning_comments.*_failed` and API 503 | Events contain identifiers; sanitize. Absence does not prove D1 health. |
| Copilot 429 | `rate_limited` versus `usage_limited` in the response error code | One is application admission; the other is upstream provider quota. |
| Copilot 503/502 | `unconfigured`, `provider_unavailable`, `malformed_response` | D1 admission failure also maps to `provider_unavailable`; it is not proof of an upstream outage. |
| Latency or client exceptions | Route, engine/version, representative interaction and sanitized timing/error | [Local performance budgets](../validation/performance-budgets.json) are diagnostic baselines, not a hosted SLO. |
| Deployment failure | Saved source SHA, version ID, deployment status and failure message | A saved version is not necessarily live; a healthy old version can remain active. |

## Provider outage or quota

**Owner:** incident lead, with the maintainer assigning provider-account access.
**Trigger:** reproducible copilot 429, 502 or 503, timeout, or a critical AI
journey failing while public reading remains available.

1. Read `GET /api/chat` without sending a question. Guest status is
   `authentication-required`; an authenticated `ready` only means a key is
   configured. It does not call or verify the provider.
2. Classify an existing failed request by the
   [chat error contract](../../app/chat-contract.ts). For `rate_limited`, wait
   for the application window; do not reset D1 counters or widen limits. For
   `usage_limited`, have the provider-account owner check quota and billing
   privately; never automatically raise a spending limit.
3. For `unconfigured`, check only configuration presence in Sites. For
   `provider_unavailable`, check D1 admission as well as upstream availability;
   [the route](../../app/api/chat/route.ts) intentionally collapses those faults.
   For `malformed_response`, inspect the pinned model/configuration and reproduce
   through the mocked evaluation before choosing a corrective release.
4. Contain through the existing “Continue without AI” tools. Avoid repeat
   submissions, automatic retries, model changes or secret changes as diagnosis.
5. After the cause is corrected, run `npm run check:copilot-evaluation` on the
   candidate. A real recovery call requires an approved synthetic question,
   account and bounded provider budget; record only status and sanitized usage.

**Verify:** reading and fallback tools work; the approved real call, when
available, succeeds without draining unrelated quota. Otherwise provider
recovery stays UNVERIFIED. **Communicate:** report the classified code, affected
window, cost boundary and next check to the incident lead; use forward recovery
or schema-compatible application rollback only for a demonstrated code cause.

## D1 unavailable or suspected corruption

**Owner:** incident lead; maintainer assigns the data/recovery operator.
**Trigger:** persistence 503, unexpected missing/changed records, or integrity
failure in an approved synthetic account. A 409 alone is an expected conflict.

1. Preserve unsaved browser work and the exact failure time. Do not clear
   storage, reload away the only unsaved copy, or treat an empty fallback as a
   successful save. Follow the [conflict and recovery contract](../validation/d1-persistence-recovery.md).
2. Check that the live configuration has the `DB` binding and compare the
   deployed schema with `drizzle/meta/_journal.json`. Inspect bounded sanitized
   persistence errors; use only approved synthetic records for row readback.
3. If integrity is in doubt, stop test writes and escalate containment under
   First response. Do not delete rows, reset the database, run ad hoc SQL or
   export real user data to diagnose the failure.
4. For binding/platform unavailability, have the Site owner correct the
   configuration/platform fault. For corruption, require the approved hosted
   backup, isolated restore target, deletion-policy reconciliation, and named
   recovery authority before any restore. This repository has no automatic
   hosted restore command; local export/restore scripts are not that procedure.
5. After recovery, the approved two-account fixture must survive reload and a
   new session, reject cross-user access, and preserve a stale-save 409. Compare
   approved sanitized counts/digests and clean up the fixtures.

**Verify:** record recovery timing, achieved RPO/RTO and data differences;
missing restore authority or isolation proof remains BLOCKED. **Communicate:**
give the owner the affected resource classes and recovery gap without record
payloads. Application rollback never rewinds D1 and is not a corruption repair.

## Bad deployment

**Owner:** release operator, accountable to the incident lead.
**Trigger:** failed deployment, wrong live SHA/version, failed production smoke,
or a critical regression correlated with the release.

1. Read Site, saved-version and deployment metadata again. Determine whether
   the candidate actually became live before deciding to roll anything back.
2. Compare the last known-good application's read/write contract with the
   current D1 schema and conflict behavior. Stop on uncertain compatibility;
   selecting an old version is not a compatibility test.
3. If compatible, follow the exact-version
   [rollback procedure](sites-release-runbook.md#rollback). Otherwise follow
   [forward recovery](sites-release-runbook.md#forward-recovery). Never relabel
   a saved version or report success from a build result alone.
4. Run the release runbook's provenance-backed production smoke and inspect
   sanitized Worker logs for the declared observation window. Verify the
   affected browser journey separately; signed-out smoke cannot pass real saves.

**Verify:** terminal deployment success, matching source/version chain and
recovered affected journeys. **Communicate:** report whether production changed,
impact window, chosen recovery SHA/version and remaining data/account checks.

## Migration failure

**Owner:** maintainer-assigned data operator with the release operator.
**Trigger:** migration application error, missing schema object or a deployed
application that cannot read/write the current schema.

1. Stop further deployment/migration attempts and record the failing journal
   tag, candidate SHA and sanitized error. Have the authorized platform operator
   establish which migrations actually applied; do not infer atomic rollback
   or re-run a non-idempotent statement blindly.
2. Compare the actual schema, ordered journal and both live/candidate data
   contracts. Keep committed migrations append-only. Reproduce with synthetic
   data locally using `npm run build`, `npm run check:performance:d1` and
   `npm run check:recovery:d1`.
3. Choose an additive forward migration with review. Roll back application code
   only when it is compatible with the schema that actually exists. Any data
   restore follows the separately approved hosted recovery path above.
4. Apply the reviewed fix through the documented platform release path. If the
   necessary schema inspection or migration access is unavailable, retain a
   BLOCKED handoff rather than improvising a hosted Wrangler command.

**Verify:** applied journal/schema agreement, synthetic read/write and stale-save
behavior, then provenance-backed smoke. Local checks alone leave hosted writes
UNVERIFIED. **Communicate:** report applied/unknown tags, compatibility decision,
operator, recovery result and next verification time.

## Authentication-header anomaly

**Owner:** incident lead; maintainer assigns security/platform diagnosis.
**Trigger:** authenticated users unexpectedly appear signed out, ordinary users
reach owner data/actions, or caller-selected identity is accepted at the edge.

1. Treat suspected disclosure or cross-user mutation as P0 and stop reproduction
   involving real user data. Preserve only sanitized actor aliases and statuses.
2. Compare guest, approved user A/user B and owner behavior at the pinned Sites
   origin. Both injected identity headers are required by
   [the identity contract](../adr/0002-trust-sites-injected-identity-headers.md).
   Check header presence only through an approved diagnostic; do not capture
   their values or inject a real identity into an arbitrary request.
3. Distinguish a missing identity (401) from owner/origin rejection (403). Check
   configured owner matching privately. Never remove origin checks, trust a
   body/query user ID, or add a public bypass endpoint to diagnose sign-in.
4. Escalate edge stripping/injection questions to the Site owner/platform
   channel. Use a reviewed forward fix for an application cause. The current
   app has no general authentication kill switch; apply containment as above.

**Verify:** hosted guest rejection, bidirectional synthetic-user isolation and
owner-only actions, including negative spoofing evidence through the trusted
edge. Mocked headers do not prove this. **Communicate:** give the owner actor
roles, affected actions, sanitized statuses and containment; never account IDs.

## Widespread client errors

**Owner:** incident lead; maintainer assigns frontend diagnosis.
**Trigger:** broken navigation, hydration failure, missing scripts/diagram assets,
or repeated exceptions preventing a critical browser journey.

1. Record route, engine/version, viewport, deployed SHA/version and first failing
   action. Inspect the browser console/network for failed asset paths, statuses,
   CSP violations and a sanitized stack; never export a raw HAR with credentials.
2. Separate an HTML response from a working hydrated page. Compare a fresh
   dedicated browser session with the failing session, retaining unsaved work;
   do not erase the failing session's storage as a diagnostic shortcut.
3. Reproduce on the exact candidate with `npm run build` and
   `npm run test:e2e:cross-browser`. Check diagram artifacts with
   `npm run check:generated`; follow the bad-deployment procedure for a release
   regression. Do not loosen CSP or hide exceptions to make a page appear healthy.
4. Verify navigation, search, learning tabs, the copilot fallback and the affected
   workshop/reader action in the failing engine after the corrective deployment.

**Verify:** affected journeys complete with no reproduced exception or failed
required resource; record engine-specific and physical-device limits separately.
**Communicate:** report impacted engines/routes, safe workaround, recovery
version, observation window and outstanding device/assistive-technology proof.

## Completion and exercise history

Close the incident only when its affected boundary has direct recovery evidence,
synthetic fixture cleanup is verified, and the owner acknowledges the handoff.
Record FAIL/BLOCKED for missing data, platform access, alert acknowledgement or
account evidence. A documentation review is not a successful production drill.

| Date | Operator | Result |
| --- | --- | --- |
| 2026-11-08 | Codex | Source-contract review only; no outage, restore, alert, identity or provider exercise performed. |
