// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OwnerComments } from "../app/owner/comments/OwnerComments";

const firstComment = {
  id: "comment-1",
  userEmail: "learner-a@example.test",
  pageSlug: "9-security",
  pageTitle: "9. Security",
  body: "Please clarify this boundary.",
  status: "new" as const,
  createdAt: "2026-08-29T10:00:00.000Z",
};

const olderComment = {
  id: "comment-2",
  userEmail: "learner-b@example.test",
  pageSlug: "3-concurrency",
  pageTitle: "3. Concurrency",
  body: "This example helped.",
  status: "read" as const,
  createdAt: "2026-08-28T10:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("owner comment review", () => {
  it("shows empty and failed loading states truthfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ comments: [] })));
    const { unmount } = render(<OwnerComments />);
    expect(await screen.findByText("No learning comments yet.")).toBeTruthy();
    unmount();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(
      { message: "Comments are temporarily unavailable." },
      { status: 503 },
    )));
    render(<OwnerComments />);
    expect((await screen.findByText("Comments are temporarily unavailable.")).getAttribute("role")).toBe("alert");
  });

  it("updates, paginates, deduplicates stale results, and deletes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ comments: [firstComment], nextCursor: "older" }))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(Response.json({ comments: [firstComment, olderComment] }))
      .mockResolvedValueOnce(Response.json({ deleted: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<OwnerComments />);

    await user.click(await screen.findByRole("button", { name: "Mark read" }));
    expect(screen.getByText("Status: Read")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mark new" }));
    expect(screen.getByText("Status: New")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Load older comments" }));
    expect(screen.getAllByText(firstComment.body)).toHaveLength(1);
    expect(screen.getByText(olderComment.body)).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.queryByText(firstComment.body)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
