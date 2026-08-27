import { defineGuideArticle } from "./article";

const markdown = `
## Start from the user journey

Observability is the ability to understand a system's behavior from its outputs. Reliability is its ability to keep a user promise and recover when it cannot. Apply this review before launch, after material changes, and whenever operators cannot explain user impact quickly.

Start with a critical journey such as sign-in or checkout. State the successful outcome, latency or freshness bound, eligible population, and failure behavior. Then connect that promise to decisions:

1. Define a service-level indicator (SLI) that measures the user outcome.
2. Set a service-level objective (SLO), the target level over a named window.
3. Use the error budget, the allowed amount of nonconforming service, to guide release and reliability work.
4. Collect telemetry that can explain why the indicator changes.
5. Assign alerts, runbooks, recovery exercises, and decisions to owners.

A green CPU chart does not prove that customers can complete checkout.

*Evidence: [S22 — OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/), [S23 — Google SRE implementing SLOs](https://sre.google/workbook/implementing-slos/).*

## Define SLIs, SLOs, and error-budget decisions

An SLI needs a numerator of good events and denominator of eligible events. Exclude only traffic outside the promise; exclusions chosen after an incident make the objective meaningless.

Choose the observation point closest to the user. Server success may count a response that never reaches a client, while client telemetry may be sampled or blocked. Document the gap.

An SLO needs a target, window, scope, and owner. More reliability usually costs capacity, redundancy, testing, and slower change. Define what fast burn or exhaustion triggers: page an owner, stop a rollout, reduce risky changes, or prioritize repair.

## Worked SLO: checkout confirmation

An online store promises that eligible checkout attempts receive a correct confirmation or explicit rejection within two seconds. Its availability SLI is:

| Contract part | Definition |
|---|---|
| Eligible events | Production checkout attempts with valid input, excluding declared synthetic traffic. |
| Good events | Eligible attempts that return a correct terminal outcome within two seconds. |
| SLO | 99.9% good events over a rolling 28-day window. |
| Error budget | 0.1% of eligible events may be slow, incorrect, or unavailable. |
| Decision | Fast budget burn pages checkout ownership and pauses the active rollout; sustained exhaustion shifts work to reliability. |

With 3,000,000 eligible attempts, the budget is 3,000 bad events. An incident producing 600 consumes 20% of it. The classification must count late or duplicate confirmations as failures.

Dependency latency, payment ambiguity, queue age, saturation, and retries help explain the SLI but do not replace it. Test known good, slow, rejected, duplicate, and timed-out attempts against durable orders and payments.

*Evidence: [S23 — Google SRE implementing SLOs](https://sre.google/workbook/implementing-slos/).*

## Choose telemetry for the question

**Metrics** aggregate measurements over time and suit rates, latency distributions, errors, saturation, queue age, and business outcomes. **Logs** record discrete events and decisions with structured context. **Traces** connect units of work across service boundaries. Use the smallest useful combination.

| Signal | Best question | Main cost or limitation |
|---|---|---|
| Metric | Is user impact or resource behavior changing? | Aggregation loses individual-event detail; unbounded labels create high cardinality and cost. |
| Structured log | What decision or event occurred for this operation? | Volume, retention, and sensitive fields require control; isolated lines may lack causal context. |
| Distributed trace | Where did this request wait or fail across boundaries? | Full capture can be expensive; sampling can omit rare paths unless policy protects them. |
| Synthetic check | Can a controlled journey succeed from this location now? | Exercises a model of user behavior, not every real client, account, or data state. |

Propagate trace context across calls, messages, and jobs, and include the trace identifier in related logs. Correlation should follow a checkout without placing payment details, secrets, or personal data in telemetry.

*Evidence: [S22 — OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/).*

## Bound cardinality, sampling, and retention

**Cardinality** is the number of distinct values a field can hold. Route name is bounded; user ID, request ID, or raw URL may not be. High-cardinality metric labels raise storage and query cost. Keep unique identifiers in controlled logs or traces, not metric labels.

Sampling reduces volume. Head sampling decides before the outcome and may miss rare failures. Tail sampling can retain errors or slow traces, but adds buffering and complexity. Record the policy so “no trace found” is not mistaken for “the event did not happen.”

Dashboards should lead from SLI and budget burn to traffic, errors, latency percentiles, saturation, dependencies, queues, and capacity trend. A dashboard without a decision or owner is decoration.

## Worked diagnosis: follow one failed checkout

Suppose the checkout SLI drops while application CPU remains normal. The alert names the affected journey, region, budget burn, start time, dashboard, runbook, and owner. It does not merely say “latency high.”

The operator sees one region deteriorating. A failed trace crosses edge, checkout API, inventory, payment, and confirmation queue. Inventory and payment are normal, but queue publish time rises. Metrics confirm broker connection-pool saturation. Correlated logs show publish deadlines expiring; durable order lookup identifies ambiguous attempts instead of assuming timeout means failure.

The team stops the rollout, limits admitted work, and restores broker capacity. Verification checks latency, budget burn, bounded queue drain, reconciliation without duplicate charges, and intact telemetry.

This path connects requirement, alert, telemetry, operational decision, safe failure, and proof of recovery. A service-only dashboard would have hidden the boundary where time was lost.

## Design health signals and actionable alerts

Liveness asks whether a process should be restarted. Readiness asks whether it should receive traffic. Startup checks can protect slow initialization. These signals have different consequences: an expensive dependency check used for liveness can restart healthy instances during an outage and increase pressure on the survivors.

Keep liveness narrow and cheap. Avoid synchronized deep readiness checks that become production load. Test overload, slow startup, dependency loss, and recovery.

Alert on urgent, actionable user impact. Every page needs an owner, severity, evidence, first safe action, and escalation path. Use tickets for slow trends, and aggregate related symptoms.

*Evidence: [S26 — Kubernetes probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/), [S24 — Google SRE launch coordination checklist](https://sre.google/sre-book/launch-checklist/).*

## Prove backup, restore, and operational ownership

A backup policy names data, frequency, retention, encryption, access, location, and deletion obligations. The **recovery point objective (RPO)** is the maximum acceptable data-loss window. The **recovery time objective (RTO)** is the target restoration time. Replication is not a backup when corruption reaches every copy.

Restore representative data, verify integrity and permissions, measure RPO/RTO, reconnect the application, and exercise a critical journey. Include required configuration, keys, schemas, queues, and object storage—not only the database.

Runbooks state trigger, impact, preconditions, safe actions, stop conditions, verification, communication, escalation, and owner. Test dependency loss, saturation, bad deployments, telemetry failure, restore, failover, backlog recovery, and failback.

*Evidence: [S24 — Google SRE launch coordination checklist](https://sre.google/sre-book/launch-checklist/).*

## Failure modes to challenge

- **Monitor infrastructure only.** Healthy hosts can serve incorrect, stale, or unusably slow results.
- **Count every request equally.** Administrative, synthetic, and critical customer flows can need different promises and owners.
- **Use averages for latency.** Averages hide the users in the slow tail and the boundaries causing it.
- **Put unique values in metric labels.** Cardinality and cost can explode precisely when traffic or errors spike.
- **Sample without a diagnosis plan.** Rare failures disappear, and absence of evidence is reported as evidence of absence.
- **Page on every symptom.** Alert storms obscure the initiating failure and exhaust responders.
- **Make liveness depend on everything.** One dependency outage restarts healthy processes and amplifies load.
- **Backup equals recovery.** Stored copies do not prove integrity, credentials, application compatibility, or restoration time.
- **Runbook without an owner or exercise.** Instructions drift and access fails when they are finally needed.
- **SLO without a decision.** A target on a dashboard changes nothing when the budget burns.

## Verify reliability evidence

Test SLI classification with known events. Exercise alerts through acknowledgement, diagnosis, mitigation, and recovery. Inject latency, errors, dropped context, saturation, lost telemetry, bad probes, and dependency failure.

Restore representative backups, measure RPO/RTO, validate integrity and access, and run the critical journey. Record environment, version, results, gaps, owner, and retest date.

For the reading experience, verify headings and links by keyboard, table reflow at narrow widths, descriptive link text, and that status does not rely on color alone.

## Observability and reliability review checklist

1. Name each critical user journey, successful outcome, latency or freshness bound, and owner.
2. Define each SLI numerator, denominator, scope, observation point, and exclusions.
3. Set an SLO window and error-budget actions before an incident or rollout.
4. Connect user impact to traffic, errors, latency, saturation, dependencies, queues, and capacity trends.
5. Use structured logs, metrics, traces, and correlation only where they answer a named question.
6. Bound telemetry cardinality, sampling, retention, sensitive data, access, and cost.
7. Separate liveness, readiness, and startup consequences and test them under failure.
8. Make alerts actionable with impact, owner, evidence, runbook, and escalation.
9. Define backup scope, RPO, RTO, restore sequence, integrity checks, and failback.
10. Exercise diagnosis and recovery end to end and turn gaps into owned work.

## Review questions

1. Which measured event proves that the user journey succeeded, and where is it observed?
2. What does the SLO target exclude, and could that hide real user harm?
3. Which decisions change when the error budget burns quickly or is exhausted?
4. Can an operator follow one request across every important service, queue, and job?
5. Which labels or fields can grow without bound or expose sensitive data?
6. Which alerts require immediate human action, and which belong in a slower review?
7. Could a health check or alert storm amplify the failure it detects?
8. What restore evidence proves integrity, achieved RPO/RTO, and a working user journey?

Continue in the complete handbook at [10. Observability and Reliability](/book/10-observability-and-reliability) and its [checklist](/book/10-observability-and-reliability#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited OpenTelemetry, Google SRE, and Kubernetes guidance was rechecked on 27 August 2026. Signal support, sampling behavior, probe semantics, provider limits, retention options, and recovery capabilities vary by deployed version and environment; verify them in the concrete system._
`;

export const observabilityArticle = defineGuideArticle({
  markdown,
  slug: "observability",
});
