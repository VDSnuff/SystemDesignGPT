import { defineGuideArticle } from "./article";

const markdown = `
## Start with the failure contract

Remote work can be slow, unavailable, partially successful, or complete after its caller stops waiting. Resilience keeps those failures bounded: time spent waiting, recovery load, resources one dependency can consume, and user impact. Apply this review to every remote dependency and critical workflow.

Begin with the user promise: the critical outcome, end-to-end deadline, acceptable degradation, and the point when work has no value. A timeout does not prove that nothing happened; retry only when repetition cannot create an unintended second effect or the operation has an idempotency contract.

Treat timeout, retry, circuit breaking, load shedding, bulkheads, fallback, and recovery as one control system. A retry may survive a short fault but consumes deadline and capacity. A circuit breaker protects a struggling dependency by rejecting work. A fallback is useful only when its data and semantics remain honest.

*Evidence: [S17 — Microsoft transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults), [S18 — Microsoft retry storm antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/), [S19 — AWS guidance for controlling retries](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html).*

## Classify failure before choosing a response

Classify failures by what the caller can safely infer, not by a generic exception label.

| Failure class | Example | Appropriate response | Cost or risk |
|---|---|---|---|
| Transient and safe to repeat | Documented overload before work is accepted. | Retry within the deadline with server guidance, backoff, and jitter. | Attempts consume capacity and delay the answer. |
| Persistent dependency failure | Connection attempts keep failing across a meaningful observation window. | Fail fast, open a circuit, degrade, queue only if delayed completion is part of the contract, or return an explicit error. | Rejected work is visible, but capacity is preserved for recovery and other flows. |
| Caller or contract error | Invalid input or missing authorization. | Stop and return an actionable failure. | Retrying unchanged work adds load and hides the real defect. |
| Ambiguous outcome | A write timed out after reaching the dependency. | Reconcile by identity, status lookup, or idempotent replay. | Blind retry can duplicate an effect. |
| Overload | Pools, queues, or downstream capacity are saturated. | Admit by priority, throttle, shed, or return bounded backpressure. | Some work is refused so the critical path can remain healthy. |
| Disaster-scale loss | A region or data store cannot support the workload. | Execute the tested recovery plan. | Trades cost, data freshness, and restoration time. |

A generic retry wrapper cannot know whether a payment was accepted, a response means “try later,” or the business deadline expired. Keep classification close to the dependency contract.

## Allocate end-to-end time and retry budgets

Start with the user-visible deadline and reserve time outside the dependency call. If checkout must answer within two seconds, reserving 700 ms for ingress, local work, and response leaves 1.3 seconds. One example policy is a 550 ms first attempt, about 100 ms of randomized backoff, and one final 550 ms attempt. Measurements and the business promise must set real values.

The budget includes connection time, attempts, backoff, and caller overhead. Stop when another attempt cannot finish usefully. Propagate deadlines so downstream work does not begin after the user contract expires.

Per-request limits are insufficient: many callers can each obey them and still overwhelm one dependency. Add an aggregate retry budget and make one layer own retries. Three layers making three total attempts each can turn one request into 27 dependency attempts. Hidden SDK defaults can create this multiplication.

Use exponential backoff and **jitter**, a small random variation, to prevent lockstep retries. Honor valid server retry guidance. After exhaustion, expose a terminal outcome; endless retries turn stale work into continuing load.

*Evidence: [S17 — Microsoft transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults), [S18 — Microsoft retry storm antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/), [S19 — AWS guidance for controlling retries](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html).*

## Compare the resilience controls

| Control | Use it when | What it costs |
|---|---|---|
| Finite timeout | Waiting longer would violate the caller's deadline or hold scarce resources. | A late success becomes ambiguous unless the operation supports reconciliation. |
| Bounded retry | A documented fault is transient, repetition is safe, and time and retry budgets remain. | Adds dependency load and tail latency; requires observability and exhaustion behavior. |
| Circuit breaker | Continued calls are unlikely to succeed and are blocking recovery. | Healthy probes or traffic may be rejected while the circuit is open; state and thresholds need tuning. |
| Bulkhead | One dependency, tenant, or workload can exhaust a shared pool. | Reserved capacity can sit unused and limits require ownership. |
| Load shedding or rate limiting | Offered load exceeds safe capacity. | Callers receive rejection or reduced service and need a clear retry contract. |
| Graceful degradation | A smaller result remains truthful and useful without the failed dependency. | Product semantics become more complex and stale or partial data must be labeled. |
| Failover or restore | The primary environment cannot meet recovery objectives. | Redundancy, replication, drills, and operator readiness add cost and operational work. |

Controls are optional techniques. A local calculation needs no circuit breaker; a critical remote write needs timeout and ambiguity handling even without automatic retry. Choose the smallest set that enforces the failure contract.

*Evidence: [S3 — Microsoft design principles](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/), [S17 — Microsoft transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults), [S45 — Microsoft rate limiting pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern).*

## Worked example: dependency outage during checkout

An online store promises a confirmed order or clear non-confirmation within two seconds. Inventory reservation is required; recommendations and loyalty points are optional. Inventory normally handles 1,000 requests per second but saturates during a promotion.

The unsafe design retries immediately in the browser, checkout API, and inventory client. At 1,000 original requests per second, one layer making three attempts drives 3,000 dependency attempts. Multiple layers multiply load, occupy pools, and prevent recovery. Users still cannot know whether a timed-out reservation succeeded.

The safer policy gives checkout sole retry ownership: at most two attempts for documented transient failures, within the remaining deadline, with jitter and server guidance. A checkout identity reconciles ambiguous reservations. An aggregate retry budget stops amplification, a circuit rejects calls during sustained failure, and an inventory bulkhead protects payment and order-status pools.

The product hides recommendations and defers loyalty accrual, but never claims checkout success without confirmed inventory. At capacity, it returns a bounded unavailable outcome instead of growing a queue. Operators observe attempts, retry ratio, circuit state, pool saturation, rejection, latency, and ambiguous reservations.

Tests inject latency, overload, dropped replies around acceptance, and recovery after circuit opening. They prove the deadline, no duplicate reservation, bounded attempts, useful degradation, isolation, and recovery without a retry spike.

*Evidence: [S17 — Microsoft transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults), [S18 — Microsoft retry storm antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/), [S19 — AWS guidance for controlling retries](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html).*

## Degrade deliberately and recover completely

Graceful degradation preserves a critical outcome while an optional capability fails: hide recommendations, label cached data, allow read-only access, or pause noncritical work. Never turn unknown state into success, silently use stale security or pricing data, or queue work expected to finish synchronously.

Disaster recovery addresses larger loss than a transient fault. Define the **recovery point objective (RPO)**, maximum acceptable data-loss window, and **recovery time objective (RTO)**, target restoration time. Backups and runbooks become evidence only when a representative restore or failover proves the outcome.

Run controlled game days for a specific failure and recovery path, with abort conditions, an observer, timestamps, and integrity checks. Exercise degradation, failover, backlog recovery, reconciliation, and failback. Record achieved RPO/RTO, restored flows, data differences, alerts, manual steps, and correction owners.

*Evidence: [S24 — Google SRE launch coordination checklist](https://sre.google/sre-book/launch-checklist/), [S30 — Microsoft operational excellence guidance](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/).*

## Failure modes to challenge

- **Retry every error.** Invalid requests, authorization failures, and exhausted business deadlines cannot become successful through repetition.
- **Retry at every layer.** Independent policies multiply attempts and hide who owns the end-to-end budget.
- **Timeout means rollback.** The remote side may have committed after the caller stopped waiting; reconcile ambiguous outcomes.
- **Circuit breaker as magic recovery.** It protects capacity but does not repair the dependency, preserve data, or define the user experience.
- **Fallback at any cost.** Stale or semantically different data can be more harmful than an explicit failure.
- **Unbounded queue as resilience.** It converts overload into rising latency, memory use, and expired work.
- **Shared pools everywhere.** One slow dependency consumes threads, sockets, or workers needed by unrelated critical paths.
- **Backup equals recovery.** An untested restore does not prove integrity, access, sequencing, or recovery time.
- **Game day without evidence.** Causing a failure is not useful unless the team verifies outcomes and improves the design or runbook.

## Verify recovery evidence

Test the control system, not each policy in isolation. Inject latency just below and above timeouts, transient and terminal responses, throttling with server retry guidance, lost replies after a write, pool exhaustion, partial dependency recovery, and a reconnect surge. Prove attempt counts and total elapsed time from telemetry rather than inferring them from configuration.

For overload, measure admitted and shed work, retry amplification, saturation, and recovery time. For degradation, verify the critical path and clearly label stale, partial, or unavailable information. For disaster recovery, restore representative data, validate integrity, measure RPO/RTO, exercise failback, and record manual dependencies.

Run browser checks at narrow and wide widths. Follow headings and links by keyboard, confirm the comparison tables reflow without page-level horizontal scrolling, and make failure messages understandable without relying on color alone.

## Resilience review checklist

1. State the end-to-end deadline and the point after which work has no value.
2. Classify transient, persistent, caller, ambiguous, overload, and disaster failures.
3. Give each remote call a finite timeout derived from the remaining deadline.
4. Retry only documented transient failures when repetition is safe.
5. Assign one retry owner; bound attempts, elapsed time, and aggregate retry load.
6. Add backoff and jitter where synchronized retries are possible.
7. Isolate scarce pools and shed load before overload spreads.
8. Define truthful degradation, retry exhaustion, reconciliation, and recovery behavior.
9. Set RPO and RTO where disaster recovery matters, then prove them with restores and drills.
10. Observe user outcomes, attempts, saturation, rejection, circuit state, and recovery time.

## Review questions

1. What does the user observe when this dependency is slow, unavailable, or ambiguously successful?
2. How was each timeout derived from the end-to-end deadline?
3. Which failures are actually transient, and what makes repetition safe?
4. Which layer owns retries, and what bounds aggregate retry amplification?
5. Which scarce resources are isolated from a slow dependency or noisy workload?
6. What work is shed first, and how does the caller know whether to retry?
7. Which degraded result remains useful without becoming misleading?
8. What evidence proves restore integrity, achieved RPO and RTO, and safe failback?

Continue in the complete handbook at [7. Failure Handling and Resilience](/book/7-failure-handling-and-resilience), its [failure toolbox](/book/7-failure-handling-and-resilience#failure-toolbox), and the [retry decision flow](/book/7-failure-handling-and-resilience#retry-decision-flow). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited Microsoft, AWS, and Google guidance was rechecked on 26 August 2026. Service error contracts, SDK retry defaults, limits, failover behavior, and recovery capabilities depend on the deployed provider and version; verify them in the concrete environment._
`;

export const resilienceArticle = defineGuideArticle({
  markdown,
  slug: "resilience",
});
