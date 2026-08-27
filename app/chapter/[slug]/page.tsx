import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChapterView } from "../../components/ChapterView";
import { findGuidePage, guidePages } from "../../content";
import { createPageMetadata, notFoundMetadata } from "../../site-metadata";

interface GuidePageProps { readonly params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return guidePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const page = findGuidePage((await params).slug);
  if (!page || page.slug === "diagram-workshop") return notFoundMetadata;
  return createPageMetadata({ title: page.label, description: page.lead, path: `/chapter/${page.slug}` });
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const page = findGuidePage(slug);
  if (!page) notFound();
  if (page.slug === "diagram-workshop") redirect("/workshop");
  return <ChapterView page={page} />;
}
