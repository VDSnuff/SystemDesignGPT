"use client";

import { useState } from "react";

export function Checklist({ items }: Readonly<{ items: readonly string[] }>) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());

  function toggle(index: number) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <section className="mt-12" aria-labelledby="review-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Interactive review</p>
          <h2 className="mt-2 font-serif text-4xl tracking-[-0.03em]" id="review-heading">Prove the essentials.</h2>
        </div>
        <span className="font-mono text-xs text-muted">{checked.size}/{items.length} checked</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => {
          const isChecked = checked.has(index);
          return (
            <button
              aria-pressed={isChecked}
              className={`flex min-h-28 items-start gap-4 rounded-2xl border p-5 text-left ${isChecked ? "border-ink bg-ink text-white" : "border-ink/15 bg-white/65 hover:border-ink/35"}`}
              key={item}
              onClick={() => toggle(index)}
              type="button"
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${isChecked ? "border-accent bg-accent text-ink" : "border-ink/25"}`}>
                {isChecked ? "✓" : index + 1}
              </span>
              <span className="text-sm font-semibold leading-6">{item}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
