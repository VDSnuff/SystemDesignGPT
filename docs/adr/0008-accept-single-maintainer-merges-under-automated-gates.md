# ADR-0008: Accept single-maintainer merges under strict automated gates

- **Status:** Accepted
- **Date:** 2026-09-11
- **Owners:** Repository maintainers
- **Risk owner:** @VDSnuff
- **Review by:** 2026-12-01

## Context

`main` is protected: pull requests are mandatory, the deterministic and
responsive-browser checks must pass on an up-to-date branch, conversations must
be resolved, history must be linear, force pushes and deletion are blocked, and
the rules apply to administrators. The protection still allows a merge with
zero approving reviews, no code-owner review, and no last-push approval.

The repository has exactly one collaborator, who is also the code owner. GitHub
does not count a pull request author's approval, so requiring one independent
review would block every merge, and defining a reviewer team would invent an
ownership model that does not exist.

## Decision

Accept single-maintainer self-merge as a recorded risk while the repository
has one maintainer. The compensating controls are the required status checks
listed in `.github/branch-protection.json`, linear history, resolved
conversations, and administrator enforcement. Automated agents that open pull
requests act under the maintainer's account and are bound by the same gates.

Keep `required_approving_review_count` at `0` and `require_code_owner_reviews`
disabled until a second maintainer with write access exists. When that happens,
raise the count to `1`, enable code-owner review and last-push approval, apply
the payload, and supersede this ADR.

Break-glass is limited to the maintainer temporarily disabling a required
status check for a revert or an incident fix. The disabling and the restoring
API calls must both be recorded in the pull request, and the protection must be
restored before the next non-incident merge. Force pushes, branch deletion, and
review bypass are never part of break-glass.

## Alternatives considered

- **Require one approving review now:** Provides independent review in theory
  but blocks every merge in a one-maintainer repository and invites bypass.
- **Require code-owner review:** Equivalent to the previous option because the
  only code owner is the only author.
- **Leave the setting undocumented:** Keeps merges flowing but hides an accepted
  risk without an owner or review date.

## Consequences

- Merges stay possible and every merged revision has passed the full quality
  and browser gates on the exact commit.
- No independent human reads the diff before it lands; defects that pass the
  automated gates reach `main` and can only be caught by the release runbook.
- The risk owner must re-review this decision by the review date or as soon as
  a second maintainer is granted write access.

## Evidence

- [Desired branch protection payload](../../.github/branch-protection.json)
- [Code owners](../../.github/CODEOWNERS)
- [Required check definitions](../../.github/workflows/quality.yml)
- [Supply-chain and merge-governance report](../validation/supply-chain-2026-09-01.md)
- [Executable governance contract](../../tests/validation-manifest.test.ts)

## Supersession rule

Supersede this ADR when a second maintainer receives write access, when the
required checks change, or when the review date passes. Read-only API evidence
from `GET /repos/{owner}/{repo}/branches/main/protection` and
`GET /repos/{owner}/{repo}/collaborators` must accompany any change and must
match the committed payload.
