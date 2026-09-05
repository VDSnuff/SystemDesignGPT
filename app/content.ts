export interface GuidePage {
  readonly slug: string;
  readonly number: string;
  readonly title: string;
  readonly label: string;
  readonly lead: string;
  readonly overview: string;
  readonly handbookSections: readonly HandbookSectionLink[];
  readonly checkpoints: readonly string[];
  readonly prompts: readonly string[];
}

export interface HandbookSectionLink {
  readonly href: string;
  readonly title: string;
}

export const masterChecklistSection: HandbookSectionLink = {
  href: "/book/13-master-system-design-review-checklist",
  title: "13. Master System Design Review Checklist",
};

export const guidePages: readonly GuidePage[] = [
  {
    slug: "requirements",
    number: "01",
    title: "Design from requirements, not from patterns.",
    label: "Requirements",
    lead: "Turn functional requirements, quality targets, constraints, and assumptions into decisions you can prove.",
    overview: "Separate required behavior from quality targets and fixed constraints. Give every important requirement an owner, threshold, and verification method before choosing technology.",
    handbookSections: [{ href: "/book/1-requirements-frs-nfrs-constraints-and-assumptions", title: "1. Requirements: FRs, NFRs, Constraints, and Assumptions" }],
    checkpoints: ["Functional scope and exclusions are explicit", "NFRs have measurable thresholds", "Constraints are separated from assumptions", "Evidence and owners are named"],
    prompts: ["Sharpen this NFR", "Challenge my assumptions", "What should I measure?"],
  },
  {
    slug: "boundaries-state-data",
    number: "02",
    title: "Make ownership and state visible.",
    label: "Boundaries, state & data",
    lead: "Know the source of truth, dependency direction, trust boundary, and failure boundary for every important state transition.",
    overview: "A boundary is useful only when ownership is clear. Track where data originates, who may mutate it, how replicas converge, and what happens when a dependency is absent.",
    handbookSections: [{ href: "/book/2-boundaries-state-and-data", title: "2. Boundaries, State, and Data" }],
    checkpoints: ["Every datum has one source of truth", "Write ownership is unambiguous", "Trust and failure boundaries are drawn", "Derived data can be rebuilt"],
    prompts: ["Find unclear ownership", "Review my data flow", "Where can state diverge?"],
  },
  {
    slug: "networking",
    number: "02A",
    title: "Treat the network as a failure surface.",
    label: "Networking & communication",
    lead: "Choose protocols, connection style, geography, and failure behavior intentionally.",
    overview: "Latency, partial delivery, retries, name resolution, and regional boundaries shape correctness. Match the communication mode to interaction needs and operational constraints.",
    handbookSections: [{ href: "/book/2a-networking-and-communication", title: "2A. Networking and Communication" }],
    checkpoints: ["Protocol matches interaction semantics", "Connection limits are bounded", "Regional paths are understood", "Network failures have explicit behavior"],
    prompts: ["Choose a protocol", "Review latency risks", "Model a network partition"],
  },
  {
    slug: "data-modeling",
    number: "02B",
    title: "Model from access patterns.",
    label: "Data modeling & partitioning",
    lead: "Design keys, indexes, and partitions around real reads, writes, growth, and retention.",
    overview: "Start with entities and access patterns. Measure before sharding, avoid hot partitions, and preserve a migration path when distribution becomes necessary.",
    handbookSections: [{ href: "/book/2b-data-modeling-indexing-and-partitioning", title: "2B. Data Modeling, Indexing, and Partitioning" }],
    checkpoints: ["Critical queries have known access paths", "Indexes support measured workloads", "Partition keys avoid hotspots", "Retention and migration are planned"],
    prompts: ["Review an access pattern", "Test a partition key", "Find missing indexes"],
  },
  {
    slug: "time-ordering",
    number: "02C",
    title: "Define what time means.",
    label: "Time, clocks & ordering",
    lead: "Make time-zone, expiry, causality, and ordering semantics explicit.",
    overview: "Wall clocks drift and event arrival order is not causal order. Decide which clock matters, how ties are handled, and when stale or late events remain valid.",
    handbookSections: [{ href: "/book/2c-time-clocks-and-ordering", title: "2C. Time, Clocks, and Ordering" }],
    checkpoints: ["Business time zone is explicit", "Clock source matches the decision", "Late events have defined handling", "Ordering guarantees are realistic"],
    prompts: ["Review expiry semantics", "Explain causal ordering", "Find clock assumptions"],
  },
  {
    slug: "concurrency",
    number: "03",
    title: "Protect shared state deliberately.",
    label: "Concurrency",
    lead: "Reason about simultaneous work, conflicts, races, and coordination before they become production defects.",
    overview: "List operations that can overlap and identify the invariant each overlap may violate. Prefer the narrowest coordination mechanism that protects that invariant.",
    handbookSections: [{ href: "/book/3-concurrency", title: "3. Concurrency" }],
    checkpoints: ["Conflicting operations are enumerated", "Invariants survive simultaneous work", "Locks have scope and timeout", "Optimistic conflicts are observable"],
    prompts: ["Find race conditions", "Choose lock vs versioning", "State the invariant"],
  },
  {
    slug: "transactions-consistency",
    number: "04",
    title: "Choose consistency, do not inherit it.",
    label: "Transactions & consistency",
    lead: "Set transaction boundaries and user-visible consistency based on business invariants.",
    overview: "Keep atomic work small, make cross-boundary workflows explicit, and describe what users may observe while replicas or asynchronous steps converge.",
    handbookSections: [{ href: "/book/4-transactions-and-consistency", title: "4. Transactions and Consistency" }],
    checkpoints: ["Atomic boundaries match invariants", "Partial success is represented", "Read consistency is user-defined", "Compensation is safe and testable"],
    prompts: ["Draw a transaction boundary", "Review eventual consistency", "Design compensation"],
  },
  {
    slug: "apis-idempotency",
    number: "05",
    title: "Make retries safe at the contract.",
    label: "APIs & idempotency",
    lead: "Design contracts, versioning, limits, retries, and duplicate handling together.",
    overview: "Clients will retry and networks will duplicate uncertainty. Give mutating operations stable identity, deterministic conflict behavior, and observable limits.",
    handbookSections: [{ href: "/book/5-apis-contracts-and-idempotency", title: "5. APIs, Contracts, and Idempotency" }],
    checkpoints: ["Contracts define errors and limits", "Mutations have retry semantics", "Idempotency scope and lifetime are bounded", "Compatibility policy is explicit"],
    prompts: ["Review an API contract", "Design an idempotency key", "Plan version evolution"],
  },
  {
    slug: "messaging",
    number: "06",
    title: "Design for duplicates and backlog.",
    label: "Messaging & async work",
    lead: "Assume duplicate delivery, reordering, poison messages, and slow consumers.",
    overview: "Queues move coupling in time rather than removing it. Define delivery guarantees, consumer idempotency, retry budgets, dead-letter handling, and backlog recovery.",
    handbookSections: [{ href: "/book/6-messaging-and-asynchronous-work", title: "6. Messaging and Asynchronous Work" }],
    checkpoints: ["Delivery semantics are named", "Consumers tolerate duplicates", "Poison messages are isolated", "Backlog age is measured"],
    prompts: ["Review queue semantics", "Design a dead-letter path", "Estimate backlog recovery"],
  },
  {
    slug: "realtime-work",
    number: "06A",
    title: "Match interaction to duration.",
    label: "Real-time & long-running work",
    lead: "Choose polling, streaming, sockets, or jobs from actual interaction needs.",
    overview: "Separate immediate acknowledgement from long-running completion. Make reconnect, progress, cancellation, and result retrieval first-class behaviors.",
    handbookSections: [{ href: "/book/6a-real-time-and-long-running-work", title: "6A. Real-Time and Long-Running Work" }],
    checkpoints: ["Interaction latency target is known", "Reconnect behavior is safe", "Long work reports progress", "Cancellation semantics are explicit"],
    prompts: ["Choose polling vs SSE", "Design job status", "Review reconnect behavior"],
  },
  {
    slug: "resilience",
    number: "07",
    title: "Bound every failure response.",
    label: "Failures & resilience",
    lead: "Plan timeouts, retries, circuit breaking, degradation, and recovery as one control system.",
    overview: "Retries can amplify failure. Allocate time budgets, add jitter, cap attempts, preserve capacity, and define the smallest useful degraded experience.",
    handbookSections: [{ href: "/book/7-failure-handling-and-resilience", title: "7. Failure Handling and Resilience" }],
    checkpoints: ["Every remote call has a timeout", "Retries fit an end-to-end budget", "Degraded behavior is useful", "Recovery is rehearsed"],
    prompts: ["Build a timeout budget", "Challenge my retry policy", "Design graceful degradation"],
  },
  {
    slug: "scale-performance",
    number: "08",
    title: "Estimate before optimizing.",
    label: "Scale, performance & caching",
    lead: "Use load shape, resource bounds, and measured bottlenecks to guide performance work.",
    overview: "Calculate the few numbers that change a decision. Treat caches as data systems with ownership, staleness, invalidation, and failure behavior.",
    handbookSections: [{ href: "/book/8-scale-capacity-performance-and-caching", title: "8. Scale, Capacity, Performance, and Caching" }],
    checkpoints: ["Normal and peak load are estimated", "Resource limits are bounded", "Bottlenecks are measured", "Cache staleness is acceptable"],
    prompts: ["Estimate capacity", "Review a cache strategy", "Find the likely bottleneck"],
  },
  {
    slug: "security",
    number: "09",
    title: "Draw trust before controls.",
    label: "Security",
    lead: "Define identity, authorization, trust boundaries, secrets, and data protection from the threat model.",
    overview: "Authenticate the actor, authorize the action and resource, minimize data exposure, and make privileged paths auditable. Controls should answer a concrete threat.",
    handbookSections: [{ href: "/book/9-security", title: "9. Security" }],
    checkpoints: ["Actors and trust boundaries are mapped", "Authorization is resource-specific", "Secrets never reach untrusted clients", "Sensitive actions are auditable"],
    prompts: ["Threat-model this flow", "Review authorization", "Find secret exposure risks"],
  },
  {
    slug: "observability",
    number: "10",
    title: "Make reliability observable.",
    label: "Observability & reliability",
    lead: "Connect telemetry, SLOs, health, backup, and recovery to user outcomes.",
    overview: "Measure what users experience, preserve diagnostic context across boundaries, and test recovery rather than trusting configuration.",
    handbookSections: [{ href: "/book/10-observability-and-reliability", title: "10. Observability and Reliability" }],
    checkpoints: ["SLIs represent user outcomes", "SLOs have error budgets", "Telemetry supports diagnosis", "Restore is tested end to end"],
    prompts: ["Design an SLI", "Review telemetry", "Create a recovery test"],
  },
  {
    slug: "deployment-evolution",
    number: "11",
    title: "Change without coordinated breakage.",
    label: "Deployment & evolution",
    lead: "Evolve clients, services, schemas, and data through compatible intermediate states.",
    overview: "Prefer additive changes, separate deployment from release, and make rollback constraints explicit. Data migrations need forward and recovery plans.",
    handbookSections: [{ href: "/book/11-deployment-migration-and-evolution", title: "11. Deployment, Migration, and Evolution" }],
    checkpoints: ["Intermediate states stay compatible", "Release can be separated from deploy", "Migration has a recovery path", "Rollback limits are documented"],
    prompts: ["Plan a safe migration", "Review compatibility", "Design a rollout sequence"],
  },
  {
    slug: "cost-simplicity",
    number: "12",
    title: "Spend complexity where it earns its keep.",
    label: "Cost, simplicity & operability",
    lead: "Prefer the smallest system that meets requirements and can be operated by the actual team.",
    overview: "Include people, cognitive load, on-call burden, and failure recovery in cost. Remove architecture whose benefit cannot be tied to a requirement or risk.",
    handbookSections: [{ href: "/book/12-cost-simplicity-and-operability", title: "12. Cost, Simplicity, and Operability" }],
    checkpoints: ["Every component solves a named problem", "Operational ownership is staffed", "Cost scales with value", "Removal opportunities are reviewed"],
    prompts: ["Simplify this architecture", "Estimate operating cost", "Find speculative components"],
  },
  {
    slug: "delivery-lifecycle",
    number: "14",
    title: "Carry intent all the way to evidence.",
    label: "Requirements-to-delivery",
    lead: "Connect requirements, decisions, implementation, verification, and production feedback.",
    overview: "Use traceable artifacts without turning delivery into paperwork. Important requirements should lead to decisions, tests, rollout signals, and a re-evaluation trigger.",
    handbookSections: [{ href: "/book/14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip", title: "14. Requirements-to-Delivery Lifecycle: FR, NFR, Constraints, ADR, and TIP" }],
    checkpoints: ["Requirements link to decisions", "Decisions link to implementation", "Verification produces evidence", "Production feedback updates assumptions"],
    prompts: ["Build a traceability chain", "Review an ADR", "Define release evidence"],
  },
  {
    slug: "agentic-systems",
    number: "15–17",
    title: "Bound intelligence with contracts.",
    label: "LLM & agentic systems",
    lead: "Design model, context, tools, memory, safety, evaluation, cost, and human control as one system.",
    overview: "Treat probabilistic behavior as an operational dependency. Constrain tool authority, make context provenance visible, evaluate complete workflows, and preserve human stop paths.",
    handbookSections: [
      { href: "/book/15-llm-and-agentic-systems", title: "15. LLM and Agentic Systems" },
      { href: "/book/16-spec-driven-development-for-agentic-systems", title: "16. Spec-Driven Development for Agentic Systems" },
      { href: "/book/17-agent-system-design-review-checklist", title: "17. Agent-System Design Review Checklist" },
    ],
    checkpoints: ["Tool authority is least-privilege", "Context has provenance and limits", "Evals cover workflow failures", "Humans can inspect and stop work"],
    prompts: ["Threat-model an agent", "Design an eval", "Review tool permissions"],
  },
];

export function findGuidePage(slug: string) {
  if (slug === workshopPage.slug) return workshopPage;
  return guidePages.find((page) => page.slug === slug);
}

export const workshopPage: GuidePage = {
  slug: "diagram-workshop",
  number: "LAB",
  title: "Build the system you mean.",
  label: "Diagram workshop",
  lead: "Place components, connect dependencies, and use the copilot to challenge boundaries and failure paths.",
  overview: "The canvas is a thinking tool, not decoration. Each node should have a responsibility; each connection should have semantics, limits, and failure behavior.",
  handbookSections: [],
  checkpoints: ["Every node has one responsibility", "Connections have named semantics", "State ownership is visible", "Failure paths can be explained"],
  prompts: ["Review my diagram", "What component is missing?", "Challenge the failure paths"],
};

export const siteMap = guidePages.map((page) => `${page.number} ${page.label} (/chapter/${page.slug})`).join("\n");
