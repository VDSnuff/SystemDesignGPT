# D1 persistence and recovery contract

This contract separates automated data-integrity evidence from hosted human
proof. Local and CI checks can prove the application protocol, migration order,
atomic writes, and backup shape. They cannot prove Sites identity headers,
production D1 durability, account isolation, or restore authority.

## Write-conflict policy

Learning state and handbook progress use `updated_at` as an opaque revision:

1. `GET` returns the stored state and its `revision`, or `null` for both when no
   record exists.
2. `PUT` must echo that value as `expectedUpdatedAt`.
3. A first write inserts only when the user-scoped key does not exist.
4. A later write updates only when its expected revision still matches.
5. A stale or duplicate create receives HTTP `409`; the server does not merge
   or overwrite either record.
6. The browser preserves its local work and instructs the reader to reload
   before making an explicit retry.

A pre-deployment browser tab that omits `expectedUpdatedAt` is treated as a
create-only write. It may create a missing record but receives `409` instead of
overwriting an existing record.

The next revision is always at least one millisecond newer than the expected
revision. This keeps comparison safe even when two operations share the same
wall-clock millisecond. User identity remains server-derived and is never
accepted from the request body.

## Schema and migration reproducibility

`drizzle/meta/_journal.json` is the ordered migration manifest. Both local D1
checks read every journal entry and fail if its matching SQL file cannot be
applied. Adding a migration therefore changes the executable check without a
second hand-maintained list.

This change adds no database column and requires no data rewrite. Current rows
already contain `updated_at`, so the deployed schema is backward-readable. An
older application build can still read rows written by this version, but it
does not enforce the new client conflict contract; rollback safety must be
confirmed against the exact deployed build under #69 and #93.

Malformed diagram, quiz, and handbook progress payloads are decoded through
versioned schemas. Valid legacy data is migrated in memory, invalid structured
fields reset with a visible warning, and unrelated valid fields remain intact.
Repository errors return `503` and do not replace local browser state.

## Automated evidence

Run from a clean checkout after the production build:

```bash
npm ci
npm test
npm run build
npm run check:performance:d1
npm run check:recovery:d1
```

`check:performance:d1` applies every journal migration to an isolated local D1,
checks distinct records, races learning-state and handbook-progress writes
against one revision, requires exactly one success and one `409` for each,
reloads, retries explicitly with the winning revision, then deletes the
synthetic user state.

`check:recovery:d1` creates a second isolated D1, applies every migration,
inserts synthetic rows for all four tables, exports a SQL backup, restores it to
a fresh local D1, and compares sanitized row counts plus a SHA-256 digest. Its
report is written to `performance-results/local-d1-recovery.json`; the temporary
database and raw backup are deleted even when the check fails.

## Human hosted gate

Issue #93 owns the real-account and destructive hosted proof: two-user
isolation, cross-session durability, hosted conflict behavior, backup/restore,
outage behavior, cleanup, RPO/RTO, and exact-SHA rollback compatibility. Issue
#92 owns policy decisions for retention, deletion, and export. Missing access or
authority is `BLOCKED`, never inferred green from local automation.
