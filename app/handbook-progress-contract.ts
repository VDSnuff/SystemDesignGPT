import type { HandbookProgress } from "./handbook-progress";

export interface HandbookProgressRecord {
  readonly userId: string;
  readonly lastPageSlug: string | null;
  readonly lastHeadingId: string | null;
  readonly completedSectionsPayload: string;
  readonly checkedItemsPayload: string;
  readonly updatedAt: string;
}

export interface HandbookProgressWrite extends HandbookProgress {
  readonly userId: string;
  readonly expectedUpdatedAt: string | null;
  readonly updatedAt: string;
}

export interface HandbookProgressRepository {
  readonly deleteForUser: (userId: string) => Promise<void>;
  readonly find: (userId: string) => Promise<HandbookProgressRecord | null>;
  readonly save: (value: HandbookProgressWrite) => Promise<boolean>;
}
