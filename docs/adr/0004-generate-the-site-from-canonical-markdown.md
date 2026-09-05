# ADR-0004: Generate the site from canonical Markdown

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

The handbook appears as source documentation, rendered chapters, search data,
learning paths, checklists, and progress identifiers. Hand-maintaining each
representation would let content and navigation drift and would make stable
learning-state identifiers difficult to review.

## Decision

Keep `docs/System_Design_Checklist_Book.md` as the canonical handbook source.
Generate the committed content, search, learning, and progress TypeScript
modules from it. Never edit generated modules directly; changes begin in the
Markdown and pass the generated-diff check.

## Alternatives considered

- **Author content directly in TypeScript:** Keeps runtime data close to code
  but weakens the portable, reviewable handbook source.
- **Maintain Markdown and runtime modules separately:** Avoids generator work
  but permits silent divergence across routes, search, and saved progress.

## Consequences

- One reviewed source drives every handbook surface and CI detects generation
  drift.
- The generator and stable identifier rules are compatibility boundaries;
  source structure changes can affect URLs and persisted progress.

## Evidence

- [Canonical handbook](../System_Design_Checklist_Book.md)
- [Book generator](../../scripts/generate-book.mjs)
- [Generated-artifact manifest](../validation/manifest.json)
- [Generation contract tests](../../tests/book-generation.test.ts)

## Supersession rule

Review this ADR when the authoring source, generator, route identity, or stored
progress mapping changes. A new source of truth or incompatible identifier
scheme requires a superseding ADR and an explicit migration plan.
