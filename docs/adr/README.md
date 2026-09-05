# Architecture decision records

Architecture decision records (ADRs) preserve choices that change system
boundaries, trust, data semantics, deployment, or long-lived maintenance cost.
Routine implementation details belong in code, tests, or the existing focused
documentation instead.

## Decision index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-use-vinext-for-the-sites-runtime.md) | Accepted | Use Vinext for the OpenAI Sites runtime |
| [0002](0002-trust-sites-injected-identity-headers.md) | Accepted | Trust identity only at the Sites-injected header boundary |
| [0003](0003-use-opaque-revisions-for-d1-writes.md) | Accepted | Use opaque revisions for D1 writes |
| [0004](0004-generate-the-site-from-canonical-markdown.md) | Accepted | Generate the site from canonical Markdown |
| [0005](0005-keep-responses-api-access-server-side.md) | Accepted | Keep Responses API access server-side |
| [0006](0006-enforce-a-nonce-based-content-security-policy.md) | Accepted | Enforce a nonce-based Content Security Policy |
| [0007](0007-load-mermaid-near-the-viewport.md) | Accepted | Load Mermaid near the viewport through its public API |

## Lifecycle

Start from [the template](template.md) and use the next four-digit number. An
ADR begins as `Proposed` when approval or implementation is pending and becomes
`Accepted` only when it describes the repository's current contract. Do not
rewrite an accepted decision to hide history. Mark it `Deprecated` when it is
no longer recommended but still present, or `Superseded by ADR-NNNN` when a new
decision replaces it; link both records.

The pull request that changes an architectural boundary must update its current
ADR or add the superseding ADR. This applies in particular to the runtime
adapter, identity trust, persistence conflict semantics, generated handbook
pipeline, provider boundary, CSP model, and Mermaid loading strategy. Evidence
links should point to authoritative code, tests, or focused documentation rather
than duplicate those sources inside the ADR.
