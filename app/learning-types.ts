import { z } from "zod";

export const nodeKinds = ["Client", "Service", "Database", "Queue"] as const;

const diagramNodeSchema = z.object({
  id: z.number().int().positive(),
  kind: z.enum(nodeKinds),
  label: z.string().trim().min(1).max(80),
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(2000),
});

const connectionSchema = z.object({
  from: z.number().int().positive(),
  to: z.number().int().positive(),
});

export const diagramStateSchema = z.object({
  nodes: z.array(diagramNodeSchema).max(40),
  connections: z.array(connectionSchema).max(100),
}).superRefine((diagram, context) => {
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  if (nodeIds.size !== diagram.nodes.length) {
    context.addIssue({ code: "custom", message: "Diagram node IDs must be unique." });
  }
  for (const connection of diagram.connections) {
    if (connection.from === connection.to || !nodeIds.has(connection.from) || !nodeIds.has(connection.to)) {
      context.addIssue({ code: "custom", message: "Connections must join two existing nodes." });
    }
  }
});

export const learningPayloadSchema = z.object({
  note: z.string().max(10_000),
  diagram: diagramStateSchema,
  quizAnswers: z.array(z.number().int().min(-1).max(5)).max(8),
});

export const learningStateInputSchema = learningPayloadSchema.extend({
  pageSlug: z.string().trim().min(1).max(100),
});

export const commentInputSchema = z.object({
  pageSlug: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(4_000),
});

export const commentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read"]),
});

export type DiagramState = z.infer<typeof diagramStateSchema>;
export type LearningPayload = z.infer<typeof learningPayloadSchema>;
export type DiagramNode = DiagramState["nodes"][number];
export type NodeKind = DiagramNode["kind"];

export const initialDiagram: DiagramState = {
  nodes: [
    { id: 1, kind: "Client", label: "Actor", x: 40, y: 100 },
    { id: 2, kind: "Service", label: "Design decision", x: 260, y: 100 },
    { id: 3, kind: "Database", label: "Evidence", x: 480, y: 100 },
  ],
  connections: [{ from: 1, to: 2 }, { from: 2, to: 3 }],
};
