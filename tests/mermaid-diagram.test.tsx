// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MermaidDiagram } from "../app/components/MermaidDiagram";

const renderedSvg = "<svg><title>Rendered</title></svg>";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MermaidDiagram", () => {
  it("reveals the pre-rendered SVG only when the diagram approaches the viewport", async () => {
    const chart = "flowchart LR\nA-->B";
    let reveal: (() => void) | undefined;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) {
        reveal = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
      observe() {}
    });
    render(<MermaidDiagram chart={chart} renderedSvg={renderedSvg} />);

    expect(screen.getByText("Diagram loads as you approach it.")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    await act(async () => reveal?.());

    expect(await screen.findByRole("img", { name: "Architecture diagram" })).toBeTruthy();
    expect(screen.getByRole("img").querySelector("title")?.textContent).toBe("Rendered");
  });

  it("keeps source readable when a generated diagram is unavailable", async () => {
    render(<MermaidDiagram chart="not valid mermaid" />);

    expect((await screen.findByText("not valid mermaid")).className).toContain("mermaid-fallback");
  });

  it("propagates the page nonce to Mermaid style elements", async () => {
    const script = document.createElement("script");
    script.nonce = "page-nonce";
    document.head.appendChild(script);
    render(<MermaidDiagram chart="flowchart LR\nA-->B" renderedSvg="<svg><style>.node { fill: white; }</style></svg>" />);

    const diagram = await screen.findByRole("img", { name: "Architecture diagram" });
    expect(diagram.querySelector("style")?.nonce).toBe("page-nonce");
    script.remove();
  });
});
