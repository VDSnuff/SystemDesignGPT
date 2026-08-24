import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bookSections, findBookSection } from "../../book-content.generated";
import { BookPageView } from "../../components/BookPageView";

interface BookPageProps { readonly params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return bookSections.slice(1).map((section) => ({ slug: section.slug }));
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const section = findBookSection((await params).slug);
  if (!section) return {};
  const title = `${section.title} · System Design Studio`;
  return {
    title,
    description: section.summary,
    openGraph: { title, description: section.summary, images: [] },
    twitter: { title, description: section.summary, images: [] },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const section = findBookSection((await params).slug);
  if (!section || section.slug === "introduction") notFound();
  return <BookPageView section={section} />;
}
