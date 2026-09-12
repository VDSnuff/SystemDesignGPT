import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  return results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
}
