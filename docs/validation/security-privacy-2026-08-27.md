# Security and privacy validation — 2026-08-27

## Verdict

The repository baseline at `ced51ca8f8a0062f9f0d7c6355afa2bfef961478`
received a complete Codex Security source review across all 163 tracked files.
The scan found six medium-severity issues and no high or critical issue. This
change remediates the six findings with shared D1 quotas, authenticated
same-origin chat, bounded JSON parsing, deletion/retention controls, pagination,
log minimization, and browser security headers.

The security implementation can be merged after deterministic, browser, CI,
and migration gates pass. Full release validation remains `BLOCKED` because no
approved synthetic user A, user B, and owner credentials were available for the
required hosted positive-isolation matrix. That absence is not treated as either
a pass or a vulnerability.

## Threat model

### Assets

- OpenAI provider credentials, model budget, and availability.
- Sites-authenticated user IDs and emails.
- Private notes, diagrams, quiz answers, reading progress, and checklist state.
- Email-linked learning comments and the owner moderation capability.
- D1 availability, storage capacity, migrations, and deletion guarantees.
- Runtime logs, CI failure artifacts, and the integrity of generated handbook
  content.

### Actors and starting capabilities

| Actor | Starting capability | Must not gain |
| --- | --- | --- |
| Guest | Read public pages and chat status. | Provider spend, D1 data, or owner actions. |
| Signed-in learner | Use chat; read/write/delete only their learning records; submit and withdraw their comments. | Another learner's records or owner comment access. |
| Owner | Learner capabilities plus list, moderate, and delete comments. | Platform, repository, or D1 administration. |
| External site | Cause ordinary browser requests. | Cross-origin mutation or provider spend. |
| Provider | Return untrusted model text. | D1, browser execution, or application tools. |
| Operator | Deploy and administer configured resources. | Undocumented access or indefinite retention. |

### Trust boundaries and controls

| Boundary | Data or authority | Enforcing control |
| --- | --- | --- |
| Browser → Sites edge | Identity headers | Sites must strip caller values and inject the authenticated principal. Exact-version negative probes verify caller values are rejected. |
| Browser → mutation APIs | JSON and session authority | Exact origin comparison, authenticated identity, JSON-only media type, and streamed byte ceilings. |
| API → D1 | User data and quota decisions | User-derived keys, Drizzle-bound queries, atomic D1 rate windows, retention cleanup, and scoped deletion. |
| API → OpenAI | Page context and bounded conversation | Signed-in user, same-origin request, D1 user/global quota, fixed HTTPS endpoint, bounded input/output, and `store: false`. |
| Owner → comments | Cross-user comment visibility | Authenticated email equals server-side `SITE_OWNER_EMAIL`; list is paginated and deletion remains owner-only or submitter-only. |
| Repository content → browser | Markdown and Mermaid SVG | Repository-only generation, React text escaping, and Mermaid strict mode. |
| Runtime → logs | Failure metadata | Stable event name plus non-email identifiers only; raw error objects, prompts, bodies, and provider payloads are excluded. |

### Abuse paths

- Forged identity headers: the production edge must remove or overwrite them.
- Cross-site chat submission: blocked before quota or provider access.
- Oversized or content-type-confused JSON: rejected before full materialization.
- Distributed provider abuse: D1 atomically counts per-user and global windows.
- Comment flooding: D1 user/global windows, a retained-row cap, expiry, and owner
  pagination prevent one learner from burying the inbox indefinitely.
- Stored/reflected XSS: learner and provider strings render as React text;
  repository-authored Mermaid is the only reviewed HTML sink.
- Prompt injection: model text has no tool, D1, owner, or navigation capability.
- Retention risk: users can delete their own learning state and progress; comment
  submitters and the owner can delete permitted comments; comments expire after
  180 days during comment activity.

## Baseline findings and remediation

| Severity | Baseline finding | Remediation in this change |
| --- | --- | --- |
| Medium | Cross-origin `text/plain` could reach a paid provider call. | Chat requires signed-in identity, exact origin, and JSON. |
| Medium | Chat parsed and traversed unbounded request bodies before limiting. | Streamed 32 KiB ceiling and bounded history candidates. |
| Medium | Chat quota lived in a process-local unbounded `Map`. | Atomic D1 user/global windows with expired-row cleanup. |
| Medium | Authenticated comment submission had no durable quota. | Atomic daily user/global windows, 20 retained rows per user, expiry, and pagination cursor. |
| Medium | Learning state and progress had no deletion lifecycle. | Same-origin authenticated `DELETE` handlers keyed only by the trusted user ID. |
| Medium | Email-linked comments could not be deleted or expired. | Submitter-scoped/owner deletion plus 180-day expiry. |

The conditional high identity-header candidate was rejected for the tested
deployment: Sites version 27 maps to the scanned SHA, and unauthenticated
requests carrying synthetic learner or owner identity headers still returned
HTTP 401. This proves negative spoof resistance for that deployed edge path; it
does not replace positive user A/user B/owner tests.

## API security contract

