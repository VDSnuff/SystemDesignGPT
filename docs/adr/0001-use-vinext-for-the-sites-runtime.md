# ADR-0001: Use Vinext for the OpenAI Sites runtime

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owners:** Repository maintainers

## Context

The application uses the Next.js App Router and React Server Components but is
built for the OpenAI Sites Vite and Cloudflare Worker toolchain. A compatibility
adapter is required between those contracts. Vinext is a beta dependency, so
uncontrolled upgrades can change routing, rendering, or build behavior.

## Decision

Use Vinext as the App Router adapter and pin its exact beta version. Compose it
with the Sites and Cloudflare Vite plugins, and require the repository's build,
browser, and production-smoke gates before an upgrade is accepted.

## Alternatives considered

- **Conventional Next.js hosting:** Mature, but does not use the repository's
  documented Sites build, binding, and deployment path.
- **A custom Vite/RSC adapter:** Removes the beta dependency but makes the
  repository responsible for framework compatibility and routing semantics.

## Consequences

- App Router conventions remain the application programming model while Sites
  can package the Worker and its D1/R2 bindings.
- The exact adapter version and its transitive RSC stack require explicit
  supply-chain review, clean builds, browser coverage, and rollback planning.

## Evidence

- [Vite runtime composition](../../vite.config.ts)
- [Pinned runtime dependencies and verification commands](../../package.json)
- [Supply-chain validation record](../validation/supply-chain-2026-09-01.md)
- [Sites release runbook](../operations/sites-release-runbook.md)

## Supersession rule

Review this ADR when Vinext leaves beta, changes its App Router compatibility,
or the supported Sites runtime no longer needs it. A move to another runtime
adapter or hosting model requires a superseding ADR and a proven rollback path.
