import fs from "node:fs";
import { diagramAssetPath, diagramInputs, validateDiagramAssets } from "./mermaid-assets.mjs";

const assets = JSON.parse(fs.readFileSync(diagramAssetPath, "utf8"));
const errors = validateDiagramAssets(assets, diagramInputs());
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Verified ${assets.diagrams.length} pre-rendered handbook diagrams`);
}
