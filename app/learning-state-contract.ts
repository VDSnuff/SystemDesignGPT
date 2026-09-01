import type { LearningPayload } from "./learning-types";

export interface LearningStateRecord {
  readonly userId: string;
  readonly pageSlug: string;
  readonly note: string;
  readonly diagramPayload: string;
  readonly quizPayload: string;
  readonly updatedAt: string;
}

export interface LearningStateWrite extends LearningPayload {
  readonly userId: string;
  readonly pageSlug: string;
  readonly expectedUpdatedAt: string | null;
  readonly updatedAt: string;
}

export interface LearningStateRepository {
  readonly deleteForUser: (userId: string) => Promise<void>;
  readonly find: (userId: string, pageSlug: string) => Promise<LearningStateRecord | null>;
  readonly save: (value: LearningStateWrite) => Promise<boolean>;
}
