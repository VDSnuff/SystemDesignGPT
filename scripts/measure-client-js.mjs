import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";

const BASE_URL = process.env.CLIENT_MEASURE_BASE_URL ?? "http://localhost:4173";
const CLIENT_CHUNK_DIRECTORY = path.join("dist", "client", "_next", "static", "chunks");
const ROUTES = [
  "/",
  "/book/1-requirements-frs-nfrs-constraints-and-assumptions",
  "/book/practical-system-design-workflow",
  "/workshop",
];
const MERMAID_ROUTE = "/book/practical-system-design-workflow";

function summarizeBodies(bodies) {
  return {
    requests: bodies.size,
    rawBytes: [...bodies.values()].reduce((total, body) => total + body.length, 0),
    gzipBytes: [...bodies.values()].reduce((total, body) => total + gzipSync(body).length, 0),
  };
}

async function measureRoute(browser, route) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const bodies = new Map();
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    try { bodies.set(new URL(response.url()).pathname, await response.body()); } catch {
      // Chromium can discard bodies for aborted requests; they transferred no measurable script bytes.
    }
  });
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 20_000 });
  await page.waitForTimeout(2_500);
  if (route === MERMAID_ROUTE) {
    await page.getByRole("img", { name: "Architecture diagram" }).waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(500);
  }
  const measurement = summarizeBodies(bodies);
  await context.close();
  return measurement;
}

async function largestChunks() {
  const files = (await readdir(CLIENT_CHUNK_DIRECTORY)).filter((file) => file.endsWith(".js"));
  const chunks = await Promise.all(files.map(async (file) => {
    const body = await readFile(path.join(CLIENT_CHUNK_DIRECTORY, file));
    return { file, rawBytes: body.length, gzipBytes: gzipSync(body).length };
  }));
  return chunks.sort((left, right) => right.rawBytes - left.rawBytes).slice(0, 5);
}

const browser = await chromium.launch({ headless: true });
console.table(await Promise.all(ROUTES.map(async (route) => ({ route, ...await measureRoute(browser, route) }))));
await browser.close();
console.table(await largestChunks());
