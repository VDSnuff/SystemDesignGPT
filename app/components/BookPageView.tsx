import Link from "next/link";
import { bookSections, type BookSection } from "../book-content.generated";
import { findBookLearningSection, type BookLearningSection } from "../book-learning.generated";
import { getSectionQuizPolicy } from "../section-quiz";
import { AppHeader } from "./AppHeader";
import { BookMarkdown } from "./BookMarkdown";
import { BookNav } from "./BookNav";
import { ChatPanel } from "./ChatPanel";
import { LearningLab } from "./LearningLab";
import { ReadingPositionTracker } from "./ReadingPositionTracker";
import { SectionProgressControls } from "./SectionProgressControls";

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

function BookArticle({ learningSection, section }: Readonly<{ learningSection: BookLearningSection; section: BookSection }>) {
  const sectionIndex = bookSections.findIndex((item) => item.slug === section.slug) + 1;
  return <article className="min-w-0 px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="kicker">Complete handbook · Section {sectionIndex} of {bookSections.length}</p>
      <SectionProgressControls sectionSlug={section.slug} />
    </div>
    <h1 className="page-title mt-5 max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">{section.title}</h1>
    <div className="mt-10" id="section-content">
      <BookMarkdown checklistItems={learningSection.checklistItems} headings={learningSection.headings} markdown={section.markdown} />
    </div>
    <ReadingPositionTracker headingIds={learningSection.headings.map((heading) => heading.id)} sectionSlug={section.slug} />
    <LearningLab pageSlug={section.slug} quizPolicy={getSectionQuizPolicy(section)} />
    <ReaderPager section={section} />
  </article>;
}

export function BookPageView({ section }: Readonly<{ section: BookSection }>) {
  const learningSection = findBookLearningSection(section.slug);
  if (!learningSection) throw new Error(`Learning metadata is missing for handbook section ${section.slug}`);
  const prompts = ["Summarize this section", "Challenge the key assumptions", "Turn this into a review checklist"];
  return (
    <>
      <AppHeader />
      <main className="reader-layout reader-layout-book mx-auto block min-h-screen max-w-[1700px] bg-paper text-ink lg:grid" id="main-content" tabIndex={-1}>
        <BookNav activeSlug={section.slug} />
        <BookArticle learningSection={learningSection} section={section} />
        <ChatPanel
          fallbackHref="#learning-lab"
          fallbackLabel="Open section learning lab"
          pageId={`book:${section.slug}`}
          pageLabel={section.title}
          prompts={prompts}
        />
      </main>
    </>
  );
}
