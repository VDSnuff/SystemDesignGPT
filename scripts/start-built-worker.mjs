import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const migrations = [
  "drizzle/0000_demonic_deadpool.sql",
  "drizzle/0001_careful_master_mold.sql",
  "drizzle/0002_glamorous_chat.sql",
];
const runtimeRoot = mkdtempSync(path.join(tmpdir(), "system-design-browser-runtime-"));
const runtimePath = path.join(runtimeRoot, "dist");
const persistencePath = mkdtempSync(path.join(tmpdir(), "system-design-browser-d1-"));
const configPath = path.join(runtimePath, "server/wrangler.json");
const port = process.env.PORT ?? "4176";

function prepareRuntime() {
  cpSync("dist", runtimePath, { recursive: true });
  const policyFiles = [
    path.join(runtimePath, "client/_headers"),
    path.join(runtimePath, "server/index.js"),
    configPath,
  ];
  for (const file of policyFiles) {
    const content = readFileSync(file, "utf8");
    const localPolicy = content
      .replaceAll("; upgrade-insecure-requests", "")
      .replaceAll(",`upgrade-insecure-requests`", "");
    writeFileSync(file, localPolicy);
  }
}

function applyMigration(file) {
  const result = spawnSync("npx", [
    "wrangler", "d1", "execute", "site-creator-d1", "--local",
    "--config", configPath, "--persist-to", persistencePath, "--file", file,
  ], { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}

function cleanup() {
  rmSync(runtimeRoot, { recursive: true, force: true });
  rmSync(persistencePath, { recursive: true, force: true });
}

prepareRuntime();
for (const migration of migrations) applyMigration(migration);

const server = spawn("npx", [
  "wrangler", "dev", "--config", configPath,
  "--port", port, "--local-protocol", "http", "--persist-to", persistencePath,
], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code, signal) => {
  cleanup();
  process.exit(signal ? 1 : code ?? 1);
});
