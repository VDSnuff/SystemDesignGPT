import { describe, expect, it } from "vitest";
import { bookChecklistIds } from "../app/book-learning.generated";
import {
  decodeStoredProgress,
  handleHandbookProgressGet,
  handleHandbookProgressPut,
} from "../app/handbook-progress-handlers";
import type {
  HandbookProgressRecord,
  HandbookProgressRepository,
  HandbookProgressWrite,
} from "../app/handbook-progress-contract";

function record(userId: string, sectionSlug: string): HandbookProgressRecord {
  return {
    userId,
    lastPageSlug: sectionSlug,
    lastHeadingId: null,
    completedSectionsPayload: JSON.stringify([sectionSlug]),
    checkedItemsPayload: JSON.stringify([bookChecklistIds[0]]),
    updatedAt: "2026-08-25T12:00:00.000Z",
  };
}

function request(method: "GET" | "PUT", userId?: string, body?: unknown, hasOrigin = true) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (userId) {
    headers.set("oai-authenticated-user-email", `${userId}@example.com`);
    headers.set("oai-authenticated-user-id", userId);
  }
  if (hasOrigin) headers.set("origin", "http://localhost");
  return new Request("http://localhost/api/handbook-progress", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function responseBody(response: Response) {
  return await response.json() as { state?: { completedSections: string[] }; warning?: string };
}

describe("handbook progress persistence handlers", () => {
  it("rejects unauthenticated reads and cross-origin writes before repository access", async () => {
    let wasAccessed = false;
    const repository: HandbookProgressRepository = {
      find: async () => { wasAccessed = true; return null; },
      save: async () => { wasAccessed = true; },
    };

    expect((await handleHandbookProgressGet(request("GET"), repository)).status).toBe(401);
    expect((await handleHandbookProgressPut(request("PUT", "user-a", {}, false), repository)).status).toBe(403);
    expect(wasAccessed).toBe(false);
  });

  it("isolates reads and writes by the authenticated user", async () => {
    const rows = new Map([
      ["user-a", record("user-a", "9-security")],
      ["user-b", record("user-b", "3-concurrency")],
    ]);
    const writes: HandbookProgressWrite[] = [];
    const repository: HandbookProgressRepository = {
      find: async (userId) => rows.get(userId) ?? null,
      save: async (value) => { writes.push(value); },
    };

    const userA = await responseBody(await handleHandbookProgressGet(request("GET", "user-a"), repository));
    const userB = await responseBody(await handleHandbookProgressGet(request("GET", "user-b"), repository));
    expect(userA.state?.completedSections).toEqual(["9-security"]);
    expect(userB.state?.completedSections).toEqual(["3-concurrency"]);

    const state = { lastRead: null, completedSections: ["9-security"], checkedItems: [bookChecklistIds[0]] };
    expect((await handleHandbookProgressPut(request("PUT", "user-a", state), repository)).status).toBe(200);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ userId: "user-a", completedSections: ["9-security"] });
  });

  it("rejects stale generated mappings and removes them from legacy records", async () => {
    const repository: HandbookProgressRepository = { find: async () => null, save: async () => undefined };
    const staleState = { lastRead: null, completedSections: ["removed-section"], checkedItems: ["removed-checklist"] };

    expect((await handleHandbookProgressPut(request("PUT", "user-a", staleState), repository)).status).toBe(400);
    const decoded = decodeStoredProgress({
      ...record("user-a", "9-security"),
      completedSectionsPayload: JSON.stringify(["9-security", "removed-section"]),
      checkedItemsPayload: JSON.stringify([bookChecklistIds[0], "removed-checklist"]),
    });
    expect(decoded.state.completedSections).toEqual(["9-security"]);
    expect(decoded.state.checkedItems).toEqual([bookChecklistIds[0]]);
    expect(decoded.warning).toContain("updated safely");
  });
});
