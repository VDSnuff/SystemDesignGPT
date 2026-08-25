import Link from "next/link";
import { bookSections, type BookSection } from "../book-content.generated";
import { buildSectionQuiz } from "../section-quiz";
import { AppHeader } from "./AppHeader";
import { BookMarkdown } from "./BookMarkdown";
import { BookNav } from "./BookNav";
import { ChatPanel } from "./ChatPanel";
import { LearningLab } from "./LearningLab";

function sectionHref(section: BookSection) {
  return section.slug === "introduction" ? "/" : `/book/${section.slug}`;
}

function ReaderPager({ section }: Readonly<{ section: BookSection }>) {
  const index = bookSections.findIndex((item) => item.slug === section.slug);
  const previous = bookSections[index - 1];
  const next = bookSections[index + 1];
  return (
    <nav aria-label="Book pagination" className="mt-14 grid gap-3 border-t border-ink/15 pt-6 sm:grid-cols-2">
      {previous ? <Link className="reader-page-link" href={sectionHref(previous)}>← {previous.title}</Link> : <span />}
      {next ? <Link className="reader-page-link text-right" href={sectionHref(next)}>{next.title} →</Link> : null}
    </nav>
  );
}

export function BookPageView({ section }: Readonly<{ section: BookSection }>) {
  const sectionIndex = bookSections.findIndex((item) => item.slug === section.slug) + 1;
  const prompts = ["Summarize this section", "Challenge the key assumptions", "Turn this into a review checklist"];
  return (
    <main className="min-h-screen bg-paper text-ink">
      <AppHeader />
      <div className="mx-auto grid max-w-[1700px] xl:grid-cols-[280px_minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <BookNav activeSlug={section.slug} />
        <article className="min-w-0 px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
          <p className="kicker">Complete handbook · Section {sectionIndex} of {bookSections.length}</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">{section.title}</h1>
          <div className="mt-10"><BookMarkdown markdown={section.markdown} /></div>
          <LearningLab pageSlug={section.slug} questions={buildSectionQuiz(section)} />
          <ReaderPager section={section} />
        </article>
        <ChatPanel pageId={`book:${section.slug}`} pageLabel={section.title} prompts={prompts} />
      </div>
    </main>
  );
}
