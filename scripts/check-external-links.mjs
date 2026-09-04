import fs from "node:fs";
import { pathToFileURL } from "node:url";

const SOURCE_PATH = "docs/System_Design_Checklist_Book.md";
const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 8;
const UNVERIFIED_STATUS_CODES = new Set([401, 403, 429]);

function sourceUrls() {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  const matches = source.matchAll(/\]\((https?:\/\/[^)]+)\)/g);
  return [...new Set([...matches].map((match) => match[1]))].toSorted();
}

export function classify(status) {
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

export async function checkUrl(url, requestUrl = request) {
  try {
    let response = await requestUrl(url, "HEAD");
    if (classify(response.status) !== "PASS") response = await requestUrl(url, "GET");
    const result = classify(response.status);
    const verification = result === "UNVERIFIED" ? "BROWSER_REQUIRED" : "AUTOMATED";
    return { url, status: response.status, result, verification, finalUrl: response.url };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { url, status: null, result: "UNVERIFIED", verification: "BROWSER_REQUIRED", detail };
  }
}

async function checkBatch(urls) {
  const results = [];
  for (let index = 0; index < urls.length; index += CONCURRENCY) {
    results.push(...await Promise.all(
      urls.slice(index, index + CONCURRENCY).map((url) => checkUrl(url)),
    ));
  }
  return results;
}

function printReport(results) {
  const counts = Object.groupBy(results, ({ result }) => result);
  console.log(`# External link health ${new Date().toISOString()}`);
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Checked: ${results.length}; PASS: ${counts.PASS?.length ?? 0}; FAIL: ${counts.FAIL?.length ?? 0}; UNVERIFIED: ${counts.UNVERIFIED?.length ?? 0}`);
  for (const result of results.filter(({ result }) => result !== "PASS")) {
    console.log(`${result.result}\t${result.verification}\t${result.status ?? "network"}\t${result.url}\t${result.detail ?? result.finalUrl ?? ""}`);
  }
}

export function hasBlockingFailure(results) {
  return results.some(({ result }) => result === "FAIL");
}

async function main() {
  const results = await checkBatch(sourceUrls());
  printReport(results);
  if (hasBlockingFailure(results)) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
