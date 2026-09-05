# ADR-0007: Load Mermaid near the viewport through its public API

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

Mermaid provides editable architecture diagrams but its published parser forms
a large optional JavaScript chunk. Most routes and handbook sections do not need
it. The package does not expose a supported smaller renderer entry point, and a
private deep import would couple the application to undocumented internals.

## Decision

Render diagrams in the browser with Mermaid's public entry point only after a
stable placeholder approaches the viewport. Use strict Mermaid security, retain
a readable source and text-description fallback, and keep the parser out of
non-diagram initial route loads.

## Alternatives considered

- **Load Mermaid with the initial application graph:** Simplifies rendering but
  charges every route for an optional feature.
- **Deep-import parser internals:** Might reduce a chunk but depends on private,
  versioned modules that Mermaid does not publish as a supported contract.
- **Render diagrams only at build time:** Reduces client JavaScript but removes
  the current runtime fallback and reusable rendering path.

## Consequences

- Non-diagram routes avoid the parser and diagrams remain accessible when
  rendering is delayed or fails.
- Diagram users still download one large lazy chunk and see a bounded rendering
  delay; the build warning remains an accepted, measured risk.

## Evidence

- [Lazy Mermaid component](../../app/components/MermaidDiagram.tsx)
- [Client bundle measurements and upstream review](../client-bundle-performance.md)
- [Mermaid component tests](../../tests/mermaid-diagram.test.tsx)
- [Performance budgets](../validation/performance-budgets.json)

## Supersession rule

Review this ADR when Mermaid exposes a supported smaller entry point, the parser
or runtime changes materially, or measured interaction and bundle budgets fail.
A private import, server renderer, or different diagram engine requires a
superseding ADR.
