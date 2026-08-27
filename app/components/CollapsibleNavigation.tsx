"use client";

import { ReactNode, useId, useState } from "react";

interface CollapsibleNavigationProps {
  readonly children: ReactNode;
  readonly label: string;
}

export function CollapsibleNavigation({ children, label }: CollapsibleNavigationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const contentId = useId();

  return (
    <aside className={`desktop-navigation ${isOpen ? "" : "is-collapsed"}`}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
        className="desktop-navigation-toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">{isOpen ? "‹" : "›"}</span>
        <span className={isOpen ? "" : "sr-only"}>{isOpen ? "Hide menu" : "Show menu"}</span>
      </button>
      <div hidden={!isOpen} id={contentId}>{children}</div>
    </aside>
  );
}
