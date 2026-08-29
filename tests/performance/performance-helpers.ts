import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { gzipSync } from "node:zlib";

export interface Profile {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly deviceScaleFactor: number;
  readonly cpuSlowdown: number;
  readonly latencyMs: number;
  readonly downloadBytesPerSecond: number;
  readonly lcpMs: number;
  readonly cls: number;
  readonly tbtMs: number;
  readonly ttfbMs: number;
}

export interface RouteBudget {
  readonly id: string;
  readonly path: string;
  readonly rawJsBytes: number;
  readonly gzipJsBytes: number;
  readonly mermaid?: boolean;
  readonly tbtMs?: Readonly<Record<string, number>>;
}

export interface ApiRoute {
  readonly id: string;
  readonly path: string;
  readonly statuses: readonly number[];
}

interface LayoutShiftEntry extends PerformanceEntry {
  readonly hadRecentInput: boolean;
  readonly sources: readonly { readonly node?: Node }[];
  readonly value: number;
}

interface LabPerformance {
  readonly cls: number;
  readonly lcp: number;
  readonly longTasks: readonly number[];
  readonly shifts: readonly { readonly value: number; readonly selectors: readonly string[] }[];
}

export function percentile(values: number[], fraction: number) {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

async function mockApi(page: Page) {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { status: "authentication-required" } }));
  await page.route("**/api/learning-state**", (route) => route.fulfill({ status: 401, json: { message: "Sign in" } }));
  await page.route("**/api/handbook-progress", (route) => route.fulfill({ status: 401, json: { message: "Sign in" } }));
  await page.route("**/api/learning-comments**", (route) => route.fulfill({ status: 401, json: { message: "Sign in" } }));
}

async function installObservers(page: Page) {
  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0, longTasks: [] as number[], shifts: [] as object[] };
    Object.assign(window, { __labPerformance: metrics });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (entry.hadRecentInput) continue;
        metrics.cls += entry.value;
        metrics.shifts.push({ value: entry.value, selectors: entry.sources.map(({ node }) => (
          node instanceof Element ? `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}` : "unknown"
        )) });
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) metrics.longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: true });
  });
}

async function throttle(page: Page, profile: Profile) {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.latencyMs,
    downloadThroughput: profile.downloadBytesPerSecond,
    uploadThroughput: profile.downloadBytesPerSecond,
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuSlowdown });
  await session.send("Performance.enable");
  return session;
}

async function settleRoute(page: Page, route: RouteBudget) {
  if (route.mermaid) {
    await page.locator(".mermaid-loading").scrollIntoViewIfNeeded();
    await page.getByRole("img", { name: "Architecture diagram" }).waitFor({ timeout: 20_000 });
  }
  await page.waitForTimeout(1_500);
}

async function pageMetrics(page: Page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const lab = (window as Window & { __labPerformance: LabPerformance }).__labPerformance;
    return {
      cls: lab.cls,
      lcpMs: lab.lcp,
      layoutShifts: lab.shifts,
      tbtMs: lab.longTasks.reduce((total, duration) => total + Math.max(0, duration - 50), 0),
      ttfbMs: navigation.responseStart,
      transferredBytes: resources.reduce((total, item) => total + item.transferSize, 0),
    };
  });
}

function scriptSizes(bodies: Map<string, Buffer>) {
  return {
    rawJsBytes: [...bodies.values()].reduce((total, body) => total + body.length, 0),
    gzipJsBytes: [...bodies.values()].reduce((total, body) => total + gzipSync(body).length, 0),
  };
}

export async function measureRoute(browser: Browser, route: RouteBudget, profile: Profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor });
  const page = await context.newPage();
  const bodies = new Map<string, Buffer>();
  await mockApi(page);
  await installObservers(page);
  const session = await throttle(page, profile);
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    try { bodies.set(response.url(), await response.body()); } catch {}
  });
  const response = await page.goto(route.path, { waitUntil: "load", timeout: 30_000 });
  await settleRoute(page, route);
  const browserMetrics = await session.send("Performance.getMetrics");
  const sizes = scriptSizes(bodies);
  const scriptDuration = browserMetrics.metrics.find(({ name }) => name === "ScriptDuration")?.value ?? 0;
  const measurement = {
    ...await pageMetrics(page), ...sizes,
    scriptExecutionMs: Math.round(scriptDuration * 1_000), status: response?.status(),
    mermaidParserFetched: sizes.rawJsBytes >= 1_000_000,
  };
  await context.close();
  return measurement;
}

