import { defineGuideArticle } from "./article";

const markdown = `
## Draw different boundaries for different decisions

Architecture diagrams become dangerous when one box or line is expected to mean everything. A team draws two services and assumes it has also shown security, failure isolation, data ownership, and consistency. Those concerns can overlap, but they answer different questions. Use boundary analysis when starting a design, splitting an existing system, reviewing an incident, or changing where data is stored.

- A **system boundary** says what is in scope and what is an external dependency.
- A **service boundary** assigns behavior, change authority, and an explicit contract to one unit.
- A **trust boundary** marks where identity, authorization, or data-handling assumptions change.
- A **failure boundary** describes which parts can fail or be recovered independently.
- A **consistency boundary** states which facts must change together and where temporary disagreement is acceptable.

Do not assume these are the same line. Two services inside one trusted network still need deliberate authorization. Two containers deployed separately may share a database and therefore share a failure and change domain. A queue can isolate request timing while leaving both sides coupled to the same event contract.

Start with a system-context view: people, the system in scope, and directly connected external systems. Then use a container view to show applications, stores, responsibilities, and calls. Add deeper views only when they resolve a real decision. The diagram is a reasoning tool, not proof that isolation exists.

*Evidence: [S3 — Azure application design principles](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/), [S27 — NIST Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final), [S93 — C4 diagrams and notation](https://c4model.com/diagrams).*

## Make every important fact answerable

A **source of truth** is the authority whose answer wins for a named business fact. “The database” is too vague: the owner must be a service or capability with the right to validate and mutate that fact. Other stores may keep replicas, caches, search indexes, analytics copies, or materialized views, but they must not silently become competing authorities.

For each important fact, record:

1. who accepts or rejects writes;
2. where the durable authoritative value lives;
3. which copies are derived and how they receive changes;
4. how stale a copy may be and how readers can tell;
5. how a missing or duplicate update is repaired;
6. how the derived store is rebuilt from an authoritative baseline and changes;
7. what deletion, retention, archival, and restore rules apply to every copy.

Lifecycle rules belong in the design, not only in a storage ticket. A deletion that removes one primary row but leaves a search document, cache entry, export, or rebuild feed is incomplete. A retention rule should name its policy owner, scope, trigger, and treatment during backup restore. If a business record must outlive a customer profile, define the minimal retained fields and the behavior explicitly; do not let an accidental foreign-key cascade or an indefinite copy decide policy.

*Evidence: [S24 — Google SRE launch checklist](https://sre.google/sre-book/launch-checklist/), [S54 — Microsoft data considerations for microservices](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/data-considerations), [S58 — Microsoft domain analysis for microservices](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis).*

## Worked example: an order-status flow

Consider an online shop with an Order service, Payment provider, Fulfillment service, customer-facing status page, and support search. The requirement is that customers can place an order and later see a trustworthy status even if a supporting view is temporarily stale.

The Order service owns the order identity, items, accepted price, and lifecycle state. It is the only component allowed to approve an order-state transition. The external Payment provider owns whether its authorization succeeded; the Order service stores the provider reference and the outcome needed for its own decision, not a second editable payment history. Fulfillment owns picking and shipment facts. The status page and support search read a projection assembled from order and fulfillment events.

An end-to-end write can work like this:

1. The edge authenticates the customer at a trust boundary and forwards the authorized identity and request to Order.
2. Order validates the command, records a Pending order, and requests payment authorization using a stable operation identifier.
3. If Payment is unavailable, Order records or returns the agreed non-success state. It does not invent an authorization or report completion.
4. After authorization, Order changes the authoritative state to Confirmed and publishes that change for Fulfillment and projections.
5. The status projection consumes the change idempotently. Its displayed timestamp or version exposes freshness where staleness matters.
6. If projection updates stop, order placement still follows its documented path while status reads either show the last known version with a clear freshness contract or fall back to the authority if capacity permits.

The projection is replaceable because the team has a rebuild path: load an authoritative order snapshot, replay changes after the snapshot position, then compare counts, versions, and sampled records before switching traffic. Deletion and correction events participate in the same process, so a rebuild cannot resurrect removed or superseded data.

This design makes several boundaries visible. Payment is external to the system and is a synchronous failure dependency during authorization. The status projection is a consistency boundary: it may lag, but it cannot approve a write. Customer-to-edge and service-to-service calls cross trust decisions even if they share a network. Order and Fulfillment have separate write ownership; changing a shipment does not require direct writes to Order tables.

Verification follows the claims. Contract tests reject unauthorized state transitions. Dependency tests make Payment time out and confirm that no successful order is reported. Projection tests deliver duplicate and out-of-order changes. A rebuild exercise starts from an empty projection and verifies versions and deletion markers. A recovery exercise restores authoritative data and confirms that derived stores reconcile afterward.

## Choose coupling deliberately

Boundaries cost something. The aim is not the greatest number of services; it is clear authority and failure behavior with no more distribution than the requirements justify.

| Approach | Appropriate when | Cost or limitation |
|---|---|---|
| One application with one transactional store | One team owns the capability, changes together, and needs simple atomic updates. | Scaling and deployment are shared; careless modules can still bypass ownership. |
| Service-owned data exposed synchronously | The caller needs a current authoritative answer before continuing. | Caller latency and availability depend on the service; timeouts and overload need explicit behavior. |
| Service-owned data plus event-built read models | Consumers need independent read shapes or should continue without a synchronous call. | Copies can lag; schema evolution, deduplication, reconciliation, and rebuilds become product work. |
| Shared schema across services | A temporary migration stage has a named exit, or the units are not truly independent services. | Owners can bypass contracts; schema changes and database incidents couple deployments and failures. |

Dependency direction should follow ownership. A consumer asks the owner through a contract or consumes an owner-published change; it does not reach behind the boundary to edit the owner’s tables. If two services call each other on most requests or constantly exchange internal details, reconsider the split. A modular monolith with enforced module APIs can be a cleaner boundary than distributed components that must deploy in lockstep.

## Failure modes that diagrams often hide

- **One box per team.** An organization chart does not prove cohesive business ownership or a safe service boundary.
- **A shared database with polite conventions.** Any service that can write another owner’s tables can bypass invariants and force coordinated change.
- **Every line means “isolated.”** Deployment, trust, consistency, and failure boundaries need separate labels or views.
- **A cache without an authority.** When values disagree, nobody knows which copy wins or how to repair it.
- **State inside replaceable compute.** A restart loses sessions, workflow position, or accepted work because durability was never assigned.
- **A happy-path dependency arrow.** The diagram names the call but not timeout, unavailable, slow, partial, or recovery behavior.
- **Delete only at the source.** Replicas, exports, search indexes, and restore flows retain or resurrect data.
- **Derived data without a rebuild test.** “We can replay events” remains an assumption until a clean rebuild is timed and reconciled.

## Review a boundary diagram in seven passes

Use the same diagram repeatedly, adding a small legend or separate overlay when one view becomes crowded.

1. **Scope:** circle the system in scope; name every person and external system that directly interacts with it.
2. **Responsibility:** give every application and store one clear purpose and owner. Challenge boxes described only as “shared” or “common.”
3. **State:** mark each business fact with one write authority. Label every other copy as cache, replica, projection, archive, or export.
4. **Dependencies:** follow the critical request arrow by arrow. For every remote call, state timeout, unavailable behavior, retry ownership, and recovery path.
5. **Trust:** mark identity and data-classification changes. Ask what authenticates the caller and what authorizes this action at each crossing.
6. **Consistency and lifecycle:** identify atomic changes, allowed lag, reconciliation, deletion, retention, backup, restore, and rebuild behavior.
7. **Failure exercise:** remove each dependency and store in turn. State the user-visible outcome, blast radius, signal, and safe recovery action.

The review is complete only when the labels correspond to enforceable contracts, tests, access controls, deployment units, or recovery procedures. A neat diagram with unanswered failure or ownership questions is still an open design.

## Review questions

1. What exactly is inside the system boundary, and which dependencies remain external?
2. Who may mutate each important fact, and which copy wins during disagreement?
3. Which request paths require another service to be healthy, fast, and authorized?
4. Where do trust assumptions change, and what authentication and authorization enforce them?
5. Which changes must be atomic, and where is temporary inconsistency acceptable and visible?
6. Can every cache, projection, and search index be rebuilt without restoring deleted data?
7. What do retention, deletion, backup restore, and archival mean for every copy?
8. Which failures stay isolated, which cascade, and what evidence proves the intended boundary?

Continue in the complete handbook at [2. Boundaries, State, and Data](/book/2-boundaries-state-and-data). For the diagram notation used there, see [C4 diagrams: zoom from context to code](/book/2-boundaries-state-and-data#c4-diagrams-zoom-from-context-to-code) and the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources).

_Evidence scope: the cited handbook sources and their canonical URLs were rechecked on 26 August 2026. Cloud guidance and security publications can evolve; revalidate them when a design depends on provider-specific behavior or a particular revision._
`;

export const boundariesStateDataArticle = defineGuideArticle({
  markdown,
  slug: "boundaries-state-data",
});
