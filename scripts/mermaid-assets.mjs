import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const diagramAssetPath = "app/mermaid-svg.generated.json";
export const diagramRenderConfig = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "neutral",
  deterministicIds: true,
};

export function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function diagramInputs(root = process.cwd()) {
  const source = fs.readFileSync(path.join(root, "docs/System_Design_Checklist_Book.md"), "utf8");
  const charts = [...source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  const styles = fs.readdirSync(path.join(root, "app")).filter((name) => name.endsWith(".css")).sort();
  return {
    charts,
    lockfileSha256: digest(fs.readFileSync(path.join(root, "package-lock.json"))),
    stylesheetSha256: digest(styles.map((name) => fs.readFileSync(path.join(root, "app", name), "utf8")).join("\n")),
    config: diagramRenderConfig,
  };
}

export function validateDiagramAssets(assets, inputs) {
  const errors = [];
  if (JSON.stringify(assets.inputs) !== JSON.stringify(inputs)) errors.push("Diagram inputs changed; run npm run generate:diagrams");
  if (assets.diagrams.length !== new Set(inputs.charts).size) errors.push("Generated diagram coverage differs from the handbook");
  for (const chart of inputs.charts) {
    const matches = assets.diagrams.filter((item) => item.chart === chart);
    if (matches.length !== 1) errors.push("Handbook diagram must have exactly one generated SVG");
    else if (!matches[0].svg.startsWith("<svg") || digest(matches[0].svg) !== matches[0].sha256) errors.push("Generated SVG content differs from its digest");
  }
  return errors;
}
