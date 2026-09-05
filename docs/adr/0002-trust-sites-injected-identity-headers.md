# ADR-0002: Trust Sites-injected identity headers

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

Hosted persistence, comments, owner actions, and copilot access need a stable
server-side identity. OpenAI Sites supplies authenticated user headers at the
trusted edge. The application cannot safely accept identity from request bodies,
query parameters, or caller-selected headers outside that edge contract.

## Decision

Derive identity on the server from both `oai-authenticated-user-id` and
`oai-authenticated-user-email`. Treat a missing value as signed out, derive
ownership from the configured owner email, and require same-origin requests for
state-changing routes. Local tests may inject synthetic headers, but only a
pinned hosted Sites run can prove the production identity boundary.

## Alternatives considered

- **Application-managed sessions:** Gives the application full identity
  ownership but duplicates the Sites sign-in lifecycle and secret handling.
- **Client-supplied identity fields:** Simpler to prototype but permits
  impersonation and cross-user access, so it is never an acceptable boundary.

## Consequences

- Route handlers share a small identity contract and never take a user ID from
  mutable JSON state.
- Production correctness depends on Sites stripping caller values and injecting
  verified headers; mocked tests and signed-out smoke checks cannot prove that.

## Evidence

- [Authenticated-user boundary](../../app/authenticated-user.ts)
- [Security and privacy validation](../validation/security-privacy-2026-08-27.md)
- [Hosted-evidence limitations](../validation/README.md)
- [Identity contract tests](../../tests/handbook-progress-handlers.test.ts)

## Supersession rule

Review this ADR when the Sites identity contract changes or the application
adopts another authentication authority. Replacing the trusted edge, header
names, principal key, or owner model requires a superseding ADR and hosted
negative spoofing plus multi-user isolation evidence.
