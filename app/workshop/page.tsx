import type { Metadata } from "next";
import { AppHeader } from "../components/AppHeader";
import { ChapterNav } from "../components/ChapterNav";
import { ChatPanel } from "../components/ChatPanel";
import { DiagramBuilder } from "../components/DiagramBuilder";
import { workshopPage } from "../content";
import { createPageMetadata } from "../site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Diagram workshop",
  description: workshopPage.lead,
  path: "/workshop",
});

export default function WorkshopPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid min-h-screen max-w-[1600px] bg-paper text-ink lg:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[230px_minmax(0,1fr)_auto]" id="main-content" tabIndex={-1}>
        <ChapterNav activeSlug={workshopPage.slug} />
        <article className="min-w-0 px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
          <p className="kicker">Lab · Interactive architecture task</p>
          <h1 className="page-title mt-5 max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">{workshopPage.title}</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-muted">{workshopPage.lead}</p>
          <DiagramBuilder pageSlug={workshopPage.slug} />
          <div className="mt-5 rounded-2xl border border-ink/15 bg-white/60 p-5 text-sm leading-6 text-muted" id="workshop-review">
            <strong className="text-ink">Review prompt:</strong> identify the source of truth, retry boundary, and first dependency that can fail partially. Then describe the evidence that would prove the design works.
          </div>
        </article>
        <ChatPanel
          fallbackHref="#workshop-review"
          fallbackLabel="Open workshop review prompt"
          pageId={workshopPage.slug}
          pageLabel={workshopPage.label}
          prompts={workshopPage.prompts}
        />
      </main>
    </>
  );
}
