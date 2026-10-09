import { describe, expect, it, vi } from "vitest";
import {
  parseNpmResult,
  runSupplyChain,
  supplyChainCommandTimeoutMs,
} from "../scripts/check-supply-chain.mjs";

const auditReport = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
    dependencies: { prod: 1, dev: 1, optional: 0, peer: 0, peerOptional: 0, total: 2 },
  },
};

const evidence = {
  productionAudit: auditReport,
  fullAudit: auditReport,
  sbom: { bomFormat: "CycloneDX" },
  licenses: [],
  unapprovedLicenses: [],
  unaccepted: [],
  acceptedHigh: [],
};

describe("supply-chain command runner", () => {
  it("reports a bounded timeout with a registry recovery action", () => {
    const error = Object.assign(new Error("timed out"), { code: "ETIMEDOUT" });

    expect(() => parseNpmResult(["audit", "--json"], { error }))
      .toThrow(`npm audit --json timed out after ${supplyChainCommandTimeoutMs / 1_000} seconds; retry when the npm registry is reachable`);
  });

  it("rejects registry error JSON instead of treating it as audit evidence", () => {
    const result = { status: 1, stdout: JSON.stringify({ error: { summary: "registry unavailable" } }), stderr: "" };

    expect(() => parseNpmResult(["audit", "--json"], result))
      .toThrow("npm audit --json could not establish an audit result: registry unavailable");
  });

  it("accepts npm audit exit one when a complete vulnerability report exists", () => {
    const result = { status: 1, stdout: JSON.stringify(auditReport), stderr: "" };

    expect(parseNpmResult(["audit", "--json"], result)).toEqual(auditReport);
  });

  it("reports accepted high findings without claiming zero high findings", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      runSupplyChain({ collect: () => ({ ...evidence,
        fullAudit: { ...auditReport, metadata: { ...auditReport.metadata,
          vulnerabilities: { ...auditReport.metadata.vulnerabilities, high: 8, total: 8 } } },
        acceptedHigh: Array.from({ length: 8 }, () => ({ name: "braces", advisory: "GHSA-vfj7-8cjw-p6xm", expiresAt: "2026-10-13T23:59:59+02:00", owner: "@VDSnuff" })),
      }), write: vi.fn() });
      expect(log).toHaveBeenCalledWith(expect.stringContaining("8 temporarily accepted high"));
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining("0 high"));
    } finally { log.mockRestore(); }
  });

  it("retains failed evidence without publishing it as successful", () => {
    const events: string[] = [];
    const write = vi.fn(() => events.push("write"));

    expect(() => runSupplyChain({
      collect: () => { events.push("collect"); return evidence; },
      validate: () => { events.push("validate"); throw new Error("invalid evidence"); },
      write,
      writeFailed: () => { events.push("retain failure"); },
    })).toThrow("invalid evidence");
    expect(events).toEqual(["collect", "validate", "retain failure"]);
    expect(write).not.toHaveBeenCalled();
  });
});
