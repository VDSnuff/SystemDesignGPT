import { expect, test, type Page } from "@playwright/test";
import { mockBrowserBoundaries } from "./browser-boundaries";
import { mockReaderBoundaries } from "./mock-reader-boundaries";

const handbookRoute = "/book/1-requirements-frs-nfrs-constraints-and-assumptions";
const revision = "2026-09-01T12:00:00.000Z";
const phoneViewport = { width: 390, height: 844 };
const desktopViewport = { width: 1440, height: 900 };
const KEYBOARD_RESIZE_STEP = 16;
const MAX_TAB_STOPS = 400;

function tabKey(browserName: string) {
  return browserName === "webkit" ? "Alt+Tab" : "Tab";
}

async function focusedDescription(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) return "body";
    return `${active.tagName.toLowerCase()}#${active.id}|${active.getAttribute("aria-label") ?? active.textContent?.trim().slice(0, 40)}`;
  });
}

async function width(page: Page, selector: string) {
  return (await page.locator(selector).boundingBox())?.width ?? 0;
}

test("mobile copilot dialog opens by keyboard, traps focus, closes with Escape, and restores focus", async ({ page }) => {
  await page.setViewportSize(phoneViewport);
  await mockReaderBoundaries(page);
  await page.goto(handbookRoute);

  const launcher = page.getByRole("button", { name: /Open design copilot/ });
  await launcher.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /Design copilot/ });
  const close = dialog.getByRole("button", { name: "Close design copilot" });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  const last = page.locator(":focus");
  await expect(last).not.toHaveAttribute("aria-label", "Close design copilot");
  expect(await dialog.locator(":focus").count()).toBe(1);
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
});

test("search combobox reaches results with ArrowDown, activates with Enter, and closes with Escape", async ({ page }) => {
  await mockBrowserBoundaries(page);
  await page.goto(handbookRoute);
  const search = page.getByRole("combobox", { name: "Search the guide and handbook" });
  await expect(search).toBeEnabled({ timeout: 20_000 });

  await search.focus();
  await page.keyboard.type("9 Security");
  const firstOption = page.getByRole("option").first();
  await expect(firstOption).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(firstOption).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/book\/9-security$/);

  await search.focus();
  await page.keyboard.type("9 Security");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("aria-expanded", "false");
});

test("side panel dividers resize with arrow keys and toggle with Enter as the drag alternative", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await mockReaderBoundaries(page);
  await page.goto(handbookRoute);
  await expect(page.getByLabel("Copilot status: Ready to ask")).toBeVisible();

  const menuHandle = page.getByRole("button", { name: "Resize or collapse complete book menu" });
  const chatHandle = page.getByRole("button", { name: "Resize or collapse design copilot" });
  const navigationWidth = await width(page, ".desktop-navigation");
  const chatWidth = await width(page, ".responsive-chat-surface");

  await menuHandle.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => width(page, ".desktop-navigation")).toBe(navigationWidth + 2 * KEYBOARD_RESIZE_STEP);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => width(page, ".desktop-navigation")).toBe(navigationWidth + KEYBOARD_RESIZE_STEP);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Expand complete book menu" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menuHandle).toHaveAttribute("aria-expanded", "true");
  await expect(menuHandle).toBeFocused();

  await chatHandle.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => width(page, ".responsive-chat-surface")).toBe(chatWidth + KEYBOARD_RESIZE_STEP);
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Expand design copilot" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(chatHandle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("textbox", { name: /Ask about 1. Requirements/ })).toBeVisible();
});

test("progress, quiz, comment, and save complete by keyboard without losing focus", async ({ page }) => {
  await mockReaderBoundaries(page);
  await page.route("**/api/learning-comments**", (route) => route.fulfill({ json: { id: "comment-1" }, status: 201 }));
  await page.route("**/api/learning-state**", (route) => route.request().method() === "PUT"
    ? route.fulfill({ json: { saved: true, updatedAt: revision } })
    : route.fulfill({ json: { state: null, revision: null } }));
  await page.goto(handbookRoute);
  await page.getByText("Ready for your first save.").waitFor();

  const complete = page.getByRole("button", { name: "Mark section complete" });
  await complete.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Section complete · Undo" })).toBeFocused();

  await page.getByRole("tab", { name: "Diagram" }).focus();
  await page.keyboard.press("ArrowRight");
  const quiz = page.getByRole("tabpanel", { name: "Quiz" });
  const answer = quiz.getByRole("radio", { name: "A measurable nonfunctional requirement." });
  await answer.focus();
  await page.keyboard.press("Space");
  await expect(answer).toBeChecked();
  await expect(answer).toBeFocused();
  await expect(quiz.getByText(/^✓ Correct\.$/)).toBeVisible();

  await page.getByRole("tab", { name: "Quiz" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Notes & feedback" })).toBeFocused();
  const comment = page.getByLabel("Learning comment");
  await comment.focus();
  await expect(comment).toBeFocused();
  await page.keyboard.type("Synthetic keyboard comment.");
  await expect(comment).toHaveValue("Synthetic keyboard comment.");
  const send = page.getByRole("button", { name: "Send to owner" });
  await send.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Comment sent to the owner.")).toBeVisible();
  await expect(send).toBeFocused();

  const save = page.getByRole("button", { name: "Save learning work" });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("All learning work for this page is saved.")).toBeVisible();
  await expect(save).toBeFocused();
});

test("the handbook template has no keyboard trap", async ({ browserName, page }) => {
  await mockBrowserBoundaries(page);
  await page.goto(handbookRoute);
  await page.getByText("Ready for your first save.").waitFor();

  const seen = new Set<string>();
  let stops = 0;
  while (stops < MAX_TAB_STOPS) {
    await page.keyboard.press(tabKey(browserName));
    stops += 1;
    const focused = await focusedDescription(page);
    if (focused === "body" || seen.has(focused)) break;
    seen.add(focused);
  }
  expect(stops, "keyboard focus never left the document").toBeLessThan(MAX_TAB_STOPS);
  expect(seen.size).toBeGreaterThan(20);
});
