import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-ink/15 bg-paper/95 px-5 py-4 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
        <Link className="flex items-center gap-3 font-semibold" href="/">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-accent">SD</span>
          <span>System Design Studio</span>
        </Link>
        <Link className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] hover:bg-white" href="/workshop">
          Open workshop
        </Link>
      </div>
    </header>
  );
}
