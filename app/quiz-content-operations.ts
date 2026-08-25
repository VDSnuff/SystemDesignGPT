import { answer as a, authoredQuiz as quiz, question as q, type QuizPolicy } from "./quiz-contract";

const heading = (label: string, href: string) => ({ label, href });
const evidence = (label: string) => ({ label, href: "#section-content" });

export const operationsQuizPolicies: readonly QuizPolicy[] = [
  quiz("10-observability-and-reliability", [
    q("health-probes", "A process is alive but cannot reach the database required for requests. How should health signals behave?", evidence("Evidence S22, S23, S24 and S26"), [
      a("Liveness can remain healthy while readiness fails so traffic is not sent to the instance.", "Correct. Liveness asks whether to restart; readiness asks whether the instance can serve traffic.", true),
      a("Liveness must fail immediately so the process restarts forever.", "Restarting a healthy process may not repair a dependency and can amplify an outage."),
      a("Both probes should ignore dependencies and always report success.", "Then routing cannot protect users from an instance that cannot serve its required path."),
    ]),
    q("slo-signal", "A team alerts whenever log volume rises, but cannot tell whether users meet the latency target. What should it add?", evidence("Evidence S22 and S23"), [
      a("A service-level indicator tied to the user-facing target, with an SLO and actionable alert policy.", "Correct. Reliability targets connect telemetry to outcomes users experience.", true),
      a("More unstructured logs without a defined success measure.", "More telemetry does not create a reliability objective by itself."),
      a("An alert for every individual successful request.", "Alerting on normal events creates noise rather than an actionable reliability signal."),
    ]),
  ]),
  quiz("11-deployment-migration-and-evolution", [
    q("schema-evolution", "Old and new application versions run together while a required database column is being renamed. Which strategy is safest?", evidence("Evidence S10, S25, S30, S33 and S55"), [
      a("Expand the schema compatibly, migrate readers/writers and data, then contract only after old versions are gone.", "Correct. Expand-and-contract preserves compatibility during mixed-version operation.", true),
      a("Rename the column first and deploy application code later.", "Old versions will fail while they still expect the original schema."),
      a("Pause monitoring so migration errors do not trigger alerts.", "Removing evidence increases deployment risk and does not create compatibility."),
    ]),
    q("progressive-rollout", "A canary release shows a clear increase in the error-budget burn rate. What is the intended response?", heading("Checklist", "#checklist"), [
      a("Stop or roll back the rollout using the predefined signal and investigate the smaller blast radius.", "Correct. Progressive delivery is valuable because measured bad change can be contained quickly.", true),
      a("Continue to 100% so the sample becomes statistically larger.", "Expanding a clearly harmful release defeats the canary's containment purpose."),
      a("Ignore the signal if unit tests passed.", "Pre-release tests do not override production evidence from real traffic."),
    ]),
  ]),
  quiz("12-cost-simplicity-and-operability", [
    q("earned-complexity", "A reliable synchronous service meets its targets, but the team proposes a queue, cache, and second database for possible future scale. What should the review ask?", evidence("Evidence S2, S30 and S32"), [
      a("Which current requirement or measured risk pays for each added component's cost and failure modes?", "Correct. Architecture complexity must be justified by a real need and its trade-offs.", true),
      a("Whether more components will make the diagram look enterprise-ready.", "Diagram density is not a requirement or operational benefit."),
      a("Whether all three can be added before measuring the current system.", "Adding mechanisms before evidence violates the chapter's simplicity rule."),
    ]),
    q("operability-cost", "A new service saves a small amount of compute but needs on-call ownership, secrets, deployment, and monitoring. How should the trade-off be evaluated?", heading("Checklist", "#checklist"), [
      a("Include lifecycle, reliability, security, staffing, and operational costs—not only compute spend.", "Correct. Total architecture cost includes operating and changing the component safely.", true),
      a("Count only its monthly cloud invoice.", "The invoice omits the human and system costs introduced by another dependency."),
      a("Assume operational work is free after initial deployment.", "Services continue to require upgrades, incident response, security work, and support."),
    ]),
  ]),
  quiz("14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip", [
    q("traceability-chain", "A latency NFR exists in a design document but has no test, deployment gate, or production signal. What is broken?", heading("14.5 Traceability — keep the chain visible", "#14-5-traceability-keep-the-chain-visible"), [
      a("The requirement-to-verification-to-operation traceability chain.", "Correct. A requirement remains active through implementation, evidence, release, and production feedback.", true),
      a("Only the source-code formatting convention.", "Formatting does not prove the requirement was implemented or remains satisfied."),
      a("Nothing; approval of the design document completes the NFR.", "A quality target is not complete until it has executable and operational evidence."),
    ]),
    q("adr-versus-tip", "The team chose an event-driven integration after comparing consistency and operability trade-offs. Where should the enduring rationale live?", heading("14.6 ADRs — use them for decisions, not for everything", "#14-6-adrs-use-them-for-decisions-not-for-everything"), [
      a("An ADR records the decision, alternatives, rationale, and consequences; the TIP then plans implementation.", "Correct. The ADR preserves why, while the TIP coordinates how the chosen design is delivered.", true),
      a("Only in the task breakdown, because implementation steps explain every trade-off.", "Tasks can change and rarely preserve the decision context or rejected alternatives."),
      a("Only in a code comment naming the preferred technology.", "A local comment cannot capture the cross-system decision lifecycle and consequences."),
    ]),
  ]),
];
