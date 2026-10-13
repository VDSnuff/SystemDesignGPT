import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { patchSource } from "../scripts/patch-toolchain-glob.mjs";

const original = 'const glob = require("fast-glob");\n';
const replacement = 'require("../../../tools/toolchain-glob.mjs")';
const patch = { package: "consumer", file: "index.js", import: 'require("fast-glob")',
  sha256: createHash("sha256").update(original).digest("hex") };

describe("reviewed consumer installation", () => {
  it("changes only the reviewed import and accepts a second identical run", () => {
    const updated = patchSource(original, patch, replacement);
    expect(updated).toBe(`const glob = ${replacement};\n`);
    expect(patchSource(updated, patch, replacement)).toBe(updated);
  });

  it.each([original + "extra();\n", "const glob = anotherModule;\n",
    original + original])("rejects unreviewed source instead of silently adapting it", (source) => {
    expect(() => patchSource(source, patch, replacement)).toThrow("Unreviewed glob consumer");
  });
});
