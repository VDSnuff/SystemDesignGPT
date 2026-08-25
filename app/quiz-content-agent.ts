import { answer as a, authoredQuiz as quiz, question as q, type QuizPolicy } from "./quiz-contract";

const heading = (label: string, href: string) => ({ label, href });

export const agentQuizPolicies: readonly QuizPolicy[] = [
  quiz("15-llm-and-agentic-systems", [
    q("least-autonomy", "A fixed three-step workflow meets the requirement, but the team wants an autonomous planner because it seems more advanced. What should it choose?", heading("15.1 Start with the least autonomy that works", "#15-1-start-with-the-least-autonomy-that-works"), [
      a("Keep the deterministic workflow unless runtime choice solves a demonstrated problem.", "Correct. More autonomy expands evaluation, security, reliability, and cost obligations.", true),
      a("Use the autonomous planner because every LLM application should be an agent.", "The handbook distinguishes fixed workflows from agents and does not make autonomy a default."),
      a("Let the model redesign its own authority at runtime.", "Authority is a system contract and must not be delegated implicitly to model output."),
    ]),
    q("tool-approval", "An agent drafts refunds and may execute them through a payment tool. Which boundary is essential?", heading("15.7 Tools and the action plane", "#15-7-tools-and-the-action-plane"), [
      a("Typed, least-privilege tool inputs plus policy checks and human approval for consequential execution.", "Correct. A model proposal is not authorization; the action plane must enforce authority independently.", true),
      a("A prompt asking the model to be careful, with unrestricted payment credentials.", "Instructions can fail and do not replace enforceable authorization or scoped credentials."),
      a("Automatic execution whenever the model expresses high confidence.", "Model confidence is not an approval policy or proof that the action is allowed."),
    ]),
    q("evaluation-layer", "An agent succeeds once on a happy-path demo. What evidence is still needed before release?", heading("15.12 Evaluation is the acceptance-test layer", "#15-12-evaluation-is-the-acceptance-test-layer"), [
      a("Repeated task-specific evaluations covering success, failure cases, safety, tool behavior, and human-control boundaries.", "Correct. Probabilistic systems need distributions and failure evidence, not a single demonstration.", true),
      a("Only a larger context window.", "More context may change behavior but does not establish acceptance criteria or reliability."),
      a("A claim that the base model scored well on an unrelated benchmark.", "General benchmark results do not replace product-specific tasks, policies, tools, and data."),
    ]),
  ]),
  quiz("16-spec-driven-development-for-agentic-systems", [
    q("authority-spec", "A coding agent can edit files but the specification never says whether it may deploy. What must happen before implementation?", heading("16.3 Agent behavior specification — template", "#16-3-agent-behavior-specification-template"), [
      a("Define allowed actions, prohibited actions, approval gates, stop conditions, and evidence requirements explicitly.", "Correct. Agent behavior specifications must cover authority and control, not only desired output.", true),
      a("Assume deployment is allowed because editing and deployment are both technical work.", "Different consequences require explicit authority; one permission does not imply the other."),
      a("Let the agent infer permission from whether credentials are present.", "Credential availability is not user authorization or a behavioral contract."),
    ]),
    q("tool-contract", "A tool may delete customer records, but its schema accepts an arbitrary string and documents no failure or approval behavior. What is missing?", heading("16.4 Tool contract — template", "#16-4-tool-contract-template"), [
      a("A typed contract for inputs, outputs, errors, side effects, authorization, idempotency, and approval semantics.", "Correct. Consequential tools need executable boundaries that agents and reviewers can test.", true),
      a("A longer natural-language tool name.", "Naming does not constrain targets, authority, side effects, or failure behavior."),
      a("More model temperature so the agent explores safer calls.", "Sampling settings cannot replace validation and authorization at the tool boundary."),
    ]),
    q("release-evidence", "A behavior specification changes, but the evaluation set and release record remain unchanged. What should block release?", heading("16.7 Change control and release", "#16-7-change-control-and-release"), [
      a("Missing traceability from the changed behavior through updated evaluations, implementation, and release evidence.", "Correct. Spec-driven delivery keeps the chain synchronized when intent or authority changes.", true),
      a("The absence of a new framework dependency.", "A specification change does not inherently require a new framework."),
      a("The fact that the source diff is small.", "Impact comes from behavioral and authority changes, not line count alone."),
    ]),
  ]),
];
