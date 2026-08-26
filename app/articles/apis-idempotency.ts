import { defineGuideArticle } from "./article";

const markdown = `
## Start with the outcome, not the endpoint

An API is a contract between components that change independently. Apply this review when timeouts, retries, client versions, or untrusted input can turn an endpoint into duplicate or incompatible behavior.

Begin with the user-visible outcome. “Submit a payment once, and let the caller discover the same result after uncertainty” is stronger than “add a POST endpoint.” Name the owner, authorization, invariant, duplicate behavior, and lifecycle before choosing paths and verbs.

HTTP method semantics help clients and intermediaries reason about requests. Safe methods are intended for retrieval; idempotent methods have the same intended effect when repeated. A POST is not automatically retry-safe. When a non-idempotent business action must tolerate retries, the API needs an explicit application-level contract.

*Evidence: [S9 — RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [S10 — Microsoft Web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S11 — Microsoft Web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation).*

## Model resources, actions, and validation boundaries

Use nouns for durable things and methods for standard operations. Model an action when it represents a meaningful state transition—for example, \`POST /orders/{id}/cancellations\` can create an auditable cancellation request. Expose the product concept, not an internal table or service topology.

Validate shape at the HTTP boundary: required fields, formats, sizes, enums, and incompatible options. Authorize the actor against the concrete resource and action. Validate inventory, state transitions, and other business invariants at their owner.

Return errors that let a caller act: a stable code, safe message and field details, plus correlation identifier. Distinguish invalid input, authentication, authorization, absence, conflict, rate limits, and temporary failure. Do not hide failure behind 200 or expose internals.

*Evidence: [S9 — RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [S10 — Microsoft Web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S11 — Microsoft Web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation).*

## Define the complete idempotency contract

An **idempotency key** is a client-generated operation identity used to recognize retries. The header name alone is insufficient. Specify all of these rules:

1. **Scope:** bind the key to one authenticated tenant or account and operation. The same text in another tenant must not collide.
2. **Fingerprint:** hash the fields that define the effect. A different amount, currency, order, or destination is a conflict, never a replay.
3. **Atomic claim:** claim the key in the durable boundary that starts work. Concurrent requests must not both perform the effect.
4. **Stored outcome:** define which status, headers, and body are returned for an exact replay. Preserve the original resource identity and business result.
5. **In-progress behavior:** document a pollable operation or a conflict with retry guidance while work continues.
6. **Failure behavior:** state which failures are final and replayed, which allow a new attempt under the same key, and how an ambiguous downstream timeout is reconciled.
7. **Lifetime:** publish a retention window. After expiry, the client cannot assume duplicate protection.

A key protects only its declared scope and lifetime; it does not replace constraints, authorization, or downstream idempotency.

## Worked example: create one payment safely

The client creates one key for one logical payment attempt and keeps it across transport retries:

~~~http
POST /payments HTTP/1.1
Authorization: Bearer <token>
Idempotency-Key: order-9381-payment-1
Content-Type: application/json

{"orderId":"order-9381","amount":"49.00","currency":"EUR"}
~~~

On success, the server stores the scoped key, request fingerprint, and response with the payment in one durable transaction:

~~~http
HTTP/1.1 201 Created
Location: /payments/pay-7742
Content-Type: application/json

{"id":"pay-7742","status":"authorized","orderId":"order-9381"}
~~~

An exact replay returns the same payment identity and result; it does not authorize another payment. If the same key arrives with \`50.00 EUR\`, the server returns a conflict such as:

~~~json
{
  "code": "idempotency_key_reused",
  "message": "This key belongs to a different request.",
  "correlationId": "req-91b8"
}
~~~

If the first response is lost after authorization, the client retries the identical request and key. It must not generate a new key or alter the body. After expiry, it queries the order’s payment relationship or uses a documented reconciliation path before new work.

Validation errors return safe field details without performing the effect. Conflicts explain current state. Rate limits return documented retry guidance. The client retries temporary failures only within the idempotency contract, caps attempts, and preserves correlation.

*Evidence: [S9 — RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [S11 — Microsoft Web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation), [S45 — Microsoft rate limiting pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern).*

## Design pagination, limits, and long work as contracts

Every collection needs deterministic ordering, bounded pages, filter semantics, and continuation. Offset pagination is inspectable but can shift as rows change. A cursor can preserve a position in the sort order but makes arbitrary page jumps harder.

Document size, page, rate, quota, timeout, and concurrency limits. State what is counted, over which scope and window, and what the caller does next.

For long work, return an operation resource with status, result, failure, expiry, and cancellation semantics. A 202 means accepted, not completed; polling must not restart work.

*Evidence: [S10 — Microsoft Web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S11 — Microsoft Web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation), [S45 — Microsoft rate limiting pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern).*

## Evolve contracts through compatible states

Prefer additive evolution: add optional response fields, new resources, or new operations while old consumers continue to work. A field rename, type change, new required request field, narrowed enum, changed default, reordered side effect, or different error meaning can break a consumer even when the route is unchanged.

Version only when compatibility cannot be preserved. URI, query, header, and media-type versions affect routing, caching, documentation, and tooling differently; choose one policy. Publish ownership, support, deprecation, migration, usage evidence, and a removal gate. Keep old behavior until consumers migrate or policy permits removal.

Test from the consumer’s view: validate responses against the schema, replay representative requests, and keep error and retry fixtures. The provider still owns authorization, invariants, and one coherent contract.

*Evidence: [S10 — Microsoft Web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S11 — Microsoft Web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation).*

## Compare the key design choices

| Choice | Appropriate when | Cost or risk |
|---|---|---|
| Resource operation | The behavior maps cleanly to create, retrieve, replace, update, or delete. | Forcing a business transition into field editing can hide its audit and authorization semantics. |
| Action resource | The transition has its own identity, policy, history, or asynchronous lifecycle. | Adds a concept and route that must remain stable. |
| Offset pagination | Data changes slowly or page-number navigation matters more than stable traversal. | Concurrent inserts and deletes can shift later pages. |
| Cursor pagination | Clients traverse a changing ordered collection and need stable continuation. | Cursors are opaque and couple continuation to a defined sort contract. |
| Additive evolution | Existing meaning can remain while clients adopt new fields or operations. | Old behavior and tests remain supported longer. |
| New API version | A necessary change cannot preserve the old contract. | Multiple versions increase routing, documentation, testing, and retirement work. |

## Secure, observe, and test the boundary

Authenticate the caller, authorize the action and exact resource, and repeat invariant checks at the owning service. Treat identifiers, filters, fields, and idempotency keys as untrusted input. Apply tenant isolation before lookup so “not found” and “forbidden” behavior does not leak another tenant’s existence. Redact credentials and sensitive payloads from logs.

Record route template, contract version, outcome class, latency, payload-size band, rate-limit decision, retry count, idempotency disposition, and correlation or trace context. Avoid high-cardinality raw paths and never put secrets in telemetry. Monitor consumer version usage and deprecated calls so lifecycle decisions use evidence.

Contract tests should cover success, validation, authentication, authorization, missing resources, conflicts, limits, schema compatibility, and stable error codes. For the payment mutation, run exact replay, concurrent same-key requests, same key with a changed fingerprint, crash before and after commit, lost response, in-progress replay, downstream ambiguity, retention expiry, and tenant-scope isolation. Assert the external business effect, not only the HTTP body.

*Evidence: [S10 — Microsoft Web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design), [S11 — Microsoft Web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation), [S22 — OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/).*

## Failure modes to challenge

- **POST means retryable.** Method choice alone does not deduplicate a business effect.
- **The key is global.** One tenant can collide with or probe another tenant’s operation identity.
- **The key ignores the request.** A changed amount silently replays an earlier result.
- **Check then execute.** Two requests pass the lookup before either claims the key.
- **Timeout means failure.** The client starts a new effect although the original may have committed.
- **Errors are prose.** Clients parse message text because no stable code or retry rule exists.
- **Pagination has no order.** Items repeat or disappear between requests with no defined behavior.
- **A version never retires.** Compatibility cost grows without usage evidence or lifecycle ownership.

## API and idempotency review checklist

1. Name each resource owner, action, invariant, actor, and authorization rule.
2. Define request, response, error, size, timeout, pagination, limit, and cancellation contracts.
3. Separate boundary validation from business-invariant validation.
4. Specify idempotency scope, fingerprint, atomic claim, replay, conflict, failure, and lifetime behavior.
5. Give clients a safe algorithm for ambiguous timeouts and exhausted retry windows.
6. Prefer compatible additions; version and deprecate with measured consumer migration.
7. Correlate requests without logging secrets or unbounded identifiers.
8. Test consumer-visible schemas, conflicts, replay, concurrency, limits, and final effects.

## Review questions

1. What business outcome does each operation promise, and who owns it?
2. Which inputs are syntactic, authorized, or business-valid, and where is each checked?
3. Can a caller distinguish retryable, conflicting, forbidden, and final failures without parsing prose?
4. What exactly does an idempotency key identify, for whom, and for how long?
5. What happens when the same key arrives concurrently or with a different fingerprint?
6. How does a client recover after a response is lost or the key has expired?
7. Which changes are additive, which are breaking, and how are consumers migrated?
8. Do tests and telemetry prove one intended external effect across retries and failures?

Continue in the complete handbook at [5. APIs, Contracts, and Idempotency](/book/5-apis-contracts-and-idempotency), its [payment example](/book/5-apis-contracts-and-idempotency#example), and the [API checklist](/book/5-apis-contracts-and-idempotency#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: RFC 9110 and the cited Microsoft architecture guidance were rechecked on 26 August 2026. HTTP intermediaries, framework behavior, gateway policies, rate-limit headers, and client compatibility depend on deployed versions and configuration; verify them for the concrete system._
`;

export const apisIdempotencyArticle = defineGuideArticle({
  markdown,
  slug: "apis-idempotency",
});
