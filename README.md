# System Design Studio

An interactive edition of the System Design Checklist Book. All 31 top-level sections are generated directly from the canonical Markdown, including tables, checklists, code, Mermaid diagrams, evidence references, and source links. Every handbook page includes a contextual design copilot that knows the current section and complete site map. The diagram workshop lets readers place components, connect dependencies, and reason about boundaries and failure paths.

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
npm run lint
npm run build
```

Tests mock the OpenAI boundary and never require a real API key or paid provider call.

The quiz suite validates all 31 canonical section policies, authored answer contracts, handbook anchors, deterministic scoring, retry behavior, and the versioned invalidation of legacy generated answers. Quiz content lives outside the generated handbook module in `app/quiz-content*.ts`.

The diagram workshop also has real-browser coverage at mobile, tablet, and desktop widths:

```bash
npx playwright install chromium
npm run test:e2e:diagram
npm run test:e2e:quiz
```

The source handbook is preserved in `docs/System_Design_Checklist_Book.md`.
