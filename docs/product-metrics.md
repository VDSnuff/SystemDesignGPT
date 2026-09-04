# Privacy-conscious product metrics

## Decision

System Design Studio will not add product analytics or aggregate event
telemetry now. Page views, clicks, dwell time, navigation paths, and inferred
abandonment do not show whether a reader learned or completed a useful design
task, and collecting them would create a privacy cost without a current
decision benefit.

Existing handbook progress and saved learning state remain user-facing resume
features. They are not silently repurposed for analytics: their raw fields mix
private notes, diagrams, quiz choices, and reading state, and they do not record
whether a task was useful or correct. Learning comments remain a feedback
channel, not an analytics dataset.

The first measurement approach is a small, explicitly consented usability
cohort. Results are reviewed only when a cohort exists; a missing cohort is
reported as `NOT MEASURED`, never as zero or success.

## Primary KPIs

| KPI | Decision informed | Definition and calculation | Denominator | Owner | Review cadence |
| --- | --- | --- | --- | --- | --- |
| Guided learning task completion | Which handbook or Quick Guide flow needs clearer sequencing, examples, or review questions? | Percentage of consented sessions in which the participant completes one predefined learning task and explains the selected trade-off using the review rubric. `completed sessions / sessions that started the task`. | Consented participants who start the assigned handbook or guide task. | Product owner | After each cohort of at least five sessions; otherwise quarterly as `NOT MEASURED`. |
| Workshop design-review completion | Does the workshop help a learner produce a reviewable architecture rather than merely move shapes? | Percentage of consented sessions in which the participant creates or edits a diagram, connects a dependency, records one failure boundary, and explains the design using the review rubric. `reviewable outcomes / sessions that started the workshop task`. | Consented participants who start the workshop task. | Workshop owner | After each cohort of at least five sessions; otherwise quarterly as `NOT MEASURED`. |
| Copilot-supported task resolution | Does the copilot help answer the current design question with grounded, usable guidance? | Percentage of consented copilot tasks where the response addresses the stated question, is supported by the displayed handbook section, and the participant can state the next design decision. `resolved tasks / copilot tasks attempted`. | Consented participants who invoke the copilot for the assigned task. | Copilot owner | After each cohort of at least five tasks; otherwise quarterly as `NOT MEASURED`. |

Targets are intentionally unset until the first eligible cohort establishes a
baseline. A target without observed task difficulty and participant mix would
invite gaming. After baseline review, each owner may propose a target with the
cohort definition, confidence, and date; changing a target does not rewrite the
historical result.

## Drivers and guardrails

Use facilitator intervention rate as a diagnostic driver for the learning and
workshop KPIs. Use incorrect or unsupported copilot claims as a diagnostic for
copilot resolution. These explain a KPI result but are not independent success
metrics.

Two guardrails apply to every cohort:

- **Outcome quality:** a task counts only when the predefined rubric passes;
  self-reported satisfaction alone cannot turn an incorrect outcome into a
  success.
- **Privacy:** any prohibited field in a retained measurement artifact is a
  policy failure. Suppress a cohort result below five participants rather than
  exposing an individual through a small denominator.

## Measurement protocol

The product owner defines the task and rubric before a cohort begins. The
facilitator records only task type, pass or fail, rubric reason code, whether
help was required, and the cohort date. Copilot tasks may also record a bounded
quality reason code such as `ungrounded`, `incorrect`, or `not_actionable`.

Do not put raw handbook notes, learning comments, prompts, model answers, quiz
answers, diagrams, emails, names, IP addresses, account IDs, or stable
cross-site identifiers into measurement records. Do not copy application or
provider logs into a research worksheet. An ephemeral session number may be
used during facilitation and must be removed before aggregation.

## Privacy lifecycle

- **Consent:** show the task, fields recorded, purpose, retention, access, and
  withdrawal method before the session. Participation is optional and is not a
  condition of using the product.
- **Minimization:** retain only the bounded fields in the measurement protocol.
  Do not collect page-view or behavioral event streams.
- **Retention:** delete participant-level worksheets within 30 days of the
  cohort review. Retain only cohort-level counts and decision notes for up to 12
  months, then delete or renew them through a documented review.
- **Access:** restrict participant-level worksheets to the product owner and the
  named reviewer for that cohort. Published summaries contain only suppressed
  or cohort-level counts.
- **Deletion:** honor withdrawal before aggregation by deleting the session
  row. Delete any remaining participant-level row on request. Existing account
  deletion continues to remove learning state and handbook progress and does
  not need to find a separate analytics store because none exists.
- **Provider boundary:** do not send research records to OpenAI or another
  analytics or model provider. Ordinary copilot requests retain the existing
  `store: false` boundary and are not copied into metric records.

There is no new collection in the product, so no analytics notice or consent
control is added by this decision. The existing descriptions and deletion
controls for saved learning work and comments remain unchanged.

## Future telemetry gate

If consented cohorts cannot answer a named product decision, open a focused
proposal before adding telemetry. It must define the event schema, purpose,
legal basis and consent behavior, aggregation threshold, retention, access,
export and deletion behavior, provider data flow, privacy-notice copy, and a
kill switch. The proposal must show why existing explicit progress or a bounded
research cohort is insufficient.

No analytics SDK, event table, identifier, cookie, or background request may be
introduced before that review. A future implementation must ship its privacy
notice and deletion behavior in the same change as collection.
