import { expect, test, type APIRequestContext } from "@playwright/test";
import { JSDOM } from "jsdom";
import { bookSections } from "../../app/book-content.generated";
import { guidePages } from "../../app/content";

const SITE_ORIGIN = "https://system-design-studio.v-dovnich.chatgpt.site";
const METADATA_CRAWL_TIMEOUT_MS = 60_000;

const indexableRoutes = [
  "/",
  "/workshop",
  ...guidePages.map(({ slug }) => `/chapter/${slug}`),
  ...bookSections.slice(1).map(({ slug }) => `/book/${slug}`),
];

async function documentFor(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  return new JSDOM(await response.text()).window.document;
}

function content(document: Document, selector: string, attribute: string) {
  return document.querySelector(selector)?.getAttribute(attribute) ?? "";
}

function internalTarget(href: string) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  const url = new URL(href, SITE_ORIGIN);
  return url.origin === SITE_ORIGIN ? url : null;
}

function canonicalUrl(path: string) {
  return path === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${path}`;
}

test("every public page has unique canonical server-rendered metadata", async ({ request }) => {
  test.setTimeout(METADATA_CRAWL_TIMEOUT_MS);
  const titles = new Set<string>();
  for (const path of indexableRoutes) {
    const document = await documentFor(request, path);
    const title = document.title;
    expect(title, path).toBeTruthy();
    expect(titles, `duplicate title on ${path}`).not.toContain(title);
    titles.add(title);
    expect(document.querySelectorAll("h1"), path).toHaveLength(1);
    expect(content(document, "meta[name='description']", "content"), path).toBeTruthy();
    expect(content(document, "link[rel='canonical']", "href"), path).toBe(canonicalUrl(path));
    expect(content(document, "meta[property='og:url']", "content"), path).toBe(canonicalUrl(path));
    expect(content(document, "meta[property='og:image']", "content"), path).toBe(`${SITE_ORIGIN}/og.png`);
    expect(content(document, "meta[name='twitter:card']", "content"), path).toBe("summary_large_image");
  }
});

test("robots, sitemap, private routes, aliases, and errors match policy", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /api/");
  expect(await robots.text()).toContain("Disallow: /owner/");

  const sitemap = await request.get("/sitemap.xml");
  const locations = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locations).toEqual(indexableRoutes.map((path) => new URL(path, SITE_ORIGIN).toString()));

  for (const path of ["/owner/comments", "/api/chat"]) {
    const response = await request.get(path);
    expect(response.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  for (const [path, location] of [["/book/introduction", "/"], ["/chapter/diagram-workshop", "/workshop"]]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
    expect(response.headers().location).toBe(location);
  }

  const trailingSlash = await request.get("/workshop/", { maxRedirects: 0 });
  expect([307, 308]).toContain(trailingSlash.status());
  expect(trailingSlash.headers().location).toBe("/workshop");
  for (const path of ["/not-a-real-route", "/book/not-a-real-section", "/book/%2F"] ) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    const document = new JSDOM(await response.text()).window.document;
    expect(content(document, "meta[name='robots']", "content"), path).toContain("noindex");
    expect(document.querySelector("link[rel='canonical']"), path).toBeNull();
  }
});

test("all rendered internal links, anchors, and public images resolve", async ({ request }) => {
  const documents = new Map<string, Document>();
  const targets = new Map<string, URL>();
  for (const path of [...indexableRoutes, "/owner/comments"]) {
    const document = await documentFor(request, path);
    documents.set(path, document);
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const target = internalTarget(anchor.getAttribute("href") ?? "");
      if (target) targets.set(target.href, target);
    }
  }

  for (const target of targets.values()) {
    const document = documents.get(target.pathname) ?? await documentFor(request, target.pathname);
    if (target.hash) expect(document.getElementById(decodeURIComponent(target.hash.slice(1))), target.href).not.toBeNull();
  }
  for (const asset of ["/favicon.svg", "/og.png"]) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
  }

  const ownerHtml = documents.get("/owner/comments")?.documentElement.textContent ?? "";
  expect(ownerHtml).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  expect(ownerHtml).not.toContain("OPENAI_API_KEY");
});
