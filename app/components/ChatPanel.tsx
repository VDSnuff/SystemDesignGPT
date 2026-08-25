"use client";

import { FormEvent, useEffect, useState } from "react";
import { isChatAnswerBody, isChatErrorBody, isChatStatusBody, type ChatErrorCode } from "../chat-contract";
import { canRecheck, statusForError, statusPresentation, type CopilotStatus } from "../copilot-status";
import { CopilotFallbacks } from "./CopilotFallbacks";
import { ResponsiveChatShell } from "./ResponsiveChatShell";

interface ChatMessage { readonly role: "user" | "assistant"; readonly content: string }

interface ChatPanelProps {
  readonly fallbackHref: string;
  readonly fallbackLabel: string;
  readonly pageId: string;
  readonly pageLabel: string;
  readonly prompts: readonly string[];
}

interface Notice {
  readonly canCheckAgain: boolean;
  readonly message: string;
}

async function readJson(response: Response) {
  try { return await response.json() as unknown; } catch { return null; }
}

export function ChatPanel(props: ChatPanelProps) {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<CopilotStatus>("checking");
  const [notice, setNotice] = useState<Notice | null>(null);

  async function loadStatus(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/chat", { method: "GET", signal });
      const result = await readJson(response);
      if (!isChatStatusBody(result)) throw new Error("Invalid status response");
      setStatus(result.status);
      setNotice(result.status === "unconfigured"
        ? { canCheckAgain: true, message: "The copilot has not been configured. Reading tools remain available." }
        : null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus("temporarily-unavailable");
      setNotice({ canCheckAgain: true, message: "The copilot status could not be checked. Reading tools remain available." });
    }
  }

  function checkStatus() {
    setStatus("checking");
    setNotice(null);
    void loadStatus();
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/chat", { method: "GET", signal: controller.signal })
      .then(readJson)
      .then((result) => {
        if (!isChatStatusBody(result)) throw new Error("Invalid status response");
        setStatus(result.status);
        setNotice(result.status === "unconfigured"
          ? { canCheckAgain: true, message: "The copilot has not been configured. Reading tools remain available." }
          : null);
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setStatus("temporarily-unavailable");
        setNotice({ canCheckAgain: true, message: "The copilot status could not be checked. Reading tools remain available." });
      });
    return () => controller.abort();
  }, []);

  function showFailure(code: ChatErrorCode, message: string) {
    setStatus(statusForError(code));
    setNotice({ canCheckAgain: canRecheck(code), message });
  }

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || status !== "ready") return;
    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");
    setNotice(null);
    setStatus("sending");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: props.pageId, question: trimmed, history }),
      });
      const result = await readJson(response);
      if (!response.ok && isChatErrorBody(result)) return showFailure(result.error.code, result.error.message);
      if (!isChatAnswerBody(result)) return showFailure("malformed_response", "The copilot returned an invalid response.");
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
      setStatus("ready");
    } catch {
      setStatus("temporarily-unavailable");
      setNotice({ canCheckAgain: true, message: "The copilot could not be reached. Your handbook and learning tools remain available." });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const presentation = statusPresentation[status];
  const isAiDisabled = status !== "ready";
  const hasOutage = status === "usage-limited" || status === "unconfigured" || status === "temporarily-unavailable";
  return (
    <ResponsiveChatShell pageLabel={props.pageLabel} status={status}>
      <div className="responsive-chat-content flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-4">
          <div>
            <p className="font-semibold">Design copilot</p>
            <p className="mt-1 text-xs text-muted">Knows {props.pageLabel} + the site map</p>
          </div>
          <div aria-label={`Copilot status: ${presentation.label}`} className="max-w-36 text-right" role="status">
            <p className="text-xs font-semibold"><span aria-hidden="true">{presentation.icon} </span>{presentation.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-muted">{presentation.detail}</p>
          </div>
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-ink/20 bg-[#fff5cf] p-3 text-xs leading-5" role="alert">
            <strong>{presentation.label}.</strong> {notice.message}
          </div>
        ) : null}

        <div aria-live="polite" className="chat-scroll flex-1 space-y-3 overflow-y-auto py-5">
          <div className="message-assistant">I’m reading <strong>{props.pageLabel}</strong>. Ask me to test a decision, expose a risk, or guide you to the right chapter.</div>
          {messages.map((message, index) => (
            <div className={message.role === "user" ? "message-user" : "message-assistant"} key={`${message.role}-${index}`}>
              {message.content}
            </div>
          ))}
          {status === "sending" && <div className="message-assistant animate-pulse">Thinking with this page’s context…</div>}
        </div>

        {hasOutage ? (
          <CopilotFallbacks
            canCheckAgain={notice?.canCheckAgain ?? false}
            fallbackHref={props.fallbackHref}
            fallbackLabel={props.fallbackLabel}
            onCheckAgain={checkStatus}
            pageLabel={props.pageLabel}
          />
        ) : null}

        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {props.prompts.map((prompt) => (
              <button className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40" disabled={isAiDisabled} key={prompt} onClick={() => void ask(prompt)} type="button">
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form className="rounded-2xl border border-ink/15 bg-paper p-2 focus-within:border-ink/40" onSubmit={submit}>
          <label className="sr-only" htmlFor={`question-${props.pageId}`}>Ask about {props.pageLabel}</label>
          <textarea
            className="min-h-20 w-full resize-none bg-transparent p-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isAiDisabled}
            id={`question-${props.pageId}`}
            maxLength={2000}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={isAiDisabled ? "AI questions are paused. Use the tools above." : "Ask about this design…"}
            value={question}
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] text-muted">Page context attached · responses are not stored by the provider</span>
            <button aria-label="Send question" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink font-bold text-accent disabled:opacity-40" disabled={!question.trim() || isAiDisabled} type="submit">↑</button>
          </div>
        </form>
      </div>
    </ResponsiveChatShell>
  );
}
