import { defineGuideArticle } from "./article";

const markdown = `
## Turn requests into a design baseline

Requirements work solves a simple but expensive problem: teams often choose architecture before they agree on what the system must do or how success will be proved. Use this process at the start of a design, when scope changes, and whenever evidence shows that an assumption or quality target no longer holds. The result is a **baseline**—an agreed set of requirements that can still change through an explicit decision.

Start with the business outcome and the critical user flow. Then separate six kinds of information:

- A **functional requirement (FR)** states observable behavior the system must provide.
- A **nonfunctional requirement (NFR)** states a measurable quality target, such as latency or availability, under named conditions.
- A **constraint** is a boundary the design must respect, such as a residency mandate or fixed deadline.
- An **assumption** is believed to be true but still needs evidence and a recheck date.
- An **exclusion** says what this design deliberately does not cover.
- An **acceptance criterion** states the observable evidence that proves a specific requirement was met.

Keep these categories separate. An assumption presented as a constraint can force unnecessary architecture. A desired quality presented as an absolute constraint can hide its cost. An exclusion left implicit becomes surprise scope later.

*Evidence: [S46 — ISO requirements engineering](https://www.iso.org/standard/72089.html), [S53 — NASA requirement quality, traceability, and verification](https://www.nasa.gov/reference/system-engineering-handbook-appendix/).*

## A repeatable path from vague to verifiable

### 1. Name the outcome, actors, and critical flow

Write one sentence for the outcome without prescribing technology. Identify who needs the outcome, who owns the decision, and which flow matters most. “Build a highly available order service” starts with a solution and an adjective. “Let an authorized customer cancel a pending order before fulfillment begins” states behavior that can be reviewed.

### 2. Bound functional scope

Write singular FRs with stable IDs. State preconditions, the observable result, and exclusions. Do not make one requirement carry cancellation, refunds, notifications, and reporting. Those behaviors can have different owners, priorities, and failure handling.

### 3. Replace adjectives with measured conditions

“Fast,” “scalable,” and “highly available” are not targets. For each important quality, name the critical flow, metric, measurement point, threshold, load or operating conditions, observation window, verification method, and production signal. A useful pattern is:

> For a named flow, measure a named metric at a named point. Meet a negotiated threshold under stated load and conditions for an observation window. Prove it with a test or analysis and monitor the same outcome where ongoing compliance matters.

Percentiles are useful for user-facing latency because an average can hide slow requests. The percentile and threshold are product decisions, not universal defaults.

### 4. Record constraints, assumptions, and exclusions

Ask who can change each item. If nobody on the project can change a regional mandate, it is a constraint. If the team merely expects traffic to remain below a level, it is an assumption. Give every important assumption an owner, the evidence needed, and an expiry or trigger for re-evaluation. Name exclusions beside the related scope so reviewers do not infer them later.

### 5. Agree priority and proof before design

Priority decides what yields when requirements conflict. The accountable stakeholder should approve the priority; the architect should expose the cost and risk. Link each important requirement to a verification method before selecting components. Testing, analysis, inspection, demonstration, telemetry, and recovery exercises are different forms of evidence; choose the one that can actually disprove the claim.

*Evidence: [S2 — Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/what-is-well-architected-framework), [S23 — Google SRE SLO implementation](https://sre.google/workbook/implementing-slos/), [S24 — Google SRE launch checklist](https://sre.google/sre-book/launch-checklist/).*

## Worked example: order cancellation

Suppose the request is: “Customers must be able to cancel orders. Make it fast and highly available.” The words sound clear, but they leave the design unable to answer basic questions: which orders, which customers, how fast, how available, under what load, and what happens when fulfillment cannot be reached?

After a short review, the team produces this baseline. The numbers are negotiated example values, not industry defaults.

| ID | Baseline requirement | Verification and owner |
|---|---|---|
| GOAL-1 | Reduce support-assisted cancellations by letting customers cancel eligible orders themselves. | Product owner reviews the outcome after release. |
| FR-1 | An authenticated customer can cancel their own order while its state is Pending. A successful response records Cancelled and prevents shipment. | API and end-to-end tests; product owner. |
| FR-2 | If fulfillment eligibility cannot be confirmed, the system does not report success and returns a retryable outcome. | Dependency-failure test; engineering owner. |
| EX-1 | Refund settlement and carrier interception after shipment are outside this change. | Scope review; product owner. |
| NFR-1 | For eligible cancellation requests, p95 server latency is at most 500 ms at 250 requests/second for 15 minutes, with errors below the agreed test threshold. | Pre-release load test and production latency/error telemetry; service owner. |
| NFR-2 | The cancellation flow meets the agreed monthly availability target, measured at the user-visible API boundary. Planned exclusions are documented in the SLO. | Synthetic check plus SLI/SLO report; service owner. |
| CON-1 | Order data remains in the approved region. | Deployment and data-flow inspection; security owner. |
| ASM-1 | Peak cancellation traffic remains below 300 requests/second through 31 January 2027. Recheck sooner if a campaign forecast exceeds that level. | Traffic forecast and observed peaks; product operations owner. |

This output connects intent, decisions, failure behavior, and proof. FR-2 prevents a dangerous false-success path. NFR-1 now gives capacity and test conditions instead of “fast.” NFR-2 still needs the stakeholder to choose a target; the design review should remain open on that point rather than inventing a percentage. ASM-1 is deliberately temporary and can trigger a capacity review.

The design can now compare options against named needs. For example, a synchronous fulfillment check gives immediate certainty but couples cancellation availability and latency to fulfillment. An accepted command with asynchronous completion can isolate the request path but changes the user contract, introduces intermediate state, and requires status retrieval and recovery. Neither option is inherently correct; FR-2, the chosen availability target, and the acceptable user experience determine the fit.

## Resolve conflicts instead of hiding them

Requirements commonly pull in different directions: stronger consistency may increase latency, another replica may improve resilience while increasing cost, and a fixed deadline may force a smaller scope. Record the conflict and ask the accountable owners to choose which outcome has priority.

| Approach | Use when | Cost or limitation |
|---|---|---|
| Hard measurable baseline | The flow is critical and the team can test the conditions now. | Requires test environments, telemetry, and capacity to investigate failures. |
| Time-boxed assumption | Evidence is unavailable but a decision cannot wait. | Adds uncertainty; needs an owner, expiry, and fallback if disproved. |
| Smaller functional scope | Deadline or budget is fixed and optional behavior can wait. | Delays value for excluded cases and must be communicated clearly. |
| Higher quality target | The business consequence of failure justifies it. | Usually demands more redundancy, operational work, testing, and cost. |

Priority labels alone do not solve conflict. “Must” is meaningful only when the owner can explain the consequence of missing it and what other requirement may yield.

*Evidence: [S31 — Azure performance efficiency](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/), [S32 — cost optimization trade-offs](https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/tradeoffs/).*

## Common failure modes

- **Starting with patterns.** “Use microservices and a queue” prevents requirements from testing whether those components earn their cost.
- **Treating every desire as fixed.** When everything is mandatory, reviewers cannot make a reasoned trade-off.
- **Using a target without conditions.** “p95 under 500 ms” is incomplete without load, measurement point, window, and error behavior.
- **Hiding assumptions in estimates.** Traffic and growth numbers become architecture facts even after the market or product changes.
- **Leaving ownership blank.** Nobody can clarify conflicts, approve exclusions, or accept residual risk.
- **Proving only before release.** A load test can show readiness under test conditions; telemetry is needed to know whether the quality still holds in production.
- **Confusing acceptance criteria with the whole requirement.** A testable example supports an FR but may not describe the complete business rule or its boundaries.

In interviews, the equivalent failure is spending the opening minutes naming technologies. State the critical flow, estimates, quality priorities, and assumptions first. In reviews, stop when a material target has no owner or proof method; an invented answer creates false certainty.

## Compact requirements worksheet

Use one row per important item. Add detail only where the decision or verification needs it.

| Field | Prompt |
|---|---|
| ID and type | Is this an FR, NFR, constraint, assumption, exclusion, or acceptance criterion? |
| Statement | What behavior, quality, boundary, or belief is being stated? |
| Conditions | Which actor, flow, state, load, geography, dependency, and time window apply? |
| Priority and consequence | What happens if this is not met, and what may yield in a conflict? |
| Source and owner | Who requested it, who can clarify it, and who approves changes? |
| Verification | Which test, analysis, inspection, demonstration, telemetry, or exercise can disprove it? |
| Traceability | Which design decision, implementation work, and evidence satisfy it? |
| Recheck trigger | When does an assumption, estimate, or target need review? |

## Review questions

1. Can every critical behavior be observed without assuming an implementation?
2. Does each important quality target include a metric, threshold, conditions, and proof method?
3. Are constraints truly fixed, and are assumptions visibly temporary?
4. Are exclusions explicit beside the scope they limit?
5. Who owns clarification, priority, and acceptance of each material risk?
6. Which requirements conflict, and what consequence determines the priority?
7. What evidence will exist before release, and what production signal shows the target still holds?
8. What event or date forces the next review?

Continue in the complete handbook at [1. Requirements: FRs, NFRs, Constraints, and Assumptions](/book/1-requirements-frs-nfrs-constraints-and-assumptions). For the full traceability lifecycle, see [14. Requirements-to-delivery lifecycle](/book/14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip) and the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources).

_Evidence scope: the handbook sources were validated on 24 August 2026. ISO/IEC/IEEE 29148:2018 remains the current published requirements-engineering edition in that register, with a replacement revision underway; recheck the source when formal compliance depends on the edition._
`;

export const requirementsArticle = defineGuideArticle({
  markdown,
  slug: "requirements",
});
