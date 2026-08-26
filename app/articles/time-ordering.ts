import { defineGuideArticle } from "./article";

const markdown = `
## Ask what time means before storing it

Time becomes a correctness problem when a system spans processes, users, queues, or regions. Apply this review to schedules, expiries, retries, billing cutoffs, event streams, audits, and any rule that says “before,” “after,” “latest,” or “for ten minutes.” Those words can refer to different clocks and different kinds of order.

Start each field and comparison with a question: is this a real-world instant, a local calendar intention, an elapsed duration, the time an event happened, the time the system observed it, or a position in a business sequence? One timestamp cannot safely answer every question.

## Separate the clocks and ordering signals

| Signal | Use when | Limitation or cost |
|---|---|---|
| Wall-clock instant | Record when something happened in the shared timeline, exchange deadlines, and audit activity. | Machine clocks can differ or be corrected; equal timestamps and skew make it unsafe as a total order. |
| Local civil time plus time zone | Preserve a human schedule such as “09:00 Europe/Warsaw every Monday.” | Daylight-saving transitions can make a local time ambiguous or nonexistent, and rules can change. |
| Monotonic time | Measure elapsed duration or an in-process timeout because it moves forward independently of wall-clock display changes. | It has no portable calendar meaning and cannot be compared across machines or process restarts. |
| Event time | Express when the source says the business event occurred. | It may be missing, wrong, duplicated, or arrive late; source authority must be defined. |
| Processing time | Express when a consumer observed or handled an event. | Backlog and retries can make it very different from business occurrence time. |
| Sequence or version | Order items inside a defined stream, partition, or entity. | Its scope is limited; it does not create a global order across unrelated streams. |

**Causality** means one event could have influenced another. If a payment authorization was produced because of a specific payment request, that relationship is stronger than which wall-clock timestamp happens to be smaller. Carry an operation identifier, predecessor, entity version, or stream sequence when correctness depends on that relationship.

*Evidence: [S57 — Microsoft dates, times, and time zones](https://learn.microsoft.com/en-us/dotnet/standard/datetime/), [S56 — Azure Service Bus sequencing and timestamps](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing).*

## Store instants and civil intentions differently

An **instant** identifies one point on the shared timeline. Store and interchange it in an unambiguous UTC or offset-aware representation. A **civil time** is what a person sees on a calendar in a locality. A UTC offset such as \`+01:00\` is not a complete time-zone rule set: the same locality can use different offsets at different times.

For an appointment chosen as “09:00 in the customer’s zone,” preserve the local date and time, a named time-zone identifier, and the policy used to resolve an ambiguous or nonexistent time. Once a particular occurrence is resolved, also store its instant for execution and auditing. Recurring schedules must be resolved occurrence by occurrence because future zone rules may differ from today’s.

Daylight-saving transitions require product decisions. During a forward transition, some displayed local times do not occur. During a backward transition, some occur twice. The system must reject, shift, or ask the user to choose; silently taking a library default turns a calendar ambiguity into hidden business behavior. Test both transition directions and a time zone whose rules differ from the development machine.

*Evidence: [S57 — Microsoft dates, times, and time zones](https://learn.microsoft.com/en-us/dotnet/standard/datetime/).*

## Worked example: a ticket hold and payment

Suppose a customer reserves a concert seat. The hold lasts ten minutes, the concert is advertised in the venue’s local time, payment confirmation arrives through a broker, and support must later explain whether the order completed before expiry.

When the hold service accepts the reservation, it records a server-authoritative \`accepted_at\` instant and calculates \`expires_at\` from that contract. The browser can show a countdown, but its clock does not decide ownership of the seat. On each confirm request, the service evaluates the stored expiry using its authoritative time source and performs the state transition atomically. An in-process monotonic timer can wake a worker or bound a request, but the durable instant remains necessary across restarts.

The concert schedule stores the venue’s local date and time with its named time zone. The booking flow displays that civil intention and the resolved offset, while internal deadlines use resolved instants. If the venue changes the advertised time, that is a business change with an audit trail—not an accidental conversion caused by the viewer’s device zone.

The payment provider emits an authorization event with a provider event identifier and event time. The broker records enqueue time and a sequence within its documented scope. The consumer records processing time. These answer different questions:

- event time helps reconstruct when the provider says authorization occurred;
- enqueue time shows when the broker accepted the message and helps diagnose producer delay;
- processing time exposes backlog or consumer delay;
- the provider identifier prevents one delivery from creating two payments;
- the reservation version or transition contract decides whether this authorization can move the hold from pending to paid.

The design does not sort payment events by timestamps and let “latest win.” A clock-skewed refund event could appear earlier than authorization, two events can share a timestamp, and an older event can arrive after a newer one. Each transition declares valid predecessor states and uses an entity version or provider sequence when available. A deterministic tie-breaker such as a stable event identifier makes reads repeatable but does not invent business causality.

Late confirmation needs an explicit policy. The service might accept an authorization only when the provider proves it occurred before \`expires_at\`, or it might require the state transition to have committed before expiry. Either can be valid; the requirement must choose the authority and user-visible recovery. Tests inject a delayed message on both sides of the boundary and assert the seat, payment, refund, and support record.

Verification covers a client clock far ahead or behind, a service clock adjustment, process restart during the hold, both daylight-saving transition shapes, equal event timestamps, reversed delivery, duplicate delivery, queue backlog past expiry, and concurrent confirm and expiry operations. The expected state and audit explanation are asserted for every case.

*Evidence: [S56 — Azure Service Bus sequencing and timestamps](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing), [S57 — Microsoft dates, times, and time zones](https://learn.microsoft.com/en-us/dotnet/standard/datetime/).*

## Choose the smallest useful ordering guarantee

A total order across an entire system is expensive and often unnecessary. Scope the requirement to the business key that can conflict: one account, reservation, device, document, or queue session. Unrelated keys can usually progress independently.

Use a timestamp when the question is about a real-world instant and small clock uncertainty does not decide correctness. Use a broker sequence when arrival order inside that broker scope is the contract. Use an entity version or application sequence when state transitions for one aggregate must be serialized or conflicts detected. A logical clock is a counter or relation that advances with events; it can express causal order without claiming a wall-clock instant. Use an explicit workflow step when the domain already defines precedence better than generic time.

Retrieval order and completion order are also different. A broker may deliver messages in sequence while parallel consumers finish them out of order. If processing order matters, use the broker’s session or key-ordering mechanism, serialize at the aggregate, or reject stale versions. State the guarantee precisely: produced, accepted, delivered, started, committed, or displayed order.

*Evidence: [S56 — Azure Service Bus sequencing and timestamps](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing).*

## Define expiry as a state transition

Expiry needs more than a time-to-live number. Name what starts the timer, the authoritative clock, whether the boundary is inclusive, what becomes forbidden after it, and whether cleanup is immediate or eventually removes already-expired data.

Do not treat deletion as the only proof of expiry. A background cleanup job can run late, so reads and writes must enforce the logical expiry contract until physical removal happens. For a lease or lock, also define renewal, maximum extension, ownership token, restart behavior, and what a late holder is allowed to do.

Test time-dependent logic through an injected clock or time provider rather than waiting for real minutes or editing the machine clock. Tests should advance through just before, exactly at, and just after the boundary, plus restart and delayed-cleanup cases.

*Evidence: [S57 — Microsoft dates, times, and time zones](https://learn.microsoft.com/en-us/dotnet/standard/datetime/).*

## Failure modes to challenge

- **Every value becomes UTC.** A future local schedule loses the zone rules that give it business meaning.
- **The client clock owns expiry.** A misconfigured or manipulated device can extend or shorten a server-side right.
- **Latest timestamp wins.** Skew, duplicate resolution, late arrival, and unrelated clocks overwrite a valid state.
- **Arrival equals processing.** Queue backlog is hidden and a retrieved sequence is mistaken for completion order.
- **One global order.** Unrelated work is serialized even though only per-entity conflicts matter.
- **TTL equals deletion.** Expired data remains usable because cleanup has not run yet.
- **DST is tested in winter only.** Ambiguous and nonexistent local times remain undefined until production.

## Time-and-order review checklist

1. Classify every important value as instant, civil time, duration, event time, processing time, or ordering position.
2. Preserve the time-zone identifier and ambiguity policy whenever local calendar meaning matters.
3. Use monotonic time for local elapsed measurement and an authoritative instant for durable cross-process deadlines.
4. Define expiry start, authority, boundary, renewal, enforcement, cleanup, and recovery.
5. Scope ordering to the smallest key and distinguish enqueue, delivery, start, commit, and display order.
6. Carry identifiers, versions, predecessors, or sequences when causality matters; never infer it only from timestamps.
7. Define late-event, duplicate-timestamp, out-of-order, and stale-version behavior.
8. Test clock skew, wall-clock adjustment, restart, DST transitions, backlog, duplicates, and concurrent boundary operations.

## Review questions

1. What question does each time field answer, and which clock is authoritative?
2. Which values are instants, and which preserve a user’s local calendar intention?
3. Can a time-zone or daylight-saving transition make the input ambiguous or nonexistent?
4. Does expiry remain correct across client skew, restart, delayed cleanup, and an operation exactly at the boundary?
5. Is the ordering requirement global, per stream, or per business entity?
6. What proves causal order when timestamps are equal, skewed, or delivered late?
7. Does the selected sequence guarantee arrival order, processing order, or committed state order?
8. Can operators reconstruct event, enqueue, processing, and decision times without treating one as another?

Continue in the complete handbook at [2C. Time, Clocks, and Ordering](/book/2c-time-clocks-and-ordering) and its [time-and-ordering checklist](/book/2c-time-clocks-and-ordering#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited official documentation was rechecked on 26 August 2026. Runtime APIs, broker guarantees, time-zone databases, and regional rules can change; verify the deployed runtime, broker configuration, time-zone data, and business boundary policies for a concrete system._
`;

export const timeOrderingArticle = defineGuideArticle({
  markdown,
  slug: "time-ordering",
});
