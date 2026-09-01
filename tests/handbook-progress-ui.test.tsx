// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bookLearningSections } from "../app/book-learning.generated";
import { bookProgressSections } from "../app/book-progress.generated";
import { HandbookProgressPanel } from "../app/components/HandbookProgressPanel";
import { HandbookProgressProvider } from "../app/components/HandbookProgressProvider";
import { SectionProgressControls } from "../app/components/SectionProgressControls";

const revision = "2026-08-25T12:00:00.000Z";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderProgress(children: React.ReactNode) {
  return render(<HandbookProgressProvider>{children}</HandbookProgressProvider>);
}

describe("handbook progress states", () => {
  it("shows first-use guidance and saves user-controlled completion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ state: null, revision: null }))
      .mockResolvedValueOnce(Response.json({ saved: true, updatedAt: revision }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderProgress(<><HandbookProgressPanel /><SectionProgressControls sectionSlug="9-security" /></>);

    expect(await screen.findByText(/No saved progress yet/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mark section complete" }));
    expect(screen.getByRole("button", { name: /Section complete/ }).getAttribute("aria-pressed")).toBe("true");
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({ completedSections: ["9-security"], expectedUpdatedAt: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows resume, path progress, and the complete state", async () => {
    const security = bookLearningSections.find((section) => section.slug === "9-security");
    const headingId = security?.headings[0].id ?? null;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      state: {
        lastRead: { sectionSlug: "9-security", headingId },
        completedSections: bookProgressSections.map((section) => section.slug),
        checkedItems: [],
      },
      revision,
    })));
    renderProgress(<HandbookProgressPanel />);

    const resume = await screen.findByRole("link", { name: /Resume reading · 9. Security/ });
    expect(resume.getAttribute("href")).toBe(`/book/9-security#${headingId}`);
    expect(screen.getByText(/All handbook sections are complete/)).toBeTruthy();
    expect(screen.getByText("Guided learning paths")).toBeTruthy();
  });

  it("keeps controls available with clear signed-out and error copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { message: "Sign in to load handbook progress." },
      { status: 401 },
    )));
    const user = userEvent.setup();
    renderProgress(<><HandbookProgressPanel /><SectionProgressControls sectionSlug="9-security" /></>);

    expect(await screen.findByText(/Sign in to save progress across visits/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mark section complete" }));
    expect(screen.getByRole("button", { name: /Section complete/ })).toBeTruthy();
  });

  it("keeps reading available when persistence fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { message: "Saved handbook progress is temporarily unavailable." },
      { status: 503 },
    )));
    renderProgress(<HandbookProgressPanel />);

    expect(await screen.findByText(/saved progress is temporarily unavailable/)).toBeTruthy();
  });
});
