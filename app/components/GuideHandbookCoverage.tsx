import Link from "next/link";
import { masterChecklistSection, type HandbookSectionLink } from "../content";

interface GuideHandbookCoverageProps {
  readonly sections: readonly HandbookSectionLink[];
}

function canonicalHandbookLinkLabel(title: string) {
  const [number, ...words] = title.split(". ");
  return `Canonical handbook chapter ${number}: ${words.join(". ")}`;
}

export function GuideHandbookCoverage({ sections }: GuideHandbookCoverageProps) {
  return (
    <section aria-labelledby="handbook-coverage-title" className="mt-10 rounded-3xl border border-ink/15 bg-white/60 p-6 sm:p-8">
      <p className="kicker">Canonical handbook coverage</p>
      <h2 className="mt-3 font-serif text-2xl" id="handbook-coverage-title">This Quick Guide summarizes</h2>
      <ul className="mt-4 space-y-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link aria-label={canonicalHandbookLinkLabel(section.title)} className="font-semibold underline decoration-ink/25 underline-offset-4 hover:decoration-ink" href={section.href}>
              {section.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">
        This page is a focused summary, not a copy of the canonical chapter. Handbook-only material includes the{" "}
        <Link aria-label="Handbook-only master system design review checklist" className="font-semibold text-ink underline underline-offset-4" href={masterChecklistSection.href}>{masterChecklistSection.title}</Link>,
        book foundations, workflows, templates, glossary, diagram notes, and verification register.
      </p>
      <Link className="mt-5 inline-flex min-h-11 items-center font-semibold" href="/">Browse the complete handbook →</Link>
    </section>
  );
}
