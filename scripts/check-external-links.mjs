import fs from "node:fs";

const SOURCE_PATH = "docs/System_Design_Checklist_Book.md";
const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 8;
const UNVERIFIED_STATUS_CODES = new Set([401, 403, 429]);

function sourceUrls() {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  const matches = source.matchAll(/\]\((https?:\/\/[^)]+)\)/g);
  return [...new Set([...matches].map((match) => match[1]))].toSorted();
}

function classify(status) {
  if (status >= 200 && status < 400) return "PASS";
  if (UNVERIFIED_STATUS_CODES.has(status) || status >= 500) return "UNVERIFIED";
  return "FAIL";
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "SystemDesignStudio-LinkHealth/1.0",
        ...(method === "GET" ? { Range: "bytes=0-0" } : {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUrl(url) {
  try {
    let response = await request(url, "HEAD");
    if ([403, 405].includes(response.status)) response = await request(url, "GET");
    return { url, status: response.status, result: classify(response.status), finalUrl: response.url };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { url, status: null, result: "UNVERIFIED", detail };
  }
}

async function checkBatch(urls) {
  const results = [];
  for (let index = 0; index < urls.length; index += CONCURRENCY) {
    results.push(...await Promise.all(urls.slice(index, index + CONCURRENCY).map(checkUrl)));
  }
  return results;
}

function printReport(results) {
  const counts = Object.groupBy(results, ({ result }) => result);
  console.log(`# External link health ${new Date().toISOString()}`);
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Checked: ${results.length}; PASS: ${counts.PASS?.length ?? 0}; FAIL: ${counts.FAIL?.length ?? 0}; UNVERIFIED: ${counts.UNVERIFIED?.length ?? 0}`);
  for (const result of results.filter(({ result }) => result !== "PASS")) {
    console.log(`${result.result}\t${result.status ?? "network"}\t${result.url}\t${result.detail ?? result.finalUrl ?? ""}`);
  }
}

const results = await checkBatch(sourceUrls());
printReport(results);
if (results.some(({ result }) => result === "FAIL")) process.exitCode = 1;
