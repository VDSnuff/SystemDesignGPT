import Link from "next/link";
import { guidePages } from "../content";

export function ChapterNav({ activeSlug }: Readonly<{ activeSlug: string }>) {
  return (
    <aside className="hidden border-r border-ink/15 p-5 xl:block">
      <div className="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto pr-1">
        <p className="mb-4 px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Site map</p>
        <nav aria-label="Handbook chapters" className="space-y-0.5">
          {guidePages.map((page) => (
            <Link
              aria-current={activeSlug === page.slug ? "page" : undefined}
              className={`flex gap-3 rounded-xl px-3 py-2 text-[13px] leading-5 ${activeSlug === page.slug ? "bg-ink text-white" : "hover:bg-white/80"}`}
              href={`/chapter/${page.slug}`}
              key={page.slug}
            >
              <span className="w-7 shrink-0 font-mono text-[11px] opacity-55">{page.number}</span>
              <span>{page.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