| Route/method | Guest | Learner | Owner | Origin/body control | Data scope |
| --- | --- | --- | --- | --- | --- |
| `GET /api/chat` | Status only | Status only | Status only | No body | No secret value returned |
| `POST /api/chat` | 401 | Allowed within D1 quotas | Allowed within D1 quotas | Same-origin, JSON, 32 KiB | Fixed page context and bounded chat only |
| `GET /api/learning-state` | 401 | Own page | Own page | Query uses known page | `(user_id, page_slug)` |
| `PUT /api/learning-state` | 401/403 | Own page | Own page | Same-origin, JSON, 32 KiB | Trusted `user_id` only |
| `DELETE /api/learning-state` | 401/403 | Delete all own rows | Delete all own rows | Same-origin | Trusted `user_id` only |
| `GET /api/handbook-progress` | 401 | Own row | Own row | No body | Trusted `user_id` only |
| `PUT /api/handbook-progress` | 401/403 | Own row | Own row | Same-origin, JSON, 16 KiB | Trusted `user_id` only |
| `DELETE /api/handbook-progress` | 401/403 | Delete own row | Delete own row | Same-origin | Trusted `user_id` only |
| `GET /api/learning-comments` | 401 | 403 | Paginated list | Valid optional cursor | Latest 100 per page |
| `POST /api/learning-comments` | 401/403 | Quota-bound submit | Quota-bound submit | Same-origin, JSON, 8 KiB | Stores submitter identity |
| `PATCH /api/learning-comments` | 401/403 | 403 | Status update | Same-origin, JSON, 8 KiB | Valid comment UUID |
| `DELETE /api/learning-comments` | 401/403 | Own comment | Any comment | Same-origin, JSON, 8 KiB | Submitter or owner predicate |

No application response emits permissive CORS headers. Unsupported media types
return 415; oversized bodies return 413; malformed or schema-invalid JSON
returns 400; quota failures return 429; quota-store failures fail closed before
provider or comment writes.

## Production header policy

The application applies its shared header set through the Next/Vinext proxy and
`next.config`, with a Cloudflare `_headers` fallback for static assets. The
proxy is required because the Cloudflare asset path can bypass application
route headers for a prerendered page. The application requires:

- Content Security Policy: self by default; no objects; same-origin forms and
  connections; framed only by self or ChatGPT; HTTPS upgrades.
- HSTS for one year without claiming control of the shared parent domain.
- `nosniff`, strict-origin-when-cross-origin referrers, and disabled camera,
  geolocation, and microphone capabilities.
- `Cache-Control: no-store` on application API responses.

The CSP retains inline script and style compatibility required by the current
Next/Vinext runtime. Tightening that allowance requires nonce support and a
separate browser compatibility change.

## Privacy and retention

| Data class | Purpose | Retention | Deletion |
| --- | --- | --- | --- |
| Learning state | Resume notes, diagrams, and quizzes. | Until the learner deletes it or the account/data store is decommissioned. | Authenticated same-origin delete removes every row for that user. |
| Handbook progress | Resume reading and checklist state. | Until learner deletion or account/data-store decommissioning. | Authenticated same-origin delete removes the user's row. |
| Learning comments | Deliver feedback to the owner. | At most 180 days during normal comment activity; operational backups may follow platform retention. | Submitter can delete their comment; owner can purge any comment. |
| Rate-limit counters | Protect provider budget and comment availability. | User-scoped opaque ID and counters are removed after 24 hours of inactivity. | Automatic cleanup runs with quota decisions. |
| Chat request | Generate one response. | Not stored by this application; provider request sets `store: false`. | No application record exists. Provider operational retention remains external. |
| Runtime logs | Diagnose failures. | Platform policy remains to be documented. | Application emits no email, prompt, comment body, provider body, or raw error object. |
| CI artifacts | Diagnose mocked browser failures. | Seven days. | GitHub artifact expiry; tests use synthetic data and no production secrets. |

Restored backups can reintroduce previously deleted rows. Any restore runbook
must replay deletion requests or document the platform's backup-erasure
guarantee before claiming complete erasure across backups.

## Sanitized hosted evidence

All probes were read-only or intentionally invalid and used `.invalid`
synthetic identities. No real user record, provider prompt, paid provider call,
or D1 write was created.

| Probe on Sites version 27 | Result | Interpretation |
| --- | --- | --- |
| Guest learning state/progress/comments reads | 401 | Signed-out denial only. |
| Synthetic learner headers on learning state | 401 | Caller identity values were stripped or ignored. |
| Synthetic owner headers on comment list | 401 | Caller owner values were stripped or ignored. |
| Foreign-Origin `text/plain` chat with nonexistent page | 400 `page_not_found` | Baseline parsed cross-origin body; no provider call occurred. |
| Root response headers | Required browser headers absent on baseline | Remediated in application configuration; production readback required after deployment. |
| Cloudflare cookie | HttpOnly, Secure, SameSite=None | Platform bot-management cookie; not an application session guarantee. |

## Evidence and remaining gates

- Authoritative scan ID: `3452a3df-136f-4790-8d67-85f18821ec99`.
- Scan artifacts: sealed manifest, six findings, coverage, Markdown report, and
  SARIF were generated by Codex Security for the baseline SHA.
- Automated contracts cover authentication, origin, media type, byte limits,
  malicious history roles, user-key isolation, owner authorization, deletion,
  quota decisions, provider error redaction, and response-header configuration.
- D1 migration `0002` creates the shared atomic quota table and expiry index.
- A local Cloudflare Worker smoke applied all three migrations, then verified
  the required headers on `/` and `/api/chat`, signed-out/learner chat status,
  foreign-origin rejection, an authenticated nonexistent-page request without
  a provider call, five successful comment writes followed by a shared D1 429,
  submitter comment deletion, and progress save/deletion.
- The full dependency audit remains owned by #68; production dependencies are
  evaluated separately by the release manifest.

Still unverified for #60:

1. Positive hosted user A, user B, and configured-owner behavior with approved
   synthetic accounts.
2. Bounded concurrent production proof that multiple requests share the same
   deployed D1 quota decision.
3. Sanitized hosted log readback and the platform log retention/access policy.
4. Production readback of the new security headers and deletion/migration
   behavior after an approved deployment.

No pass is inferred for those boundaries. They must be recorded against the
exact deployed revision and Sites version before #60 can close.
