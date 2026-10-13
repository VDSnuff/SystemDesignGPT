import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "vite";
import { globSync } from "../tools/toolchain-glob.mjs";

const load = createRequire(import.meta.url);
const deepPatternDepth = 4_096;
let fixture: string;

beforeEach(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), "toolchain-glob-"));
  for (const file of ["apps/web/page.tsx", "apps/admin/page.tsx", "views/a.ts", "views/b.tsx",
    "views/c.js", "views/nested/index.ts", "views/1.ts", "views/2.ts", "views/3.ts", ".hidden/secret.ts"]) {
    const target = path.join(fixture, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export default 1;\n");
  }
});

afterEach(() => fs.rmSync(fixture, { recursive: true, force: true }));

describe("Braces-free toolchain consumers", () => {
  it("preserves extension braces, exclusions, recursive discovery and numeric ranges", () => {
    expect(globSync(["views/**/*.{ts,tsx}", "!views/nested/**"], { cwd: fixture }).sort())
      .toEqual(["views/1.ts", "views/2.ts", "views/3.ts", "views/a.ts", "views/b.tsx"]);
    expect(globSync("views/{1..3}.ts", { cwd: fixture }).sort())
      .toEqual(["views/1.ts", "views/2.ts", "views/3.ts"]);
    expect(globSync("views/nested/**/*.ts", { cwd: fixture })).toEqual(["views/nested/index.ts"]);
  });

  it("preserves directory formatting and explicit dot-file matching", () => {
    expect(globSync("apps/*", { cwd: fixture, onlyDirectories: true }).sort())
      .toEqual(["apps/admin", "apps/web"]);
    expect(globSync("apps/*", { cwd: fixture, onlyDirectories: true, absolute: true }).sort())
      .toEqual([path.join(fixture, "apps/admin"), path.join(fixture, "apps/web")]);
    expect(globSync("**/*.ts", { cwd: fixture, dot: true })).toContain(".hidden/secret.ts");
  });

  it("runs the installed Next.js root-directory consumer through the adapter", () => {
    const consumer = path.join(path.dirname(load.resolve("@next/eslint-plugin-next")), "utils/get-root-dirs.js");
    const { getRootDirs } = load(consumer);
    expect(getRootDirs({ cwd: fixture, settings: { next: { rootDir: path.join(fixture, "apps/*") } } }).sort())
      .toEqual([path.join(fixture, "apps/admin"), path.join(fixture, "apps/web")]);
  });

  it.each(["CommonJS", "ESM"])("runs the installed Vite %s consumer with extension and index discovery", async (format) => {
    const { globFiles, Resolve } = await import("vite-plugin-dynamic-import");
    const discover = format === "ESM" ? globFiles : load("vite-plugin-dynamic-import").globFiles;
    const config = await resolveConfig({ root: fixture, configFile: false }, "build");
    const expression = "`./views/${name}`";
    const node = load("acorn").parseExpressionAt(expression, 0, { ecmaVersion: "latest" });
    const result = await discover({ importeeNode: node, importExpression: expression,
      importer: path.join(fixture, "entry.ts"), resolve: new Resolve(config),
      extensions: [".ts", ".tsx"], loose: false });
    expect(result?.files?.sort()).toEqual(["./views/1.ts", "./views/2.ts", "./views/3.ts",
      "./views/a.ts", "./views/b.tsx", "./views/nested/index.ts"]);
  });

  it("does not exhaust the call stack on a deeply nested pattern within the old length limit", () => {
    const adapter = fileURLToPath(new URL("../tools/toolchain-glob.mjs", import.meta.url));
    const code = `const {globSync}=require(${JSON.stringify(adapter)});` +
      `console.log(JSON.stringify(globSync('{'.repeat(${deepPatternDepth})+'a'+'}'.repeat(${deepPatternDepth}),` +
      `{cwd:${JSON.stringify(fixture)}})));`;
    const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8", timeout: 5_000 });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("[]");
  });

  it("removes Braces and micromatch from every locked package path", () => {
    const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
    const names = Object.keys(lock.packages).map((node) => node.split("node_modules/").at(-1));
    expect(names).not.toContain("braces");
    expect(names).not.toContain("micromatch");
    const aliases = Object.entries(lock.packages).filter(([node]) => node.endsWith("/fast-glob"));
    expect(aliases).toHaveLength(2);
    for (const [, metadata] of aliases) {
      expect(metadata).toMatchObject({ name: "tinyglobby", version: "0.2.17", dev: true });
    }
  });
});
