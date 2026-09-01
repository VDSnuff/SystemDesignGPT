import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const DATABASE = "site-creator-d1";
const CONFIG_PATH = path.resolve("dist/server/wrangler.json");
const LOCAL_CONFIG = "wrangler.json";
const JOURNAL_PATH = "drizzle/meta/_journal.json";
const OUTPUT_PATH = "performance-results/local-d1-recovery.json";
const WRANGLER_PATH = path.resolve("node_modules/.bin/wrangler");
const TABLES = ["learning_page_state", "handbook_progress", "learning_comments", "api_rate_limits"];

function wrangler(args, workspace) {
  const result = spawnSync(WRANGLER_PATH, args, { cwd: workspace, encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}

function localArgs(command) {
  return ["d1", command, DATABASE, "--local", "--config", LOCAL_CONFIG];
}

function executeFile(workspace, file) {
  wrangler([...localArgs("execute"), "--file", path.resolve(file), "--yes"], workspace);
}

function executeSql(workspace, command) {
  return wrangler([...localArgs("execute"), "--command", command, "--json"], workspace);
}

async function migrations() {
  const journal = JSON.parse(await readFile(JOURNAL_PATH, "utf8"));
  return journal.entries.map(({ tag }) => `drizzle/${tag}.sql`);
}

function fixtureSql() {
  return [
    "INSERT INTO learning_page_state (user_id,page_slug,note,diagram_payload,quiz_payload,updated_at) VALUES ('recovery-user','diagram-workshop','backup-marker','{\"version\":1,\"nodes\":[],\"connections\":[]}','{\"version\":1,\"answers\":[]}','2026-09-01T12:00:00.000Z')",
    "INSERT INTO handbook_progress (user_id,last_page_slug,last_heading_id,completed_sections_payload,checked_items_payload,updated_at) VALUES ('recovery-user','9-security',NULL,'[\"9-security\"]','[]','2026-09-01T12:00:00.000Z')",
    "INSERT INTO learning_comments (id,user_id,user_email,page_slug,page_title,body,status,created_at) VALUES ('00000000-0000-4000-8000-000000000061','recovery-user','synthetic@example.test','9-security','Security','Synthetic recovery marker','new','2026-09-01T12:00:00.000Z')",
    "INSERT INTO api_rate_limits (scope,client_key,window_started_at,request_count) VALUES ('recovery','synthetic-client',1788264000000,1)",
  ].join(";");
}

function verificationSql() {
  return TABLES.map((table) => (
    `SELECT '${table}' AS table_name, COUNT(*) AS row_count FROM ${table}`
  )).join(" UNION ALL ");
}

function parseRows(output) {
  const parsed = JSON.parse(output);
  return parsed[0]?.results ?? [];
}

function snapshot(workspace) {
  const rows = parseRows(executeSql(workspace, verificationSql()));
  if (rows.length !== 4 || rows.some(({ row_count }) => row_count !== 1)) {
    throw new Error(`Recovery fixture counts were invalid: ${JSON.stringify(rows)}`);
  }
  const contents = TABLES.map((table) => parseRows(executeSql(workspace, `SELECT * FROM ${table} ORDER BY rowid`)));
  return { rows, digest: createHash("sha256").update(JSON.stringify(contents)).digest("hex") };
}

function exportDatabase(workspace, output) {
  wrangler(["d1", "export", DATABASE, "--local", "--config", LOCAL_CONFIG,
    "--output", output, "--skip-confirmation"], workspace);
}

async function prepareWorkspace(workspace) {
  const config = await readFile(CONFIG_PATH, "utf8");
  await writeFile(path.join(workspace, LOCAL_CONFIG), config);
}

async function main() {
  const workspace = await mkdtemp(path.join(tmpdir(), "system-design-d1-recovery-"));
  const source = path.join(workspace, "source");
  const restored = path.join(workspace, "restored");
  const backup = path.join(workspace, "backup.sql");
  try {
    await mkdir(source);
    await mkdir(restored);
    await prepareWorkspace(source);
    await prepareWorkspace(restored);
    const migrationFiles = await migrations();
    for (const migration of migrationFiles) executeFile(source, migration);
    executeSql(source, fixtureSql());
    const before = snapshot(source);
    exportDatabase(source, backup);
    executeFile(restored, backup);
    const after = snapshot(restored);
    if (before.digest !== after.digest) throw new Error("Restored D1 data did not match the backup");
    const result = { migrations: migrationFiles, tables: before.rows, restoredDigest: after.digest };
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

await main();
