# Evidence freshness workflow

`docs/evidence-freshness.json` is the review ledger for fast-moving handbook evidence. It supplements the dated `PASS / PASS` edition snapshot in the canonical handbook; it does not replace it.

## Review sequence

1. Run `npm run check:external-links`. Record automated reachability for every tracked source. `UNVERIFIED` means a browser check is required, not that the source passed.
2. Open each tracked source in a browser. Confirm the canonical page, redirect target, edition, and lifecycle status.
3. Read the source and compare it with the handbook claims. Record the independent semantic result and a concise summary.
4. Set `lastChecked`, `reviewAfter`, and the event-driven `nextReviewTrigger`. Chapters 15–17 and monthly sources use a 30-day review window; stable paid standards use up to 90 days.
5. Run `npm run check:evidence-freshness` and include its three-layer report in review evidence.

The owner is accountable for both the calendar date and the event trigger. A release, replacement edition, roadmap delivery, lifecycle warning, SDK behavior change, or security-taxonomy change starts a review even if `reviewAfter` has not arrived.

## Material changes

When a source no longer supports the handbook:

1. Open a focused GitHub issue describing the affected claim and source.
2. Set `semantic.result` to `ACTION_REQUIRED` and add the issue URL as `semantic.contentIssue`.
3. Update only `docs/System_Design_Checklist_Book.md`, then run `npm run generate:book`. Never hand-edit generated handbook files.
4. Return the semantic result to `CURRENT` only after the canonical content and generated artifacts are updated and reviewed.

The freshness check remains blocking while any source is `ACTION_REQUIRED`, including when an issue exists. This prevents an actionable change from being recorded and then silently treated as green.
