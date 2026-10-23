import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import tailwindcss from "@tailwindcss/postcss";
import { canonicalImage } from "./run-visual-regression.mjs";
import { diagramAssetPath, diagramInputs, digest } from "./mermaid-assets.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixturePath = "/__diagram_generator";
const fixture = `<html><body><script type="module">
import "/app/globals.css";
import mermaid from "mermaid";
import { stableDomId } from "/app/dom-id.ts";
window.renderChart = async (chart, config) => {
  await document.fonts.ready;
  mermaid.initialize(config);
  return (await mermaid.render(stableDomId("diagram", chart), chart)).svg;
};
</script></body></html>`;

async function fixtureServer() {
  const plugin = {
    name: "diagram-generator",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== fixturePath) return next();
        response.setHeader("Content-Type", "text/html");
        response.end(await server.transformIndexHtml(fixturePath, fixture));
      });
    },
  };
  const server = await createServer({ root, configFile: false, plugins: [plugin], css: { postcss: { plugins: [tailwindcss()] } }, server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  return server;
}

async function generate() {
  const inputs = diagramInputs(root);
  const server = await fixtureServer();
  const browser = await chromium.launch({ headless: true });
  const diagrams = [];
  try {
    for (const chart of new Set(inputs.charts)) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`${server.resolvedUrls.local[0].replace(/\/$/, "")}${fixturePath}`);
      await page.waitForFunction(() => typeof window.renderChart === "function");
      const svg = await page.evaluate(({ chart, config }) => window.renderChart(chart, config), { chart, config: inputs.config });
      diagrams.push({ chart, svg, sha256: digest(svg) });
      await page.close();
    }
    fs.writeFileSync(path.join(root, diagramAssetPath), `${JSON.stringify({ inputs, diagrams }, null, 2)}\n`);
    console.log(`Generated ${diagrams.length} sanitized handbook SVGs`);
  } finally {
    await browser.close();
    await server.close();
  }
}

function containerGeneration() {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, "node_modules/@playwright/test/package.json"), "utf8"));
  const files = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root });
  if (files.status !== 0) throw new Error("Could not list diagram-generation inputs");
  const archive = spawnSync("tar", ["--null", "-T", "-", "-cf", "-"], { cwd: root, input: files.stdout, env: { ...process.env, COPYFILE_DISABLE: "1" }, maxBuffer: 1024 ** 3 });
  if (archive.status !== 0) throw new Error("Could not archive diagram-generation inputs");
  const name = `system-design-diagrams-${process.pid}`;
  const command = "tar --warning=no-unknown-keyword -xf - && npm ci --no-audit && node scripts/generate-diagrams.mjs";
  const args = ["run", "--interactive", "--init", "--ipc=host", "--name", name, "--volume", "/work/node_modules", "--workdir", "/work", canonicalImage(version), "bash", "-lc", command];
  try {
    const run = spawnSync("docker", args, { input: archive.stdout, stdio: ["pipe", "inherit", "inherit"] });
    if (run.status !== 0) throw new Error("Canonical diagram generation failed");
    const copy = spawnSync("docker", ["cp", `${name}:/work/${diagramAssetPath}`, path.join(root, diagramAssetPath)], { stdio: "inherit" });
    if (copy.status !== 0) throw new Error("Could not copy generated diagram assets");
  } finally {
    spawnSync("docker", ["rm", "--volumes", name], { stdio: "inherit" });
  }
}

if (process.platform === "linux") await generate();
else containerGeneration();
