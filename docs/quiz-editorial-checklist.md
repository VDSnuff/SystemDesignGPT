# Authored quiz editorial checklist

Use this checklist whenever a handbook quiz changes. The canonical handbook remains the authority; a quiz must not add unsupported teaching claims.

## Section policy

- Every canonical slug has exactly one policy.
- A teaching section has two to four authored questions.
- A reference, checklist, or template section has a specific no-quiz reason.
- Generated handbook output contains no hand-authored quiz data.

## Question quality

- The prompt tests application, a trade-off, a failure mode, or a misconception.
- Exactly one option is correct under the scenario as written.
- Distractors are plausible within the same concept boundary.
- Options are short statements, not truncated handbook paragraphs.
- The answer order is deliberate and deterministic.

## Feedback and evidence

- Every option explains why its distinction is right or wrong.
- Feedback teaches the concept instead of only telling the reader to reread.
- Every question links to an existing section heading or labels the handbook evidence cited by that section.
- Claims match the canonical Markdown and do not extend beyond its evidence.

## Persistence and interaction

- Authored assessments use storage version 2. Unversioned arrays belong to the retired generated quiz and are cleared because their answer indexes have no valid mapping to authored question IDs.
- A quiz-content change deliberately retains or bumps the storage version.
- Incompatible saved answers are cleared with a visible migration warning.
- Retry clears only quiz answers; notes and diagrams remain intact.
- Desktop and mobile controls remain semantic and keyboard operable.

## Verification record

The initial authored set was reviewed against this checklist on 2026-08-25. Executable tests enforce slug completeness, duplicate and stale mapping rejection, option length, one correct answer, feedback presence, valid heading links, deterministic scoring, retry isolation, and storage migration.
