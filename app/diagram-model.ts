import { z } from "./zod-config";

export const nodeKinds = ["Client", "Service", "Database", "Queue"] as const;
export const diagramVersion = 1 as const;
export const diagramLimits = {
  width: 680,
  height: 430,
  nodeWidth: 128,
  nodeHeight: 64,
  padding: 8,
  maxNodes: 40,
  maxConnections: 100,
  moveStep: 16,
} as const;

const maximumX = diagramLimits.width - diagramLimits.nodeWidth - diagramLimits.padding;
const maximumY = diagramLimits.height - diagramLimits.nodeHeight - diagramLimits.padding;

function nodeSchema(xMaximum: number, yMaximum: number) {
  return z.object({
    id: z.number().int().positive(),
    kind: z.enum(nodeKinds),
    label: z.string().trim().min(1).max(80),
    x: z.number().min(0).max(xMaximum),
    y: z.number().min(0).max(yMaximum),
  });
}

const connectionSchema = z.object({
  from: z.number().int().positive(),
  to: z.number().int().positive(),
});

function validateGraph(
  diagram: { nodes: readonly { id: number }[]; connections: readonly { from: number; to: number }[] },
  context: z.RefinementCtx,
) {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  if (nodeIds.size !== diagram.nodes.length) {
    context.addIssue({ code: "custom", message: "Diagram node IDs must be unique." });
  }
  for (const connection of diagram.connections) {
    if (connection.from === connection.to || !nodeIds.has(connection.from) || !nodeIds.has(connection.to)) {
      context.addIssue({ code: "custom", message: "Connections must join two existing nodes." });
    }
  }
}

const currentDiagramSchema = z.object({
  version: z.literal(diagramVersion),
  nodes: z.array(nodeSchema(maximumX, maximumY)).max(diagramLimits.maxNodes),
  connections: z.array(connectionSchema).max(diagramLimits.maxConnections),
}).strict().superRefine(validateGraph);

const legacyDiagramSchema = z.object({
  nodes: z.array(nodeSchema(2000, 2000)).max(diagramLimits.maxNodes),
  connections: z.array(connectionSchema).max(diagramLimits.maxConnections),
}).strict().superRefine(validateGraph);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeDiagram(diagram: z.infer<typeof currentDiagramSchema> | z.infer<typeof legacyDiagramSchema>) {
  const connectionKeys = new Set<string>();
  const connections = diagram.connections.filter((connection) => {
    const key = `${connection.from}:${connection.to}`;
    if (connectionKeys.has(key)) return false;
    connectionKeys.add(key);
    return true;
  });
  return {
    version: diagramVersion,
    nodes: diagram.nodes.map((node) => ({
      ...node,
      x: clamp(node.x, diagramLimits.padding, maximumX),
      y: clamp(node.y, diagramLimits.padding, maximumY),
    })),
    connections,
  };
}

export const diagramStateSchema = z.union([currentDiagramSchema, legacyDiagramSchema])
  .transform(normalizeDiagram)
  .pipe(currentDiagramSchema);

export type DiagramState = z.infer<typeof diagramStateSchema>;
export type DiagramNode = DiagramState["nodes"][number];
export type NodeKind = DiagramNode["kind"];

export const initialDiagram: DiagramState = {
  version: diagramVersion,
  nodes: [
    { id: 1, kind: "Client", label: "Web client", x: 40, y: 100 },
    { id: 2, kind: "Service", label: "API", x: 260, y: 100 },
    { id: 3, kind: "Database", label: "Primary store", x: 480, y: 100 },
  ],
  connections: [{ from: 1, to: 2 }, { from: 2, to: 3 }],
};

export function addDiagramNode(diagram: DiagramState, kind: NodeKind) {
  if (diagram.nodes.length >= diagramLimits.maxNodes) return diagram;
  const id = Math.max(0, ...diagram.nodes.map((node) => node.id)) + 1;
  const offset = diagram.nodes.length * 31;
  const node = {
    id,
    kind,
    label: `New ${kind.toLowerCase()}`,
    x: clamp(50 + offset % 500, diagramLimits.padding, maximumX),
    y: clamp(230 + offset % 170, diagramLimits.padding, maximumY),
  };
  return { ...diagram, nodes: [...diagram.nodes, node] };
}

export function connectDiagramNodes(diagram: DiagramState, selected: readonly number[]) {
  if (selected.length !== 2 || selected[0] === selected[1]) return diagram;
  if (diagram.connections.length >= diagramLimits.maxConnections) return diagram;
  const [from, to] = selected;
  if (!diagram.nodes.some((node) => node.id === from) || !diagram.nodes.some((node) => node.id === to)) return diagram;
  if (diagram.connections.some((connection) => connection.from === from && connection.to === to)) return diagram;
  return { ...diagram, connections: [...diagram.connections, { from, to }] };
}

export function deleteDiagramNodes(diagram: DiagramState, selected: readonly number[]) {
  const nodes = diagram.nodes.filter((node) => !selected.includes(node.id));
  const connections = diagram.connections.filter((item) => !selected.includes(item.from) && !selected.includes(item.to));
  return { ...diagram, nodes, connections };
}

export function moveDiagramNode(diagram: DiagramState, id: number, x: number, y: number) {
  const nodes = diagram.nodes.map((node) => node.id === id ? {
    ...node,
    x: clamp(x, diagramLimits.padding, maximumX),
    y: clamp(y, diagramLimits.padding, maximumY),
  } : node);
  return { ...diagram, nodes };
}

export function renameDiagramNode(diagram: DiagramState, id: number, label: string) {
  const nodes = diagram.nodes.map((node) => node.id === id ? { ...node, label: label.slice(0, 80) } : node);
  return { ...diagram, nodes };
}

export function serializeDiagram(diagram: DiagramState) {
  return JSON.stringify(diagramStateSchema.parse(diagram));
}
