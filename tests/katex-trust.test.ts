import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const mermaidRequire = createRequire(require.resolve("mermaid"));
const katex: {
  renderToString(expression: string, options?: Record<string, unknown>): string;
} = mermaidRequire("katex");

describe("Mermaid mathematical rendering", () => {
  it("does not inherit trusted rendering from the options prototype", () => {
    const options: Record<string, unknown> = Object.create({ trust: true });
    const output = katex.renderToString(String.raw`\href{https://example.invalid}{link}`, options);

    expect(output).not.toContain('href="https://example.invalid"');
  });

  it("continues to render ordinary mathematical expressions", () => {
    const output = katex.renderToString(String.raw`\frac{1}{2} + x^2`);

    expect(output).toContain('class="katex"');
    expect(output).toContain('class="mfrac"');
  });
});
