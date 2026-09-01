import { z } from "./zod-config";
import { diagramStateSchema } from "./diagram-model";
import { persistenceRevisionSchema } from "./persistence-revision";

export {
  diagramStateSchema,
  initialDiagram,
  nodeKinds,
  type DiagramNode,
  type DiagramState,
  type NodeKind,
} from "./diagram-model";

export const quizAnswersSchema = z.array(z.number().int().min(-1).max(3)).max(4);

export const learningPayloadSchema = z.object({
  note: z.string().max(10_000),
  diagram: diagramStateSchema,
  quizAnswers: quizAnswersSchema,
});

export const learningStateInputSchema = learningPayloadSchema.extend({
  pageSlug: z.string().trim().min(1).max(100),
  expectedUpdatedAt: persistenceRevisionSchema.nullable().default(null),
});

export const commentInputSchema = z.object({
  pageSlug: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(4_000),
});

export const commentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read"]),
});

export const commentDeleteSchema = z.object({ id: z.string().uuid() });

export type LearningPayload = z.infer<typeof learningPayloadSchema>;
