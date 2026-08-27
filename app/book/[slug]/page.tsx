import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { bookSections, findBookSection } from "../../book-content.generated";
import { BookPageView } from "../../components/BookPageView";
import { createPageMetadata, notFoundMetadata } from "../../site-metadata";

interface BookPageProps { readonly params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return bookSections.slice(1).map((section) => ({ slug: section.slug }));
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const section = findBookSection((await params).slug);
  if (!section) return notFoundMetadata;
  const path = section.slug === "introduction" ? "/" : `/book/${section.slug}`;
  return createPageMetadata({ title: section.title, description: section.summary, path });
}

export default async function BookPage({ params }: BookPageProps) {
  const section = findBookSection((await params).slug);
  if (!section) notFound();
  if (section.slug === "introduction") redirect("/");
  return <BookPageView section={section} />;
}
