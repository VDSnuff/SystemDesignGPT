import { defineGuideArticle } from "./article";

const markdown = `
## Start with the invariant, not the lock

Concurrency becomes a design problem when operations overlap and touch the same mutable state. Apply this review to inventory, balances, quotas, reservations, job ownership, counters, file updates, and any workflow where two individually valid actions can become invalid together.

Begin with the **invariant**: the rule that must remain true. “A seat has at most one confirmed booking” is useful; “make booking thread-safe” is not. Then name the shared state, every operation that reads or writes it, and the **race window** between observing state and committing a decision. The window may cross application code, a database round trip, a queue, or a remote call.

Also define acceptable conflict behavior. A losing request might receive a conflict, retry from fresh state, wait for an owner, or complete later through a queue. That product decision determines whether the system should detect overlap, prevent it, or serialize it. Reduce shared mutable state first; coordination that protects no named invariant adds latency and failure modes without adding correctness.

*Evidence: [S4 — .NET managed threading best practices](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices), [S5 — .NET threads and threading](https://learn.microsoft.com/en-us/dotnet/standard/threading/threads-and-threading), [S6 — PostgreSQL MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html).*

## Map overlap before choosing a mechanism

Write each risky operation as read, decide, and write steps. Two operations conflict when an interleaving can violate the invariant, even if requests arrive milliseconds apart or run in different services. Include scheduled jobs, retries, support tools, and replayed messages—not only two browser requests.

For each pair, ask:

1. What state can both observe or change?
2. Which interleaving produces a lost update, duplicate effect, or invalid transition?
3. At which durable boundary can the invariant be enforced?
4. What should the loser observe, and is retry safe?
5. Which metric or trace proves contention is healthy rather than hidden?

An in-process mutex protects only callers inside one process. It cannot coordinate another replica, a database console, or a consumer after restart. Persistent invariants usually belong in an atomic database statement, constraint, transaction, version check, or a deliberately serialized owner close to the source of truth.

*Evidence: [S4 — .NET managed threading best practices](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices), [S6 — PostgreSQL MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html), [S8 — PostgreSQL explicit locking](https://www.postgresql.org/docs/current/sql-lock.html).*

## Worked example: the last concert seat

Inventory contains one remaining seat. Request A and request B both read \`available = 1\`. Each decides that booking is allowed, creates a reservation, and writes \`available = 0\`. The final count looks plausible, but two customers now own one seat. The invariant failed because the decision and state change were not one protected operation.

Several fixes are valid, with different contracts:

- **Atomic conditional update:** run \`UPDATE seats SET available = available - 1 WHERE id = ? AND available > 0\` and accept only one affected row. This is compact when one record and one condition protect the invariant. The loser gets a sold-out result; no blind retry can create capacity.
- **Optimistic version check:** read the seat and version, then update only when the version is unchanged. One request commits and advances the version; the other detects a conflict. This fits short work with uncommon conflicts and a cheap way to recompute, but repeated retries under heavy contention waste work and must be bounded.
- **Pessimistic row lock:** lock the seat inside a short transaction, re-read it, decide, and commit before releasing the lock. This fits frequent conflicts or decisions that cannot be cheaply repeated. It makes wait time, deadlocks, and transaction duration part of the user experience.
- **Queue or single writer:** route commands for the same seat or event to one ordered owner. This makes serialization explicit and can absorb bursts, but adds queue delay, backlog recovery, and an asynchronous completion contract. Ordering must be scoped by the conflict key; globally serializing unrelated events destroys useful parallelism.

Whatever mechanism is chosen, a unique constraint on the confirmed seat assignment remains valuable as a final durable guard. The service translates a conflict into one documented outcome rather than exposing a database error or quietly retrying forever.

Verification starts both booking attempts behind a barrier so they read the same initial state, releases them together, and asserts exactly one confirmation, one clear rejection, one inventory decrement, and no orphan payment. Repeat the test enough times to exercise the overlap, but make the barrier—not timing luck—the reason the race occurs. A production trace should connect both attempts to the same seat key and show which guard accepted or rejected each write.

*Evidence: [S6 — PostgreSQL MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html), [S7 — PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [S8 — PostgreSQL explicit locking](https://www.postgresql.org/docs/current/sql-lock.html), [S14 — Microsoft competing consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers).*

## Compare the coordination choices

| Mechanism | Best fit | Cost and failure behavior |
|---|---|---|
| Atomic operation or constraint | A database can express the invariant in one durable change. | Limited to invariants the storage boundary can express; callers must handle a rejected write. |
| Optimistic concurrency | Conflicts are uncommon and work can be recomputed from fresh state. | Conflict retries add load and latency; stale clients need a clear merge or rejection path. |
| Pessimistic lock | Contention is expected and the protected decision must be serialized. | Waits, deadlocks, reduced throughput, and abandoned work require limits and recovery. |
| Queue or single writer | Commands for one key can complete asynchronously in order. | Queue delay, hot keys, ownership failover, and backlog become operational concerns. |
| Lease with fencing | Ownership must expire so another worker can recover abandoned work. | Time-limited ownership alone is insufficient: a paused old owner can resume after expiry. |

A **lease** grants ownership for a bounded period. Renewal and expiry let another worker recover, but the old worker may still wake and write. Pair the lease with a monotonically increasing **fencing token**; the protected resource rejects operations carrying a token older than the latest accepted token. Define which component issues the token and which durable boundary enforces it. If the resource cannot reject stale owners, the lease coordinates intention but does not prove exclusive effects.

Queues also need an ownership contract. Competing consumers can improve throughput, while partitioning or routing by business key can serialize only related work. Define what happens when a consumer crashes after performing an effect but before acknowledging the message; concurrency control does not replace idempotency.

*Evidence: [S8 — PostgreSQL explicit locking](https://www.postgresql.org/docs/current/sql-lock.html), [S14 — Microsoft competing consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers).*

## Bound locks, waits, and fairness

Keep lock scope aligned with the smallest state that protects the invariant and hold it for the shortest complete critical section. Do not make slow network calls while holding a database or in-process lock when the remote result can be obtained before the transaction or represented as a later state transition.

A **deadlock** occurs when operations wait in a cycle—for example, A holds account 1 and waits for account 2 while B holds account 2 and waits for account 1. Acquire multiple locks in one consistent order, keep transactions short, and treat a database deadlock abort as a bounded, observable outcome. A timeout caps waiting; it does not repair a partial side effect, so retry only when the complete operation contract is safe.

**Starvation** means one operation repeatedly loses access while others progress. Watch for a hot key, an unfair retry loop, or high-priority work that permanently displaces ordinary work. Bound attempts, add backoff where recomputation is safe, and expose a terminal conflict or defer work through a fairer queue. Parallelism limits should protect scarce resources without turning one slow task into a convoy that blocks unrelated keys.

*Evidence: [S4 — .NET managed threading best practices](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices), [S7 — PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [S8 — PostgreSQL explicit locking](https://www.postgresql.org/docs/current/sql-lock.html).*

## Failure modes to challenge

- **Check then write.** Validation and mutation are separate, so another operation can invalidate the decision between them.
- **A process-local lock guards shared storage.** Another replica or tool bypasses the lock.
- **Retry until success.** Contention becomes an invisible retry storm and user latency has no bound.
- **The lock covers remote I/O.** A slow dependency expands the critical section and causes a convoy.
- **A lease proves exclusivity.** An expired owner resumes and writes unless the resource rejects its stale fencing token.
- **The queue orders everything.** Unrelated work loses parallelism, while multiple partitions still fail to protect the actual conflict key.
- **A stress test proves the race is fixed.** Timing-dependent tests may never create the dangerous interleaving.

## Observe and test the conflict contract

Record conflict count and rate, lock or queue wait duration, timeout and deadlock aborts, retry attempts, hot keys, lease renewals, stale-token rejections, queue age, and the final business outcome. High contention may mean the mechanism is working, but it may also signal a poor partition key or a requirement the design cannot meet. Alert on user impact and exhausted budgets, not every expected optimistic conflict.

Test the interleaving deterministically with barriers or controllable dependencies. Cover two writers from the same version, read-versus-write overlap, duplicate commands, cancellation during a wait, deadlock victim retry, owner pause beyond lease expiry, stale fencing token, process crash, and a hot key under the expected concurrency limit. Assert both the invariant and what each caller observes. Run a separate load test to measure throughput and tail latency; correctness tests and capacity tests answer different questions.

## Concurrency review checklist

1. State each invariant and the shared mutable state it protects.
2. Enumerate overlapping operations, including jobs, retries, replays, and administrative paths.
3. Draw the dangerous read-decide-write interleaving and define the losing outcome.
4. Enforce persistent invariants at a durable boundary that every writer uses.
5. Choose atomic update, optimistic check, lock, queue, lease, or single writer from measured conflict behavior.
6. Bound lock scope, wait time, retry count, queue age, lease renewal, and ownership recovery.
7. Define lock ordering and stale-owner fencing when those mechanisms apply.
8. Observe conflicts and test the exact interleaving plus crash and timeout paths.

## Review questions

1. Which operations can overlap, and what shared state can they each observe or change?
2. What business invariant could their interleaving violate?
3. Where is that invariant enforced so every writer—including jobs and tools—must obey it?
4. Should a conflict wait, fail, retry, merge, or complete asynchronously, and what does the user see?
5. Does the mechanism coordinate one process, one database, one key, or the whole system?
6. Are lock scope, ordering, timeouts, retries, and lease expiry bounded and observable?
7. Can an expired owner still write, and where is its fencing token rejected?
8. Do tests force the dangerous schedule and assert the durable outcome rather than relying on chance?

Continue in the complete handbook at [3. Concurrency](/book/3-concurrency) and its [concurrency checklist](/book/3-concurrency#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited official documentation was rechecked on 26 August 2026. Runtime scheduling, database isolation and lock behavior, queue configuration, and retry policy depend on the deployed versions and settings; verify them for the concrete system._
`;

export const concurrencyArticle = defineGuideArticle({
  markdown,
  slug: "concurrency",
});
