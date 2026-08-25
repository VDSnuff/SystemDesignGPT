export type ChatErrorCode =
  | "invalid_request"
  | "page_not_found"
  | "rate_limited"
  | "usage_limited"
  | "unconfigured"
  | "provider_unavailable"
  | "malformed_response";

export type ChatServiceStatus = "ready" | "unconfigured";

interface ChatErrorDefinition {
  readonly message: string;
  readonly status: number;
}

export const chatErrors: Readonly<Record<ChatErrorCode, ChatErrorDefinition>> = {
  invalid_request: { message: "Send a page and a question of up to 2,000 characters.", status: 400 },
  page_not_found: { message: "That handbook page does not exist.", status: 400 },
  rate_limited: { message: "Copilot request limit reached. Try again in a few minutes.", status: 429 },
  usage_limited: { message: "The AI project has reached a usage limit.", status: 429 },
  unconfigured: { message: "The copilot is not configured yet.", status: 503 },
  provider_unavailable: { message: "The copilot provider is temporarily unavailable.", status: 503 },
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
  readonly status: "ready";
}

export interface ChatStatusBody {
  readonly status: ChatServiceStatus;
}

export function isChatAnswerBody(value: unknown): value is ChatAnswerBody {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { answer?: unknown; status?: unknown };
  return typeof candidate.answer === "string" && candidate.status === "ready";
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
  return status === "ready" || status === "unconfigured";
}
