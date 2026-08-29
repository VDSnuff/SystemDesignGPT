# Product journeys and route inventory — 2026-08-29

## Result

- Domain: content integrity and functional UI
- Owner issue: #63
- Domain result: `PASS`
- Implementation commit: `7687c3e9bf79e9e5e9113a5b5e51261d40219094`
- Branch: `codex/issue-63-complete-journey-evidence`
- Overall release verdict: not evaluated here; issue #70 owns that decision.

The current source registries, deterministic fixtures, and Chromium browser
matrix exercise the complete public UI inventory without a content, route,
console, resource, hydration, or page-overflow failure. This result proves the
mocked-browser and local-build boundaries only. It does not substitute for the
hosted identity, D1, provider, multi-engine, physical-device, or operational
workstreams.

## Run identity

| Field | Value |
| --- | --- |
| Date / timezone | 2026-08-29 / Europe/Warsaw |
| Platform | Darwin 25.6.0 arm64 |
| Node / npm | Node 22.22.3 / npm 10.9.8 |
| Lockfile SHA-256 | `0857d460f02201e6e8c29bc98c2ff4092abd5e39f11471bc79ed312a92700e27` |
| Browser boundary | Playwright Chromium against the local Vinext development server |
| Data/provider boundary | Deterministic synthetic fixtures; no account credential, hosted write, or paid provider call |

## Inventory proof

The validation manifest remains derived from the application registries and
fails when routes or test files drift. Browser coverage now visits 51 unique UI
URLs at the 320 CSS-pixel reflow width:

| Surface | Expected | Exercised | Result |
| --- | ---: | ---: | --- |
| Quick Guide | 18 | 18 | `PASS` |
| Canonical handbook | 31, including `/` | 31 | `PASS` |
| Additional UI shells | 2: workshop and owner comments | 2 | `PASS` |
| Intentional not-found routes | 2 | 2 | `PASS` |

Every public UI route returned HTTP 200, exposed one expected H1, remained
within the page viewport, and produced no unexpected console error, uncaught
page exception, or failed resource. Both intentional missing routes returned
HTTP 404 with the custom not-found heading.

Existing content contracts additionally prove unique slugs, checklist IDs,
heading anchors, canonical handbook links, evidence references, source links,
public assets, and generated-content stability. All nine source-authored
Mermaid diagrams retain browser coverage for rendered output or the readable
fallback contract.

## Journey proof

| Actor/surface | Exercised behavior | Result |
| --- | --- | --- |
| Guest | Signed-out persistence messaging, uninterrupted reading, local completion, and editable unsaved notes | `PASS` |
| Synthetic learner | Section completion, checklist state, authored quiz answers, private note, owner feedback, save, and reload | `PASS` |
| Owner fixture | Empty/error states, new/read toggles, repeated update, pagination, stale-page deduplication, and deletion | `PASS` |
| Navigation | Canonical guide-to-book link, back, forward, refresh, exact heading deep link, and fresh-tab load | `PASS` |
| Workshop | Responsive canvas reachability plus keyboard create, rename, connect, move, delete, undo, and save | `PASS` in the existing browser suite |
| Search | Guide and handbook heading anchors, keyboard selection, and lazy-corpus failure recovery | `PASS` in the existing browser suite |

The owner pagination exercise reproduced one functional defect: a stale next
page could append a comment ID already present in the current list. The client
now admits only unseen IDs, and the regression test proves the existing card is
not duplicated before subsequent updates or deletion.

## Command evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test` | `PASS` | 28 files, 122 tests |
| `npm run lint` | `PASS` | Exit 0 |
| `npm run check:generated` | `PASS` | 31 canonical sections regenerated with no drift |
| `npm audit --omit=dev --audit-level=high` | `PASS` | 0 production vulnerabilities |
| `npm audit --audit-level=high` | `FAIL` outside this domain | 12 development-toolchain advisories: 6 moderate, 6 high; owned by #68 |
| `npm run build` | `PASS` | Vinext production build completed; existing large-chunk warning remains owned by #66 |
| `npm run test:e2e` | `PASS` | 75 Chromium browser contracts, no retry required locally |
| `npm run check:links` | `PASS` with explicit unavailable endpoints | 95 external links passed, 0 failed, 2 unverified; 5 unit link contracts and 3 browser link contracts passed |
| `git diff --check` | `PASS` | Exit 0 |

The two unverified external endpoints were the ISO/IEC/IEEE 29148 page, which
returned HTTP 403 to the checker, and a VLDB PDF whose network fetch failed.
Neither produced a terminal broken-link response, so they remain `UNVERIFIED`
rather than being mislabeled as passing or failing.

## Proof limits

- Hosted user A/user B/owner identity and positive authorization remain owned
  by #60 and #61; deterministic fixtures do not prove the Sites identity edge.
- Hosted D1 durability, isolation, backup, and restore remain owned by #61.
- Real-provider quality, usage, and hosted abuse ceilings remain owned by #62.
- Firefox, WebKit, physical devices, and additional assistive technology remain
  owned by #64 and #65.
- The full development dependency audit remains failing under #68.
- Exact Sites version provenance, rollback, restore, and production observation
  remain owned by #69 and the final release gate.

Within those declared limits, issue #63's route, content, search, navigation,
learning, workshop, owner-review, error-state, and browser-diagnostic contracts
are terminal and passing on the recorded implementation revision.
