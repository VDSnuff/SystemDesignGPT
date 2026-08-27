import Link from "next/link";
import { bookSections } from "../book-content.generated";
import { CollapsibleNavigation } from "./CollapsibleNavigation";
import { HandbookProgressPanel } from "./HandbookProgressPanel";

export function BookNav({ activeSlug }: Readonly<{ activeSlug: string }>) {
  const active = bookSections.find((section) => section.slug === activeSlug);
  return (
    <>
      <details className="mx-5 mt-5 rounded-2xl border border-ink/15 bg-white/60 p-3 lg:col-span-2 xl:hidden">
        <summary className="cursor-pointer text-sm font-bold">Complete book · {active?.title}</summary>
        <div className="mt-3"><HandbookProgressPanel instanceId="mobile" /></div>
        <nav aria-label="Complete handbook sections" className="mt-3 max-h-80 space-y-0.5 overflow-y-auto">
          <BookLinks activeSlug={activeSlug} />
        </nav>
      </details>
      <CollapsibleNavigation defaultWidth={280} label="complete book menu">
        <div className="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto pr-1">
          <HandbookProgressPanel instanceId="desktop" />
          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Complete book</p>
          <nav aria-label="Complete handbook sections" className="space-y-0.5"><BookLinks activeSlug={activeSlug} /></nav>
        </div>
      </CollapsibleNavigation>
    </>
  );
}

function BookLinks({ activeSlug }: Readonly<{ activeSlug: string }>) {
  return bookSections.map((section) => (
    <Link
      aria-current={activeSlug === section.slug ? "page" : undefined}
      className={`flex gap-3 rounded-xl px-3 py-2 text-[13px] leading-5 ${activeSlug === section.slug ? "bg-ink text-white" : "hover:bg-white/80"}`}
      href={section.slug === "introduction" ? "/" : `/book/${section.slug}`}
      key={section.slug}
    >
      <span className={`w-7 shrink-0 font-mono text-[10px] ${activeSlug === section.slug ? "text-accent" : "text-muted"}`}>{section.number}</span>
      <span>{section.title}</span>
    </Link>
  ));
}
