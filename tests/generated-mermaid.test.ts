import { describe, expect, it } from "vitest";
import assets from "../app/mermaid-svg.generated.json";
import { diagramInputs, validateDiagramAssets } from "../scripts/mermaid-assets.mjs";

describe("pre-rendered handbook diagrams", () => {
  it("covers every authored diagram with an intact SVG from the current inputs", () => {
    expect(validateDiagramAssets(assets, diagramInputs())).toEqual([]);
  });

  it.each(["charts", "lockfileSha256", "stylesheetSha256"])("rejects stale %s", (field) => {
    const inputs = structuredClone(diagramInputs());
    if (field === "charts") inputs.charts[0] += "\nA-->NewNode";
    else if (field === "lockfileSha256") inputs.lockfileSha256 = "changed";
    else inputs.stylesheetSha256 = "changed";
    expect(validateDiagramAssets(assets, inputs).length).toBeGreaterThan(0);
  });

  it.each(["missing", "duplicate", "modified SVG"])("rejects %s generated content", (change) => {
    const candidate = structuredClone(assets);
    if (change === "missing") candidate.diagrams.pop();
    if (change === "duplicate") candidate.diagrams.push(candidate.diagrams[0]);
    if (change === "modified SVG") candidate.diagrams[0].svg += "modified";
    expect(validateDiagramAssets(candidate, diagramInputs()).length).toBeGreaterThan(0);
  });
});
