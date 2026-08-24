# System Design Studio

An interactive edition of the System Design Checklist Book. Every handbook page includes a contextual design copilot that knows the current chapter and the complete site map. The diagram workshop lets readers place components, connect dependencies, and reason about boundaries and failure paths.

## Run locally

Requirements: Node.js 22.13 or newer and an `OPENAI_API_KEY` in `.env.local`.

```bash
npm install
npm run dev
```

The OpenAI key is read only by the server route. It is never sent to the browser or committed to Git.

## Verify

```bash
npm run lint
npm run build
```

The source handbook is preserved in `docs/System_Design_Checklist_Book.md`.
