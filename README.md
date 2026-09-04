# System Design Studio

An interactive edition of the System Design Checklist Book. All 31 top-level sections are generated directly from the canonical Markdown, including tables, checklists, code, Mermaid diagrams, evidence references, and source links. Every handbook page includes a contextual design copilot that knows the current section and complete site map. The diagram workshop lets readers place components, connect dependencies, and reason about boundaries and failure paths.

The product, handbook, and support contract are currently English-only.
Localization is possible future work, not a committed requirement; the boundary
and implications are documented in [the localization policy](docs/localization-policy.md).

The product does not use page-view or behavioral analytics. Learning-outcome
decisions and the privacy gate for any future measurement are defined in the
[product metrics policy](docs/product-metrics.md).

## Run locally

Requirements: Node.js 22.13 or newer and an `OPENAI_API_KEY` in `.env.local`.

```bash
npm install
npm run dev
```

The OpenAI key is read only by the server route. It is never sent to the browser or committed to Git.

## Verify

```bash
npm test
npm run typecheck
npm run lint
npm run check:generated
npm run check:supply-chain
npm run build
npm run test:e2e
```

The deterministic suite mocks the OpenAI and persistence boundaries. It does not
require network access, production secrets, or a hosted database, and it never
makes a paid provider call. `check:generated` regenerates the canonical handbook
module and fails when the committed output has drifted.

The quiz suite validates all 31 canonical section policies, authored answer contracts, handbook anchors, deterministic scoring, retry behavior, and the versioned invalidation of legacy generated answers. Quiz content lives outside the generated handbook module in `app/quiz-content*.ts`.

The diagram workshop also has real-browser coverage at mobile, tablet, and desktop widths:

```bash
npx playwright install chromium
npm run test:e2e
```

Browser tests start the local app, mock authenticated persistence and provider
requests, and cover representative handbook routes, the mobile copilot, quizzes,
and the workshop at mobile, tablet, and desktop widths. CI runs the same commands
on pull requests and pushes to `main`; failed browser runs retain screenshots,
traces, and an HTML report without production secrets or user content.

The scheduled production-build matrix runs Chromium, Firefox, and WebKit with
zero retries. Run it locally after `npm run build` with
`npm run test:e2e:cross-browser`.

The source handbook is preserved in `docs/System_Design_Checklist_Book.md`.
