// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagramEditor } from "../app/components/DiagramEditor";
import { diagramVersion, initialDiagram, type DiagramState } from "../app/diagram-model";

const emptyDiagram: DiagramState = { version: diagramVersion, nodes: [], connections: [] };

function EditorHarness({ initial = emptyDiagram }: Readonly<{ initial?: DiagramState }>) {
  const [diagram, setDiagram] = useState(initial);
  return (
    <>
      <DiagramEditor label="Test diagram canvas" onChange={setDiagram} value={diagram} />
      <div aria-hidden="true" data-testid="diagram-state" hidden>{JSON.stringify(diagram)}</div>
    </>
  );
}

function currentDiagram() {
  return JSON.parse(screen.getByTestId("diagram-state").textContent ?? "") as DiagramState;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("shared diagram editor", () => {
  it("supports the complete create, rename, move, connect, delete, and undo keyboard flow", async () => {
    const user = userEvent.setup();
    render(<EditorHarness />);

    async function activate(name: string | RegExp) {
      screen.getByRole("button", { name }).focus();
      await user.keyboard("{Enter}");
    }

    await activate("+ Client");
    await activate("+ Service");
    await activate("Client: New client");
    const label = screen.getByLabelText("Selected node label");
    await user.clear(label);
    await user.type(label, "Browser");
    const beforeMove = currentDiagram().nodes[0].x;
    await activate("Move selected node right");
    expect(currentDiagram().nodes[0].x).toBeGreaterThan(beforeMove);

    await activate("Service: New service");
    await activate("Connect selected");
    expect(currentDiagram().connections).toHaveLength(1);

    await activate("Client: Browser");
    await activate("Delete selected");
    expect(currentDiagram().nodes).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("Undo is available");
    await activate("Undo delete/reset");
    expect(currentDiagram().nodes).toHaveLength(2);
  });

  it("offers a reachable fixed canvas at a mobile viewport and constrains pointer movement", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    render(<EditorHarness initial={initialDiagram} />);

    const region = screen.getByTestId("diagram-scroll-region");
    const canvas = screen.getByTestId("diagram-canvas");
    expect(region.className).toContain("overflow-x-auto");
    expect(canvas.style.width).toBe("680px");
    expect(screen.getByText(/horizontally scrollable on narrow screens/i)).toBeTruthy();

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      bottom: 430,
      height: 430,
      left: 0,
      right: 680,
      top: 0,
      width: 680,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Client: Web client" }), { pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 2_000, clientY: 2_000, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(currentDiagram().nodes[0]).toMatchObject({ x: 544, y: 358 });
  });

  it("requires reset confirmation and announces cancel, reset, and undo", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    render(<EditorHarness initial={emptyDiagram} />);

    await user.click(screen.getByRole("button", { name: "Reset diagram" }));
    expect(screen.getByRole("status").textContent).toBe("Reset canceled.");
    await user.click(screen.getByRole("button", { name: "Reset diagram" }));
    expect(currentDiagram()).toEqual(initialDiagram);
    expect(screen.getByRole("status").textContent).toContain("Undo is available");
    await user.click(screen.getByRole("button", { name: "Undo delete/reset" }));
    expect(currentDiagram()).toEqual(emptyDiagram);
  });
});
