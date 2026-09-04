import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const policy = readFileSync("docs/localization-policy.md", "utf8");
const readme = readFileSync("README.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};

const futureBoundaries = [
  "Routing",
  "Metadata and discovery",
  "Generated content",
  "Glossary",
  "Diagrams",
  "Quizzes",
  "Copilot context",
] as const;

const runtimeI18nPackages = [
  "@lingui/core",
  "@lingui/react",
  "i18next",
  "next-intl",
  "react-i18next",
  "react-intl",
] as const;

describe("localization policy", () => {
  it("publishes the current English-only support boundary", () => {
    expect(readme).toContain("currently English-only");
    expect(policy).toContain("Localization is future work, not a committed product requirement or release.");
  });

  it.each(futureBoundaries)("documents the future %s boundary", (boundary) => {
    expect(policy).toContain(`### ${boundary}`);
  });

  it("keeps runtime i18n dependencies out until a language is committed", () => {
    const dependencies = packageJson.dependencies ?? {};
    expect(runtimeI18nPackages.filter((name) => name in dependencies)).toEqual([]);
  });
});
