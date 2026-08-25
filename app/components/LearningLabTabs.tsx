import type { KeyboardEvent } from "react";

export type LearningTab = "diagram" | "quiz" | "notes";

const tabs: ReadonlyArray<{ readonly id: LearningTab; readonly label: string }> = [
  { id: "diagram", label: "Diagram" },
  { id: "quiz", label: "Quiz" },
  { id: "notes", label: "Notes & feedback" },
];

interface LearningLabTabsProps {
  readonly activeTab: LearningTab;
  readonly baseId: string;
  readonly onChange: (tab: LearningTab) => void;
}

function nextTab(key: string, currentIndex: number) {
  if (key === "Home") return 0;
  if (key === "End") return tabs.length - 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + tabs.length) % tabs.length;
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % tabs.length;
  return null;
}

export function LearningLabTabs({ activeTab, baseId, onChange }: LearningLabTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const nextIndex = nextTab(event.key, currentIndex);
    if (nextIndex === null) return;
    event.preventDefault();
    const tab = tabs[nextIndex];
    onChange(tab.id);
    requestAnimationFrame(() => document.getElementById(`${baseId}-tab-${tab.id}`)?.focus());
  }

  return (
    <div aria-label="Learning lab tools" className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            aria-controls={`${baseId}-panel-${tab.id}`}
            aria-selected={isActive}
            className={isActive ? "tool-button-dark" : "tool-button"}
            id={`${baseId}-tab-${tab.id}`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
