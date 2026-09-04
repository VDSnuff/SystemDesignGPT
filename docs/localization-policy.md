# Language and localization policy

## Current support

System Design Studio supports English only. This applies to the interface,
canonical handbook, Quick Guides, glossary terms, diagrams, quizzes, metadata,
and copilot context. Content in another language is not currently authored,
reviewed, evaluated, or covered by the release gates.

Localization is future work, not a committed product requirement or release.
No runtime internationalization dependency should be added until a concrete
target language, owner, quality bar, and delivery milestone exist. A target
language must include editorial and technical validation; machine translation
alone is not a supported edition.

## Decision trigger

Reconsider localization only when a product requirement names at least one
target language and defines:

- an accountable language owner and qualified reviewer;
- the translated surface and whether the edition must match English coverage;
- terminology, accessibility, search, quiz, and copilot quality gates;
- a release, update, fallback, and withdrawal policy; and
- evidence that expected reader value justifies ongoing editorial work.

Until then, preserve the English contract and avoid speculative translation
frameworks, locale negotiation, duplicate content trees, or generated catalogs.

## Future architecture boundary

### Routing

Keep current English URLs stable. A future language edition needs an explicit
URL strategy, locale switch behavior, fallback policy, and redirect plan.
Route identity and stored learning progress must not depend on translated
labels. Decide whether English remains unprefixed or moves under a locale prefix
before publishing another indexable edition; do not infer language from an
account or browser header in a way that changes a shared URL unexpectedly.

### Metadata and discovery

Each published locale needs its own page title, description, social image text,
HTML language, canonical URL, sitemap entries, and reciprocal `hreflang` links.
Search indexing must expose only reviewed editions. Missing translations must
fall back deliberately without claiming that fallback pages belong to the
requested language.

### Generated content

The English canonical handbook remains the source of truth today. A localized
edition needs a defined source format and generator inputs per locale, stable
section identifiers independent of translated headings, and drift checks that
fail when source revisions leave translations stale. Generated TypeScript is
never edited by hand. Search indexes, learning paths, checklist identifiers,
and progress mappings must be regenerated and validated for every locale.

### Glossary

System design concepts need stable semantic identifiers with localized display
terms, definitions, aliases, and disambiguation notes. Do not use an English or
translated label as the storage key. A language reviewer must resolve terms
that have no direct equivalent and keep cross-links consistent with the
handbook edition.

### Diagrams

Diagram labels, legends, examples, accessible names, and text alternatives are
translatable content. Layout validation must cover text expansion, wrapping,
right-to-left direction when relevant, keyboard use, and readable exports.
Persist diagram structure with language-neutral component identifiers so a
translated label does not break saved work.

### Quizzes

Questions, answers, explanations, and review links require human review in each
language. Scoring identifiers and saved attempts must remain language-neutral,
while content versions must invalidate attempts when meaning changes. Release
tests must verify answer correctness, source anchors, and ambiguity in the
actual target language rather than assuming parity with English strings.

### Copilot context

The copilot must receive the selected handbook edition and an explicit response
language. Prompts, safety behavior, citations, refusal paths, and evaluation
fixtures need per-language review. Provider multilingual capability is not
proof of product support: grounding, terminology, failure behavior, latency,
and cost must pass the same evidence standard as English before launch.

## Change control

A future localization proposal should update this policy before implementation,
record the chosen routing and fallback decisions, and add acceptance tests for
every new locale. Until that proposal is approved, English remains the only
supported language and the dependency set remains unchanged.
