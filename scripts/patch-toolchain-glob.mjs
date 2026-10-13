import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const adapter = path.join(root, "tools/toolchain-glob.mjs");
const patches = JSON.parse(fs.readFileSync(new URL("./toolchain-glob-patches.json", import.meta.url), "utf8"));

export function patchSource(current, patch, replacement) {
  const original = current.includes(patch.import)
    ? current : current.replace(replacement, patch.import);
  const digest = createHash("sha256").update(original).digest("hex");
  if (digest !== patch.sha256 || original.split(patch.import).length !== 2) {
    throw new Error(`Unreviewed glob consumer: ${patch.package}/${patch.file}`);
  }
  return original.replace(patch.import, replacement);
}

function prepare(patch) {
  const packageRoot = path.join(root, "node_modules", patch.package);
  const metadata = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (metadata.version !== patch.version) {
    throw new Error(`Review glob compatibility before updating ${patch.package} from ${patch.version}`);
  }
  const file = path.join(packageRoot, patch.file);
  const relative = path.relative(path.dirname(file), adapter).split(path.sep).join("/");
  const replacement = patch.import.startsWith("import ")
    ? `import fastGlob from "${relative}";` : `require("${relative}")`;
  const current = fs.readFileSync(file, "utf8");
  return { file, current, updated: patchSource(current, patch, replacement) };
}

function main() {
  const prepared = patches.map(prepare);
  for (const item of prepared) {
    if (item.current !== item.updated) fs.writeFileSync(item.file, item.updated);
  }
  console.log(`Verified Braces-free glob adapter for ${prepared.length} pinned consumer files`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
