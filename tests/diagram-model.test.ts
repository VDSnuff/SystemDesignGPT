import { describe, expect, it } from "vitest";
import {
  addDiagramNode,
  connectDiagramNodes,
  diagramLimits,
  diagramStateSchema,
  diagramVersion,
  initialDiagram,
  moveDiagramNode,
  serializeDiagram,
  type DiagramState,
} from "../app/diagram-model";

describe("diagram state model", () => {
  it("migrates legacy payloads and constrains previously reachable coordinates", () => {
    const migrated = diagramStateSchema.parse({
      nodes: [
        { id: 1, kind: "Client", label: "Client", x: 2000, y: 2000 },
        { id: 2, kind: "Service", label: "Service", x: 0, y: 0 },
      ],
      connections: [{ from: 1, to: 2 }, { from: 1, to: 2 }],
    });

    expect(migrated.version).toBe(diagramVersion);
    expect(migrated.nodes[0]).toMatchObject({ x: 544, y: 358 });
    expect(migrated.nodes[1]).toMatchObject({ x: diagramLimits.padding, y: diagramLimits.padding });
    expect(migrated.connections).toEqual([{ from: 1, to: 2 }]);
  });

  it("rejects dangling and self-referencing connections", () => {
    const invalid = {
      nodes: [{ id: 1, kind: "Client", label: "Client", x: 40, y: 40 }],
      connections: [{ from: 1, to: 1 }],
    };
    expect(diagramStateSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid current-version coordinates instead of treating them as legacy", () => {
    const invalidCurrent = {
      ...initialDiagram,
      nodes: [{ ...initialDiagram.nodes[0], x: 2_000 }],
      connections: [],
    };
    expect(diagramStateSchema.safeParse(invalidCurrent).success).toBe(false);
  });

  it("keeps pointer and keyboard movement inside the reachable canvas", () => {
    const farBottomRight = moveDiagramNode(initialDiagram, 1, 10_000, 10_000);
    const farTopLeft = moveDiagramNode(farBottomRight, 1, -10_000, -10_000);

    expect(farBottomRight.nodes[0]).toMatchObject({ x: 544, y: 358 });
    expect(farTopLeft.nodes[0]).toMatchObject({ x: diagramLimits.padding, y: diagramLimits.padding });
  });

  it("enforces node and connection limits without growing the payload", () => {
    const nodes = Array.from({ length: diagramLimits.maxNodes }, (_, index) => ({
      id: index + 1,
      kind: "Service" as const,
      label: `Service ${index + 1}`,
      x: diagramLimits.padding,
      y: diagramLimits.padding,
    }));
    const fullDiagram: DiagramState = { version: diagramVersion, nodes, connections: [] };
    const withConnections = { ...fullDiagram, connections: Array.from({ length: diagramLimits.maxConnections }, (_, index) => ({ from: index % 39 + 1, to: index % 39 + 2 })) };

    expect(addDiagramNode(fullDiagram, "Queue")).toBe(fullDiagram);
    expect(connectDiagramNodes(withConnections, [1, 40])).toBe(withConnections);
  });

  it("serializes the current version deterministically", () => {
    expect(JSON.parse(serializeDiagram(initialDiagram))).toEqual(initialDiagram);
  });
});
