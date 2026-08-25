// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagramBuilder } from "../app/components/DiagramBuilder";
import { initialDiagram } from "../app/diagram-model";

const savedPayload = { note: "", diagram: initialDiagram, quizAnswers: [] };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("workshop diagram persistence", () => {
  it("loads saved work and persists edits with the shared versioned schema", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ state: savedPayload }))
      .mockResolvedValueOnce(Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DiagramBuilder pageSlug="diagram-workshop" />);

    expect(await screen.findByText("Saved workshop diagram loaded.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Service: API" }));
    const label = screen.getByLabelText("Selected node label");
    await user.clear(label);
    await user.type(label, "Gateway API");
    await user.click(screen.getByRole("button", { name: "Save workshop diagram" }));

    expect(await screen.findByText("Workshop diagram saved for your next visit.")).toBeTruthy();
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(request.body as string) as { pageSlug: string; diagram: typeof initialDiagram };
    expect(body.pageSlug).toBe("diagram-workshop");
    expect(body.diagram.version).toBe(1);
    expect(body.diagram.nodes[1].label).toBe("Gateway API");
  });

  it("keeps editing available while clearly disabling persistence for signed-out readers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { message: "Sign in to load learning work." },
      { status: 401 },
    )));
    render(<DiagramBuilder pageSlug="diagram-workshop" />);

    expect(await screen.findByText(/You can edit this diagram now. Sign in to save/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Client" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save workshop diagram" })).toHaveProperty("disabled", true);
  });
});
