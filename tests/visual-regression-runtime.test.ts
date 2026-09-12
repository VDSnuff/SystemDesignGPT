import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalImage,
  containerArgs,
  containerScript,
  resolveRuntime,
} from "../scripts/run-visual-regression.mjs";

const config = readFileSync("playwright.visual.config.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

describe("visual regression runtime", () => {
  it("routes the documented command through the runtime guard", () => {
    expect(packageJson.scripts["test:e2e:visual"]).toBe("node scripts/run-visual-regression.mjs");
  });

  it("compares and updates natively only on Linux", () => {
    expect(resolveRuntime({ platform: "linux" })).toEqual({ mode: "native", updates: false });
    expect(resolveRuntime({ platform: "linux", args: ["-u"] })).toEqual({ mode: "native", updates: true });
    expect(resolveRuntime({ platform: "darwin" })).toEqual({ mode: "container", updates: false });
    expect(resolveRuntime({ platform: "win32", args: ["--update-snapshots=changed"] })).toEqual({ mode: "container", updates: true });
  });

  it("lets Linux opt into the container and other platforms into diagnostics", () => {
    expect(resolveRuntime({ platform: "linux", runtime: "container" })).toMatchObject({ mode: "container" });
    expect(resolveRuntime({ platform: "darwin", runtime: "native" })).toEqual({ mode: "diagnostic", updates: false });
    expect(() => resolveRuntime({ platform: "darwin", runtime: "native", args: ["--update-snapshots"] }))
      .toThrow("Snapshot updates are Linux-only");
    expect(() => resolveRuntime({ platform: "linux", runtime: "docker" })).toThrow('Unknown VISUAL_RUNTIME "docker"');
  });

  it("pins the container to the installed Playwright release on Ubuntu noble", () => {
    const { version } = JSON.parse(readFileSync("node_modules/@playwright/test/package.json", "utf8"));

    expect(canonicalImage(version)).toBe(`mcr.microsoft.com/playwright:v${version}-noble`);
  });

  it("builds and compares inside the container with the Linux runtime marker", () => {
    const args = containerArgs({ image: "mcr.microsoft.com/playwright:v1.62.1-noble", name: "visual-1", args: ["-g", "home"] });

    expect(args).toContain("--ipc=host");
    expect(args.join(" ")).toContain("--env VISUAL_RUNTIME=native");
    expect(args.join(" ")).toContain("--volume system-design-visual-node-modules:/work/node_modules");
    expect(args.at(-1)).toBe(containerScript(["-g", "home"]));
    expect(containerScript(["-g", "home"])).toMatch(/^tar --warning=no-unknown-keyword -xf - && .* && npm run build && npx playwright test --config playwright.visual.config.ts -g home$/);
  });

  it("refuses direct non-Linux comparisons unless the diagnostic runtime is declared", () => {
    expect(config).toContain('process.platform !== "linux" && process.env.VISUAL_RUNTIME !== "native"');
    expect(config).toContain("throw new Error(");
  });
});
