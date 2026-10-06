# AGENTS.md

Operating manual for AI coding assistants in this repo.

<!-- BEGIN:unified-agents-roster -->

## Unified agent roster

This repo participates in the **unified SkepticFlow agent set**: 13 canonical
roles shared across `~/Developer/GitHub/`, adapted for this stack (Vinext + React 19 + TypeScript on Cloudflare Workers with D1).
This profile enables **13** role(s), listed below.

Each role is materialized for three runtimes:

| Runtime | Location | How to invoke |
|---|---|---|
| **Claude Code** | `.claude/agents/<role>.md` | `claude` picks them up automatically; reference by name in prompts |
| **GitHub Copilot** (VS Code) | `.github/agents/<role>.agent.md` | Open Copilot Chat → agent picker → select role |
| **Codex** | `.codex/agents/<role>.toml` | Ask Codex to use or spawn the role by name |
| **Generic agents** | This file (`AGENTS.md`) | Adopt the closest matching role below and follow the shared defaults |

### Roles

- **`orchestrator`** — Default entry point; routes each task to the right specialist role below.
- **`dev`** — Default agent for implementing features and modifying code.
- **`devops`** — CI/CD, infrastructure, deploys, observability, secrets.
- **`code-reviewer`** — Reviews staged or proposed changes for correctness, style, and conventions.
- **`security-reviewer`** — Audits changes for OWASP Top 10, secrets, auth, and EU AI Act / GDPR compliance.
- **`architect`** — Design decisions across modules; produces short decision records.
- **`qa-tester`** — Test strategy, coverage gaps, flake reduction. Writes the missing tests.
- **`debugger`** — Reproduces a bug, locates root cause, ships a regression test.
- **`refactorer`** — Reduces complexity in code that is correct but hard to maintain.
- **`docs-writer`** — Maintains README, CLAUDE.md, AGENTS.md, and inline docs for public APIs.
- **`data-engineer`** — Schema design, migrations, query performance, data integrity.
- **`product-manager`** — Scopes features against the sprint plan; writes user stories with acceptance criteria.
- **`performance-tuner`** — Profiles and optimises slow paths. No speculative optimization.

### Stack-specific defaults for this repo

| Key | Value |
|---|---|
| Stack | Vinext + React 19 + TypeScript on Cloudflare Workers with D1 |
| Build | `npm run build` |
| Test | `npm test` |
| Lint | npm run lint && npm run typecheck |
| Test runner | Vitest |
| E2E runner | Playwright |
| Deploy | OpenAI Sites on Cloudflare Workers |
| Secrets | Sites environment variables and GitHub Actions secrets |
| Profiler | Lighthouse / Chrome DevTools / Wrangler |
| Strategy target | none |

### Local GitHub Actions validation

If this repo has GitHub Actions validation, run its mapped local targets through
`~/Developer/GitHub/.local-actions/run.sh 'SystemDesignGPT'` after committing and
before pushing. See the launcher README for targets and prerequisites. Record
the source commit and results; local runs do not create GitHub PR checks or
replace required checks.
When adding a validation workflow with no local mapping, add safe launcher
targets and document unsupported jobs before the first push.

## Git session lifecycle

- Read-only work creates no branch. A writing task uses one identified writer and one persistent isolated worktree; reuse it when resuming the same task.
- Verify the physical checkout root and common Git directory before editing. Open projects through `~/Developer/GitHub/`; compatibility links are for existing tooling.
- Preserve unrelated dirty files, staged paths and active worktrees. Do not stash, reset, clean or commit another task's work to unblock your task.
- Stage explicit owned paths and inspect the complete index before every commit, including after a failed hook. Run required guards with hooks enabled; never use `--no-verify` or silently skip a missing guard.
- Record the revision and policy used for validation. Relevant changes invalidate that evidence; local, hosted, deployment and human checks remain separate.
- Push and merge only within the user's existing authorization or an explicitly authorized delivery workflow. Verify GitHub's actual merge state and reviewed head before declaring delivery complete.
- A pause or question does not trigger automatic commits, merges or cleanup. Hand off pending work with its branch, worktree, owner and next action.
- Retire only task-owned disposable workspaces covered by authorization after verifying exact recovery refs and needed ignored files. Preserve protected/default/release refs, active chats, dirty worktrees and uncertain ownership.
- Branch age or a matching merged PR alone never authorizes deletion. Use the read-only `Main/AgentHub/scripts/git_agent.py cleanup-plan` before separately authorized cleanup.

## MeHub personal-context protocol

- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Main/MeHub/` is the
  canonical private source for information about Viacheslav. Consult it when a
  task needs personal facts, preferences, history, working style, or tailored
  context; do not scan it for unrelated tasks.
- Start with `Index-MeHub.md` and `00-Guide-and-Source-Register.md`, then read
  only the smallest relevant topic note. Treat the material as private and
  provenance-aware. Direct user corrections outrank other sources, inferred or
  third-party claims stay labelled, and time-sensitive claims require current
  verification before external use.
- For recommendations, choices, plans, or trade-offs where personal fit matters,
  also read `25-Advice-Compass-and-Personalization-Rules.md`. Establish the
  objective baseline first, then compare personal fit, friction and risk, and a
  useful stretch option. MeHub informs the recommendation; it does not dictate it.
- Treat direct current preferences as strong signals and observed behavior as a
  soft signal. Access, purchase, search, save, or library presence does not prove
  liking, completion, or ownership. Skip MeHub for unrelated factual or
  mechanical tasks.
- Keep replies to Viacheslav short, simple, and direct. Use plain language, fewer
  words and sentences, and no unnecessary detail or formatting.
- MeHub writes are allowed without per-write confirmation, but they must never be silent.
  Save only durable, materially useful personal context; do not turn transient
  conversation or weak inference into profile clutter.
- After every write, prominently report `**MeHub updated:**` with the facts,
  source or confidence, and exact target note(s). When replacing, deleting,
  moving, renaming, or materially reclassifying existing content, report
  `**MeHub overwrite:**` with the target and a concise old-to-new summary.
- Preserve provenance and useful history instead of silently erasing superseded
  context. Delete personal history only when the user explicitly requests it.
  Calibration feedback may be saved when durable and useful, with the same
  visible notification.
- Never store passwords, tokens, recovery codes, payment data, exact identity
  numbers, or unnecessary third-party private data. If MeHub is unavailable or
  the evidence is insufficient, say so rather than inventing personal facts.

### Editing the roster

Source of truth lives in `Main/AgentHub/` (vault: `Documents/Main/AgentHub/`). Do not edit the generated role files (`.github/agents/`, `.claude/agents/`, `.codex/agents/`, or this block) by hand. To change a role across all repos, edit the template in `AgentHub/roles/<role>/`; to change this repo's values, edit `AgentHub/stacks/SystemDesignGPT.yml`. Then re-run `AgentHub/scripts/gen.py SystemDesignGPT` (or `--all`).

<!-- END:unified-agents-roster -->
