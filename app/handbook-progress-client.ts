import { handbookProgressSchema, type HandbookProgress } from "./handbook-progress";

interface HandbookProgressBody {
  readonly state?: unknown;
  readonly warning?: string;
  readonly message?: string;
}

export class HandbookProgressRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "HandbookProgressRequestError";
  }
}

async function responseBody(response: Response) {
  try { return await response.json() as HandbookProgressBody; } catch { return {}; }
}

export async function loadHandbookProgress(signal: AbortSignal) {
  const response = await fetch("/api/handbook-progress", { signal });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new HandbookProgressRequestError(body.message ?? "Handbook progress could not be loaded.", response.status);
  }
  if (body.state === null) return { state: null, warning: body.warning };
  const parsed = handbookProgressSchema.safeParse(body.state);
  if (!parsed.success) throw new HandbookProgressRequestError("Saved handbook progress is not valid.", 500);
  return { state: parsed.data, warning: body.warning };
}

export async function saveHandbookProgress(progress: HandbookProgress) {
  const response = await fetch("/api/handbook-progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(progress),
  });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new HandbookProgressRequestError(body.message ?? "Handbook progress could not be saved.", response.status);
  }
}
