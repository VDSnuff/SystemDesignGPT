# Supply-chain and merge-governance validation — 1 September 2026

## Scope and decision

This record covers issue #68 at the candidate branch based on
`a604f5fd81adce6de563e00b80d8578caeab7eec`. The final pull request and
post-merge issue comment own the exact candidate SHA, CI run, protection
readback, and deployed Sites version.

The baseline full audit reported 12 findings: six high and six moderate. The
production-only audit reported zero findings. The high findings were reachable
only through the checked-in build and test toolchain, but they still execute on
developer and CI machines and therefore required remediation.

## Remediation

The focused upgrades are React and React DOM 19.2.8,
`react-server-dom-webpack` 19.2.8, Vite 8.2.2, Wrangler 4.127.1,
`@cloudflare/vite-plugin` 1.54.2, and matching Cloudflare Workers types. The
resulting full graph has zero high or critical findings; the production graph
remains clean.

Cross-engine validation also exposed Zod's default runtime capability probe,
which calls `Function()` and is reported as a strict-CSP violation by Firefox.
Application schemas now load through one configuration module that enables
Zod's supported jitless mode before parsing.

Four moderate dependency paths remain, all representing one accepted esbuild
advisory inherited through Drizzle Kit's development-only loader. The current
Drizzle Kit release has no compatible patched path; npm proposes a downgrade to
0.18.1. That downgrade is rejected because it predates the repository's schema
and migration toolchain. The exception is machine-readable in
`dependency-policy.json`, has owner `@VDSnuff`, review date 1 December 2026,
and fails CI if its source, severity, or dependency set changes.

## Enforced evidence

`npm run check:supply-chain` produces, validates, and retains:

- production and full npm audit JSON;
- a CycloneDX 1.5 SBOM for the locked graph;
- an exact license inventory checked against the reviewed expressions; and
- a summary that fails on every high or critical finding, any unaccepted
  advisory, or any new license expression.

Each npm audit/SBOM command has a 60-second timeout. Registry, timeout, malformed
JSON, and policy failures exit nonzero before the previous complete evidence is
replaced. CI installs with `npm ci --no-audit`; the explicit supply-chain command
is the only audit gate, so install-time registry work cannot hide or duplicate it.

Khroma 2.1.0 omits its license field from the registry metadata and lockfile;
its packaged `LICENSE` file is MIT. The exact name/version override is recorded
in the policy, so another missing-license package still fails the gate.

Dependabot tracks both npm and GitHub Actions weekly. GitHub Actions are pinned
to immutable commit SHAs, run with read-only repository contents, and do not
persist checkout credentials. Browser retries are disabled, while a scheduled
production-build matrix runs Chromium, Firefox, and WebKit plus repeated
Chromium critical journeys. Failed runs retain traces, screenshots, reports,
and supply-chain evidence without application secrets or user content.
The matrix serves the built Worker with a fresh migrated Miniflare D1 database;
it does not substitute Vinext's Node server for Cloudflare-bound API modules.
WebKit keyboard checks use Safari's full-keyboard-access chord (`Option+Tab`)
for links and buttons; Chromium and Firefox use `Tab`.

## Required `main` governance

`.github/branch-protection.json` is the exact desired REST payload. It requires
the deterministic and responsive-browser checks on an up-to-date branch,
requires pull requests and resolved review conversations, applies to the owner,
forbids force pushes and deletion, and requires linear history. A read-only API
capture after applying the policy is required before #68 can close.

Repository security settings must also show dependency alerts, automated
security fixes, private vulnerability reporting, secret scanning, and push
protection enabled. The issue closeout comment records the live readback rather
than treating these committed files as proof of repository state.

## Boundaries

Scheduled Firefox/WebKit evidence strengthens CI governance but does not close
the physical-device and full compatibility matrix owned by #65. License review
is an engineering distribution policy, not legal advice. The accepted moderate
Drizzle Kit path must be re-reviewed by its date or earlier when an upstream
release changes the audit graph.
