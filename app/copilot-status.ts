import type { ChatErrorCode } from "./chat-contract";

export type CopilotStatus =
  | "checking"
  | "ready"
  | "sending"
  | "usage-limited"
  | "unconfigured"
  | "temporarily-unavailable";

interface StatusPresentation {
  readonly detail: string;
  readonly icon: string;
  readonly label: string;
}

export const statusPresentation: Readonly<Record<CopilotStatus, StatusPresentation>> = {
  checking: { icon: "◌", label: "Checking setup", detail: "No model request is being made." },
  ready: { icon: "✓", label: "Ready to ask", detail: "The live provider is checked when you send." },
  sending: { icon: "…", label: "Sending", detail: "Using this page as context." },
  "usage-limited": { icon: "!", label: "Usage limited", detail: "AI requests are paused." },
  unconfigured: { icon: "—", label: "Not configured", detail: "AI requests are disabled." },
  "temporarily-unavailable": { icon: "!", label: "Temporarily unavailable", detail: "AI requests are paused." },
};

export function statusForError(code: ChatErrorCode): CopilotStatus {
  if (code === "usage_limited") return "usage-limited";
  if (code === "unconfigured") return "unconfigured";
  if (code === "rate_limited" || code === "provider_unavailable" || code === "malformed_response") {
    return "temporarily-unavailable";
  }
  return "ready";
}

export function canRecheck(code: ChatErrorCode) {
  return code === "rate_limited"
    || code === "unconfigured"
    || code === "provider_unavailable"
    || code === "malformed_response";
}
