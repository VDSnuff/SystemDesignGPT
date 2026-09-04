import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const policy = readFileSync("docs/product-metrics.md", "utf8");
const normalizedPolicy = policy.replace(/\s+/g, " ");
const readme = readFileSync("README.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};

const metricFields = ["Decision informed", "Definition and calculation", "Denominator", "Owner", "Review cadence"];
const productSurfaces = ["handbook", "Quick Guide", "workshop", "copilot"];
const privacyControls = ["Consent", "Minimization", "Retention", "Access", "Deletion", "Provider boundary"];
const analyticsPackages = ["@segment/analytics-next", "@vercel/analytics", "mixpanel-browser", "plausible-tracker", "posthog-js"];

describe("product metrics policy", () => {
  it("publishes the no-additional-analytics decision", () => {
    expect(readme).toContain("does not use page-view or behavioral analytics");
    expect(normalizedPolicy).toContain("will not add product analytics or aggregate event telemetry now");
  });

  it.each(metricFields)("defines the metric field %s", (field) => {
    expect(policy).toContain(field);
  });

  it.each(productSurfaces)("covers the %s outcome", (surface) => {
    expect(policy).toContain(surface);
  });

  it.each(privacyControls)("defines the %s control", (control) => {
    expect(policy).toContain(`**${control}:**`);
  });

  it("excludes raw learning content and stable identifiers", () => {
    expect(normalizedPolicy).toContain("raw handbook notes, learning comments, prompts, model answers, quiz");
    expect(normalizedPolicy).toContain("stable cross-site identifiers");
  });

  it("keeps analytics SDKs out until the future telemetry gate passes", () => {
    const dependencies = packageJson.dependencies ?? {};
    expect(analyticsPackages.filter((name) => name in dependencies)).toEqual([]);
  });
});
