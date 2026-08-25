// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "../app/components/ChatPanel";
import { statusPresentation } from "../app/copilot-status";

const panelProps = {
  fallbackHref: "#learning-lab",
  fallbackLabel: "Open section learning lab",
  pageId: "book:introduction",
  pageLabel: "Introduction",
  prompts: ["Challenge the assumptions"],
} as const;

function statusResponse(status: "ready" | "unconfigured") {
  return Response.json({ status });
}

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

async function sendQuestion() {
  const user = userEvent.setup();
  await user.type(await screen.findByRole("textbox", { name: "Ask about Introduction" }), "Review this");
  await user.click(screen.getByRole("button", { name: "Send question" }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("ChatPanel service states", () => {
  it("defines the six explicit client states", () => {
    expect(Object.keys(statusPresentation)).toEqual([
      "checking",
      "ready",
      "sending",
      "usage-limited",
      "unconfigured",
      "temporarily-unavailable",
    ]);
  });

  it("shows ready after a configuration-only check and renders successful answers", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(statusResponse("ready"))
      .mockResolvedValueOnce(Response.json({ answer: "Use a bounded retry budget.", status: "ready" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatPanel {...panelProps} />);

    expect(await screen.findByText("Ready to ask")).toBeTruthy();
    await sendQuestion();

    expect(await screen.findByText("Use a bounded retry budget.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a provider usage limit as a persistent notice with non-AI actions", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(statusResponse("ready"))
      .mockResolvedValueOnce(errorResponse("usage_limited", "The AI project has reached a usage limit.", 429)));
    render(<ChatPanel {...panelProps} />);

    await sendQuestion();

    expect(await screen.findByText("Usage limited")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("The AI project has reached a usage limit.");
    expect(screen.getByRole("link", { name: "Open section learning lab" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy review prompt" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Ask about Introduction" })).toHaveProperty("disabled", true);
    expect(screen.queryByText("The AI project has reached a usage limit.", { selector: ".message-assistant" })).toBeNull();

    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "Copy review prompt" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("requirements, assumptions, failure modes"));
  });

  it("shows the unconfigured state before a user sends a question", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse("unconfigured")));
    render(<ChatPanel {...panelProps} />);

    expect(await screen.findByText("Not configured")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("has not been configured");
    expect(screen.getByRole("button", { name: "Check setup again" })).toBeTruthy();
  });

  it("shows provider failures as temporarily unavailable and offers a manual recheck", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(statusResponse("ready"))
      .mockResolvedValueOnce(errorResponse("provider_unavailable", "The copilot provider is temporarily unavailable.", 503)));
    render(<ChatPanel {...panelProps} />);

    await sendQuestion();

    expect(await screen.findByText("Temporarily unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check setup again" })).toBeTruthy();
  });

  it("shows malformed responses as unavailable instead of an assistant answer", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(statusResponse("ready"))
      .mockResolvedValueOnce(errorResponse("malformed_response", "The copilot returned an invalid response.", 502)));
    render(<ChatPanel {...panelProps} />);

    await sendQuestion();

    expect((await screen.findByRole("alert")).textContent).toContain("invalid response");
    expect(screen.queryByText("The copilot returned an invalid response.", { selector: ".message-assistant" })).toBeNull();
  });

  it("distinguishes a browser network failure and never retries automatically", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(statusResponse("ready"))
      .mockRejectedValueOnce(new TypeError("network down"));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatPanel {...panelProps} />);

    await sendQuestion();

    expect((await screen.findByRole("alert")).textContent).toContain("could not be reached");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
