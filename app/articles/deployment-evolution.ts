import { defineGuideArticle } from "./article";

const markdown = `
## Design the mixed-version period first

A production change is rarely instantaneous. Application versions overlap, clients update at different times, queued events outlive producers, and data takes time to transform. Apply this review before changing an API, event, schema, configuration, or stateful workflow.

Describe every intermediate state: which versions read and write, what is authoritative, how failures appear, and what evidence allows the next step. An **additive change** introduces something new without immediately changing the old contract, creating a compatibility window.

A safe sequence is **expand, migrate, contract**:

1. **Expand:** add compatible fields, columns, endpoints, event versions, or behavior while old consumers still work.
2. **Migrate:** move traffic or data incrementally, measure parity, and retain a recovery point.
3. **Contract:** remove the old path only after usage is zero, evidence is accepted, and the compatibility window has ended.

Use the sequence when simultaneous replacement cannot be proved. Canaries, flags, and blue/green environments are optional techniques for named risks.

*Evidence: [S10 — Microsoft Web API design practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S55 — Microsoft multitenant storage and data approaches](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data).*

## Separate deployment from release

**Deployment** places a version in an environment. **Release** exposes its behavior to users or traffic. Separating them can make rollout reversible: deploy dormant code, verify health, then enable it through routing, configuration, or a **feature flag**, a controlled switch for behavior.

Flags create behavior paths and configuration-specific defects. Give each an owner, permitted states, telemetry, expiry, and cleanup. Security, data integrity, and schema compatibility cannot depend on a client-controlled flag. If code writes incompatible state, turning the flag off is not rollback.

Record the artifact, configuration, migration state, flags, and traffic allocation so operators can reproduce what users run.

## Choose a rollout and recovery strategy

| Strategy | Appropriate when | Cost and recovery limit |
|---|---|---|
| Rolling deployment | Adjacent versions are compatible and gradual instance replacement is sufficient. | Mixed versions are guaranteed; rollback restores code only if state remains compatible. |
| Canary release | A small representative cohort can reveal user, reliability, or performance regressions before wider exposure. | Needs comparable control data, measurable stop criteria, and enough traffic to evaluate. |
| Blue/green | Two complete environments can run while traffic switches between them. | Duplicates environment cost; shared databases and side effects can still prevent safe reversal. |
| Feature-flag release | Behavior can be enabled independently of deployment for named cohorts. | Adds state combinations, operational ownership, and cleanup obligations. |
| Roll forward | A corrective version is safer than reverting changed state or contracts. | Requires a prepared fix path and a system healthy enough to accept another change. |

A **rollback** returns to an earlier version or configuration; a **roll-forward** deploys a correction. Stateless compatible code may roll back safely. Schema contraction, external side effects, or transformed data may require roll-forward, restore, or compensation.

Before rollout, define the observation window, signals, thresholds, stop authority, action, and recovery verification. Deployment completion does not make a canary successful.

*Evidence: [S25 — Google SRE canarying releases](https://sre.google/workbook/canarying-releases/), [S33 — Google SRE reliable product launches](https://sre.google/sre-book/reliable-product-launches/).*

## Evolve APIs, events, schemas, and data compatibly

For an API, prefer optional response fields and optional request fields with documented defaults. Consumers should tolerate unused fields. Changed meaning can break a field even when its type stays the same. Incompatible changes need a version and deprecation plan with usage telemetry, migration guidance, ownership, and an end date.

For events, deploy tolerant consumers before new producers. Preserve identity and meaning; even an added field fails if strict consumers reject it. Coexisting contracts need explicit versions or event types and replay tests. Removal waits for every consumer, including offline jobs.

Let old and new applications use the expanded schema. Do not require a new column before every writer supplies it. Plan index creation, validation, and transformation around locks, input/output pressure, replication lag, and interruption. Verify the exact engine and version.

A **backfill** transforms existing records after a compatible destination exists. Make it bounded, resumable, observable, and repeatable. Use stable batches and checkpoints, throttle against headroom, record failures, and reconcile correctness before changing reads.

## Worked migration: rename a customer field without downtime

An orders API stores \`customer_name\`, but now needs \`display_name\`. Clients update independently, deployment is rolling, orders remain writable, and no accepted order may lose its label.

### Phase 0: baseline and recovery proof

Measure old-field use, row counts, and nulls; verify restoration; record application, schema, and configuration versions. Contract tests prove old clients still work. Stop if restore or observability is unproven.

### Phase 1: expand

Add nullable \`display_name\` without constraining \`customer_name\`. New code accepts either API field, rejects conflicts, writes both columns, and reads the new field with fallback. Old code keeps using the old column.

Canary the version against a control using success, latency, errors, write parity, and visible labels. On failure, route back to old code; the additive schema is the recovery point.

### Phase 2: migrate and verify

Backfill \`display_name\` from \`customer_name\` in stable, resumable batches. Checkpoint the last processed identity, cap concurrency, and monitor database latency, locks, replication lag, failures, and remaining nulls. Re-running a completed batch must produce the same result.

If thresholds fail, pause, correct, and resume; old readers still work. Switching reads requires complete backfill, no unexplained differences, old/new contract tests, and a production smoke flow.

### Phase 3: release the new contract

Stop old application instances, run a final catch-up backfill, and reconcile parity. Then return \`display_name\` to migrated clients while retaining the old API and dual writes. Observe usage through the deprecation window and record traffic, versions, migration checkpoint, parity, and owner.

### Phase 4: contract and clean up

After old usage is zero and recovery evidence is accepted, a later change stops old-field writes and removes the old API field, compatibility code, dual write, column, dashboards, and flag. Preserve the required backup first. Column removal makes code-only rollback unsafe; recovery is roll-forward or restoration.

“Zero downtime” is proved by compatible operation and measured user outcomes, not a successful migration command.

## Treat stateful rollback as a separate design

Code, schema, data, configuration, queues, caches, and external side effects move on different timelines. List each one in the recovery plan. A previous binary may fail against a contracted schema; an old consumer may misread a new event; a payment or email cannot be undone by redeploying code.

Delay destructive operations until the new path is proven and old use is absent. Preserve backups, event retention, migration checkpoints, compatibility adapters, or compensating actions for the required recovery window. Test the chosen rollback or roll-forward path in a production-like environment, including the time and permissions needed to execute it.

## Make release evidence a gate

Pre-release evidence covers build provenance, contract and migration tests, security review, capacity, backup/restore, rollout configuration, owners, and recovery rehearsal. During release, compare user outcomes, errors, latency, saturation, dependency health, data invariants, migration progress, and business-critical signals against the baseline or control.

After release, run a representative user flow, confirm the reported version and configuration, reconcile data, and watch through the agreed window. Store the result with the change. A green health endpoint alone cannot prove compatibility or correctness.

*Evidence: [S30 — Microsoft Azure Well-Architected Operational Excellence](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/), [S33 — Google SRE reliable product launches](https://sre.google/sre-book/reliable-product-launches/).*

## Failure modes to challenge

- **Breaking change in one deployment.** Old clients, instances, or queued work encounter a contract they cannot understand.
- **Deploy equals release.** Operators cannot isolate artifact health from behavior exposure.
- **Rollback means redeploy code.** Changed schemas, data, side effects, and configuration remain incompatible.
- **Canary without a control or threshold.** A small rollout runs, but nobody can decide whether it is better or worse.
- **Backfill as one large transaction.** Locks, resource pressure, or interruption turn migration into an outage.
- **Dual write forever.** Drift and complexity persist because the compatibility path has no owner or end date.
- **Feature flag without cleanup.** Untested combinations accumulate and stale behavior becomes permanent.
- **Contract by calendar alone.** The old path is removed without measured usage reaching zero.
- **Smoke test only infrastructure.** Healthy processes can still serve wrong fields or corrupt workflow state.

## Deployment and evolution review checklist

1. Describe every mixed-version state for applications, clients, APIs, events, schemas, data, and configuration.
2. Expand compatibly before migrating traffic or data; contract only after evidence and the deprecation window.
3. Separate deployment from release when independent exposure materially reduces risk.
4. Give feature flags owners, telemetry, permitted states, expiry dates, and cleanup work.
5. Choose rolling, canary, blue/green, rollback, or roll-forward from the actual failure and state model.
6. Make backfills bounded, resumable, repeatable, throttled, and reconciled.
7. Define recovery points and prove that code, schema, data, and side effects can recover together.
8. Gate progression on user, system, compatibility, and data-integrity evidence.
9. Record the artifact, configuration, migration state, flags, traffic, owner, and result.
10. Remove compatibility code and obsolete data through an owned, verified cleanup change.

## Review questions

1. Which old and new versions coexist at each step, and can every pair read and write safely?
2. What is additive, what is destructive, and what evidence permits contraction?
3. Can behavior exposure be reversed independently of deployment?
4. Which state change makes code rollback unsafe, and what is the roll-forward or restore path?
5. How does the backfill resume, throttle, reconcile, and handle conflicting live writes?
6. Which canary signals represent users, and what threshold automatically or manually stops rollout?
7. How will we prove that old clients, consumers, fields, flags, and compatibility paths are unused?
8. Who owns the migration, recovery decision, deprecation communication, and final cleanup?

Continue in the complete handbook at [11. Deployment, Migration, and Evolution](/book/11-deployment-migration-and-evolution) and its [checklist](/book/11-deployment-migration-and-evolution#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for canonical sources.

_Evidence scope: the cited Microsoft and Google guidance was rechecked on 27 August 2026. API behavior, database migration features, rollout controls, and provider recovery capabilities vary by product and version; verify them in the deployed environment before changing production state._
`;

export const deploymentEvolutionArticle = defineGuideArticle({
  markdown,
  slug: "deployment-evolution",
});
