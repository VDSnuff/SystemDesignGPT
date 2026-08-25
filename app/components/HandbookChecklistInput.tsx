"use client";

import { useHandbookProgress } from "./HandbookProgressProvider";

export function HandbookChecklistInput({ itemId, label }: Readonly<{ itemId: string; label: string }>) {
  const { progress, status, toggleChecklistItem } = useHandbookProgress();
  return (
    <input
      aria-label={label}
      checked={progress.checkedItems.includes(itemId)}
      disabled={status === "loading"}
      onChange={() => toggleChecklistItem(itemId)}
      type="checkbox"
    />
  );
}
