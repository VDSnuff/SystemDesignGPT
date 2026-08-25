import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name} assessment teaches, links, scores, and retries`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null } }));
    await page.goto("/book/5-apis-contracts-and-idempotency");
    await expect(page.getByText("Ready for your first save.")).toBeVisible();
    await page.getByRole("tab", { name: "Quiz" }).click();

    const incorrect = page.getByRole("radio", { name: "Create a new payment because POST is never retryable." });
    await incorrect.check();
    await expect(page.getByText("POST can support safe retries when the API defines an idempotency contract.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Example" }).first()).toHaveAttribute("href", "#example");

    await page.getByRole("radio", { name: "Recognize the same scoped operation and return the recorded outcome without creating a second payment." }).check();
    await page.getByRole("radio", { name: "The change is backward-incompatible unless versioning or a staged migration preserves old clients." }).check();
    await expect(page.getByText("2 of 2 correct")).toBeVisible();

    await page.getByRole("button", { name: "Retry quiz" }).click();
    await expect(incorrect).not.toBeChecked();
    await expect(page.getByText("Answer every question to see your score.")).toBeVisible();
  });
}

test("reference section explains its deliberate no-quiz policy", async ({ page }) => {
  await page.route("**/api/learning-state**", (route) => route.fulfill({ json: { state: null } }));
  await page.goto("/book/architecture-decision-record-short-template");
  await expect(page.getByText("Ready for your first save.")).toBeVisible();
  await page.getByRole("tab", { name: "Quiz" }).click();

  await expect(page.getByRole("heading", { name: "Practice this section directly" })).toBeVisible();
  await expect(page.getByText(/fill-in template/)).toBeVisible();
});
