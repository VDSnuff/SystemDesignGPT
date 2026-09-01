export type ChatErrorCode =
  | "authentication_required"
  | "invalid_origin"
  | "invalid_request"
  | "payload_too_large"
  | "page_not_found"
  | "rate_limited"
  | "usage_limited"
  | "unconfigured"
  | "provider_unavailable"
  | "unsupported_media_type"
  | "malformed_response";

export type ChatServiceStatus = "authentication-required" | "ready" | "unconfigured";

interface ChatErrorDefinition {
  readonly message: string;
  readonly status: number;
}

export const chatErrors: Readonly<Record<ChatErrorCode, ChatErrorDefinition>> = {
  authentication_required: { message: "Sign in to use the design copilot.", status: 401 },
  invalid_origin: { message: "The copilot request origin is not allowed.", status: 403 },
  invalid_request: { message: "Send a page and a question of up to 2,000 characters.", status: 400 },
  payload_too_large: { message: "The copilot request is too large.", status: 413 },
  page_not_found: { message: "That handbook page does not exist.", status: 400 },
  rate_limited: { message: "Copilot request limit reached. Try again in a few minutes.", status: 429 },
  usage_limited: { message: "The AI project has reached a usage limit.", status: 429 },
  unconfigured: { message: "The copilot is not configured yet.", status: 503 },
  provider_unavailable: { message: "The copilot provider is temporarily unavailable.", status: 503 },
  unsupported_media_type: { message: "Send copilot requests as JSON.", status: 415 },
  malformed_response: { message: "The copilot returned an invalid response.", status: 502 },
};

export interface ChatErrorBody {
  readonly error: {
    readonly code: ChatErrorCode;
    readonly message: string;
  };
}

export interface ChatAnswerBody {
  readonly answer: string;
  readonly metadata: ChatAnswerMetadata;
  readonly status: "ready";
}

export interface ChatAnswerMetadata {
  readonly inputTokens: number;
  readonly latencyMs: number;
  readonly model: string;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface ChatStatusBody {
  readonly status: ChatServiceStatus;
}

export function isChatAnswerBody(value: unknown): value is ChatAnswerBody {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { answer?: unknown; metadata?: unknown; status?: unknown };
  if (!candidate.metadata || typeof candidate.metadata !== "object") return false;
  const metadata = candidate.metadata as Record<string, unknown>;
  return typeof candidate.answer === "string"
    && candidate.status === "ready"
    && typeof metadata.model === "string"
    && [metadata.inputTokens, metadata.outputTokens, metadata.totalTokens, metadata.latencyMs]
      .every((item) => Number.isInteger(item) && Number(item) >= 0);
}

export function isChatErrorBody(value: unknown): value is ChatErrorBody {
  if (!value || typeof value !== "object") return false;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return typeof candidate.code === "string"
    && Object.hasOwn(chatErrors, candidate.code)
    && typeof candidate.message === "string";
}

export function isChatStatusBody(value: unknown): value is ChatStatusBody {
  if (!value || typeof value !== "object") return false;
  const status = (value as { status?: unknown }).status;
  return status === "authentication-required" || status === "ready" || status === "unconfigured";
}
