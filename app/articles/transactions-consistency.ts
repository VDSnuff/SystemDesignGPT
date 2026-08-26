import { defineGuideArticle } from "./article";

const markdown = `
## Start with the invariant and the visible promise

Transactions and consistency matter when several changes must preserve one business rule under concurrent work, retries, partial failure, or delayed replication. Apply this review wherever a user could observe an impossible intermediate state.

Begin with the **invariant**: the rule that must always hold. “A captured payment belongs to exactly one order” is useful; “use ACID” is not. Next define what the user may observe while work is in progress. An order may legitimately be \`payment_pending\`, but it must not say “confirmed” while inventory is unreserved and recovery is unknown.

A **transaction** is related work committed or rolled back under one data system’s guarantees. Its **atomic boundary** contains the changes that succeed or fail together. Keep an invariant inside one local transaction when one resource owns its state. Across independent owners, use explicit states, retries, compensation, and reconciliation.

*Evidence: [S7 — PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [S16 — Microsoft saga pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga), [S34 — Highly Available Transactions: Virtues and Limitations](https://www.vldb.org/pvldb/vol7/p181-bailis.pdf).*

## Draw atomic boundaries before drawing arrows

List each invariant beside its durable owner, then mark every boundary crossing. One database transaction can protect an order, its lines, and an outbox record in the same resource. It cannot silently include a payment provider, another service’s database, or an accepted broker message.

Keep local transactions short and do not hold them across human approval or a remote call. Extra lock time does not make a remote effect atomic or remove an ambiguous network outcome.

Name intermediate states as business facts: \`pending_inventory\`, \`payment_authorized\`, \`cancellation_required\`, or \`manual_review\`. Persist the workflow, completed steps, and stable operation identifiers so recovery does not infer success from a timeout.

## Choose isolation from the anomaly you must prevent

**Isolation** controls how concurrent database transactions can affect what each other observes. A dirty read sees another transaction’s uncommitted data. A nonrepeatable read sees a row change between two reads. A phantom read sees the result set of a repeated query change. A serialization anomaly means the committed outcome cannot be explained by running the transactions one at a time in any order.

Document the deployed database, isolation level, dangerous read/write pattern, and conflict outcome. PostgreSQL Read Committed gives each command a fresh committed snapshot, so two queries in one transaction can see different data. PostgreSQL Serializable rejects executions inconsistent with a serial order; the application retries the complete transaction. Other engines can implement similarly named levels differently.

Stronger isolation can simplify an invariant but increase aborts, retries, blocking, or coordination. A constraint, atomic write, lock, or version check may express a narrow rule more directly. Choose the minimum guarantee that makes the business rule and user promise true.

*Evidence: [S7 — PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [S34 — Highly Available Transactions: Virtues and Limitations](https://www.vldb.org/pvldb/vol7/p181-bailis.pdf).*

## Worked example: checkout across three owners

An order service owns order state, an inventory service owns stock reservations, and a payment provider owns authorizations. The requirement is: confirm an order only after inventory and payment are secured; otherwise release every reversible hold and tell the customer what is still happening.

1. The order service creates \`pending_inventory\` and an \`InventoryReservationRequested\` outbox record in one local transaction. If commit fails, neither exists. A publisher sends the outbox message later and may send it more than once.
2. Inventory processes the stable reservation identifier idempotently. It either records a reservation and emits \`InventoryReserved\`, or rejects the request. A duplicate produces the same reservation result rather than consuming stock again.
3. The workflow records \`inventory_reserved\` and requests payment authorization with a stable payment operation identifier. A timeout is **ambiguous**: the provider may have authorized payment even though the caller received no response. The workflow queries by that identifier before retrying or compensating.
4. After verified authorization, the order service commits \`confirmed\` plus an \`OrderConfirmed\` outbox record. Read models, email, and fulfillment can lag without changing the order service’s authoritative state.
5. If payment is declined, the workflow requests release of the inventory reservation. If release fails, the order becomes \`cancellation_required\`; a bounded retry and reconciliation worker continue recovery. The UI says the order was not confirmed and that the reservation is being released.

This is a **saga**: a sequence of local transactions coordinated as one business workflow. Compensation is a new business action, not a time machine. Releasing inventory can undo a reservation; refunding a captured payment does not erase the charge from history and may have fees or timing consequences. Define the point of no return before irreversible fulfillment, and place human review or an operational stop path before it when recovery cannot be safely automated.

With choreography, services react to events; with orchestration, one durable coordinator commands and tracks steps. Choreography suits a short flow but becomes harder to trace as participants grow. Orchestration makes recovery explicit but adds a component that must itself recover. Both need idempotent steps, durable state, and compensation failure handling.

*Evidence: [S15 — Microsoft transactional outbox pattern](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos), [S16 — Microsoft saga pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga).*

## Compare consistency and workflow choices

| Choice | Use when | What it costs or does not solve |
|---|---|---|
| Local transaction | One transactional resource owns every change needed for the invariant. | Cannot atomically include independent services, stores, or remote effects. |
| Stronger local isolation | Concurrent reads and writes can violate a specific invariant that weaker isolation permits. | More coordination, aborts, or retries; exact behavior is engine- and configuration-specific. |
| Transactional outbox | One local commit must durably record both business state and intent to publish. | Publication is asynchronous and may repeat; consumers and outbox cleanup need operational controls. |
| Saga with compensation | A multi-owner workflow can expose intermediate states and completed steps have meaningful recovery actions. | No cross-service isolation; compensation can fail or be only semantically corrective. |
| Reconciliation | Independent records can diverge temporarily and a trusted comparison can identify and repair differences. | Detection and repair are delayed; ownership, audit, and manual exceptions must be explicit. |

Prefer one service and store when they can own the invariant. Do not hide independent ownership behind a request chain and call it a transaction.

## Design read and user-visible consistency

Write and read consistency are separate decisions. A correct write can be followed by a stale replica, cache, search index, or projection. Name the authoritative surface and each other surface’s freshness promise.

After a mutation, **read-your-write** behavior may require reading the owner, a replica that has applied the returned version, or the committed response while projections catch up. A dashboard may allow bounded staleness if it names its “as of” time and does not drive an irreversible decision.

If a user has seen version 12, a later page should not silently show version 10. Carry a version token where this monotonic experience matters. Show pending state and recovery instead of presenting missing data as final truth.

A catalog may serve stale data during a partition; a final seat sale may defer when inventory is unreachable. “Eventually consistent” is incomplete until the design states what may differ, for how long, how convergence is detected, and what users may safely do.

*Evidence: [S34 — Highly Available Transactions: Virtues and Limitations](https://www.vldb.org/pvldb/vol7/p181-bailis.pdf), [S16 — Microsoft saga pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga).*

## Failure modes to challenge

- **The transaction label proves correctness.** The selected isolation level still permits the anomaly that breaks the invariant.
- **Database commit, then publish.** A crash between unrelated writes leaves durable state without its event; reversing the order can publish an event for state that never commits.
- **Timeout means failure.** Retrying an ambiguous remote effect with a new identity can duplicate a charge, reservation, or refund.
- **Compensation is guaranteed rollback.** The compensating action can fail, conflict with later work, or have a different business meaning.
- **Every read is authoritative.** A cache or replica hides a successful write and the user repeats the operation.
- **Retry only the failed statement.** A serialization failure invalidates the transaction’s decisions; retry the complete unit from fresh state.
- **A reconciliation job exists.** No owner, bounded detection delay, repair rule, or alert makes silent divergence permanent.

## Verify stale reads, retries, and partial success

Force failure points. Start concurrent writers from one version and assert both the invariant and caller responses at the deployed isolation level. Inject serialization failures and prove the whole transaction retries with bounded attempts and stable identity.

Delay replica, cache, or projection updates and verify promised read-your-write, “as of,” and monotonic behavior. Crash after local commit, after publish, and after consumer effect; prove outbox replay and deduplication converge on one business effect.

For the checkout saga, test inventory rejection, payment decline, payment success followed by response timeout, compensation timeout, duplicate and reordered messages, coordinator restart at every stored state, and reconciliation of an authorization with no confirmed order. Assert the final external state in every owner, not only the coordinator’s status. Observe workflow age, time in each intermediate state, retry count, duplicate suppression, outbox backlog, compensation failures, reconciliation discrepancies, and manual-review age.

## Transactions and consistency review checklist

1. State each invariant and its authoritative owner.
2. Draw the local atomic boundaries and every remote or asynchronous crossing.
3. Name the isolation anomaly that could break each local invariant and the chosen guard.
4. Define stable identities and outcomes for retries after ambiguous timeouts.
5. Persist explicit workflow states, completed steps, stop paths, and recovery ownership.
6. Use an outbox for database-plus-message intent and make consumers duplicate-safe.
7. Define compensation, its limits, and what happens when compensation fails.
8. Specify authoritative reads, acceptable staleness, read-your-write behavior, and partition behavior.
9. Reconcile independently owned facts and alert on age or unresolved divergence.
10. Test concurrency, crash points, replay, stale reads, and final external state.

## Review questions

1. What rule would make the business outcome invalid even if every individual write succeeded?
2. Which component can enforce that rule inside one local transaction?
3. What anomalies remain possible at the deployed isolation level, and what does the loser observe?
4. Where can partial success or an ambiguous timeout occur across owners?
5. Which steps are retryable, compensable, irreversible, or manual?
6. What may each user surface show before convergence, and for how long?
7. How are duplicate publication, duplicate consumption, and stale reads detected?
8. Which durable evidence proves recovery reached a valid final state?

Continue in the complete handbook at [4. Transactions and Consistency](/book/4-transactions-and-consistency), its [practical rules](/book/4-transactions-and-consistency#practical-rules), the [consistency checklist](/book/4-transactions-and-consistency#checklist), and [Reliable DB + message publishing](/book/4-transactions-and-consistency#reliable-db-message-publishing). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited PostgreSQL 18 documentation, Microsoft architecture guidance, and research source were rechecked on 26 August 2026. Isolation, transactional scope, replication, broker delivery, and provider retry behavior depend on deployed versions and configuration; verify them for the concrete system._
`;

export const transactionsConsistencyArticle = defineGuideArticle({
  markdown,
  slug: "transactions-consistency",
});
