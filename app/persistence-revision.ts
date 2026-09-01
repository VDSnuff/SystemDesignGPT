import { z } from "./zod-config";

export const persistenceRevisionSchema = z.iso.datetime();

export function nextPersistenceRevision(expectedRevision: string | null) {
  const earliest = expectedRevision ? Date.parse(expectedRevision) + 1 : 0;
  return new Date(Math.max(Date.now(), earliest)).toISOString();
}
