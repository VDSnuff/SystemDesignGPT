import { defineGuideArticle } from "./article";

const markdown = `
## Start with the load model

Scaling begins with a measurable workload. **Throughput** is completed work per unit of time, **latency** is the time one operation takes, and **concurrency** is work currently in progress. Describe normal, peak, and growth traffic; read/write mix; payload sizes; and bursty work. State the user-visible latency and error objectives.

A compact capacity workflow is:

1. Describe traffic shape and growth with ranges, peaks, and burst duration.
2. Convert it into requests, bytes, records, and concurrent work at each major dependency.
3. Measure where latency rises, queues grow, or a resource approaches its safe limit.
4. Choose the smallest scaling or caching change that relieves that constraint.
5. Validate the change with representative load, failure, and recovery tests.

Treat every number as an assumption until telemetry or a controlled test supports it. Recheck quotas, connection limits, instance shapes, and pricing against the deployed region and version.

*Evidence: [S31 — Microsoft Azure Well-Architected performance efficiency](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/), [S44 — Microsoft capacity planning guidance](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning).*

## Estimate the few numbers that change a decision

Estimate orders of magnitude before selecting components: peak request rate, data growth, bandwidth, concurrency, connections, partitions, queue drain time, and cost. Show units and assumptions.

A rough concurrency estimate is request rate multiplied by time in the system. At 600 requests per second and 300 milliseconds, about 180 requests are in flight. Slow dependencies increase both time and concurrency. A 20 KB response at that rate is about 12 MB/s before overhead.

Separate raw records from indexes, replicas, and backups. Eight million 2 KB orders per month produce about 16 GB raw monthly and 384 GB over 24 months; measure the deployed amplification.

Headroom must cover bursts, instance loss, deployments, and forecast error. One benchmark is not a permanent capacity claim.

## Find the bottleneck and queuing boundary

A **bottleneck** is the resource that limits useful throughput. **Saturation** means a scarce resource is near its safe limit: CPU, memory, storage input/output, network, worker slots, database connections, locks, or an external quota. Measure latency percentiles, throughput, errors, saturation, and queue age together. Average latency can look healthy while the slowest user requests deteriorate.

When offered work exceeds completed work, a queue grows. A queue smooths a brief burst but does not create capacity. Bound its length or age and scale consumers within downstream limits. If consumers drain 400 jobs per second while producers sustain 500, backlog grows by 100 per second; more consumers help only if dependencies can accept them.

Trace one request to locate waiting time and resource use. More application instances cannot fix a database lock hotspot.

*Evidence: [S13 — Microsoft queue-based load leveling pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling), [S31 — Microsoft Azure Well-Architected performance efficiency](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/).*

## Compare scaling choices

| Choice | Best fit | Main tradeoff |
|---|---|---|
| Vertical scale | A component benefits from more CPU, memory, or faster storage and can tolerate a bounded host size. | Simple, but has a ceiling and can increase replacement cost and failure impact. |
| Horizontal scale | Stateless or partitionable work can run across more instances. | Needs load distribution, coordination, and proof that shared dependencies will not saturate. |
| Queue and bounded consumers | Work may complete asynchronously and bursts should be smoothed. | Adds delay, backlog operations, duplicate handling, and expiry policy. |
| Partition data or work | One node or partition cannot carry the volume. | Keys, rebalancing, cross-partition operations, and hotspots become design concerns. |
| Cache repeated reads | Recomputing or reading the same data is a measured latency or load problem. | Adds staleness, invalidation, memory cost, and a new failure mode. |

Scaling modes are often combined. Autoscaling signals must match the real constraint; CPU is a poor signal when connections or queue age are the bottleneck.

## Worked example: size an order-read path

Suppose an order service expects a peak of 600 requests per second for 15 minutes, a 300 millisecond p95 latency objective, and 20 KB responses. A representative load test shows one application instance sustains 80 requests per second below its latency and saturation thresholds.

Throughput alone suggests eight instances. That leaves no room for failure or deployment, so the team tests twelve under those scenarios rather than declaring them sufficient. The path carries roughly 12 MB/s before overhead and 180 concurrent requests at the target.

Sixty percent read product metadata: 360 reads per second without caching. A measured 90% hit ratio reduces ordinary origin reads to about 36. Test cold starts, invalidations, hot products, cache failure, and retries; the database remains authoritative and needs bounded bypass capacity.

The estimate exposes instance count, network budget, database capacity, cache-failure headroom, and scaling signals.

## Treat the cache as a data system

A cache stores copies, so define the authority and writers. With cache-aside, the application checks the cache, loads the origin on a miss, and stores the copy. Update the authority and invalidate the copy; concurrent readers can still see stale data.

Include every dimension that changes an answer in its key: tenant, authorization scope, locale, identity, and representation version. Omitting tenant or permission can leak data. Old key versions need bounded retention.

The **time to live (TTL)** is how long an entry remains before expiration. Short TTLs reduce staleness but increase origin load; long TTLs reverse that tradeoff. Define how freshness returns and what users see meanwhile.

*Evidence: [S20 — Microsoft cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside), [S21 — Microsoft caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching).*

## Worked cache decision: product catalog reads

A catalog page contains a description, current price, and stock status. Descriptions change infrequently and the product owner accepts up to 60 seconds of staleness. Price and stock drive a purchase promise and require a stricter authoritative check. Caching the complete page under one long-lived key would make the risky fields as stale as the description.

Cache the description with tenant, locale, product ID, and representation version in the key, a 60-second TTL, and update invalidation. Read price and stock from authoritative paths and verify them at checkout. This costs extra calls but keeps the purchase contract honest.

Track hit ratio, miss latency, origin load, eviction, entry age, invalidation delay, memory, and cost. A high hit ratio cannot excuse stale or unauthorized results.

## Control hotspots, stampedes, and cache failure

A **hotspot** is a key or partition receiving a disproportionate share of traffic. A **cache stampede** occurs when many requests miss or expire together and all refill the same value. Popular launches, synchronized TTLs, cold deployments, and cache restarts can create both.

Coalesce refreshes so one request loads a value, vary expiration times, warm proven hot data, and limit origin admission. Serving recently expired data while refreshing is valid only when that staleness is accepted.

Bypass preserves availability only if the origin accepts the surge. Protect it with rate limits, bounded concurrency, and deliberate degradation. Define local-cache divergence, invalidation, and recovery.

## Failure modes to challenge

- **Scale every tier together.** It increases cost without proving which resource constrains throughput.
- **Use average traffic and latency.** Peaks, bursts, and tail latency determine user harm and saturation.
- **Unbounded queue as capacity.** It converts overload into rising delay and expired work.
- **Autoscale on a convenient metric.** More workers can amplify pressure on the actual bottleneck.
- **Cache everything.** Volatile, sensitive, rarely reused, or correctness-critical data may cost more to cache safely than to read directly.
- **TTL as complete invalidation.** Users can remain wrong for the entire TTL, and synchronized expiry can overload the origin.
- **Cache hit ratio as the only goal.** Correctness, origin protection, latency, memory, and cost matter together.
- **Benchmark the happy path once.** Warm caches and uniform keys conceal cold starts, hotspots, failures, and long-run leaks.

## Verify performance with representative load

Run baseline, expected, peak, overload, and sustained tests. Use realistic payloads, data distribution, hot keys, read/write mix, dependency latency, cache warmth, and connections. Exercise cache loss, instance loss, deployment, and controlled recovery.

Record version, environment, dataset, workload, duration, and thresholds. Verify latency percentiles and errors alongside queues, connections, saturation, cache behavior, and quotas. The result is a supported operating envelope and known degradation boundary, not unlimited scale.

Run the guide itself at wide and narrow widths. Follow links and headings by keyboard, confirm tables reflow without page-level horizontal scrolling, and keep equations readable as text.

*Evidence: [S24 — Google SRE launch coordination checklist](https://sre.google/sre-book/launch-checklist/), [S31 — Microsoft Azure Well-Architected performance efficiency](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/), [S44 — Microsoft capacity planning guidance](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning).*

## Scale, performance, and caching review checklist

1. State normal, peak, burst, and growth traffic with a latency and error objective.
2. Estimate throughput, concurrency, bandwidth, data growth, connections, queue drain time, and cost where they change a decision.
3. Identify the measured bottleneck and its safe operating limit.
4. Keep queues, pools, and concurrency bounded, with explicit overload behavior.
5. Match vertical, horizontal, partition, queue, and autoscaling choices to the actual constraint.
6. Give every cached value an authority, key schema, freshness contract, TTL or invalidation path, and failure policy.
7. Test cold caches, hotspots, stampedes, dependency limits, instance loss, and recovery.
8. Record the supported operating envelope and alert before saturation.

## Review questions

1. Which traffic assumption most changes this design, and how will it be verified?
2. What resource saturates first at peak, and what user signal appears before failure?
3. How long can the system sustain and drain a burst without violating the product promise?
4. Why does the autoscaling signal track the true bottleneck?
5. Which data is authoritative, and what staleness is acceptable for each cached field?
6. Can a cache key cross tenant, permission, locale, or representation boundaries?
7. How are simultaneous misses and cache failure prevented from overwhelming the origin?
8. What test evidence supports the operating envelope and cost estimate?

Continue in the complete handbook at [8. Scale, Capacity, Performance, and Caching](/book/8-scale-capacity-performance-and-caching) and its [capacity review checklist](/book/8-scale-capacity-performance-and-caching#capacity-review-checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: the cited Microsoft and Google guidance was rechecked on 27 August 2026. Service quotas, instance capabilities, cache behavior, pricing, and provider limits vary by region and version; verify them against the deployed environment before making a capacity commitment._
`;

export const scalePerformanceArticle = defineGuideArticle({
  markdown,
  slug: "scale-performance",
});
