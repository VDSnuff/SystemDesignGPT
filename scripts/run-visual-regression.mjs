import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const config = "playwright.visual.config.ts";
const snapshotDir = "tests/e2e/visual-regression.spec.ts-snapshots";
const artifactDirs = ["test-results/visual-regression", "playwright-report"];
const runtimes = new Set(["auto", "container", "native"]);
const updateFlags = /^(-u|--update-snapshots(=.*)?)$/;
const volumePrefix = "system-design-visual";
const containerVolumes = { "node-modules": "/work/node_modules", "npm-cache": "/root/.npm" };
const installScript = "cmp -s package-lock.json node_modules/.visual-lock || (npm ci --no-audit && cp package-lock.json node_modules/.visual-lock)";

export function canonicalImage(playwrightVersion) {
  return `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
}

/** @param {{ platform: string, runtime?: string, args?: readonly string[] }} selection */
export function resolveRuntime({ platform, runtime = "auto", args = [] }) {
  if (!runtimes.has(runtime)) throw new Error(`Unknown VISUAL_RUNTIME "${runtime}"; use auto, container, or native`);
  const updates = args.some((argument) => updateFlags.test(argument));
  if (platform === "linux" && runtime !== "container") return { mode: "native", updates };
  if (runtime === "native") {
    if (updates) throw new Error("Snapshot updates are Linux-only; run them in the canonical container");
    return { mode: "diagnostic", updates: false };
  }
  return { mode: "container", updates };
}

/** @param {readonly string[]} args */
export function containerScript(args) {
  const test = ["npx", "playwright", "test", "--config", config, ...args].join(" ");
  return `tar --warning=no-unknown-keyword -xf - && mkdir -p ${artifactDirs.join(" ")} && ${installScript} && npm run build && ${test}`;
}

/** @param {{ image: string, name: string, args: readonly string[] }} run */
export function containerArgs({ image, name, args }) {
  const mounts = Object.entries(containerVolumes).flatMap(([volume, target]) => ["--volume", `${volumePrefix}-${volume}:${target}`]);
  return [
    "run", "--interactive", "--init", "--ipc=host", "--name", name,
    "--env", "CI=1", "--env", "VISUAL_RUNTIME=native",
    ...mounts, "--workdir", "/work", image, "bash", "-lc", containerScript(args),
  ];
}

function docker(args, options = {}) {
  return spawnSync("docker", args, { stdio: "inherit", ...options });
}

function workspaceArchive() {
  const files = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "buffer" });
  if (files.status !== 0) throw new Error("Could not list the workspace files to copy into the container");
  const env = { ...process.env, COPYFILE_DISABLE: "1" };
  const archive = spawnSync("tar", ["--null", "-T", "-", "-cf", "-"], { env, input: files.stdout, maxBuffer: 1024 ** 3 });
  if (archive.status !== 0) throw new Error("Could not archive the workspace for the container");
  return archive.stdout;
}

function copyBack(name, paths) {
  for (const target of paths) {
    mkdirSync(target, { recursive: true });
    docker(["cp", `${name}:/work/${target}/.`, target]);
  }
}

function runContainer(args, updates) {
  const { version } = JSON.parse(readFileSync("node_modules/@playwright/test/package.json", "utf8"));
  const image = canonicalImage(version);
  const name = `${volumePrefix}-${process.pid}`;
  console.info(`Running the canonical Linux visual environment in ${image}`);
  const result = docker(containerArgs({ image, name, args }), { input: workspaceArchive(), stdio: ["pipe", "inherit", "inherit"] });
  copyBack(name, updates ? [...artifactDirs, snapshotDir] : artifactDirs);
  docker(["rm", "--force", name], { stdio: "ignore" });
  return result.status ?? 1;
}

function runNative(args, mode) {
  if (mode === "diagnostic") {
    console.warn(`Diagnostic run on ${process.platform}: results are not release evidence and snapshots stay untouched.`);
    args = ["--update-snapshots=none", ...args];
  }
  const env = { ...process.env, VISUAL_RUNTIME: "native" };
  return spawnSync("npx", ["playwright", "test", "--config", config, ...args], { env, stdio: "inherit" }).status ?? 1;
}

function main() {
  const args = process.argv.slice(2);
  const { mode, updates } = resolveRuntime({ platform: process.platform, runtime: process.env.VISUAL_RUNTIME, args });
  process.exit(mode === "container" ? runContainer(args, updates) : runNative(args, mode));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
