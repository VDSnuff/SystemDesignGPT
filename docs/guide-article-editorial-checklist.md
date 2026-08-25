# Quick Guide article editorial checklist

Use this checklist for each authored Quick Guide article before review. The
canonical handbook remains authoritative for technical claims and evidence IDs.

## Reader value

- The opening names the problem, the reader, and when to apply the topic.
- The article works without requiring the reader to open the complete handbook.
- Key terms are explained on first use in plain language.
- The prose teaches decisions and consequences rather than repeating a checklist.
- One end-to-end example connects requirements, decisions, failure behavior, and verification.
- A comparison states when each option fits and what it costs.
- A failure or anti-pattern section covers likely review mistakes.
- The ending gives actionable review questions.

## Evidence and boundaries

- Technical claims trace to evidence IDs already registered in the canonical handbook.
- New claims use a verified primary source added to the evidence register first.
- Provider, version, price, quota, policy, and other fast-moving facts carry a validation date and caveat.
- Examples are identified as examples; negotiated numbers are not presented as universal defaults.
- The article links to the relevant complete-handbook heading and evidence register.
- The article does not shorten, replace, or silently fork canonical Markdown.
- Repeated handbook copy is limited to the context needed for a standalone explanation.

## Accessibility and verification

- One page heading is followed by logically ordered section headings.
- Link text describes its destination without relying on surrounding prose.
- Tables have headers, remain readable in reflow, and add value over prose.
- Diagrams are used only when they clarify a relationship and include a text equivalent.
- Keyboard focus order follows reading order at desktop and mobile widths.
- Automated coverage proves the article slug, word count, headings, and canonical links.
- Representative desktop and mobile routes render without horizontal page overflow.
- `npm test`, `npm run lint`, `npm run check:generated`, `npm run build`, and `git diff --check` pass.
