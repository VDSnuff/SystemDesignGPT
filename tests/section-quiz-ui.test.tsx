// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearningLab } from "../app/components/LearningLab";
import { SectionQuiz } from "../app/components/SectionQuiz";
import { initialDiagram } from "../app/diagram-model";
import type { QuizPolicy } from "../app/quiz-contract";

const policy: QuizPolicy = {
  slug: "sample",
  kind: "quiz",
  questions: [{
    id: "scenario",
    prompt: "Which choice preserves the contract?",
    reference: { label: "Relevant heading", href: "#relevant-heading" },
    options: [
      { label: "Break it", feedback: "This silently breaks deployed consumers.", isCorrect: false },
      { label: "Preserve it", feedback: "This preserves compatibility for deployed consumers.", isCorrect: true },
    ],
  }, {
    id: "failure",
    prompt: "Which choice handles failure?",
    reference: { label: "Failure heading", href: "#failure-heading" },
    options: [
      { label: "Ignore it", feedback: "Ignoring the error removes recovery evidence.", isCorrect: false },
      { label: "Bound it", feedback: "Bounding failure protects resources and callers.", isCorrect: true },
    ],
  }],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("authored quiz interaction", () => {
  it("teaches the selected distinction and exposes its handbook reference", async () => {
    const onAnswer = vi.fn();
    render(<SectionQuiz answers={[0]} onAnswer={onAnswer} onRetry={() => undefined} policy={policy} />);

    expect(screen.getByText("Not quite.")).toBeTruthy();
    expect(screen.getByText("This silently breaks deployed consumers.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Relevant heading" }).getAttribute("href")).toBe("#relevant-heading");
  });

  it("retries answers without discarding the saved note or diagram", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ state: { note: "keep me", diagram: initialDiagram, quizAnswers: [1, 0] } }))
      .mockResolvedValueOnce(Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LearningLab pageSlug="sample" quizPolicy={policy} />);

    expect(await screen.findByText("Saved work loaded.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Quiz" }));
    await user.click(screen.getByRole("button", { name: "Retry quiz" }));
    await user.click(screen.getByRole("button", { name: "Save learning work" }));

    const request = fetchMock.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(request.body as string) as { note: string; diagram: typeof initialDiagram; quizAnswers: number[] };
    expect(body.note).toBe("keep me");
    expect(body.diagram).toEqual(initialDiagram);
    expect(body.quizAnswers).toEqual([]);
  });
});
