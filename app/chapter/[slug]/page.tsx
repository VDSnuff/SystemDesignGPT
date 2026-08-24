import { notFound } from "next/navigation";
import { ChapterView } from "../../components/ChapterView";
import { findGuidePage, guidePages } from "../../content";

export function generateStaticParams() {
  return guidePages.map((page) => ({ slug: page.slug }));
}

export default async function GuidePage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const page = findGuidePage(slug);
  if (!page || page.slug === "diagram-workshop") notFound();
  return <ChapterView page={page} />;
}
