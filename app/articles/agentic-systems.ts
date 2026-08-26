import { defineGuideArticle } from "./article";

const markdown = `
## Use an agent only when the path cannot be fixed in advance

Agentic systems help with work whose next useful step depends on information discovered during execution: investigating an incident, researching across changing sources, or resolving a request through several conditional tools. Use this review when a model may choose an action, observe its result, and continue. That loop creates value, but it also creates trajectories that ordinary request-response testing can miss.

An **LLM application** produces model output. A **workflow** uses code to choose most steps and may call a model inside those steps. An **agent** lets the model choose among approved steps or tools at runtime. The question is therefore not whether a feature can be called an agent; it is how much decision authority the requirement actually needs.

Keep deterministic control over identity, authorization, budgets, approvals, durable state, and final side effects. The model may propose a decision, but code must enforce the boundary. Start from an observable outcome and a simpler baseline, then add autonomy only when repeated evaluation shows a material gain in quality or coverage.

*Evidence: [S63 — OpenAI practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/), [S65 — Anthropic building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [S68 — Anthropic agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).*

## Choose the least autonomy that satisfies the requirement

Move up this ladder deliberately. Each step expands the possible sequences of model decisions, tool calls, latency, cost, and failure.

| Control style | Appropriate when | Cost or limitation |
|---|---|---|
| Deterministic function | Rules and inputs fully determine the result. | Cannot interpret genuinely ambiguous or open-ended material. |
| Single model call | One bounded transformation or classification is enough and output can be validated. | No adaptive tool use; quality still varies across trials and model versions. |
| Coded workflow with model steps | The route is known, but selected steps benefit from model judgment. | Code must maintain the graph, retries, and intermediate contracts. |
| Single bounded agent | The useful next step depends on observations and cannot be enumerated economically. | More trajectories, tool ambiguity, and budget or stop failures must be evaluated. |
| Multiple agents | Work is separable, parallelizable, or needs distinct context and expertise. | Coordination, shared-state conflicts, delegation errors, and aggregate cost increase. |

A support assistant that classifies a request and drafts a reply may need one structured model call. A refund process with known eligibility and approval rules is usually a workflow. An incident investigator that chooses among read-only telemetry tools may justify a bounded agent. Adding a manager agent and several specialists to a tightly coupled sequence often adds coordination without improving the outcome.

Record the baseline and the evidence for moving upward. “The model can decide” is not evidence; compare completion quality, harmful side effects, latency, and total operating cost on representative tasks.

*Evidence: [S63 — OpenAI practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/), [S65 — Anthropic building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [S69 — Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system).*

## Design model, context, tools, and memory as separate boundaries

The model is a probabilistic dependency, not the control plane. Select and version it against the real task distribution, required structured-output and tool capabilities, data-handling constraints, latency, and cost. Validate every model route—including fallbacks—against its own thresholds. Treat model aliases and defaults as changeable unless the provider guarantees otherwise.

**Context** is the information assembled for one decision: instructions, user input, retrieved documents, tool descriptions, tool results, and relevant state. Give each source an owner, trust level, permission result, freshness, and stable identifier. Retrieved or user-supplied text is data, not authority. More context can add conflict and distraction, so measure retrieval quality, truncation, and grounding instead of filling the context window by default.

**Tools** are action contracts. Prefer narrow operations such as \`customer_order.cancel\` over a generic database, shell, or admin interface. A tool contract must define input and output schemas, represented identity, resource-level authorization, side-effect class, approval rule, timeout, retry eligibility, idempotency, limits, error categories, and audit fields. Validate permission again inside the tool; a model saying an action is allowed never makes it allowed.

**Memory** is not one store. Separate resumable run state, conversation history, temporary working notes, durable user preferences, retrieved knowledge, and immutable audit history. Durable user memory needs consent, purpose, provenance, correction, deletion, retention, and tenant isolation. Long-running run state needs checkpoints, ownership or leases, cancellation, and recorded tool outcomes so recovery does not blindly repeat an effect.

*Evidence: [S66 — Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [S67 — Anthropic tool design](https://www.anthropic.com/engineering/writing-tools-for-agents), [S81 — NIST AI RMF Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence), [S84 — Microsoft threat modeling for AI agents](https://learn.microsoft.com/en-us/agents/architecture/threat-models).*

## Put permissions, budgets, and approval outside the model

Write the authority boundary as separate verbs: read, propose, stage, write, communicate, spend, and delete. Grant only the verbs and resources needed for the task. Bind credentials to the represented user, tenant, audience, and short lifetime; never place secrets in model context.

Classify each tool effect as read-only, reversible, or irreversible. Low-risk reads may run automatically. A reversible write may be staged for review. High-impact communication, spending, deletion, or privilege change should pause with the exact action, target, validated arguments, and consequence visible to an authorized approver. If arguments change, the approval is no longer valid.

Enforce time, turns, tokens, tool calls, recursion, concurrency, and spend in deterministic code. A prompt asking the model to be economical is not a budget. Define what happens when any limit is reached: return partial evidence, abstain, escalate, or cancel queued and delegated work. Provide an operator kill switch and credential revocation path for behavior that escapes normal limits.

*Evidence: [S83 — OWASP agentic AI threats and mitigations](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/), [S84 — Microsoft threat modeling for AI agents](https://learn.microsoft.com/en-us/agents/architecture/threat-models), [S89 — OpenAI Agents SDK human-in-the-loop approvals](https://openai.github.io/openai-agents-python/human_in_the_loop/).*

## Worked example: a bounded order-cancellation agent

Suppose a retailer wants an assistant that resolves a customer’s cancellation request. The outcome is: cancel one eligible order for the authenticated customer, or explain why it cannot be cancelled, without duplicating a refund. The response should normally arrive within 12 seconds; refunds above a negotiated policy limit require a human approver. These numbers are example requirements, not universal defaults.

The deterministic gateway authenticates the customer and creates run \`run-814\` with tenant, user, order, deadline, tool-call, and spend budgets. The context builder supplies the policy version and the customer’s request. It does not preload unrelated orders or unrestricted customer history.

The agent may use only two versioned tools:

- \`customer_order.read@3(order_id)\` is read-only. It validates that the represented customer may see the order and returns bounded status, fulfilment state, value, and policy identifiers.
- \`customer_order.cancel@2(order_id, reason, idempotency_key, approval_id?)\` is a reversible write until fulfilment. It rechecks identity, authorization, eligibility, and approval at execution time, then returns \`cancelled\`, \`already_cancelled\`, \`ineligible\`, or an explicit retryable or final error.

The orchestrator—not free-form model text—owns these states:

1. **Inspecting:** the model requests the read tool. Invalid schema, wrong resource, or budget exhaustion moves to a safe stop.
2. **Deciding:** structured output must select \`answer\`, \`request_approval\`, \`cancel\`, or \`escalate\`, with evidence from the tool result.
3. **Awaiting approval:** a high-value refund pauses durably. The approval binds the order, amount, policy version, proposed action, and expiry. Rejection or timeout ends without a write.
4. **Executing:** the orchestrator calls the cancellation tool with \`run-814:cancel:ord-731\` as a stable idempotency key. The model cannot alter identity or approval fields.
5. **Verifying:** the orchestrator reads the order again and accepts success only when the authoritative state is cancelled and the refund operation identity matches.
6. **Completed or stopped:** the user receives the verified outcome, a safe explanation, or a handoff reference. No further tool call is allowed.

If the process crashes after cancellation but before saving the response, recovery loads the checkpoint and queries the stable operation identity. It does not issue a fresh cancellation. If the tool times out with an ambiguous outcome, the run enters reconciliation rather than retrying blindly. If fulfilment starts between the read and write, the tool’s owner rejects the stale decision and the agent explains the conflict or escalates. Cancellation from the user propagates to pending work; it cannot undo an already committed external effect, so the UI reports the verified final state.

Test the complete chain: unauthorized order, prompt injection inside order notes, malformed tool request, changed approval arguments, approval rejection and expiry, concurrent duplicate runs, crash before and after commit, ambiguous timeout, policy-version change, budget exhaustion, and user cancellation. Assert the final order and refund state, not merely that the model produced a plausible sentence.

*Evidence: [S67 — Anthropic tool design](https://www.anthropic.com/engineering/writing-tools-for-agents), [S89 — OpenAI Agents SDK human-in-the-loop approvals](https://openai.github.io/openai-agents-python/human_in_the_loop/), [S91 — Anthropic long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), [S92 — Anthropic trustworthy agents research](https://www.anthropic.com/research/trustworthy-agents).*

## Treat MCP and A2A as contracts, not trust

The **Model Context Protocol (MCP)** connects an agent host to tools, resources, and related capabilities. The **Agent2Agent protocol (A2A)** supports discovery and task or artifact exchange between independently operated agents. MCP commonly sits at the capability boundary; A2A commonly sits at an inter-agent boundary. They can coexist, but neither grants authorization or makes a remote party trustworthy.

Pin the protocol and SDK versions, supported features, authentication, audience, data classification, timeouts, limits, and error semantics. Treat remote tools and agents like external services: validate their claims, bound returned data, preserve correlation, and verify final effects locally. Do not infer released behavior from a roadmap.

This article follows the canonical handbook snapshot verified on **24 August 2026**. In particular, its MCP discussion refers to the **28 July 2026** stateless-core release, while A2A refers to the linked latest specification at that verification date. Protocol releases, model capabilities, SDK behavior, prices, quotas, and provider policies move quickly; recheck official sources and concrete deployed versions before implementation.

*Evidence: [S70 — MCP 28 July 2026 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [S71 — MCP August 2026 roadmap](https://blog.modelcontextprotocol.io/posts/mcp-roadmap/), [S72 — A2A latest specification](https://a2a-protocol.org/latest/), [S75 — OAuth protected resource metadata](https://www.rfc-editor.org/rfc/rfc9728.html), [S76 — OAuth resource indicators](https://www.rfc-editor.org/rfc/rfc8707.html).*

## Specify behavior before implementation

An agent specification must cover more than prompts. Start with users, outcome, functional requirements, measurable quality targets, constraints, non-goals, and risks. Add the agent’s output schema, instruction priority, authority, prohibited behavior, context sources, tool and memory contracts, approval points, budgets, completion, abstention, escalation, and cancellation conditions.

Link that behavior specification to architecture decisions, implementation tasks, an evaluation dataset, release gates, and production evidence. Version models, prompts, policies, tools, retrieval, memory rules, orchestration, graders, and thresholds as independent release inputs. A permission or prompt change can alter product behavior even when application code is unchanged.

For every change, state the requirement or failure that motivates it, run targeted and full regression evaluations, compare safety and operational outcomes, then release to a controlled cohort with rollback or disable controls. Feed privacy-reviewed production failures back into the specification and regression set.

*Evidence: [S53 — NASA systems engineering handbook appendix](https://www.nasa.gov/reference/system-engineering-handbook-appendix/), [S80 — GitHub Spec Kit documentation](https://github.github.com/spec-kit/), [S85 — OpenAI Model Spec dated snapshot](https://model-spec.openai.com/2025-09-12.html).*

## Evaluate outcomes, trajectories, and side effects

An **outcome evaluation** checks whether the final task state is correct. A **trajectory evaluation** checks the sequence of decisions, tool calls, evidence, approvals, and stops that produced it. Both matter: an agent can reach a correct answer through an unauthorized read, or fail safely through a correct refusal.

Build representative tasks from production shapes and known failures. Store the initial state, allowed tools and permissions, expected invariants, graders, thresholds, and multiple trials. Evaluate:

- Task outcome and grounded evidence, including abstention when evidence is missing.
- Tool selection, arguments, ordering, duplicate safety, and unnecessary steps.
- Side effects and invariants, including actions the user never requested.
- Authorization, tenant isolation, injection resistance, secret handling, and approval behavior.
- Recovery after tool failure, interruption, timeout, cancellation, and resume.
- End-to-end latency, tokens, tool calls, provider spend, and human correction cost.
- Drift across model, prompt, policy, tool, retrieval, memory, and grader versions.

Use deterministic graders for state and policy invariants; use human or carefully calibrated model grading where judgment is genuinely required. Inspect failures and reward hacking, not only one aggregate score. Define zero-tolerance release blockers for critical classes such as cross-tenant access or unapproved high-impact action.

Production monitoring should connect trace IDs, model/spec/tool versions, approvals, token and tool usage, latency, errors, stop reasons, and verified outcome—while redacting sensitive content. A cheaper model that causes more retries, escalations, or corrections may cost more overall.

*Evidence: [S68 — Anthropic agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), [S86 — tau-bench tool-agent benchmark](https://arxiv.org/abs/2406.12045), [S87 — SWE-bench repository benchmark](https://arxiv.org/abs/2310.06770), [S90 — OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-python/tracing/).*

## Failure modes to challenge

- **Agent by default.** A coded rule or workflow would be faster, cheaper, and easier to verify.
- **The prompt is the policy engine.** The model can ignore or misapply permissions, budgets, or approval language that code never enforces.
- **One giant tool.** Broad shell, database, browser, or admin access turns a small reasoning error into an uncontrolled effect.
- **Approval without binding.** The user approves one action, then changed arguments or a different target execute under the old approval.
- **Memory without lifecycle.** Stale, incorrect, cross-tenant, or undeletable facts silently shape later decisions.
- **Blind resume or retry.** A crash or timeout repeats a cancellation, payment, message, or deletion because the original operation identity was lost.
- **Protocol equals trust.** MCP or A2A compatibility is treated as proof of identity, authorization, safety, or reliability.
- **Happy-path evals.** The final answer looks good while unauthorized reads, needless tool calls, cost explosions, and unsafe intermediate states go unmeasured.
- **Unversioned drift.** A model alias, prompt, tool description, retrieval index, or grader changes without regression evidence or rollback.

## Agent-system review checklist

1. State the user outcome and prove why a deterministic function or workflow is insufficient.
2. Define the model, context, retrieval, tools, memory, and orchestration as separate versioned boundaries.
3. Keep identity, authorization, policy, budgets, approvals, and critical state transitions outside the model.
4. Give every tool a narrow contract, side-effect class, idempotency behavior, timeout, limit, audit record, and final-state verification.
5. Specify completion, abstention, escalation, rejection, interruption, cancellation, and kill-switch behavior.
6. Pin MCP, A2A, OpenAPI, JSON Schema, OAuth, telemetry, model, and SDK versions where used.
7. Evaluate repeated outcomes, trajectories, side effects, security, recovery, latency, cost, and version drift.
8. Release through a controlled cohort with observable gates, rollback, and an accountable owner.

## Review questions

1. Which observation makes the next step impossible to determine in advance?
2. What is the simplest non-agent baseline, and what evidence justifies more autonomy?
3. Which decisions may the model make, and which must deterministic code enforce?
4. What identity, permission, data, and side-effect boundary does each tool cross?
5. How are approval arguments bound, and what happens on rejection, timeout, or change?
6. Can an interrupted run resume without repeating an external effect?
7. Which state is temporary, user-controlled memory, authoritative knowledge, or audit evidence?
8. Do evaluations detect harmful paths and side effects even when the final answer looks correct?
9. What stops the run when time, turns, tool calls, recursion, or spend reaches its limit?
10. Which deployed versions and fast-moving assumptions must be revalidated before release?

Continue in the complete handbook at [15. LLM and Agentic Systems](/book/15-llm-and-agentic-systems), [16. Spec-Driven Development for Agentic Systems](/book/16-spec-driven-development-for-agentic-systems), and [17. Agent-System Design Review Checklist](/book/17-agent-system-design-review-checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources and dated verification caveats.
`;

export const agenticSystemsArticle = defineGuideArticle({
  markdown,
  slug: "agentic-systems",
});