async function measureAction(action: () => Promise<void>) {
  const startedAt = performance.now();
  await action();
  return Math.round(performance.now() - startedAt);
}

async function readerInteractions(page: Page) {
  await page.goto("/book/1-requirements-frs-nfrs-constraints-and-assumptions");
  const searchFirstUse = await measureAction(async () => {
    await page.getByRole("combobox", { name: "Search the guide and handbook" }).fill("bounded order cancellation");
    await page.getByRole("option").first().waitFor();
  });
  const mobileCopilotOpen = await measureAction(async () => {
    await page.getByRole("button", { name: /Open design copilot/ }).click();
    await page.getByRole("dialog").waitFor();
  });
  return { searchFirstUse, mobileCopilotOpen };
}

async function mermaidInteraction(page: Page) {
  await page.goto("/book/practical-system-design-workflow");
  return measureAction(async () => {
    await page.locator(".book-prose").evaluate((element) => {
      element.querySelector(".mermaid-loading, .mermaid-diagram")?.scrollIntoView();
    });
    await page.getByRole("img", { name: "Architecture diagram" }).waitFor({ timeout: 20_000 });
  });
}

async function quizInteraction(page: Page) {
  await page.goto("/book/5-apis-contracts-and-idempotency");
  await page.getByRole("tab", { name: "Quiz" }).click();
  return measureAction(async () => {
    await page.getByRole("radio").first().check();
    await page.getByText("Answer every question to see your score.").waitFor();
  });
}

async function installStateMock(page: Page) {
  await page.unroute("**/api/learning-state**");
  let savedState: Record<string, unknown> | null = null;
  await page.route("**/api/learning-state**", async (route) => {
    if (route.request().method() === "PUT") {
      savedState = route.request().postDataJSON();
      return route.fulfill({ json: { saved: true } });
    }
    return route.fulfill({ json: { state: savedState } });
  });
}

async function workshopInteractions(page: Page) {
  await installStateMock(page);
  await page.goto("/workshop");
  const workshopManipulation = await measureAction(async () => {
    await page.getByRole("button", { name: "+ Queue" }).click();
    await page.getByRole("button", { name: "Queue: New queue" }).waitFor();
  });
  const mockedSaveResume = await measureAction(async () => {
    await page.getByRole("button", { name: "Save workshop diagram" }).click();
    await page.getByText("Workshop diagram saved for your next visit.").waitFor();
    await page.reload();
    await page.getByText("Saved workshop diagram loaded.").waitFor();
  });
  return { workshopManipulation, mockedSaveResume };
}

export async function measureInteractions(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await mockApi(page);
  const reader = await readerInteractions(page);
  const mermaidRender = await mermaidInteraction(page);
  const quizAnswer = await quizInteraction(page);
  const workshop = await workshopInteractions(page);
  await context.close();
  return { ...reader, mermaidRender, quizAnswer, ...workshop };
}

export async function batchedRequests(
  request: APIRequestContext,
  route: ApiRoute,
  concurrency: number,
  sampleCount: number,
) {
  const samples = [];
  for (let index = 0; index < sampleCount; index += concurrency) {
    const count = Math.min(concurrency, sampleCount - index);
    samples.push(...await Promise.all(Array.from({ length: count }, async () => {
      const startedAt = performance.now();
      const response = await request.get(route.path);
      return {
        durationMs: Math.round(performance.now() - startedAt),
        ok: route.statuses.includes(response.status()),
        status: response.status(),
        cacheControl: response.headers()["cache-control"],
      };
    })));
  }
  return samples;
}
