import { defineGuideArticle } from "./article";

const markdown = `
## Start with the interaction promise

Real-time delivery and long-running work solve different timing problems. Real-time delivery keeps a user informed while something changes; a long-running operation lets useful work outlive one request. Apply this review when an operation may exceed the request deadline, users need updates without refreshing, or a disconnected client must later recover the same outcome.

Begin with observable requirements: how quickly must submission be acknowledged, how fresh must an update be, how long may work run, and what must survive a disconnect? A three-second calculation may belong in a synchronous request. A ten-minute export needs a durable operation record and bounded workers. A dashboard that can be ten seconds stale may need polling, not a fleet of persistent connections.

Do not move work behind a queue merely because asynchronous architecture sounds scalable. It introduces accepted-but-incomplete states, duplicate handling, cancellation races, worker capacity, and recovery duties. Use it when those costs buy a required duration, isolation, or buffering property.

*Evidence: [S39 — Microsoft asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply), [S40 — Microsoft background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs).*

## Choose the update channel from the interaction

The channel should match direction, latency, frequency, client reachability, and operational capacity. Treat the options as contracts, not a ladder from old to modern.

| Choice | Appropriate when | Cost or limitation |
|---|---|---|
| Polling | Updates are infrequent, modest staleness is acceptable, and the client can ask again. | Empty requests add load; polling intervals trade freshness against capacity. |
| Long polling | The server can hold one request until an update or timeout and updates are occasional. | Timeouts and reconnects are normal; every waiting request consumes connection capacity. |
| Server-sent events (SSE) | A browser needs an ordered server-to-client event stream over HTTP. | Communication is one-way; reconnect, event identity, buffering, and proxy behavior still need design. |
| WebSocket | Client and server both send frequent, low-latency messages over one persistent connection. | Connection lifecycle, authorization refresh, heartbeats, fan-out, and per-client backpressure become application concerns. |
| Callback or webhook | A server client has a reachable endpoint and completion can arrive later. | Delivery must be authenticated, retried, deduplicated, observed, and reconciled when the receiver is unavailable. |
| Asynchronous job plus status resource | Work exceeds the request budget and completion must survive client disconnects. | The API gains operation states, retention, cancellation, duplicate handling, and worker recovery. |

SSE provides a server-to-client event stream and reconnection behavior; WebSocket defines two-way framed communication. Neither proves that an application event was processed exactly once. Give resumable events stable identifiers and define the replay window.

*Evidence: [S39 — Microsoft asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply), [S40 — Microsoft background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs), [S41 — RFC 6455 WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html), [S42 — WHATWG server-sent events](https://html.spec.whatwg.org/dev/server-sent-events.html).*

## Define acknowledgement, progress, and terminal states

For long work, separate submission from completion. A successful acknowledgement means the system durably accepted responsibility; it does not mean the export, import, or analysis finished. Return a stable operation identifier and a status location the caller can retrieve after losing the original response.

Use a small state model such as \`queued → running → succeeded | failed | cancelled\`. Add \`cancelling\` when cancellation takes observable time, and \`expired\` when retention is part of the contract. Every state needs allowed transitions and a user-visible meaning. Progress can be a known fraction, completed units, or a named phase; false precision is worse than an honest indeterminate state.

Submission needs an idempotency identity when a timeout may hide whether the first request was accepted. The same identity and same request should return the same operation. The same identity with different work should be rejected. A retry must not silently create two exports or charge twice.

Define timeouts at three levels: the request acknowledgement budget, each worker attempt, and the operation's total useful lifetime. When the total lifetime expires, stop new attempts and record a final outcome. Retain status and results long enough for the stated client workflow, then expose expiry explicitly instead of returning an ambiguous not-found response.

*Evidence: [S39 — Microsoft asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply), [S40 — Microsoft background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs).*

## Worked example: generate a large account export

An account export usually completes within eight minutes. Submission must be acknowledged within 500 ms, duplicate clicks must create one export, users may close the browser, and completed files remain available for 24 hours. These are example requirements, not universal defaults.

1. The client sends \`POST /exports\` with idempotency key \`export-8f4\`. The API validates authorization, durably creates operation \`op-731\` in \`queued\`, and returns \`202 Accepted\` with \`Location: /operations/op-731\`. Repeating the same request returns that operation.
2. A bounded worker claims the job, records \`running\`, and writes phase progress such as \`collecting\`, \`rendering\`, and \`uploading\`. The browser polls the status resource every few seconds. If the product later needs faster updates, SSE can carry the same versioned status events without changing the operation's source of truth.
3. The browser models \`submitting → waiting → succeeded | failed | cancelled | expired\`. A network error after submission enters \`recovering\`, not \`failed\`: it repeats the idempotent submission or loads the known operation. Closing the browser changes no server state.
4. Cancellation is a request, not a promise that already committed effects vanish. The API changes \`queued\` work directly to \`cancelled\`; running work moves to \`cancelling\`, the worker checks a cancellation signal between bounded phases, removes incomplete output, and records the terminal state. A success that wins the race remains \`succeeded\` and returns its result.
5. On completion, the status resource contains the durable outcome and a short-lived download reference. After 24 hours, the result expires and the status explains that a new export is required. It never guesses that a missing file means the export failed.

Failure behavior follows the same contract. A worker crash releases its lease for a bounded retry. Invalid account state ends in a non-retryable failure. Repeated transient failure exhausts the operation budget and becomes terminal. Correlation context links the lifecycle.

Verification proves the requirements: acknowledgement latency under load, one operation for concurrent duplicate submissions, browser-close recovery, cancellation at every phase boundary, bounded retries, retained result retrieval, explicit expiry, and no orphaned partial file.

*Evidence: [S39 — Microsoft asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply), [S40 — Microsoft background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs).*

## Bound connections, fan-out, and backpressure

Persistent connections turn users into capacity. Estimate concurrent connections, reconnect bursts, messages per connection, payload size, heartbeat traffic, authentication refresh, and regional distribution. Keep connection handling separate from durable operation state so reconnecting to another gateway can resume rather than reset work.

**Fan-out** is the work of delivering one update to many clients. Bound it by audience and authorization; avoid broadcasting every event to every gateway. When one client reads slowly, **backpressure** prevents its buffer from growing without limit. Coalesce replaceable progress updates, cap per-client queues, disconnect persistently slow clients with a resumable cursor, and preserve terminal outcomes in durable status storage.

Offline clients are expected. A transient stream should improve freshness, not become the only record of truth. On reconnect, the client presents its last event identifier or reloads the status resource. If the replay window has expired, return the latest snapshot and continue from there. Degraded behavior might fall back from WebSocket or SSE to polling, reduce update frequency, or show “still processing” while durable work continues.

Observe active connections, reconnect rate, event lag, send-queue size, dropped updates, fan-out latency, worker queue age, operation duration, cancellation latency, and terminal outcomes. Alert on stale progress or overdue completion, not merely process health.

*Evidence: [S40 — Microsoft background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs), [S41 — RFC 6455 WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html), [S42 — WHATWG server-sent events](https://html.spec.whatwg.org/dev/server-sent-events.html).*

## Failure modes to challenge

- **Async by default.** A simple bounded action gains queues, status states, retries, and operations without a requirement that needs them.
- **Accepted means complete.** The API or UI reports success before a durable terminal outcome exists.
- **Progress is the source of truth.** Missing one transient event makes the client permanently wrong.
- **Reconnect starts over.** A network interruption duplicates work or loses the operation identity.
- **Cancel deletes the record.** The client cannot distinguish accepted cancellation, a completed race, failure, or expiry.
- **Unlimited connection buffers.** One slow or offline client consumes memory while producers continue sending.
- **Every update is broadcast.** Fan-out cost and authorization exposure grow with the entire audience instead of the relevant subscription.
- **Retries outlive usefulness.** Workers keep consuming capacity after the result deadline or user cancellation.
- **No result-retention contract.** Clients cannot know when a completed result is available or when to start again.

## Verify the lifecycle, not only the happy path

Test submission timeout before and after durable acceptance, concurrent duplicate requests, worker crash before and after a checkpoint, retry exhaustion, stale leases, cancellation races, result expiry, and cleanup of partial artifacts. For live channels, test idle timeout, lost heartbeats, authorization expiry, gateway restart, reconnect storms, replay-window expiry, slow consumers, bounded buffers, and polling fallback.

Run browser checks at narrow and wide viewports. Follow the page by keyboard, confirm heading order and descriptive links, and prove the comparison table reflows without page-level horizontal scrolling. Observe that disconnecting the browser does not cancel the job and that reconnecting restores the same operation.

## Real-time and long-running work review checklist

1. State acknowledgement, update freshness, completion, and retention promises separately.
2. Keep work synchronous when it reliably fits the request budget and simpler recovery is valuable.
3. Choose polling, long polling, SSE, WebSocket, callback, or status retrieval from direction and latency needs.
4. Give submissions and operations stable identities with deterministic duplicate behavior.
5. Define progress, reconnect, resume, cancellation, timeout, failure, expiry, and result retrieval semantics.
6. Bound workers by downstream capacity and connections by gateway, client, and fan-out limits.
7. Keep durable status authoritative when transient update channels disconnect or overflow.
8. Measure user-visible freshness and completion plus queue, connection, fan-out, and backpressure signals.
9. Test every race and recovery path with observable final state.

## Review questions

1. What requirement makes this interaction synchronous, streamed, callback-based, or job-based?
2. What does acknowledgement guarantee, and where is that promise stored durably?
3. How does a client recover the same operation after an ambiguous timeout or disconnect?
4. Which state transitions are terminal, and what happens when completion races cancellation?
5. How much progress precision is truthful and useful to the user?
6. What bounds worker concurrency, live connections, fan-out, and slow-client buffers?
7. What can an offline client replay, and what happens after that replay window expires?
8. Which tests prove the result survives failure and remains retrievable for the promised period?

Continue in the complete handbook at [6A. Real-Time and Long-Running Work](/book/6a-real-time-and-long-running-work) and its [checklist](/book/6a-real-time-and-long-running-work#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the canonical Microsoft, IETF, and WHATWG sources were verified for the handbook on 24 August 2026. Proxy limits, idle timeouts, event retention, WebSocket extensions, and managed-service behavior depend on the deployed infrastructure and version; verify them in the concrete environment._
`;

export const realtimeWorkArticle = defineGuideArticle({
  markdown,
  slug: "realtime-work",
});
