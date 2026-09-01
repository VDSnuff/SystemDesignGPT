import { spawnSync } from "node:child_process";

const config = "playwright.cross-browser.config.ts";
const projects = ["chromium", "firefox", "webkit"];
const webkitBatches = [
  [
    "tests/e2e/accessibility.spec.ts",
    "tests/e2e/agentic-systems-guide.spec.ts",
    "tests/e2e/authored-quiz.spec.ts",
    "tests/e2e/complete-journeys.spec.ts",
    "tests/e2e/cost-simplicity-guide.spec.ts",
    "tests/e2e/delivery-lifecycle-guide.spec.ts",
    "tests/e2e/deployment-evolution-guide.spec.ts",
    "tests/e2e/diagram-workshop.spec.ts",
    "tests/e2e/divider-handles.spec.ts",
    "tests/e2e/messaging-guide.spec.ts",
    "tests/e2e/observability-guide.spec.ts",
    "tests/e2e/realtime-work-guide.spec.ts",
    "tests/e2e/resilience-guide.spec.ts",
  ],
  [
    "tests/e2e/route-smoke.spec.ts",
    "tests/e2e/scale-performance-guide.spec.ts",
    "tests/e2e/search.spec.ts",
    "tests/e2e/security-guide.spec.ts",
    "tests/e2e/seo-links.spec.ts",
  ],
];

function run(project, files = [], port = 4176) {
  const args = ["playwright", "test", "--config", config, `--project=${project}`, ...files];
  const env = { ...process.env, PORT: String(port) };
  const result = spawnSync("npx", args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runProject(project) {
  if (project === "webkit") {
    for (const [index, batch] of webkitBatches.entries()) run(project, batch, 4176 + index);
    return;
  }
  run(project);
}

const projectArgument = process.argv.find((argument) => argument.startsWith("--project="));
const selectedProject = projectArgument?.split("=")[1];
if (selectedProject && !projects.includes(selectedProject)) {
  throw new Error(`Unknown browser project: ${selectedProject}`);
}

for (const project of selectedProject ? [selectedProject] : projects) runProject(project);
