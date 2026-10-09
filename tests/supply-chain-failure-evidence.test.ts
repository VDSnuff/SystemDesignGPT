import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSupplyChain, writeFailedEvidence } from "../scripts/check-supply-chain.mjs";

let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "supply-chain-evidence-test-"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});

const evidence = {
  productionAudit: { vulnerabilities: {} },
  fullAudit: { vulnerabilities: {} },
  sbom: { bomFormat: "CycloneDX" },
  licenses: [],
  unapprovedLicenses: [],
  unaccepted: [],
  acceptedHigh: [],
};

describe("failed supply-chain evidence", () => {
  it("retains distinct failures and leaves the last successful report unchanged", () => {
    const successPath = path.join(directory, "last-success.json");
    fs.writeFileSync(successPath, "known-good report");
    const failures = path.join(directory, "failures");

    writeFailedEvidence(evidence, new Error("first policy failure"), failures);
    writeFailedEvidence(evidence, new Error("second policy failure"), failures);

    const runs = fs.readdirSync(failures);
    expect(runs).toHaveLength(2);
    const reports = runs.map((run) => JSON.parse(fs.readFileSync(path.join(failures, run, "failure.json"), "utf8")));
    expect(reports.map((report) => report.message).sort()).toEqual(["first policy failure", "second policy failure"]);
    expect(reports.every((report) => report.status === "failed" && Number.isFinite(Date.parse(report.checkedAt)))).toBe(true);
    for (const run of runs) {
      expect(JSON.parse(fs.readFileSync(path.join(failures, run, "evidence.json"), "utf8"))).toEqual(evidence);
    }
    expect(fs.readFileSync(successPath, "utf8")).toBe("known-good report");
  });

  it("retains a malformed audit report without requiring valid summary metadata", () => {
    const incomplete = { productionAudit: { auditReportVersion: 2 }, fullAudit: {} };
    writeFailedEvidence(incomplete, new Error("incomplete production audit"), directory);
    const run = fs.readdirSync(directory)[0];

    expect(JSON.parse(fs.readFileSync(path.join(directory, run, "evidence.json"), "utf8"))).toEqual(incomplete);
  });

  it("does not publish partial evidence when a report cannot be written", () => {
    vi.spyOn(fs, "writeFileSync").mockImplementationOnce(() => { throw new Error("disk full"); });

    expect(() => writeFailedEvidence(evidence, new Error("policy failed"), directory)).toThrow("disk full");
    expect(fs.readdirSync(directory)).toEqual([]);
    expect(fs.readdirSync(path.dirname(directory)).filter((entry) => entry.startsWith(`${path.basename(directory)}.staging-`))).toEqual([]);
  });

  it("keeps the original validation error when retaining evidence also fails", () => {
    const failure = new Error("policy failed");
    const write = vi.fn();

    expect(() => runSupplyChain({
      collect: () => evidence,
      validate: () => { throw failure; },
      write,
      writeFailed: () => { throw new Error("disk full"); },
    })).toThrow(failure);
    expect(write).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("Failed supply-chain evidence could not be retained: disk full");
  });

  it("does not write failure evidence when collection produced no report", () => {
    const writeFailed = vi.fn();

    expect(() => runSupplyChain({
      collect: () => { throw new Error("registry unavailable"); },
      write: vi.fn(),
      writeFailed,
    })).toThrow("registry unavailable");
    expect(writeFailed).not.toHaveBeenCalled();
  });
});
