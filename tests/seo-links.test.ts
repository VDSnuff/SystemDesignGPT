import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { bookSections } from "../app/book-content.generated";
import { findBookLearningSection } from "../app/book-learning.generated";
import { guideArticles } from "../app/articles";
import { guidePages } from "../app/content";
import robots from "../app/robots";
import sitemap, { indexableRoutes } from "../app/sitemap";
import { createPageMetadata, rootMetadata, SITE_ORIGIN } from "../app/site-metadata";

function internalLinks(markdown: string) {
  return [...markdown.matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
}

function routeHeadings(path: string) {
  if (!path.startsWith("/book/")) return [];
  const slug = path.slice("/book/".length);
  return findBookLearningSection(slug)?.headings.map(({ id }) => id) ?? [];
}

describe("SEO and link contracts", () => {
  it("publishes the complete canonical route inventory once", () => {
    const routes = indexableRoutes();
    expect(routes).toHaveLength(50);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toContain("/");
    expect(routes).not.toContain("/book/introduction");
    expect(routes).not.toContain("/owner/comments");
    expect(sitemap().map(({ url }) => url)).toEqual(
      routes.map((path) => new URL(path, SITE_ORIGIN).toString()),
    );
  });

  it("keeps private and API routes out of search", () => {
    const policy = robots();
    expect(policy.host).toBe(SITE_ORIGIN);
    expect(policy.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`);
    expect(policy.rules).toEqual([
      { userAgent: "*", allow: "/", disallow: ["/api/", "/owner/"] },
    ]);
  });

  it("builds absolute-ready canonical and social metadata", () => {
    const metadata = createPageMetadata({
      title: "Requirements",
      description: guidePages[0].lead,
      path: "/chapter/requirements",
    });
    expect(rootMetadata.metadataBase?.toString()).toBe(`${SITE_ORIGIN}/`);
    expect(metadata.alternates?.canonical).toBe("/chapter/requirements");
    expect(metadata.openGraph?.url).toBe("/chapter/requirements");
    expect(metadata.openGraph?.title).toBe("Requirements · System Design Studio");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("declares the real social-preview image dimensions", () => {
    const image = fs.readFileSync("public/og.png");
    const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
    expect(image.subarray(1, 4).toString()).toBe("PNG");
    expect(view.getUint32(16)).toBe(1731);
    expect(view.getUint32(20)).toBe(909);
  });

  it("resolves every authored internal content link and heading anchor", () => {
    const routes = new Set(indexableRoutes());
    const markdown = [...bookSections.map(({ markdown }) => markdown), ...guideArticles.map(({ markdown }) => markdown)];
    for (const link of markdown.flatMap(internalLinks)) {
      const target = new URL(link, SITE_ORIGIN);
      expect(routes, `missing route for ${link}`).toContain(target.pathname);
      if (!target.hash) continue;
      const headings = routeHeadings(target.pathname);
      expect(headings, `missing heading for ${link}`).toContain(decodeURIComponent(target.hash.slice(1)));
    }
  });
});
