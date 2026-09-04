// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MermaidDiagram } from "../app/components/MermaidDiagram";

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({ default: mermaid }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MermaidDiagram", () => {
  it("loads Mermaid only when the diagram approaches the viewport", async () => {
    const chart = "flowchart LR\nA-->B";
    let reveal: (() => void) | undefined;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) {
        reveal = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
      observe() {}
    });
    mermaid.render.mockResolvedValue({ svg: "<svg><title>Rendered</title></svg>" });
    render(<MermaidDiagram chart={chart} />);

    expect(screen.getByText("Diagram loads as you approach it.")).toBeTruthy();
    expect(mermaid.render).not.toHaveBeenCalled();
    await act(async () => reveal?.());

    expect(await screen.findByRole("img", { name: "Architecture diagram" })).toBeTruthy();
    expect(mermaid.render).toHaveBeenCalledWith(expect.any(String), chart);
  });

  it("keeps invalid source readable when rendering fails", async () => {
    mermaid.render.mockRejectedValue(new Error("Invalid diagram"));
    render(<MermaidDiagram chart="not valid mermaid" />);

    expect((await screen.findByText("not valid mermaid")).className).toContain("mermaid-fallback");
  });

  it("propagates the page nonce to Mermaid style elements", async () => {
    const script = document.createElement("script");
    script.nonce = "page-nonce";
    document.head.appendChild(script);
    mermaid.render.mockResolvedValue({ svg: "<svg><style>.node { fill: white; }</style></svg>" });

    render(<MermaidDiagram chart="flowchart LR\nA-->B" />);

    const diagram = await screen.findByRole("img", { name: "Architecture diagram" });
    expect(diagram.querySelector("style")?.nonce).toBe("page-nonce");
    script.remove();
  });
});
