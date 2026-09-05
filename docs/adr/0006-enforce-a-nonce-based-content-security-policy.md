# ADR-0006: Enforce a nonce-based Content Security Policy

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

The server-rendered application needs inline framework scripts, while Mermaid
emits diagram styles and React uses inline style attributes in bounded places.
A static permissive policy would weaken script protection; a static strict
policy would break the current runtime and diagrams.

## Decision

Generate a fresh server nonce for every request, authorize scripts only through
that nonce, and reject caller-selected CSP headers. Allow style elements through
the nonce and the reviewed Mermaid hashes. Retain `style-src-attr 'unsafe-inline'`
as the sole unsafe-inline exception. Apply non-CSP security
headers to static assets as well.

## Alternatives considered

- **Permit unsafe inline scripts:** Avoids nonce plumbing but materially expands
  the script-injection surface.
- **Use only static hashes:** Is brittle for framework-generated scripts and
  request-specific runtime output.
- **Block every inline style:** Is stricter but incompatible with current React
  and Mermaid output without a broader rendering rewrite.

## Consequences

- Caller-controlled policies cannot relax the response, and inline scripts need
  a server-authorized nonce.
- Mermaid hash changes and inline-style usage are explicit maintenance costs;
  production smoke must catch an incomplete policy rollout.

## Evidence

- [CSP policy](../../app/security-headers.ts)
- [Per-request nonce proxy](../../proxy.ts)
- [Security contract tests](../../tests/security-contracts.test.ts)
- [Production smoke contract](../../scripts/check-production-smoke.mjs)

## Supersession rule

Review this ADR when the renderer stops requiring inline scripts or styles,
Mermaid changes its emitted CSS, or Sites supplies a different CSP mechanism.
Changing trust sources or adding another unsafe directive requires a superseding
ADR and security regression evidence.
