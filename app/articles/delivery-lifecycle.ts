import { defineGuideArticle } from "./article";

const markdown = `
## Keep delivery connected to the reason for the change

A requirement loses value when it becomes a sentence that nobody can connect to a design choice, a test, or a production result. Use a requirements-to-delivery chain for changes whose behavior, quality, constraints, or operational risk matter enough that a reviewer must answer three questions: **why are we changing this, how will we deliver it, and what evidence will prove it worked?**

The chain can be lightweight. It does not require a document for every step. It requires stable identities and useful links between the few artifacts that carry intent:

- A **functional requirement (FR)** states observable behavior the system must provide.
- A **nonfunctional requirement (NFR)** states how well a named flow must operate, using a metric, target, conditions, and verification method.
- A **constraint** is a boundary the design must respect; an **assumption** is an unproven belief with an owner and a recheck trigger.
- **Acceptance criteria** are concrete conditions used to prove a requirement or work item. They support an FR; they do not replace its full business rules.
- An **architecture decision record (ADR)** preserves the context, options, decision, and trade-offs for an architecturally significant choice.
- A **technical implementation plan (TIP)** is this handbook's name for the implementation-ready plan that sequences code, migration, tests, rollout, and recovery. Other teams may call it a technical specification or engineering plan.

Apply the chain before implementation, review it when reality forces a deviation, and close it with release and production evidence. The goal is not perfect paperwork. The goal is to prevent silent drift between the requested outcome and the system that reaches users.

*Evidence: [S46 — ISO requirements engineering](https://www.iso.org/standard/72089.html), [S47 — Microsoft architecture design specification](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-design-specification), [S53 — NASA requirement quality, traceability, and verification](https://www.nasa.gov/reference/system-engineering-handbook-appendix/).*

## Build the smallest useful traceability chain

Start at the business outcome and move forward to proof. Then check the chain backward: every significant decision and every release gate should point to the requirement, constraint, assumption, or risk that justified it.

| Artifact | Decision it records | Useful forward link |
|---|---|---|
| Goal | Why the change matters | FRs, NFRs, owner, outcome measure |
| FR | What observable behavior is required | Acceptance criteria, design, tests |
| NFR | How well a critical flow must operate | Design choice, load or recovery test, production signal |
| Constraint or assumption | What must be respected, or what is believed for now | Affected decision, owner, evidence, review trigger |
| Architecture or technical design | How the system will satisfy the baseline | ADRs and TIP |
| ADR | Why one significant option won | Requirements, rejected options, consequences, superseding ADR |
| TIP or technical specification | How the approved design will be delivered safely | Work items, migrations, tests, rollout, recovery |
| Verification evidence | What proved the requested behavior or quality | Requirement and release gate |
| Telemetry or incident | Whether the requirement still holds in operation | NFR, assumption, owner, next review |

A spreadsheet row, issue field, repository document, test name, and dashboard link can form a valid chain. Co-location is optional; discoverability is not. Use stable IDs for important items and link rather than copying the same statement into several places. Duplication creates competing versions and makes change control harder.

*Evidence: [S49 — Microsoft formalized development practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/formalize-development-practices), [S50 — Microsoft ongoing architecture support](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/ongoing-support).*

## Choose the artifact by the decision being made

Not every change needs an ADR or a large plan. Choose the lightest artifact that preserves a decision another person will need to implement, verify, operate, or revisit.

| Artifact | Use it when | Cost of misuse |
|---|---|---|
| Acceptance criteria | A requirement or work item needs observable pass/fail examples. | Examples can omit business rules and create false completeness if treated as the whole FR. |
| ADR | A choice changes boundaries, ownership, quality attributes, deployment shape, or is costly to reverse. | Recording routine implementation details creates noise and hides important decisions. |
| TIP | Several components, migrations, compatibility states, security changes, or rollout steps must happen in a safe order. | Too little detail leaves delivery risk implicit; too much repeats code-level decisions that belong in work items. |
| Work item | One bounded implementation step has a clear done condition and trace link. | A disconnected task can be completed while the end-to-end outcome remains broken. |

An ADR answers **why this significant option**. A TIP answers **how the accepted design reaches production safely**. If implementation reveals a new significant choice, pause that part of the plan, create or supersede the ADR, and align the TIP. Do not quietly change architectural intent inside a code review.

*Evidence: [S48 — Microsoft architecture decision records](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record), [S52 — Microsoft solution architect responsibilities](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/fundamentals).*

## Worked example: cancel a pending order safely

Suppose the outcome is to reduce support-assisted cancellations by letting customers cancel eligible orders themselves. The team creates a compact baseline:

- **FR-14:** an authenticated customer can cancel their own order while it is Pending. Success records Cancelled and prevents fulfillment. If eligibility cannot be confirmed, the service must not report success.
- **NFR-14:** under the negotiated peak load, the cancellation API must meet the agreed p95 latency and error thresholds during a 15-minute test; the same user-visible signals are monitored after release.
- **CON-14:** order data must remain in the approved region.
- **ASM-14:** the fulfillment service can answer eligibility within the allocated dependency budget. The service owner must recheck this after a latency alert or contract change.
- **AC-14A:** a Pending order becomes Cancelled once, while a Fulfilled order returns the documented conflict and remains unchanged.
- **AC-14B:** a fulfillment timeout produces a retryable outcome and never a false success.

Design review compares two options. A synchronous eligibility check preserves an immediate final answer but couples cancellation latency and availability to fulfillment. An accepted cancellation command with later completion isolates the request path but changes the user contract, adds an intermediate state, and requires status retrieval and recovery. Because the current FR promises an immediate result and the measured dependency budget appears feasible, the team accepts the synchronous option in **ADR-14**. The ADR records ASM-14 and states that repeated dependency-budget violations trigger reconsideration of the asynchronous option.

The TIP links FR-14, NFR-14, CON-14, ASM-14, and ADR-14. It sequences the API contract, authorization check, conditional state transition, fulfillment integration, regional configuration review, telemetry, and client update. It names the mixed-version behavior during rollout, the feature flag, the rollback condition, and the owner for each release gate.

Implementation work items retain those links. Contract tests prove the documented success and conflict responses. An integration test injects the fulfillment timeout required by AC-14B. A concurrency test submits two cancellations and proves one state transition. A load test produces the NFR evidence. A data-flow inspection proves CON-14. None of these tests merely says “issue complete”; each proves a named part of the baseline.

The team releases to a small cohort. The success gate checks cancellation completion, false-success count, latency, errors, and support contacts. A false-success signal or material error regression disables the feature. After rollout, telemetry shows that fulfillment latency regularly consumes most of the request budget. That evidence challenges ASM-14 even though the functional tests pass. The owner reopens the design review, writes a superseding ADR if the user contract changes, updates the NFR and TIP, and preserves ADR-14 as history. The chain has now carried intent through design, failure behavior, delivery, verification, and re-evaluation.

## Control change without erasing history

Requirements will change; traceability makes the change deliberate. Give each material requirement and assumption an owner who can clarify intent, approve priority, and accept residual risk. Record which event demands review: a date, traffic threshold, incident, provider contract change, missed SLO, regulation change, or newly discovered implementation constraint.

When a baseline changes, update the authoritative requirement and affected proof. When a significant decision changes, create an ADR that supersedes the old one instead of editing history to make the original choice look timeless. Update the TIP when delivery details change, but escalate back to design when the change alters system boundaries, ownership, or a key quality trade-off. Re-run the evidence that the changed requirement invalidates.

This preserves a useful distinction: implementation learning may refine a plan, while changed intent or architecture needs review by the people who own that decision.

## Avoid documentation theatre

- **Links without meaning.** A task references an FR but its done condition proves nothing about that FR. State which behavior or threshold the task advances.
- **One giant traceability matrix.** A central table becomes stale because the real work and evidence live elsewhere. Prefer durable IDs and links from authoritative artifacts.
- **An ADR for every choice.** Important decisions disappear in routine noise. Reserve ADRs for consequential trade-offs and hard-to-reverse choices.
- **A TIP that copies tickets.** A plan should expose sequence, compatibility, rollout, and recovery across work items, not duplicate their implementation detail.
- **Passing tests with no requirement mapping.** Green checks prove only what they assert. Connect critical tests to the behavior, quality target, or constraint they verify.
- **Closing at deployment.** Deployment shows that code moved. Production signals show whether the user outcome and NFRs still hold.
- **Silent assumption drift.** An assumption without an owner or trigger becomes accidental architecture. Review it when its evidence changes.

Good traceability should reduce investigation time. If a link does not help someone make, verify, operate, or revisit a decision, remove it.

## Delivery review questions

1. Can each significant implementation or architecture choice point back to a requirement, constraint, assumption, or risk?
2. Do FRs have observable acceptance conditions, and do NFRs name a metric, target, conditions, and proof method?
3. Which decisions deserve ADRs, and which details belong only in the design, TIP, or work item?
4. Does the TIP name ordering, compatibility, migration, security, observability, rollout, and recovery where they matter?
5. What evidence blocks release, and who owns each gate?
6. Which production signal proves or challenges the user outcome, NFR, or assumption?
7. What change would supersede an ADR or reopen the requirements baseline?
8. Can a new team member follow the chain without relying on tribal knowledge?

Continue in the complete handbook at [14. Requirements-to-Delivery Lifecycle: FR, NFR, Constraints, ADR, and TIP](/book/14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip). Review the source catalogue in the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources).

_Evidence scope: the handbook sources linked here were validated on 24 August 2026. Recheck the cited primary guidance and any applicable organizational or regulatory rules when formal compliance depends on their current edition._
`;

export const deliveryLifecycleArticle = defineGuideArticle({
  markdown,
  slug: "delivery-lifecycle",
});
