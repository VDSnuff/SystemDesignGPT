# ADR-0005: Keep Responses API access server-side

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

The page-aware copilot needs a provider secret, trusted handbook context, input
bounds, per-user and global quotas, failure normalization, and auditable usage
metadata. A browser-to-provider request would expose credentials and let callers
bypass those controls.

## Decision

Call the OpenAI Responses API only from the `/api/chat` server route. Use the
server-held key, derive identity at the trusted boundary, enforce same-origin
and size/history limits, apply persistent quotas, set `store: false`, bound the
request timeout, and return only normalized answer and usage metadata.

## Alternatives considered

- **Call the provider from the browser:** Reduces server code but exposes the
  key or requires a separate ephemeral-token architecture and duplicates policy.
- **Add a provider SDK:** Provides convenience helpers but adds a runtime
  dependency without changing the small HTTP contract currently required.

## Consequences

- Secrets and policy enforcement remain outside the browser, and provider
  failures have a stable application contract.
- The route owns provider schema parsing and must be updated when the Responses
  API contract, model policy, storage terms, or quota behavior changes.

## Evidence

- [Server chat route](../../app/api/chat/route.ts)
- [Copilot evaluation runbook](../validation/copilot-evaluation.md)
- [Provider boundary tests](../../tests/chat-route.test.ts)
- [Local secret boundary](../../README.md)

## Supersession rule

Review this ADR when provider access moves to another service, the application
supports multiple providers, or the Responses API/storage contract changes. A
browser-side provider call or new trust boundary requires a superseding ADR and
a threat-model update.
