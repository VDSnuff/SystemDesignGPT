import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

const license = readFileSync("LICENSE", "utf8");
const readme = readFileSync("README.md", "utf8");
const liveUrl = "https://system-design-studio.v-dovnich.chatgpt.site";

describe("project metadata", () => {
  it("publishes the selected MIT license", () => {
    expect(packageJson.license).toBe("MIT");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 Viacheslav Dovnich");
    expect(license).toContain("Permission is hereby granted, free of charge");
  });

  it("links the canonical live application", () => {
    expect(readme).toContain(`[system-design-studio.v-dovnich.chatgpt.site](${liveUrl})`);
  });

  it("documents release provenance without implying launch readiness", () => {
    expect(readme).toContain("`sites-v<N>`");
    expect(readme).toContain("full source SHA");
    expect(readme).toContain("does not claim launch readiness");
    expect(readme).toContain("issues/58");
  });
});
