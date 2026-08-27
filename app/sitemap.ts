import type { MetadataRoute } from "next";
import { bookSections } from "./book-content.generated";
import { guidePages } from "./content";
import { SITE_ORIGIN } from "./site-metadata";

const staticRoutes = ["/", "/workshop"] as const;

export function indexableRoutes() {
  const guides = guidePages.map(({ slug }) => `/chapter/${slug}`);
  const handbook = bookSections.slice(1).map(({ slug }) => `/book/${slug}`);
  return [...staticRoutes, ...guides, ...handbook];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes().map((path) => ({
    url: new URL(path, SITE_ORIGIN).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
