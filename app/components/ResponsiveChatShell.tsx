"use client";

import { KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import { statusPresentation, type CopilotStatus } from "../copilot-status";

interface ResponsiveChatShellProps {
  readonly children: ReactNode;
  readonly pageLabel: string;
  readonly status: CopilotStatus;
}

const DESKTOP_QUERY = "(min-width: 1024px)";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function useDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function ResponsiveChatShell({ children, pageLabel, status }: ResponsiveChatShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useDesktopViewport();
  const dialogId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const presentation = statusPresentation[status];

  useEffect(() => {
    if (isDesktop || !isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isDesktop, isOpen]);

  function closeChat() {
    setIsOpen(false);
    launcherRef.current?.focus();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeChat();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const elements = focusableElements(dialogRef.current);
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Open design copilot. ${presentation.label}. ${presentation.detail}`}
        className="mobile-copilot-launcher"
        hidden={isDesktop}
        onClick={() => setIsOpen(true)}
        ref={launcherRef}
        type="button"
      >
        <span aria-hidden="true">{presentation.icon}</span>
        <span>Ask copilot</span>
        <span aria-hidden="true" className="mobile-copilot-status">Status: {presentation.label}</span>
      </button>
      <aside
        aria-label={isOpen && !isDesktop ? `Design copilot for ${pageLabel}` : undefined}
        aria-modal={isOpen && !isDesktop ? true : undefined}
        className={`responsive-chat-surface ${isOpen ? "is-open" : ""}`}
        hidden={!isDesktop && !isOpen}
        id={dialogId}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role={isOpen && !isDesktop ? "dialog" : undefined}
      >
        <div className="responsive-chat-panel">
          <button
            aria-label="Close design copilot"
            className="mobile-copilot-close"
            onClick={closeChat}
            ref={closeRef}
            type="button"
          >
            Close
          </button>
          {children}
        </div>
      </aside>
    </>
  );
}
