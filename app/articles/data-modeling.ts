import { defineGuideArticle } from "./article";

const markdown = `
## Model the questions your system must answer

Data modeling turns business rules and access patterns into durable structure. Apply it before choosing a database and whenever a critical query changes. The goal is a model that preserves invariants, answers required questions predictably, and can evolve without losing meaning.

Start with a workload inventory. For every important operation, record lookup fields, filters, ordering, result size, rate, consistency, retention, and latency. Include maintenance such as expiry, reconciliation, backup, and deletion. These patterns determine aggregate boundaries, keys, constraints, indexes, and eventually partitioning.

An **invariant** is a rule that must remain true, such as “an order total cannot be negative” or “an external payment reference is unique within a tenant.” Put invariants in the strongest practical enforcement point. A database constraint protects every writer; application-only validation protects only the code paths that remember to call it.

*Evidence: [S37 — Microsoft data-store models](https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/understand-data-store-models), [S6 — PostgreSQL MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html), [S7 — PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).*

## Choose storage from invariants and access shape

Storage choice follows the operations the system must support, not the shape of an in-memory object.

| Model | Good fit | Cost to accept |
|---|---|---|
| Relational | Multi-row invariants, transactions, joins, flexible filtering, and mature constraints. | Normalized reads may join tables; horizontal write scaling needs deliberate partitioning. |
| Document | An aggregate is normally read and written together and its nested shape evolves. | Cross-document transactions, unbounded document growth, and ad hoc relationships can become awkward. |
| Key-value | Access is primarily exact lookup by a stable key. | Secondary queries require another index or model; changing lookup needs can force redesign. |
| Object storage | Large immutable or replaceable binaries such as exports, images, and backups. | Metadata queries and partial structured updates are limited, so keep searchable metadata elsewhere. |

Using two models can be correct when life cycles or access patterns differ—for example, order metadata in a relational store and generated files in object storage. Every additional store adds backup, security, observability, migration, and failure responsibilities. Keep one model while it satisfies the requirements.

## Worked example: tenant order history

Consider a multi-tenant order service with four dominant operations:

1. Create an order once for a tenant-scoped request identifier.
2. Fetch one order with its line items by tenant and order identifier.
3. Page through one customer’s newest orders with stable ordering.
4. Claim pending orders for fulfillment in creation order.

A relational starting model uses \`orders\` and \`order_items\`. An order row contains \`tenant_id\`, \`order_id\`, \`customer_id\`, \`request_id\`, \`status\`, \`created_at\`, and the monetary fields needed to preserve the accepted price. Line items use \`tenant_id\`, \`order_id\`, and \`line_number\` as their identity. A foreign key connects each line to its order; checks reject invalid quantities and amounts; a uniqueness constraint on \`(tenant_id, request_id)\` prevents two orders for one accepted request.

The keys and indexes each answer a named operation:

- Primary key \`(tenant_id, order_id)\` supports tenant-scoped point lookup and makes tenant context unavoidable in related keys.
- Index \`(tenant_id, customer_id, created_at DESC, order_id DESC)\` supports the customer-history filter and complete deterministic ordering.
- A pending-work index beginning with \`tenant_id\` and the claim ordering supports fulfillment without scanning completed history. If the database supports partial indexes, indexing only pending rows can reduce index size, but it must be verified against the real query plan.
- The unique request index enforces the create-once invariant as well as accelerating reconciliation after a timeout.

Do not add indexes for hypothetical screens. Capture query plans and latency under realistic cardinality. An index can avoid a broad scan, but every write must maintain it and every index consumes storage. Remove redundant indexes only after verifying that no critical workload depends on them.

The example deliberately keeps product descriptions and accepted prices on each line item. That duplication is owned by the order because historical truth must not change when the catalog changes. Product search remains owned by the catalog; the copied snapshot is not a second editable product record.

*Evidence: [S38 — PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html), [S37 — Microsoft data-store models](https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/understand-data-store-models).*

## Make pagination a stable data contract

Pagination is not only a user-interface choice. The ordering fields and cursor determine which rows can be repeated or skipped while data changes.

Offset pagination is simple and useful for small, stable result sets or interfaces that require direct page numbers. On a large, changing order history, increasing offsets can require more work and inserts can shift later pages. Cursor pagination instead continues after the last observed ordering tuple—for this example, \`(created_at, order_id)\`. The unique tie-breaker matters because timestamps alone can repeat.

Define whether the result is a live view or a fixed snapshot, what filters are encoded into the cursor contract, and what happens when the referenced row is deleted. Treat cursors as opaque API values and test concurrent inserts, equal timestamps, deletion, forward traversal, and empty final pages.

*Evidence: [S10 — Microsoft Web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S38 — PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html).*

## Normalize first; denormalize with ownership

Normalization stores one fact in one authoritative place and uses relationships to combine it. It is a strong default for transactional data because updates do not have to find many editable copies. Denormalization copies or precomputes data to satisfy a proven read requirement.

Before denormalizing, name the source of truth, freshness target, update mechanism, rebuild path, and behavior when propagation fails. A materialized customer-order summary can make a dashboard cheaper, but it is a derived view, not an alternative place to edit an order. If readers cannot tell which copy wins, the design has created a consistency problem rather than a performance feature.

## Partition only for a concrete limit

A **partition** or shard is a subset of data managed separately to distribute capacity or isolate workloads. It introduces routing, cross-partition operations, rebalancing, backup coordination, and failure modes that a single logical store avoids. Partition only after simpler measures—query tuning, suitable indexes, archival, caching, read replicas, or vertical capacity—cannot meet a measured storage, write, concurrency, isolation, or recovery requirement.

Good partition keys align with dominant queries and distribute load. For the order example, \`tenant_id\` keeps most tenant operations local and supports isolation, but it fails when one tenant owns a disproportionate share of traffic or data. Hashing can distribute writes more evenly but makes tenant-wide scans fan out. Time ranges simplify retention and time-window scans but concentrate current writes and complicate entity history. There is no universally good key; compare candidates against real distributions and queries.

Before launch, model the largest key, peak write concentration, storage growth, partition count, and cross-partition rate. Define routing, resharding triggers, data copy and cutover, verification, rollback, backup ownership, and recovery. Rebalancing is a production data migration, not an automatic footnote.

Signals that justify partitioning include sustained resource saturation after query tuning, approaching a verified service or storage limit, write contention tied to one ownership unit, recovery objectives that require smaller failure domains, or contractual tenant isolation. Signals of a poor key include one partition dominating CPU or storage, frequent scatter-gather queries, cross-partition transactions, growing routing exceptions, throttling isolated to a hot key, and rebalancing that cannot keep up with growth.

*Evidence: [S36 — Microsoft sharding pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding), [S44 — Microsoft capacity planning](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning), [S43 — Microsoft multitenant storage](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/service/storage).*

## Evolve the schema through compatible states

Treat a schema change as a sequence, not a flag day. Add the new shape while old readers and writers still work, deploy code that understands both states, backfill in bounded resumable batches, verify counts and invariants, switch reads and then writes deliberately, and remove the old shape only after rollback no longer needs it.

For a rename, adding the new field before removing the old one is safer than coordinating every process at one instant. For a new required value, add it as optional, populate it, verify it, then enforce the constraint. Bound migration load, monitor replication and request latency, record progress durably, and test restart after interruption. If two writers temporarily produce both forms, define which is authoritative and how divergence is detected.

## Failure modes to challenge

- **Schema-first design.** Tables mirror UI objects, while required filters, invariants, retention, and maintenance operations appear later.
- **Indexes as decoration.** Many indexes improve a synthetic read but make writes, storage, vacuuming, or migrations expensive without an owner.
- **Editable duplication.** Two copies of a business fact can both change, with no authority or repair path.
- **Unstable pagination.** Ordering is not unique, so concurrent changes repeat or skip records.
- **Sharding for future scale.** Routing and recovery complexity arrive before a measured limit or team capability.
- **A fashionable partition key.** Average distribution looks even while one tenant, timestamp range, or celebrity key overloads a shard.
- **Big-bang evolution.** A destructive schema change assumes every application instance and background worker changes simultaneously.

## Data-model review checklist

1. List critical reads, writes, maintenance jobs, ordering, result sizes, rates, retention, and consistency needs.
2. Name entities, relationships, aggregate boundaries, source-of-truth ownership, and business invariants.
3. Map each key, constraint, and index to an operation or invariant; measure its read benefit and write cost.
4. Define stable pagination, including unique ordering, concurrent changes, deletion, and cursor behavior.
5. Justify every denormalized copy with freshness, update, failure, and rebuild contracts.
6. Keep a single store unless another model solves a named life-cycle or access-pattern conflict.
7. Partition only for a verified limit; test key distribution, hot keys, fan-out, rebalance, backup, and recovery.
8. Plan schema evolution as compatible, observable, resumable states with a clear rollback boundary.

## Review questions

1. Which business invariants must the data layer preserve, and where are they enforced?
2. Which representative queries shaped the model, keys, and indexes?
3. What does each index cost on the write path, and is its production use observable?
4. Can pagination remain stable while rows are inserted, updated, or deleted?
5. Which data is authoritative, copied, cached, or derived, and how is each copy repaired?
6. What measured limit would trigger partitioning, and why does the candidate key fit both distribution and query locality?
7. How are hot partitions, cross-shard work, rebalancing, backup, and restore tested?
8. Can every schema migration pause, resume, verify, and recover while mixed application versions run?

Continue in the complete handbook at [2B. Data Modeling, Indexing, and Partitioning](/book/2b-data-modeling-indexing-and-partitioning) and its [practical progression](/book/2b-data-modeling-indexing-and-partitioning#practical-progression). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited official guidance was rechecked on 26 August 2026. Database versions, query planners, managed-service limits, quotas, and online migration capabilities can change; verify the deployed engine, service tier, data distribution, query plans, and recovery procedure for a concrete system._
`;

export const dataModelingArticle = defineGuideArticle({
  markdown,
  slug: "data-modeling",
});
