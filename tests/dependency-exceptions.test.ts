import { createHash } from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyVulnerabilities } from "../scripts/dependency-exceptions.mjs";

const policy = JSON.parse(fs.readFileSync("docs/validation/dependency-policy.json", "utf8"));
const lockContent = fs.readFileSync("package-lock.json", "utf8");
const lockfile = JSON.parse(lockContent);
const exception = policy.temporaryToolchainAdvisories[0];
const cleanAudit = { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } };

function fixture() {
  const vulnerabilities = Object.fromEntries(exception.affectedPackages.map((name: string) => [name, {
    severity: "high",
    via: name === exception.package ? [{ source: exception.source }] : [exception.package],
    nodes: Object.keys(lockfile.packages).filter((node) => node.split("node_modules/").at(-1) === name),
  }]));
  return structuredClone({ productionAudit: cleanAudit, fullAudit: { vulnerabilities }, policy, lockfile,
    lockfileSha256: createHash("sha256").update(lockContent).digest("hex"),
    now: new Date("2026-10-06T12:00:00+02:00") });
}

function expectRejected(input: ReturnType<typeof fixture>) {
  expect(classifyVulnerabilities(input).unaccepted.length).toBeGreaterThan(0);
}

describe("temporary development-toolchain exception", () => {
  it("accepts only the eight pinned development paths and records their expiry", () => {
    const result = classifyVulnerabilities(fixture());
    expect(result.unaccepted).toEqual([]);
    expect(result.acceptedHigh).toHaveLength(8);
    expect(result.acceptedHigh.map((item: { name: string }) => item.name).sort())
      .toEqual([...exception.affectedPackages].sort());
    expect(result.acceptedHigh.every((item: { expiresAt: string }) => item.expiresAt === exception.expiresAt)).toBe(true);
  });

  it.each(["2026-10-13T21:59:59Z", "2026-10-14T00:00:00+02:00"])("expires at the Warsaw deadline: %s", (instant) => {
    const input = fixture();
    input.now = new Date(instant);
    expectRejected(input);
  });

  it("accepts the last second before expiry", () => {
    const input = fixture();
    input.now = new Date("2026-10-13T21:59:58Z");
    expect(classifyVulnerabilities(input).unaccepted).toEqual([]);
  });

  it.each(["changed lock", "different owner", "invalid expiry"])("rejects %s", (change) => {
    const input = fixture();
    if (change === "changed lock") input.lockfileSha256 = "different";
    if (change === "different owner") input.policy.temporaryToolchainAdvisories[0].owner = "another-owner";
    if (change === "invalid expiry") input.policy.temporaryToolchainAdvisories[0].expiresAt = "invalid";
    expectRejected(input);
  });

  it.each(["production finding", "missing production report"])("rejects %s", (change) => {
    const input = fixture();
    if (change === "production finding") input.productionAudit.metadata.vulnerabilities.total = 1;
    else Reflect.deleteProperty(input.productionAudit, "vulnerabilities");
    expectRejected(input);
  });

  it.each(["production node", "missing node", "empty nodes", "wrong package node", "different root version"])("rejects %s", (change) => {
    const input = fixture();
    const node = input.fullAudit.vulnerabilities.braces.nodes[0];
    if (change === "production node") input.lockfile.packages[node].dev = false;
    if (change === "missing node") delete input.lockfile.packages[node];
    if (change === "empty nodes") input.fullAudit.vulnerabilities.braces.nodes = [];
    if (change === "wrong package node") input.fullAudit.vulnerabilities.braces.nodes = ["node_modules/vinext"];
    if (change === "different root version") input.lockfile.packages[node].version = "different";
    expectRejected(input);
  });

  it.each(["additional advisory", "unresolved advisory", "critical", "unknown package"])("rejects %s", (change) => {
    const input = fixture();
    if (change === "additional advisory") input.fullAudit.vulnerabilities.braces.via.push({ source: 1 });
    if (change === "unresolved advisory") input.fullAudit.vulnerabilities.vinext.via.push("missing-advisory");
    if (change === "critical") input.fullAudit.vulnerabilities.braces.severity = "critical";
    if (change === "unknown package") input.fullAudit.vulnerabilities.unknown = { ...input.fullAudit.vulnerabilities.braces };
    expectRejected(input);
  });

  it("accepts converging dependency paths but rejects advisory cycles", () => {
    const input = fixture();
    input.fullAudit.vulnerabilities.vinext.via = ["fast-glob", "micromatch"];
    expect(classifyVulnerabilities(input).unaccepted).toEqual([]);
    input.fullAudit.vulnerabilities.braces.via.push("vinext");
    expectRejected(input);
  });

  it("preserves the existing moderate advisory policy", () => {
    const input = fixture();
    input.fullAudit.vulnerabilities.esbuild = { severity: "moderate", via: [{ source: 1102341 }], nodes: [] };
    expect(classifyVulnerabilities(input).unaccepted).toEqual([]);
    input.fullAudit.vulnerabilities.esbuild.via = [{ source: 1 }];
    expectRejected(input);
  });
});
