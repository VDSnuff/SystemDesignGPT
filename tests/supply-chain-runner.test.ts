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

  it("does not write evidence until collection and validation succeed", () => {
    const events: string[] = [];
    const write = vi.fn(() => events.push("write"));

    expect(() => runSupplyChain({
      collect: () => { events.push("collect"); return evidence; },
      validate: () => { events.push("validate"); throw new Error("invalid evidence"); },
      write,
    })).toThrow("invalid evidence");
    expect(events).toEqual(["collect", "validate"]);
    expect(write).not.toHaveBeenCalled();
  });
});
