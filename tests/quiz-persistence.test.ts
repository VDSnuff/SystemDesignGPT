import { describe, expect, it } from "vitest";
import { decodeQuizAnswers, QUIZ_STORAGE_VERSION, serializeQuizAnswers } from "../app/quiz-persistence";

describe("quiz answer persistence", () => {
  it("round-trips the authored quiz storage version", () => {
    const serialized = serializeQuizAnswers([2, -1, 0]);

    expect(JSON.parse(serialized)).toEqual({ version: QUIZ_STORAGE_VERSION, answers: [2, -1, 0] });
    expect(decodeQuizAnswers(serialized)).toEqual({ answers: [2, -1, 0], warning: undefined });
  });

  it("explicitly invalidates unversioned generated answer arrays", () => {
    expect(decodeQuizAnswers("[0,1]")).toEqual({
      answers: [],
      warning: "Saved answers used the retired generated quiz format and were cleared for this authored assessment.",
    });
  });

  it("fails malformed current storage to a recoverable empty state", () => {
    const decoded = decodeQuizAnswers('{"version":2,"answers":[4]}');

    expect(decoded.answers).toEqual([]);
    expect(decoded.warning).toContain("invalid");
  });
});
