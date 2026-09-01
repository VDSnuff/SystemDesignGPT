import { describe, expect, it } from "vitest";
import { initialDiagram } from "../app/diagram-model";
import {
  decodeStoredState,
  handleLearningStateDelete,
  handleLearningStateGet,
  handleLearningStatePut,
} from "../app/learning-state-handlers";
import type {
  LearningStateRecord,
  LearningStateRepository,
  LearningStateWrite,
} from "../app/learning-state-contract";
import { serializeQuizAnswers } from "../app/quiz-persistence";

const revision = "2026-08-25T12:00:00.000Z";

function record(userId: string, label: string): LearningStateRecord {
  return {
    userId,
    pageSlug: "diagram-workshop",
    note: "private note",
    diagramPayload: JSON.stringify({
      ...initialDiagram,
      nodes: initialDiagram.nodes.map((node, index) => index === 0 ? { ...node, label } : node),
    }),
    quizPayload: serializeQuizAnswers([]),
    updatedAt: revision,
  };
}

function request(method: "DELETE" | "GET" | "PUT", userId: string, body?: unknown) {
  const url = "http://localhost/api/learning-state?page=diagram-workshop";
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "oai-authenticated-user-email": `${userId}@example.com`,
      "oai-authenticated-user-id": userId,
      origin: "http://localhost",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function body(response: Response) {
  return await response.json() as { state?: { diagram: typeof initialDiagram }; warning?: string };
}

describe("learning-state persistence handlers", () => {
  it("rejects unauthenticated reads and cross-origin writes before repository access", async () => {
    let wasAccessed = false;
    const repository: LearningStateRepository = {
      deleteForUser: async () => { wasAccessed = true; },
      find: async () => { wasAccessed = true; return null; },
      save: async () => { wasAccessed = true; return true; },
    };
    const read = new Request("http://localhost/api/learning-state?page=diagram-workshop");
    const write = new Request("http://localhost/api/learning-state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "oai-authenticated-user-email": "user-a@example.com",
        "oai-authenticated-user-id": "user-a",
      },
      body: JSON.stringify({ pageSlug: "diagram-workshop", note: "", diagram: initialDiagram, quizAnswers: [], expectedUpdatedAt: null }),
    });

    expect((await handleLearningStateGet(read, repository)).status).toBe(401);
    expect((await handleLearningStatePut(write, repository)).status).toBe(403);
    expect(wasAccessed).toBe(false);
  });

  it("reads and writes state only through the authenticated user's key", async () => {
    const rows = new Map([["user-a:diagram-workshop", record("user-a", "A private diagram")], ["user-b:diagram-workshop", record("user-b", "B private diagram")]]);
    const writes: LearningStateWrite[] = [];
    const repository: LearningStateRepository = {
      deleteForUser: async () => undefined,
      find: async (userId, pageSlug) => rows.get(`${userId}:${pageSlug}`) ?? null,
      save: async (value) => { writes.push(value); return true; },
    };

    const responseA = await handleLearningStateGet(request("GET", "user-a"), repository);
    const responseB = await handleLearningStateGet(request("GET", "user-b"), repository);
    expect((await body(responseA)).state?.diagram.nodes[0].label).toBe("A private diagram");
    expect((await body(responseB)).state?.diagram.nodes[0].label).toBe("B private diagram");

    const payload = { pageSlug: "diagram-workshop", note: "", diagram: initialDiagram, quizAnswers: [], expectedUpdatedAt: revision };
    expect((await handleLearningStatePut(request("PUT", "user-a", payload), repository)).status).toBe(200);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ userId: "user-a", pageSlug: "diagram-workshop", expectedUpdatedAt: revision });
  });

  it("rejects a stale write without overwriting the stored learning work", async () => {
    const repository: LearningStateRepository = {
      deleteForUser: async () => undefined,
      find: async () => record("user-a", "Current diagram"),
      save: async () => false,
    };
    const payload = { pageSlug: "diagram-workshop", note: "stale", diagram: initialDiagram, quizAnswers: [], expectedUpdatedAt: revision };

    const response = await handleLearningStatePut(request("PUT", "user-a", payload), repository);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining("another session") });
    const legacyPayload = { pageSlug: "diagram-workshop", note: "stale", diagram: initialDiagram, quizAnswers: [] };
    expect((await handleLearningStatePut(request("PUT", "user-a", legacyPayload), repository)).status).toBe(409);
  });

  it("deletes every learning-state row only for the authenticated user", async () => {
    const deletedUsers: string[] = [];
    const repository: LearningStateRepository = {
      deleteForUser: async (userId) => { deletedUsers.push(userId); },
      find: async () => null,
      save: async () => true,
    };

    expect((await handleLearningStateDelete(request("DELETE", "user-a"), repository)).status).toBe(200);
    expect(deletedUsers).toEqual(["user-a"]);
  });

  it("migrates valid legacy diagrams without discarding learning work", () => {
    const decoded = decodeStoredState({
      ...record("user-a", "unused"),
      diagramPayload: JSON.stringify({
        nodes: [{ id: 1, kind: "Client", label: "Legacy", x: 700, y: 500 }],
        connections: [],
      }),
    });

    expect(decoded.state.note).toBe("private note");
    expect(decoded.state.diagram).toMatchObject({ version: 1, nodes: [{ label: "Legacy", x: 544, y: 358 }] });
    expect(decoded.warning).toBeUndefined();
  });

  it("recovers an invalid stored diagram explicitly while preserving the note", () => {
    const decoded = decodeStoredState({ ...record("user-a", "unused"), diagramPayload: "not-json" });

    expect(decoded.state.note).toBe("private note");
    expect(decoded.state.diagram).toEqual(initialDiagram);
    expect(decoded.warning).toContain("invalid and has been reset");
  });

  it("invalidates legacy generated answers with an explicit migration warning", () => {
    const decoded = decodeStoredState({ ...record("user-a", "unused"), quizPayload: "[1,0]" });

    expect(decoded.state.quizAnswers).toEqual([]);
    expect(decoded.warning).toContain("retired generated quiz format");
  });
});
