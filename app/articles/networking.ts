import { defineGuideArticle } from "./article";

const markdown = `
## Start with the interaction, not the protocol

Networking design defines what a caller can know after a timeout, how long the complete path may take, how overload is contained, and what users see when only part of the system is reachable. Apply this review whenever a critical flow crosses a process, zone, region, organization, or public network.

Describe the interaction before naming technology:

- Who initiates communication, and who needs to send data afterward?
- Is one answer enough, or do updates continue over time?
- Must producer and consumer be available at the same moment?
- Can messages be delayed, duplicated, reordered, or dropped?
- What latency, freshness, throughput, payload, and connection limits apply?
- What must the caller do when the outcome is unknown?

## Match the communication mode to the contract

| Mode | Use when | Cost or limitation |
|---|---|---|
| HTTP request-response | One side asks for a bounded operation or representation and can wait for one response. | The caller is coupled to the path’s latency and availability; a timeout can leave the outcome unknown. |
| HTTP polling | Updates are infrequent, some delay is acceptable, and operational simplicity matters more than immediate delivery. | Empty polls waste work; polling interval trades freshness against load. |
| Server-Sent Events (SSE) | A browser mainly receives an ordered stream of server updates over HTTP. | It is one-way; intermediaries, idle limits, reconnect position, and per-client capacity must be tested. |
| WebSocket | Both sides need frequent messages on one persistent two-way channel. | Connection lifecycle, authentication refresh, routing, backpressure, reconnect, and fleet capacity become explicit responsibilities. |
| Asynchronous messaging | Producer and consumer should be decoupled in time or peak load, and delayed completion fits the product contract. | Delivery, ordering, duplicates, poison messages, schema evolution, and status visibility require design and operations. |

Streaming does not automatically require WebSocket. Connection-oriented communication retains channel state; event-driven communication publishes work or facts for later consumers. Choose the least stateful mode that satisfies the interaction: ordinary requests for periodic refresh, SSE for one-way progress, WebSocket for frequent two-way changes, or a queue for delayed background work.

*Evidence: [S9 — RFC 9110 HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [S41 — RFC 6455 WebSocket](https://www.rfc-editor.org/rfc/rfc6455.html), [S42 — WHATWG Server-Sent Events](https://html.spec.whatwg.org/dev/server-sent-events.html).*

## Budget the whole path

An end-to-end latency target must contain every material stage, not only application execution. Trace the route in order: name resolution, connection-pool wait, connection establishment when needed, TLS, edge or regional routing, proxy and load-balancer work, service queueing and execution, downstream calls, serialization, transfer, and client processing.

Assign budgets and measurement points to material stages from representative traffic. Leave room for variance, retries, and growth; the composed path cannot work if every service consumes the full user deadline.

Connection pools trade setup work for retained resources. Bound pool size and queueing, and measure wait time separately from request time. A pool that is too small adds local queueing; an unbounded pool can move overload into the dependency. Persistent streams likewise need a connection budget per instance, region, tenant, and intermediary.

DNS is part of runtime behavior. Record the names used, resolution path, caching assumptions, change or failover mechanism, and how quickly clients actually adopt a new answer. TLS is both a trust decision and path cost: define certificate identity, termination points, service-to-service authentication, and what is re-encrypted after a proxy. Do not treat “inside the network” as authorization.

Proxies and load balancers can change the effective contract. Verify request and response size limits, buffering, streaming support, connection and idle timeouts, health-based routing, retry behavior, and whether a persistent connection remains pinned to one backend. For regional routing, show where the client enters, where state is authoritative, what crosses regions, and what happens when one region or the route between regions is unavailable.

*Evidence: [S24 — Google SRE launch checklist](https://sre.google/sre-book/launch-checklist/), [S27 — NIST Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final), [S31 — Azure performance efficiency](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/).*

## Worked example: export progress

Suppose a user starts a large data export. Acceptance may take seconds, generation can take minutes, the browser only needs server-to-client progress, 10,000 users might watch concurrently, and a disconnected browser must resume without restarting the export. The final file and job status are authoritative; individual progress updates may be coalesced.

The public contract uses three pieces:

1. An HTTP request starts or finds the export and returns a stable job identifier. If processing continues after the response, an accepted status does not claim completion.
2. An SSE endpoint streams job-version, progress, completed, and failed events because updates are server-to-browser and the browser does not need a two-way message channel.
3. A normal HTTP status endpoint provides the authoritative current state and a fallback when streaming is unavailable.

Internally, the API places durable work on a queue so workers can process at a controlled rate. This is an event-driven boundary used for load isolation, not a reason to expose a broker protocol to the browser.

Failure behavior is part of the choice. If the start request times out, the client does not blindly create another export: it uses the operation’s defined deduplication or lookup contract to learn whether the first request was accepted. If the SSE connection closes, the client reconnects from its last processed event position when available, then reconciles with current status. A missing event cannot make the completed export disappear because the status record remains authoritative.

The edge and load balancer are tested with streaming and the configured idle behavior. Each connection has bounded buffering. When a browser cannot keep up, the server coalesces replaceable progress updates or closes the stream; the client reconnects and reads current state.

Worker retries are finite and owned by one layer. A retry occurs only for a failure classified as transient and only when repeating the work is safe under the job contract. Queue depth and oldest-job age trigger load shedding or capacity action before the backlog violates the completion target.

Verification includes a request timeout after server acceptance, duplicate start requests, an SSE disconnect and resume, a proxy idle interval, a slow-reading client, a full connection budget, delayed workers, a regional route failure, and replay of a duplicate progress event. The expected user-visible status is asserted in every case.

*Evidence: [S13 — queue-based load leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling), [S17 — transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults), [S42 — WHATWG Server-Sent Events](https://html.spec.whatwg.org/dev/server-sent-events.html).*

## Treat partial failure and backpressure as normal

A timeout means the caller stopped waiting; it does not prove that the server did nothing. Design an **unknown outcome** explicitly: query status, reconcile by operation identity, or present a retryable state whose repeat behavior is defined. Never convert uncertainty into false success.

Retries consume the same resources that are already failing. Set a timeout for each attempt, a total deadline, a finite attempt count, and one owning layer. Retry only safe or explicitly deduplicated operations, respect server recovery signals such as Retry-After where the contract uses them, and include all waits in the latency budget. Cascading retries at client, gateway, service, and SDK layers multiply load.

Backpressure is how a slower receiver limits a faster sender. Bounded queues, concurrency limits, rate limits, load shedding, coalescing, and explicit rejection are valid techniques depending on the contract. An unbounded queue is not resilience; it hides overload while latency and memory grow. A queue protects a consumer only when producers receive or observe a clear capacity signal and operators monitor backlog age.

## Diagnose the path, not only the service

Collect signals that separate stages and failure classes:

- client-perceived duration plus DNS, connect, TLS, time-to-first-byte, and transfer timing where available;
- proxy, gateway, load-balancer, service, queue, and downstream spans joined by a trace identifier;
- connection-pool active, idle, waiting, rejected, reset, and timeout counts;
- response codes, timeout source, retry count, retry delay, and final outcome;
- open persistent connections, reconnect rate, connection age, messages or bytes, buffer use, and slow-consumer disconnects;
- queue depth, oldest item age, processing rate, duplicate deliveries, and terminal failures;
- source and destination region, route or backend selected, and failover events;
- DNS resolution failures and observed target changes, without logging secrets or sensitive payloads.

*Evidence: [S22 — OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/), [S17 — transient fault handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults).*

## Failure modes to challenge

- **Choosing WebSocket because the feature is “real time.”** One-way updates or polling may satisfy the actual interaction with less connection state.
- **Measuring only handler time.** DNS, pool wait, TLS, proxies, queues, transfer, and downstream calls disappear from the reported latency.
- **Retrying at every layer.** A small retry count multiplies across the call chain and amplifies an outage.
- **No unknown-outcome state.** A timed-out write is reported as failed even though it may have committed.
- **Assuming the proxy is transparent.** Buffering or idle limits break a stream that worked directly against a development server.
- **Treating DNS as configuration.** Cached answers and client behavior make a routing change slower or different than the diagram suggests.
- **Unlimited connections or buffers.** A healthy feature becomes a fleet-wide resource exhaustion path.
- **Testing only one region.** Geographic latency, data placement, route loss, and failover behavior remain assumptions.

## Network-failure review checklist

1. Draw every client, service, proxy, load balancer, broker, store, region, and external dependency on the critical path.
2. Label protocol, direction, payload or message size, expected rate, connection lifetime, and trust transition.
3. Allocate and measure the end-to-end latency budget at each material stage.
4. State timeout, unknown-outcome, retry owner, retry safety, and total retry budget for every remote operation.
5. Bound connection pools, concurrent streams, queues, buffers, and per-tenant use; define the overload response.
6. Verify DNS, TLS, health routing, proxy buffering, idle limits, reconnect, and regional failover in the real path.
7. Inject delay, loss, reset, throttling, dependency failure, stale resolution, slow consumers, and duplicate delivery; assert user-visible behavior.
8. Confirm telemetry identifies the failing stage and that alerts use user impact, saturation, backlog age, or persistent error signals.

## Review questions

1. Does each communication mode follow the interaction semantics rather than a preferred technology?
2. What is the complete latency budget, and where can time queue or disappear from measurement?
3. After a timeout, can the caller distinguish not-started, still-running, succeeded, and failed?
4. Which layer owns retries, and how are unsafe repeats prevented?
5. What bounds connections, pools, buffers, queues, payloads, and tenant usage?
6. Do DNS, TLS, proxies, load balancers, and regional routing preserve the intended contract?
7. How do streams reconnect, resume, authenticate again, and shed slow consumers?
8. Which production signals and failure tests prove the network behavior under overload and partial failure?

Continue in the complete handbook at [2A. Networking and Communication](/book/2a-networking-and-communication) and its [networking checklist](/book/2a-networking-and-communication#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited standards and official guidance were rechecked on 26 August 2026. The WHATWG HTML standard and provider routing, timeout, connection, and retry defaults can change; verify the deployed client, proxy, load balancer, SDK, and region configuration for a concrete system._
`;

export const networkingArticle = defineGuideArticle({
  markdown,
  slug: "networking",
});
