import { answer as a, authoredQuiz as quiz, question as q, type QuizPolicy } from "./quiz-contract";

const evidence = (label: string) => ({ label, href: "#section-content" });
const heading = (label: string, href: string) => ({ label, href });

export const foundationsQuizPolicies: readonly QuizPolicy[] = [
  quiz("what-we-adopted-from-hellointerview", [
    q("source-authority", "A design heuristic comes from a practitioner interview guide. How should a production review use it?", evidence("Evidence S2, S3, S24, S44 and P1–P4"), [
      a("Treat it as a useful prompt, then verify the technical claim against standards, official guidance, or research.", "Correct. The handbook uses practitioner material for teaching structure while primary evidence supports technical claims.", true),
      a("Treat it as authoritative because it is optimized for interviews.", "Interview usefulness does not make a source authoritative for production claims."),
      a("Reject it because practitioner sources can never influence architecture work.", "The handbook keeps strong teaching ideas, but validates the underlying guidance independently."),
    ]),
    q("capacity-math", "A rough throughput estimate changes whether a queue is needed. What is the handbook's policy?", evidence("Evidence S24, S44 and P4"), [
      a("Use the estimate for the decision, then validate production capacity with real limits, monitoring, and tests.", "Correct. Decision-relevant math is useful, but production capacity still needs current evidence.", true),
      a("Skip the estimate because all capacity numbers become stale.", "Current limits may change, but decision-relevant estimates still expose design risks."),
      a("Memorize common hardware limits and use them as the production plan.", "Static numbers are not a substitute for current quotas and workload benchmarks."),
    ]),
  ]),
  quiz("practical-system-design-workflow", [
    q("start-from-requirements", "A team selects a distributed cache before agreeing what must be fast. What should happen next?", evidence("Evidence S2, S3, S24 and P1"), [
      a("Return to functional requirements, measurable quality targets, and constraints before choosing the mechanism.", "Correct. The workflow begins with requirements and earns each technology through a concrete need.", true),
      a("Keep the cache and derive requirements that justify it.", "Backfilling requirements around a preferred pattern reverses the design workflow."),
      a("Move directly to detailed cache invalidation design.", "A deep dive is premature until the requirement and high-level design justify a cache."),
    ]),
    q("validation-loop", "A deep-dive review shows the proposed design misses the recovery-time target. Where does the workflow go?", evidence("Figure 1 and evidence S2, S3, S24, P1"), [
      a("Back to the high-level design and deep dives until the requirement is met or deliberately changed.", "Correct. Validation loops back when the design does not satisfy requirements.", true),
      a("Forward to approval because the design sequence is complete.", "Completing steps does not justify approval when a measured requirement is unmet."),
      a("Back only to API naming because recovery is an interface concern.", "Recovery can affect architecture and dependencies, so the design itself must be revisited."),
    ]),
  ]),
  quiz("the-12-question-system-design-loop", [
    q("ambiguous-retry", "A payment request times out and the client cannot tell whether it succeeded. Which design question is most urgent?", evidence("Evidence S2, S3, S23, S24, S46 and S53"), [
      a("Which operations can be retried safely, and how are duplicates handled?", "Correct. Ambiguous completion makes retry safety and duplicate handling the immediate contract question.", true),
      a("Which dashboard color best communicates payment state?", "Presentation matters later; it does not prevent duplicate side effects."),
      a("Which cache eviction policy should the service use?", "Caching does not resolve the ambiguous operation or make a retry safe."),
    ]),
    q("slow-dependency", "A critical dependency becomes slow but not fully unavailable. Which loop question exposes the missing design?", evidence("Evidence S23 and S24"), [
      a("What happens when every dependency is slow, unavailable, or partially successful?", "Correct. The loop treats slowness and partial success as first-class failure modes.", true),
      a("What is the preferred programming language?", "Language selection does not define timeout, degradation, or recovery behavior."),
      a("Can the service add more feature flags?", "Feature flags may help rollout, but they do not define dependency-failure behavior."),
    ]),
  ]),
  quiz("1-requirements-frs-nfrs-constraints-and-assumptions", [
    q("classify-requirement", "A product must keep monthly availability at or above 99.9%. What kind of statement is this?", heading("What good requirements look like", "#what-good-requirements-look-like"), [
      a("A measurable nonfunctional requirement.", "Correct. It sets a verifiable quality target rather than describing a user behavior.", true),
      a("A functional requirement.", "A functional requirement describes required behavior, not its availability level."),
      a("An unproven assumption.", "The statement is a target to satisfy; an assumption is a belief that still needs evidence."),
    ]),
    q("improve-requirement", "A requirement says only that search must be fast. What is missing before design approval?", heading("What good requirements look like", "#what-good-requirements-look-like"), [
      a("A measurable threshold, operating conditions, and a verification method.", "Correct. A quality claim must be testable under defined conditions.", true),
      a("A named database product.", "A requirement should state the needed outcome before prescribing a technology."),
      a("A promise that engineers will optimize later.", "An unverifiable promise does not create an acceptance criterion."),
    ]),
  ]),
  quiz("2-boundaries-state-and-data", [
    q("source-of-truth", "Two services can independently update the same customer's subscription tier. What should the design establish first?", heading("Key decisions", "#key-decisions"), [
      a("One authoritative source of truth and explicit ownership of updates.", "Correct. Shared business facts need clear ownership before synchronization mechanisms are chosen.", true),
      a("A nightly job that overwrites whichever value is older.", "Reconciliation without authority leaves conflict semantics undefined."),
      a("A cache in front of both services.", "A cache can hide or amplify inconsistency; it does not establish ownership."),
    ]),
    q("c4-scope", "Stakeholders need to see users, the system, and external dependencies without internal detail. Which C4 view fits?", heading("C4 diagrams: zoom from context to code", "#c4-diagrams-zoom-from-context-to-code"), [
      a("System context.", "Correct. A context view shows the system in its environment and its external relationships.", true),
      a("Component view.", "A component view is a deeper zoom inside one container."),
      a("Code-level class diagram.", "Code detail is far below the scope needed for stakeholder boundaries."),
    ]),
  ]),
  quiz("2a-networking-and-communication", [
    q("choose-push", "A browser needs one-way progress updates from a server during a long task; the client sends no live messages. What is the simplest fitting option?", heading("Simple protocol choices", "#simple-protocol-choices"), [
      a("Server-Sent Events, if its delivery and connection limits fit.", "Correct. SSE supports server-to-client streaming without the bidirectional state of WebSockets.", true),
      a("WebSockets solely because the updates are real time.", "WebSockets can work, but bidirectional state is unnecessary for this interaction."),
      a("A distributed queue connected directly to the browser.", "A queue is not a browser delivery protocol and would expose new trust and operational concerns."),
    ]),
    q("remote-boundary", "Why must a remote call have different failure handling from a local function call?", evidence("Evidence S9, S17, S27, S41 and S42"), [
      a("It can be slow, time out, or fail after partial work across an independent boundary.", "Correct. Networked interactions have ambiguity and partial-failure modes local calls do not.", true),
      a("It always executes exactly once but may return a different type.", "Remote execution is not inherently exactly once; retries can duplicate work."),
      a("It is safe whenever both services use the same language.", "Shared language does not remove network, process, or dependency failure boundaries."),
    ]),
  ]),
  quiz("2b-data-modeling-indexing-and-partitioning", [
    q("progression-before-sharding", "A database is slow on two known queries, but the team has not inspected query plans or indexes. What should it do first?", heading("Practical progression", "#practical-progression"), [
      a("Measure the access paths and add justified constraints or indexes before considering sharding.", "Correct. The handbook optimizes the simple store before accepting permanent partitioning complexity.", true),
      a("Shard immediately by a random key.", "Sharding before measuring can preserve the original problem while adding routing and rebalancing costs."),
      a("Duplicate every table into a second database.", "Duplication does not target the known access pattern and creates consistency work."),
    ]),
    q("partition-key", "A proposed tenant partition key sends 70% of traffic to one tenant. What risk must the design address?", heading("Practical progression", "#practical-progression"), [
      a("A hot partition that defeats horizontal scale and may require a different key or isolation plan.", "Correct. A partition key must distribute the actual workload while supporting access patterns.", true),
      a("Too many cross-origin browser requests.", "Browser origin policy is unrelated to storage partition distribution."),
      a("Loss of SQL syntax highlighting.", "Developer tooling is not the capacity risk created by skewed traffic."),
    ]),
  ]),
  quiz("2c-time-clocks-and-ordering", [
    q("civil-time", "A recurring Warsaw meeting is stored only as 09:00 and a fixed +01:00 offset. What is lost?", evidence("Evidence S56 and S57"), [
      a("The time-zone rules needed to preserve local civil time across daylight-saving changes.", "Correct. A fixed offset does not represent the full rules of a named time zone.", true),
      a("The UTC instant of every past event.", "A recurring local meeting is not one fixed past instant; the missing element is the zone rule."),
      a("The database transaction isolation level.", "Isolation does not determine how civil time maps across daylight-saving transitions."),
    ]),
    q("message-order", "Two producers emit events with close timestamps from different machines. What can the timestamps prove by themselves?", evidence("Evidence S56 and S57"), [
      a("They do not prove a total causal order; ordering semantics need an explicit mechanism and scope.", "Correct. Distributed clocks and transport ordering cannot be treated as a universal sequence.", true),
      a("They prove exactly which event caused the other.", "Wall-clock timestamps alone do not establish causality across machines."),
      a("They guarantee every consumer observes the same order.", "Consumer order depends on broker, partition, and processing contracts, not timestamps alone."),
    ]),
  ]),
];
