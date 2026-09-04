import type { Page } from "@playwright/test";
import type { HandbookProgress } from "../../app/handbook-progress";
import { mockChatBoundary } from "./mock-chat";

export interface ProgressStore { state: HandbookProgress | null }

const revision = "2026-09-01T12:00:00.000Z";

export async function mockReaderBoundaries(page: Page, progressStore: ProgressStore = { state: null }) {
  await mockChatBoundary(page, "Review requirements first.");
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null, revision: null } }));
  await page.route("**/api/handbook-progress", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { state: progressStore.state, revision: progressStore.state ? revision : null } });
    progressStore.state = route.request().postDataJSON() as HandbookProgress;
    return route.fulfill({ json: { saved: true, updatedAt: revision } });
  });
}
