import { answer as a, authoredQuiz as quiz, question as q, type QuizPolicy } from "./quiz-contract";

const heading = (label: string, href: string) => ({ label, href });
const evidence = (label: string) => ({ label, href: "#section-content" });

export const distributedQuizPolicies: readonly QuizPolicy[] = [
  quiz("3-concurrency", [
    q("lost-update", "Two requests read stock 1 and both try to sell the final item. Which control directly protects the invariant?", heading("Common tools", "#common-tools"), [
      a("An atomic conditional update or equivalent concurrency control that allows only one transition from 1 to 0.", "Correct. The shared-state invariant must be enforced where concurrent writes are serialized or rejected.", true),
      a("A longer client-side loading animation.", "Presentation does not prevent both server operations from committing."),
      a("A cache entry with a one-minute TTL.", "A stale cache can make the race worse and does not enforce inventory correctness."),
    ]),
    q("lock-tradeoff", "A global lock prevents races but causes high contention and deadlock risk. What is the preferred next move?", heading("Common tools", "#common-tools"), [
      a("Reduce shared mutable state or narrow the protected scope before adding more locking.", "Correct. Simpler ownership and smaller critical sections reduce both contention and reasoning cost.", true),
      a("Add a second global lock around the first one.", "Nested broad locks increase coordination and deadlock risk."),
      a("Remove synchronization while keeping concurrent writes unchanged.", "That reintroduces the original correctness race."),
    ]),
  ]),
  quiz("4-transactions-and-consistency", [
    q("db-message-atomicity", "An order row commits, but the process crashes before publishing OrderCreated. Which pattern addresses this boundary?", heading("Reliable DB + message publishing", "#reliable-db-message-publishing"), [
      a("Write the order and an outbox record in one database transaction, then publish the outbox reliably.", "Correct. The outbox makes the durable business change and publish intent atomic in one resource.", true),
      a("Publish first and assume the database insert will succeed.", "A database failure would leave an event for an order that does not exist."),
      a("Retry both operations forever without recording state.", "Unbounded retries do not resolve the atomicity gap or duplicate effects."),
    ]),
    q("cross-service-change", "A workflow updates two independently owned services and cannot use one atomic transaction. What must the design define?", heading("Practical rules", "#practical-rules"), [
      a("Explicit intermediate states, retry/idempotency behavior, and compensation or recovery for partial completion.", "Correct. Distributed consistency requires a workflow contract rather than pretending one local transaction spans services.", true),
      a("A stronger isolation level in only the first service.", "Local isolation cannot make a separate service participate atomically."),
      a("A requirement that partial failures never occur.", "Independent resources can fail separately, so recovery must be designed."),
    ]),
  ]),
  quiz("5-apis-contracts-and-idempotency", [
    q("idempotency-key", "A client retries CreatePayment after a timeout with the same idempotency key. What should the server do?", heading("Example", "#example"), [
      a("Recognize the same scoped operation and return the recorded outcome without creating a second payment.", "Correct. Durable idempotency state turns an ambiguous retry into the same logical operation.", true),
      a("Create a new payment because POST is never retryable.", "POST can support safe retries when the API defines an idempotency contract."),
      a("Reject every retry even when the first request never arrived.", "The key should identify one operation, not prohibit recovery from transport uncertainty."),
    ]),
    q("contract-evolution", "A deployed client omits a field that the new server version now requires. What does this reveal?", heading("Checklist", "#checklist"), [
      a("The change is backward-incompatible unless versioning or a staged migration preserves old clients.", "Correct. Independently deployed consumers make compatibility part of the API contract.", true),
      a("The client is automatically upgraded by the server deployment.", "Independent clients do not change merely because the server changed."),
      a("The field is safe to require if its database column is indexed.", "Indexing has no bearing on wire-contract compatibility."),
    ]),
  ]),
  quiz("6-messaging-and-asynchronous-work", [
    q("duplicate-delivery", "A consumer charges a card for each at-least-once message delivery. What contract is missing?", evidence("Evidence S12, S13, S14, S15 and S56"), [
      a("Idempotent processing or durable deduplication keyed to the logical charge.", "Correct. At-least-once delivery means duplicate messages must not duplicate the side effect.", true),
      a("A larger message body.", "Payload size does not prevent the same logical message from being delivered twice."),
      a("A promise that the broker will become exactly-once end to end.", "Broker guarantees do not automatically make external side effects exactly once."),
    ]),
    q("poison-message", "One malformed message fails on every attempt while the backlog grows. What should the worker policy do?", heading("Checklist", "#checklist"), [
      a("Bound retries, expose the failure, and move or quarantine the message for deliberate recovery.", "Correct. A poison-message policy protects throughput while retaining evidence for repair.", true),
      a("Retry immediately forever on every worker.", "Unbounded retries consume capacity and can create a retry storm."),
      a("Delete the entire queue to restore throughput.", "That destroys unrelated work and loses recovery evidence."),
    ]),
  ]),
  quiz("6a-real-time-and-long-running-work", [
    q("long-running-api", "A report takes ten minutes to generate. Which request contract fits the chapter?", evidence("Evidence S39 and S40"), [
      a("Acknowledge quickly with a job identifier, process with bounded workers, and expose status/result retrieval.", "Correct. Long work needs durable status and bounded background execution.", true),
      a("Keep the HTTP request open indefinitely with no cancellation or status record.", "Long open requests are fragile and give poor recovery after disconnects."),
      a("Return success immediately without recording whether work runs.", "An acknowledgement needs a durable operation users can observe."),
    ]),
    q("keep-synchronous", "A validated operation finishes reliably in 80 ms and the caller needs the result before continuing. What is the default?", evidence("Evidence S39, S40, S41 and S42"), [
      a("Keep it synchronous while it meets the SLA and has simpler failure semantics.", "Correct. Asynchrony is earned by interaction or workload needs, not by fashion.", true),
      a("Put it behind three queues because queues always scale better.", "Queues add state, latency, duplicate handling, and operational cost without a demonstrated need."),
      a("Use WebSockets because the response is important.", "Importance does not imply a bidirectional long-lived connection."),
    ]),
  ]),
  quiz("7-failure-handling-and-resilience", [
    q("retry-policy", "A read-only dependency call fails with a documented transient error. Which retry policy is safest?", heading("Retry decision flow", "#retry-decision-flow"), [
      a("Retry within a bounded time/attempt budget with backoff and jitter, while respecting the caller deadline.", "Correct. Retries must be safe, transient-focused, and bounded to avoid amplifying failure.", true),
      a("Retry immediately until the dependency recovers, regardless of deadline.", "Unbounded immediate retries can exhaust resources and create a retry storm."),
      a("Retry every error, including validation failures.", "Permanent errors do not improve with retries and waste capacity."),
    ]),
    q("failure-amplification", "A dependency is saturated and every caller retries five times at once. What is happening?", heading("Failure toolbox", "#failure-toolbox"), [
      a("Retry amplification; budgets, backoff, load shedding, or circuit breaking should limit pressure.", "Correct. Resilience mechanisms must reduce failing work rather than multiply it.", true),
      a("Healthy horizontal scaling because request volume increased.", "The extra load is self-generated failure traffic, not useful capacity demand."),
      a("Successful graceful degradation because callers keep trying.", "Graceful degradation serves a reduced useful outcome; repeated failure is not degradation."),
    ]),
  ]),
  quiz("8-scale-capacity-performance-and-caching", [
    q("load-model", "A team says the service will scale by adding instances but has not measured database connections or peak traffic. What is missing?", evidence("Evidence S13, S20, S21, S24 and S31"), [
      a("A load model, identified bottlenecks, and safe limits for each scarce dependency.", "Correct. Stateless instances do not remove database, queue, API, or connection-pool limits.", true),
      a("A more optimistic autoscaling slogan.", "A claim without workload and dependency evidence is not a capacity plan."),
      a("A cache for every response.", "Caching may shift load but adds invalidation and cannot replace capacity analysis."),
    ]),
    q("cache-correctness", "A profile cache may serve data for five minutes after a user changes it. What must the design decide?", evidence("Evidence S20 and S21"), [
      a("Whether that staleness is acceptable and how invalidation, expiry, and failure fallback behave.", "Correct. A cache is a consistency policy as well as a performance mechanism.", true),
      a("Only which compression algorithm stores the value.", "Storage format does not define user-visible freshness or invalidation."),
      a("That cached data is always authoritative during its TTL.", "The source of truth and acceptable staleness must be explicit; TTL alone does not make cache data authoritative."),
    ]),
  ]),
  quiz("9-security", [
    q("authorization-boundary", "An authenticated user changes the resource ID in a request to another tenant's record. What must prevent access?", evidence("Evidence S27, S28 and S29"), [
      a("Server-side authorization for that identity, action, tenant, and resource on every request.", "Correct. Authentication proves identity; authorization must enforce the resource boundary.", true),
      a("Hiding the resource ID in the UI.", "Client presentation is not a security boundary and requests can be modified."),
      a("Trusting the request because it came from the internal network.", "Zero Trust guidance rejects network location as sufficient authorization."),
    ]),
    q("least-privilege", "A report worker only reads aggregated metrics but holds full database-admin credentials. What should change?", heading("Checklist", "#checklist"), [
      a("Give it a narrowly scoped identity with only the data and operations required for its task.", "Correct. Least privilege reduces the blast radius of compromise or mistakes.", true),
      a("Keep admin access so future features need no permission changes.", "Speculative authority expands risk and violates least privilege."),
      a("Store the admin credential in the worker logs for recovery.", "Secrets must not be logged, and logging would further expose excessive authority."),
    ]),
  ]),
];
