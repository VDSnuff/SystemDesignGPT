import { defineGuideArticle } from "./article";

const markdown = `
## Use asynchronous work to solve a named timing problem

Messaging helps when the caller should not wait for all work, producers and consumers must fail independently, bursts need buffering, or several owners react to the same business fact. It changes **temporal coupling**: components no longer have to be available at the same moment, but they still depend on message contracts, broker capacity, and eventual processing.

Start with the user promise. “Accept an order within 300 ms and begin fulfillment within two minutes” is stronger than “put orders on a queue.” Name what acceptance means, who owns final completion, how users discover progress, and how old work may become before the promise is broken.

Keep a short operation synchronous when the caller needs the result immediately, the work reliably fits the request budget, and an extra broker would only add states and recovery paths. A queue is not a faster function call. It trades immediate completion for buffering, independent availability, and explicit delayed outcomes.

*Evidence: [S13 — Microsoft queue-based load leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling), [S14 — Microsoft competing consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers).*

## Choose the communication contract before the broker

Decide whether one worker should own each unit of work or multiple consumers should independently observe an event. A work queue suits commands such as “generate this invoice”; an event suits facts such as “order accepted.” A retained event log is appropriate only when consumers need independent positions and deliberate replay. Retention, ordering, fan-out, and acknowledgement are contract decisions, not product defaults.

| Choice | Appropriate when | Cost or risk |
|---|---|---|
| Synchronous request | The caller needs the result now and work fits a bounded latency and failure budget. | Caller and dependency availability are coupled; retries can extend or duplicate the operation. |
| Work queue | One of several workers should complete each job and intake bursts must be smoothed. | Completion is delayed; duplicate delivery, leases, retries, and backlog ownership become part of the design. |
| Published event | Multiple owners react independently to an immutable business fact. | Consumers can lag or disagree temporarily; schema evolution and per-consumer recovery are required. |
| Retained event log | Consumers need independent progress, history, or controlled replay. | Storage, retention, offsets, ordering scope, replay safety, and catch-up capacity require explicit operations. |

Avoid global ordering unless the business invariant truly needs it. Prefer order within a business key—such as one order or account—so unrelated work can run in parallel. Broker timestamps are not automatically causal order; sequence guarantees depend on the deployed broker and configuration.

*Evidence: [S14 — Microsoft competing consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers), [S56 — Microsoft Azure Service Bus sequencing and timestamps](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing).*

## Define ownership, identity, and the message contract

Each message needs a stable message identifier, business operation identifier, schema version, correlation context, producer, creation time, and routing key when ordering or partitioning uses one. Keep payloads bounded; pass a durable reference when large or sensitive content belongs in an owned store.

The producer owns the truth of the event it emits. The broker owns durable transport under its configured guarantees. The consumer owns its side effect, duplicate handling, retry policy, and progress. “Exactly once” in one broker feature does not prove exactly one external business effect across a database, API, email provider, and replay. Design the consumer so repeating the same operation identity produces the same outcome or a safe no-op.

Evolve schemas additively while old producers and consumers overlap. A new required field, changed meaning, narrowed enum, or reused event name can break delayed messages and replay. Test the oldest retained version that policy allows, and retire it only after measured consumer migration and retention expiry.

*Evidence: [S12 — Microsoft message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates), [S56 — Microsoft Azure Service Bus sequencing and timestamps](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing).*

## Worked example: accept an order and start fulfillment

The order service must acknowledge an order quickly, preserve one accepted order, and start fulfillment even if the broker or worker is briefly unavailable.

1. The API validates the request and idempotency key. In one database transaction it inserts order \`ord-731\` with status \`accepted\` and an outbox record for \`OrderAccepted\`, both carrying operation \`checkout-284\`. If this commit fails, neither business state nor publish intent exists.
2. An outbox publisher reads pending records and sends the event. If it crashes after publish but before marking the row, it sends again. This is expected, not exceptional.
3. The fulfillment consumer begins a local transaction and tries to claim \`checkout-284\` in an **inbox** record. If the operation was already completed, it acknowledges the duplicate without creating another shipment. Otherwise it records the inbox claim, creates shipment \`ship-992\`, and commits both.
4. If validation finds an unsupported address, the consumer records a final business rejection and emits \`FulfillmentRejected\`; retrying cannot make the same input valid. If the carrier API times out, the outcome is ambiguous. The consumer queries the carrier with the stable shipment operation before attempting another effect.
5. After a bounded transient retry budget, the message moves to quarantine with error class, attempt count, and correlation context. An operator can correct data or infrastructure, then replay the original identity. Replay reaches the same inbox guard and cannot create a second shipment.

Failure points are visible: database commit, outbox publication, broker delivery, inbox claim, local side effect, remote carrier call, acknowledgement, and status publication. A crash at any point has a named owner and recovery path. The outbox prevents a committed order from silently losing publish intent; the inbox pattern makes consumer state and duplicate recognition one local decision. Neither removes the need to reconcile external carrier state after an ambiguous timeout.

*Evidence: [S12 — Microsoft message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates), [S15 — Microsoft transactional outbox pattern](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos).*

## Bound retries, poison messages, and replay

Classify failures before retrying. A brief connection reset may be transient. Invalid schema, missing required business data, revoked authorization, and a permanently rejected destination are final until something changes. Retrying final failures wastes capacity and can hide the real defect.

Set a total retry budget with capped attempts, backoff, jitter, and maximum age. Count redelivery and application retries together. When exhausted, move the message to a **dead-letter queue** or quarantine: an isolated holding area for inspection and controlled recovery. Give it an owner, alert, retention limit, safe payload access, and resolution workflow. A dead-letter queue without triage is delayed data loss.

Replay is a production write path. Define selection, ordering, rate, authorization, idempotency, observability, and a stop control before using it. Prefer a small canary batch, verify side effects, then increase rate within consumer and downstream headroom. Never “fix” a poison message by endlessly returning it to the hot queue.

*Evidence: [S12 — Microsoft message loss and duplicate processing](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-message-loss-and-duplicates).*

## Measure age, throughput, and recovery capacity

Queue depth alone can mislead: ten slow jobs may be worse than ten thousand tiny ones. Measure oldest-message age, arrival and completion throughput, processing latency, success and retry rates, dead-letter rate, duplicate suppression, consumer saturation, and downstream throttling. Partition or business-key views expose one hot tenant hidden by a healthy total.

Capacity must cover both normal intake and recovery. If 120 messages per second arrive and healthy consumers complete 150, only 30 per second drains backlog. A backlog of 108,000 messages therefore needs about one hour after recovery, assuming rates and work size remain stable. If that misses the user promise, reserve more catch-up capacity, throttle producers, prioritize by business value, or shed work under an explicit policy.

Track time from business acceptance to final outcome. Alert before the oldest message exceeds the promise. During recovery, watch downstream limits so catch-up does not create another outage.

*Evidence: [S13 — Microsoft queue-based load leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling), [S14 — Microsoft competing consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers).*

## Failure modes to challenge

- **Publish after commit.** A crash leaves durable business state with no message and no recovery record.
- **A broker feature means one effect.** Duplicate delivery, consumer restart, or an external timeout still repeats work outside that feature’s boundary.
- **Retry everything forever.** Permanent failures consume capacity and delay healthy work.
- **The dead-letter queue is the owner.** Messages accumulate without alert, diagnosis, correction, or retention policy.
- **Global order by default.** Unrelated keys wait behind one slow item and throughput collapses.
- **Depth is the only signal.** Large or old work violates the user promise while the item count looks acceptable.
- **Replay is harmless.** Old schemas and side effects run again without a canary, rate limit, or idempotency guard.
- **Async means accepted equals completed.** The UI and API report success before the outcome is known or recoverable.

## Verify delivery, recovery, and the user promise

Test duplicate and reordered messages, consumer crashes before and after local commit, publisher crashes after send, unavailable broker, slow downstreams, invalid payloads, retry exhaustion, quarantine redrive, old schema versions, and backlog catch-up. Assert final business state and external effects, not only acknowledgement.

Run the worked flow with the same operation delivered concurrently to two consumers. Prove one shipment exists, the duplicate is observable, and both attempts finish predictably. Pause consumers, build a measured backlog, restore them, and verify oldest-message age returns within the recovery objective without overwhelming the carrier.

## Messaging review checklist

1. State why work is asynchronous and what the user observes after acceptance.
2. Choose command, event, queue, or retained-log semantics before a broker product.
3. Name producer, transport, consumer, schema, routing, ordering, and side-effect ownership.
4. Give messages and business operations stable identities; make every consumer duplicate-safe.
5. Commit database state and publish intent atomically with an outbox or justify another mechanism.
6. Bound attempts, delay, age, quarantine, replay rate, retention, and operator ownership.
7. Define schema compatibility for delayed messages and mixed producer/consumer versions.
8. Measure age, throughput, retries, duplicates, dead letters, saturation, and recovery time.
9. Test crash points, ambiguity, replay, backlog recovery, and final external effects.

## Review questions

1. Which requirement becomes easier with asynchronous work, and which new delayed state appears?
2. Does each message represent a command to one owner or a fact for independent consumers?
3. What ordering scope protects the invariant without serializing unrelated work?
4. Where can publication or consumption repeat, and what stable identity makes the effect safe?
5. Which failures are transient, final, ambiguous, or operator-owned?
6. How old may the oldest message become, and how quickly must a peak backlog drain?
7. Can an old message or controlled replay run safely against today’s consumer?
8. Which evidence proves the user outcome recovered, not merely that the queue emptied?

Continue in the complete handbook at [6. Messaging and Asynchronous Work](/book/6-messaging-and-asynchronous-work), its [messaging checklist](/book/6-messaging-and-asynchronous-work#checklist), and [Reliable DB + message publishing](/book/4-transactions-and-consistency#reliable-db-message-publishing). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited Microsoft architecture and Azure Service Bus guidance were rechecked for the canonical handbook on 24 August 2026. Delivery, ordering, retention, duplicate detection, acknowledgement, and replay behavior depend on the deployed broker, client, and configuration; verify them for the concrete system._
`;

export const messagingArticle = defineGuideArticle({
  markdown,
  slug: "messaging",
});
