import { defineGuideArticle } from "./article";

const markdown = `
## Count the cost of running and changing the system

Architecture cost is more than a cloud invoice. Apply this review before design approval and when ownership, incidents, or spending challenge an old trade-off. Count infrastructure, licenses, engineering time, **cognitive load** (the knowledge people must hold to change the system safely), on-call work, failure recovery, security work, and **opportunity cost**: valuable work delayed because capacity is spent elsewhere.

For every service, database, queue, cache, region, framework, and abstraction, name the requirement, risk, or measurable benefit it serves, plus its owner, failure behavior, evidence, and revisit trigger. Otherwise it is a hypothesis, not a permanent entitlement.

Simplicity means the smallest design whose behavior, limits, recovery, security, and change process the team can operate. Redundancy that satisfies a recovery objective earns its complexity; fashionable topology does not.

*Evidence: [S2 — Microsoft Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/what-is-well-architected-framework), [S3 — Microsoft design principles](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/).*

## Make every component earn its place

Use a short justification record for nontrivial elements:

1. **Requirement or risk:** the user promise, constraint, scale limit, or failure being addressed.
2. **Decision:** the component or abstraction and the simpler option considered.
3. **Expected benefit:** a measurable change such as recovery time, deployment independence, latency, error exposure, or staff effort.
4. **Full cost:** build, migration, recurring spend, support, security, observability, testing, and recovery.
5. **Owner and proof:** who operates it and which test or production signal demonstrates the benefit.
6. **Removal trigger:** the date or evidence that requires consolidation, replacement, or deletion.

Use this proportional record when a choice changes boundaries, ownership, failure modes, or sustained cost. Prefer reversible choices while uncertainty is high. Add complexity only after evidence shows the simpler design cannot meet the requirement.

## Compare build, buy, and managed operation

**Build versus buy** is an ownership decision. Buying software or using a managed service can transfer maintenance, but the team still owns integration, configuration, access, data, continuity, and exit risk. Self-managing preserves control while making upgrades, backups, capacity, patching, and incidents yours.

| Option | Appropriate when | Cost and risk to accept |
|---|---|---|
| Build a focused capability | It differentiates the product, existing options miss a hard requirement, and the team can own its lifecycle. | Delivery time, specialist knowledge, maintenance, security, and opportunity cost. |
| Buy a product or service | The need is common, integration is bounded, and vendor terms satisfy the data and continuity contract. | License growth, integration work, provider dependency, migration, and exit planning. |
| Use a managed platform | Operational work is not differentiating and the platform meets required control, region, recovery, and scale boundaries. | Less low-level control, provider limits, usage pricing, observability gaps, and portability work. |
| Self-manage a platform | A verified constraint or sustained economic case requires control the managed option cannot provide. | Staffing, upgrades, patching, capacity, backup, incident response, and 24-hour ownership where needed. |

Compare lifecycle scenarios rather than list price: normal and peak load, growth, support, redundancy, transfer, observability, migration, incidents, and exit. A managed database can cost more per instance yet less overall if it removes staffed work; the reverse can become true at verified scale. Record assumptions and revisit the evidence.

*Evidence: [S30 — Microsoft Azure Well-Architected Operational Excellence](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/), [S32 — Microsoft cost-optimization trade-offs](https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/tradeoffs).*

## Worked simplification review: an order-status portal

Suppose an internal order-status portal has 300 users, peaks at 50 reads per second, shows committed state within two seconds, targets 99.9% availability during staffed hours, preserves an audit trail, and recovers within four hours. Its team of four shares on-call with two products.

The proposal has eight services, a database per service, an event bus, Kubernetes, a cache, a warehouse feed, and active-active regions. Each element is plausible, but plausibility is not evidence.

A simplification review maps the design to the contract:

| Concern | Minimal design | Over-engineered alternative | Decision and proof |
|---|---|---|---|
| Read current order state | One modular application reads a managed relational database with suitable indexes. | Separate query, customer, order, and audit services joined through APIs. | Start modular; load-test 50 reads per second plus headroom and trace the slow path. |
| Refresh slow external data | One durable background worker retries bounded jobs and records status. | Event bus plus several consumer services for every state transition. | Use the worker because asynchronous recovery is required; verify retries, duplicates, backlog, and replay. |
| Availability and recovery | Provider-supported zonal resilience, backups, restore exercise, and a four-hour runbook. | Active-active multi-region databases and application clusters. | Reject multi-region until a tighter recovery or continuity requirement justifies conflict handling and failover cost. |
| Repeated reads | Query the indexed authority and measure it. | Add a distributed cache immediately. | Add caching only if load evidence shows a bottleneck and a freshness contract is accepted. |
| Operation | Managed application, database, telemetry, and named ownership. | Self-managed Kubernetes and observability stack. | Choose managed operation because platform control is not a requirement and staffing is constrained. |

Tests must prove latency, load, authorization, audit completeness, worker idempotency, backup restoration, and four-hour recovery. Alerts need owners and runbooks. Drills cover dependency loss, worker backlog, database unavailability, and a bad deployment.

The alternative becomes appropriate if traffic, independent ownership, isolation, regional continuity, or another constraint crosses a recorded threshold. Until then it adds failure and on-call paths without proving user benefit.

## Connect cost scaling to value

Separate **fixed cost** from cost that changes with demand. Identify dominant drivers: requests, data, transfers, tenants, jobs, replicas, telemetry, support, or engineer hours. Model normal, peak, failure, and recovery states; redundancy and observability are part of the system.

Choose a unit tied to a successful outcome: cost per completed order, active tenant, processed document, or another product result. This is **unit economics** for the architecture. Divide the relevant period cost by successful outcomes, then inspect why it changes. Cost per request can look healthy while retries, failures, or manual corrections make cost per completed order worse.

Set guardrails, not false precision: forecast expected and double demand; alert when cost per successful order rises; identify whether traffic, failure, telemetry, idle capacity, or pricing caused it. Do not weaken security, recovery, or the user promise to improve one metric.

## Match the design to ownership capacity

Every operational surface needs people, access, documentation, telemetry, and practice. Ask who can diagnose and restore each service, store, queue, provider, region, and recovery procedure when the primary expert is absent.

Automate repetition that creates error or toil, while owning the automation. Runbooks need triggers, safe actions, stop conditions, verification, escalation, an owner, and an exercise.

Team capacity is a design constraint. If a small team cannot safely patch, observe, restore, and evolve the chosen stack, reduce the surface, transfer suitable work to a managed service, add qualified ownership, or revise the requirement openly.

## Set removal and consolidation triggers

Give speculative or transitional elements an expiry condition. Review them when ownership disappears, benefit stays below a threshold, fixed cost dominates value, a migration completes, traffic misses the scale trigger, or operational burden exceeds protection.

Before removal, prove consumers and data flows, plan compatibility, preserve records, observe cutover, and keep a recovery path. Verify that simplification reduces deployments, pages, cost, lead time, or recovery work.

## Failure modes to challenge

- **Pattern-first architecture.** Components are selected before requirements, so every box looks mandatory.
- **Cloud bill as total cost.** Engineering, on-call, recovery, security, and delayed product work disappear from the comparison.
- **Managed means unowned.** Configuration, data, integration, continuity, and exit duties remain with the team.
- **Microservices as team structure.** Independent services without independent ownership create more coordination, not autonomy.
- **High availability everywhere.** Every replica and region is funded without matching business value or a recovery target.
- **Cheapest unit price wins.** Discounts hide migration cost, lock-in, failure behavior, or staffing.
- **Automation without stewardship.** Scripts and platforms fail silently because nobody owns their inputs, limits, and recovery.
- **Temporary becomes permanent.** A cache, queue, flag, dual write, or compatibility layer has no removal trigger.
- **Simplification by deletion only.** A component is removed without preserving its safety, audit, or recovery contract.

## Verify cost, simplicity, and operability

Challenge every unowned or unmeasured element. Recalculate normal, peak, failure, recovery, and growth cost. Test flows, limits, dependency loss, restoration, alerts, runbooks, and rollback with the operators.

Measure the claimed benefit before and after a change: cost per successful outcome, deployment lead time, incident count, pages, recovery time, or cognitive surface. Record assumptions, environment, provider version, owner, result, and revisit date.

For this guide, follow headings and links by keyboard, confirm the comparison tables reflow without page-level horizontal scrolling, and verify the article at desktop and mobile widths.

## Cost, simplicity, and operability review checklist

1. Tie every nontrivial component and abstraction to a named requirement, risk, or measured benefit.
2. Compare a simpler design and record why it is insufficient when rejected.
3. Count infrastructure, people, cognitive load, on-call, recovery, security, and opportunity cost.
4. Compare build, buy, managed, and self-managed options across their full lifecycle.
5. Model normal, peak, failure, recovery, and growth costs with explicit assumptions.
6. Measure cost per successful product outcome, not only per resource or request.
7. Assign services, data, alerts, incidents, runbooks, and automation to capable owners.
8. Prove limits, failure behavior, restoration, and rollback with representative exercises.
9. Give transitional and speculative components removal or consolidation triggers.
10. Revisit decisions when requirements, traffic, ownership, incidents, or cost evidence changes.

## Review questions

1. Which requirement or risk earns each major component its place?
2. What is the smallest design that meets the current behavior and recovery contract?
3. Which cost is missing from the model: people, on-call, failure, security, migration, or opportunity?
4. What do we still own if we buy the product or use the managed service?
5. Which driver changes cost fastest, and does successful product value scale with it?
6. Can the available team diagnose, patch, restore, and evolve every operational surface?
7. Which evidence would justify adding the rejected complexity later?
8. What trigger removes or consolidates each temporary, speculative, or low-value element?

Continue in the complete handbook at [12. Cost, Simplicity, and Operability](/book/12-cost-simplicity-and-operability) and its [checklist](/book/12-cost-simplicity-and-operability#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited Microsoft guidance was rechecked on 27 August 2026. Provider pricing, service capabilities, limits, support models, and regional availability change; verify them against the concrete deployed version and commercial terms before committing to a cost or operating model._
`;

export const costSimplicityArticle = defineGuideArticle({
  markdown,
  slug: "cost-simplicity",
});
