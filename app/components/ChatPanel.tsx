"use client";

import { FormEvent, useState } from "react";

interface ChatMessage { readonly role: "user" | "assistant"; readonly content: string }

interface ChatPanelProps {
  readonly pageId: string;
  readonly pageLabel: string;
  readonly prompts: readonly string[];
}

export function ChatPanel({ pageId, pageLabel, prompts }: ChatPanelProps) {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isSending) return;
    const history = messages.slice(-8);
    setMessages([...messages, { role: "user", content: trimmed }]);
    setQuestion("");
    setIsSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, question: trimmed, history }),
      });
      const result = await response.json() as { answer?: string; message?: string };
      const answer = response.ok ? result.answer : result.message;
      setMessages((current) => [...current, { role: "assistant", content: answer ?? "The copilot could not answer just now." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "The copilot is temporarily unreachable. Your handbook and diagram remain available." }]);
    } finally {
      setIsSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <aside className="border-t border-ink/15 bg-[#faf8f3] p-4 lg:border-l lg:border-t-0 lg:p-5">
      <div className="sticky top-5 flex h-[calc(100vh-40px)] min-h-[560px] flex-col rounded-3xl border border-ink/15 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between border-b border-ink/10 pb-4">
          <div>
            <p className="font-semibold">Design copilot</p>
            <p className="mt-1 text-xs text-muted">Knows {pageLabel} + the site map</p>
          </div>
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#87c300]" title="Available" />
        </div>

        <div aria-live="polite" className="chat-scroll flex-1 space-y-3 overflow-y-auto py-5">
          <div className="message-assistant">I’m reading <strong>{pageLabel}</strong>. Ask me to test a decision, expose a risk, or guide you to the right chapter.</div>
          {messages.map((message, index) => (
            <div className={message.role === "user" ? "message-user" : "message-assistant"} key={`${message.role}-${index}`}>
              {message.content}
            </div>
          ))}
          {isSending && <div className="message-assistant animate-pulse">Thinking with this page’s context…</div>}
        </div>

        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-paper" key={prompt} onClick={() => void ask(prompt)} type="button">
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form className="rounded-2xl border border-ink/15 bg-paper p-2 focus-within:border-ink/40" onSubmit={submit}>
          <label className="sr-only" htmlFor={`question-${pageId}`}>Ask about {pageLabel}</label>
          <textarea
            className="min-h-20 w-full resize-none bg-transparent p-2 text-sm outline-none"
            id={`question-${pageId}`}
            maxLength={2000}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about this design…"
            value={question}
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] text-muted">Page context attached</span>
            <button aria-label="Send question" className="grid h-9 w-9 place-items-center rounded-full bg-ink font-bold text-accent disabled:opacity-40" disabled={!question.trim() || isSending} type="submit">↑</button>
          </div>
        </form>
      </div>
    </aside>
  );
}
