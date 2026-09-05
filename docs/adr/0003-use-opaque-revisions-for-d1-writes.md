# ADR-0003: Use opaque revisions for D1 writes

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

The same learner can edit saved work from multiple browser sessions. Blind
last-write-wins updates can silently discard a newer note, diagram, quiz state,
or handbook checkpoint. D1 already stores `updated_at`, so conflict protection
can reuse the current schema without adding merge infrastructure.

## Decision

Treat `updated_at` as an opaque revision. Reads return it as `revision`; writes
echo it as `expectedUpdatedAt`. Inserts succeed only when no user-scoped record
exists, updates succeed only when the revision matches, and conflicts return
HTTP 409 without overwriting either copy. The client preserves local state and
requires an explicit reload and retry.

## Alternatives considered

- **Last write wins:** Minimizes protocol work but silently loses concurrent
  edits.
- **Automatic field or CRDT merging:** Can preserve more concurrent changes but
  adds semantics and operational complexity that the current state shape does
  not justify.

## Consequences

- Concurrent changes fail visibly and atomic D1 predicates enforce the contract.
- Clients must retain and submit revisions, and users resolve conflicts instead
  of receiving an automatic merge.

## Evidence

- [Persistence and recovery contract](../validation/d1-persistence-recovery.md)
- [Learning-state repository](../../app/learning-state-repository.ts)
- [Handbook-progress repository](../../app/handbook-progress-repository.ts)
- [Conflict contract tests](../../tests/learning-state-handlers.test.ts)

## Supersession rule

Review this ADR if collaborative editing, offline-first synchronization, or
field-level merge becomes a product requirement. Any change from reject-on-
conflict semantics requires a superseding ADR plus migration, rollback, and
concurrent-write evidence.
