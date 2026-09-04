import { describe, expect, it } from "vitest";
import { guideArticles } from "../app/articles";
import { bookSections } from "../app/book-content.generated";
import { guidePages } from "../app/content";

describe("authored Quick Guide articles", () => {
  it("keeps authored slugs aligned with the guide registry", () => {
    const guideSlugs = new Set(guidePages.map((page) => page.slug));
    const articleSlugs = guideArticles.map((article) => article.slug);

    expect(new Set(articleSlugs).size).toBe(articleSlugs.length);
    expect(articleSlugs.every((slug) => guideSlugs.has(slug))).toBe(true);
  });

  it("ships Requirements as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "requirements");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Worked example: order cancellation",
      "Resolve conflicts instead of hiding them",
      "Common failure modes",
      "Compact requirements worksheet",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Boundaries, state & data as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "boundaries-state-data");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Worked example: an order-status flow",
      "Choose coupling deliberately",
      "Failure modes that diagrams often hide",
      "Review a boundary diagram in seven passes",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2-boundaries-state-and-data");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Networking & communication as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "networking");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Match the communication mode to the contract",
      "Worked example: export progress",
      "Treat partial failure and backpressure as normal",
      "Diagnose the path, not only the service",
      "Network-failure review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2a-networking-and-communication");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Data modeling & partitioning as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "data-modeling");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Choose storage from invariants and access shape",
      "Worked example: tenant order history",
      "Make pagination a stable data contract",
      "Partition only for a concrete limit",
      "Evolve the schema through compatible states",
      "Data-model review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2b-data-modeling-indexing-and-partitioning");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Time, clocks & ordering as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "time-ordering");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Separate the clocks and ordering signals",
      "Store instants and civil intentions differently",
      "Worked example: a ticket hold and payment",
      "Choose the smallest useful ordering guarantee",
      "Define expiry as a state transition",
      "Time-and-order review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/2c-time-clocks-and-ordering");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Concurrency as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "concurrency");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Start with the invariant, not the lock",
      "Map overlap before choosing a mechanism",
      "Worked example: the last concert seat",
      "Compare the coordination choices",
      "Bound locks, waits, and fairness",
      "Failure modes to challenge",
      "Observe and test the conflict contract",
      "Concurrency review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/3-concurrency");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Transactions & consistency as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "transactions-consistency");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Start with the invariant and the visible promise",
      "Choose isolation from the anomaly you must prevent",
      "Worked example: checkout across three owners",
      "Compare consistency and workflow choices",
      "Design read and user-visible consistency",
      "Failure modes to challenge",
      "Verify stale reads, retries, and partial success",
      "Transactions and consistency review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/4-transactions-and-consistency");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships APIs & idempotency as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "apis-idempotency");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Model resources, actions, and validation boundaries",
      "Define the complete idempotency contract",
      "Worked example: create one payment safely",
      "Design pagination, limits, and long work as contracts",
      "Evolve contracts through compatible states",
      "Compare the key design choices",
      "Secure, observe, and test the boundary",
      "Failure modes to challenge",
      "API and idempotency review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/5-apis-contracts-and-idempotency");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Messaging & async work as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "messaging");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Choose the communication contract before the broker",
      "Define ownership, identity, and the message contract",
      "Worked example: accept an order and start fulfillment",
      "Bound retries, poison messages, and replay",
      "Measure age, throughput, and recovery capacity",
      "Failure modes to challenge",
      "Verify delivery, recovery, and the user promise",
      "Messaging review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/6-messaging-and-asynchronous-work");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Real-time & long-running work as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "realtime-work");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Start with the interaction promise",
      "Choose the update channel from the interaction",
      "Define acknowledgement, progress, and terminal states",
      "Worked example: generate a large account export",
      "Bound connections, fan-out, and backpressure",
      "Failure modes to challenge",
      "Verify the lifecycle, not only the happy path",
      "Real-time and long-running work review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/6a-real-time-and-long-running-work");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships LLM & agentic systems as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "agentic-systems");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_800);
    expect(article?.wordCount).toBeLessThanOrEqual(3_000);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Choose the least autonomy that satisfies the requirement",
      "Design model, context, tools, and memory as separate boundaries",
      "Worked example: a bounded order-cancellation agent",
      "Treat MCP and A2A as contracts, not trust",
      "Specify behavior before implementation",
      "Evaluate outcomes, trajectories, and side effects",
      "Failure modes to challenge",
      "Agent-system review checklist",
      "Review questions",
    ]));
    expect(article?.markdown).toContain("/book/15-llm-and-agentic-systems");
    expect(article?.markdown).toContain("/book/16-spec-driven-development-for-agentic-systems");
    expect(article?.markdown).toContain("/book/17-agent-system-design-review-checklist");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toContain("24 August 2026");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("ships Requirements-to-delivery as a substantive evidence-linked article", () => {
    const article = guideArticles.find(({ slug }) => slug === "delivery-lifecycle");

    expect(article).toBeDefined();
    expect(article?.wordCount).toBeGreaterThanOrEqual(1_000);
    expect(article?.wordCount).toBeLessThanOrEqual(1_800);
    expect(article?.headings.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Build the smallest useful traceability chain",
      "Choose the artifact by the decision being made",
      "Worked example: cancel a pending order safely",
      "Control change without erasing history",
      "Avoid documentation theatre",
      "Delivery review questions",
    ]));
    expect(article?.markdown).toContain("/book/14-requirements-to-delivery-lifecycle-fr-nfr-constraints-adr-and-tip");
    expect(article?.markdown).toContain("evidence and verification register");
    expect(article?.markdown).toMatch(/Evidence: \[S\d+/);
  });

  it("keeps article handbook links and evidence IDs canonical", () => {
    const bookSlugs = new Set<string>(bookSections.map(({ slug }) => slug));
    const referenceSection = bookSections.find(({ slug }) => slug === "references-and-verification-register");
    const evidenceIds = new Set(
      [...(referenceSection?.markdown.matchAll(/^\| (S\d+) \|/gm) ?? [])].map((match) => match[1]),
    );

    for (const article of guideArticles) {
      const linkedSlugs = [...article.markdown.matchAll(/\]\(\/book\/([^#)]+)/g)].map((match) => match[1]);
      const citedIds = [...article.markdown.matchAll(/\[(S\d+) —/g)].map((match) => match[1]);

      expect(linkedSlugs.length).toBeGreaterThan(0);
      expect(linkedSlugs.every((slug) => bookSlugs.has(slug))).toBe(true);
      expect(citedIds.length).toBeGreaterThan(0);
      expect(citedIds.every((id) => evidenceIds.has(id))).toBe(true);
    }
  });
});
