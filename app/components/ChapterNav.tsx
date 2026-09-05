import Link from "next/link";
import { guidePages, masterChecklistSection } from "../content";
import { CollapsibleNavigation } from "./CollapsibleNavigation";

function GuideLinks({ activeSlug }: Readonly<{ activeSlug: string }>) {
  return guidePages.map((page) => (
    <Link
      aria-current={activeSlug === page.slug ? "page" : undefined}
      className={`flex gap-3 rounded-xl px-3 py-2 text-[13px] leading-5 ${activeSlug === page.slug ? "bg-ink text-white" : "hover:bg-white/80"}`}
      href={`/chapter/${page.slug}`}
      key={page.slug}
    >
      <span className={`w-7 shrink-0 font-mono text-[11px] ${activeSlug === page.slug ? "text-accent" : "text-muted"}`}>{page.number}</span>
      <span>{page.label}</span>
    </Link>
  ));
}

function HandbookOnlyLinks() {
  return <div className="mt-5 border-t border-ink/15 pt-4 text-[13px] leading-5">
    <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Handbook only</p>
    <Link className="block rounded-xl px-3 py-2 hover:bg-white/80" href={masterChecklistSection.href}>{masterChecklistSection.title}</Link>
    <Link className="block rounded-xl px-3 py-2 font-semibold hover:bg-white/80" href="/">Browse complete handbook →</Link>
  </div>;
}

export function ChapterNav({ activeSlug }: Readonly<{ activeSlug: string }>) {
  const active = guidePages.find((page) => page.slug === activeSlug);
  return <>
    <details className="mx-5 mt-5 rounded-2xl border border-ink/15 bg-white/60 p-3 lg:col-span-2 xl:hidden">
      <summary className="cursor-pointer text-sm font-bold">Quick Guides · {active?.label}</summary>
      <nav aria-label="Quick Guides" className="mt-3 max-h-80 space-y-0.5 overflow-y-auto"><GuideLinks activeSlug={activeSlug} /></nav>
      <HandbookOnlyLinks />
    </details>
    <CollapsibleNavigation defaultWidth={230} label="Quick Guides menu">
      <div className="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto pr-1">
        <p className="mb-4 px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Quick Guides</p>
        <nav aria-label="Quick Guides" className="space-y-0.5"><GuideLinks activeSlug={activeSlug} /></nav>
        <HandbookOnlyLinks />
      </div>
    </CollapsibleNavigation>
  </>;
}
