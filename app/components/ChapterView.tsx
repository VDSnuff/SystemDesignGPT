import Link from "next/link";
import type { GuidePage } from "../content";
import { AppHeader } from "./AppHeader";
import { ChapterNav } from "./ChapterNav";
import { ChatPanel } from "./ChatPanel";
import { Checklist } from "./Checklist";

export function ChapterView({ page }: Readonly<{ page: GuidePage }>) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="mx-auto grid max-w-[1600px] xl:grid-cols-[230px_minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <ChapterNav activeSlug={page.slug} />
        <article className="min-w-0 px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
          <p className="kicker">Chapter {page.number} · {page.label}</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl 2xl:text-7xl">
            {page.title}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-muted">{page.lead}</p>

          <section className="mt-10 grid gap-4 md:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-3xl bg-ink p-7 text-white sm:p-9">
              <span className="mb-16 block h-3 w-3 rounded-full bg-accent" />
              <p className="max-w-2xl font-serif text-2xl leading-9 sm:text-3xl">{page.overview}</p>
            </div>
            <Link className="group flex min-h-72 flex-col justify-between rounded-3xl border border-ink/15 bg-white/60 p-7 hover:border-ink/40" href="/workshop">
              <div>
                <p className="kicker">Interactive task</p>
                <h2 className="mt-4 font-serif text-3xl">Map this decision.</h2>
                <p className="mt-3 leading-7 text-muted">Place components and connections, then ask the copilot to test the design.</p>
              </div>
              <span className="font-semibold group-hover:translate-x-1">Open canvas →</span>
            </Link>
          </section>

          <Checklist items={page.checkpoints} />
          <footer className="mt-14 border-t border-ink/15 pt-6 text-sm text-muted">
            Based on the System Design Checklist Book, canonical edition 5.0.
          </footer>
        </article>
        <ChatPanel pageId={page.slug} pageLabel={page.label} prompts={page.prompts} />
      </div>
    </main>
  );
}
