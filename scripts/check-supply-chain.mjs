import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { classifyVulnerabilities } from "./dependency-exceptions.mjs";

const outputDirectory = "outputs/supply-chain";
const failureOutputDirectory = "outputs/supply-chain-failures";
const policyPath = "docs/validation/dependency-policy.json";
export const supplyChainCommandTimeoutMs = 60_000;

export function parseNpmResult(args, result) {
  const command = `npm ${args.join(" ")}`;
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`${command} timed out after ${supplyChainCommandTimeoutMs / 1_000} seconds; retry when the npm registry is reachable`);
  }
  if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
  if (!result.stdout) throw new Error(`${command} produced no JSON output: ${result.stderr}`);
  let output;
  try { output = JSON.parse(result.stdout); } catch { throw new Error(`${command} produced invalid JSON`); }
  if (output.error) {
    const detail = output.error.summary || output.error.detail || result.stderr || "unknown registry error";
    throw new Error(`${command} could not establish an audit result: ${detail}`);
  }
  const isAuditFindingExit = args[0] === "audit" && result.status === 1;
  if (result.status !== 0 && !isAuditFindingExit) {
    throw new Error(`${command} failed with exit code ${result.status}: ${result.stderr}`);
  }
  return output;
}

function runNpm(args) {
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: process.platform === "win32",
    timeout: supplyChainCommandTimeoutMs,
  });
  return parseNpmResult(args, result);
}

function writeJson(directory, fileName, value) {
  fs.writeFileSync(
    path.join(directory, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function packageName(packagePath) {
  const parts = packagePath.split("node_modules/").at(-1)?.split("/") ?? [];
  return parts[0]?.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function licenseInventory(lockfile, policy) {
  return Object.entries(lockfile.packages)
    .filter(([packagePath]) => packagePath)
    .map(([packagePath, metadata]) => {
      const name = metadata.name ?? packageName(packagePath);
      const override = policy.licenseOverrides.find(
        (item) => item.name === name && item.version === metadata.version,
      );
      return {
        name,
        version: metadata.version,
        license: metadata.license ?? override?.license ?? "UNKNOWN",
        licenseSource: metadata.license ? "lockfile" : override?.source ?? "missing",
        developmentOnly: metadata.dev === true,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function auditSummary(audit) {
  return {
    vulnerabilities: audit.metadata.vulnerabilities,
    dependencies: audit.metadata.dependencies,
  };
}

function collectEvidence() {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  const lockfileContent = fs.readFileSync("package-lock.json", "utf8");
  const lockfile = JSON.parse(lockfileContent);
  const lockfileSha256 = createHash("sha256").update(lockfileContent).digest("hex");
  const productionAudit = runNpm(["audit", "--omit=dev", "--json"]);
  const fullAudit = runNpm(["audit", "--json"]);
  const sbom = runNpm(["sbom", "--sbom-format", "cyclonedx"]);
  const licenses = licenseInventory(lockfile, policy);
  const approvedLicenses = new Set(policy.approvedLicenseExpressions);
  const unapprovedLicenses = licenses.filter(({ license }) => !approvedLicenses.has(license));
  const { unaccepted, acceptedHigh } = classifyVulnerabilities({
    productionAudit, fullAudit, policy, lockfile, lockfileSha256,
  });
  return { productionAudit, fullAudit, sbom, licenses, unapprovedLicenses, unaccepted, acceptedHigh };
}

function writeEvidenceFiles(directory, evidence) {
  const { productionAudit, fullAudit, sbom, licenses, unapprovedLicenses, unaccepted, acceptedHigh } = evidence;
  writeJson(directory, "production-audit.json", productionAudit);
  writeJson(directory, "full-audit.json", fullAudit);
  writeJson(directory, "licenses.json", licenses);
  writeJson(directory, "sbom.cdx.json", sbom);
  writeJson(directory, "summary.json", {
    production: auditSummary(productionAudit),
    full: auditSummary(fullAudit),
    licenseCount: licenses.length,
    unapprovedLicenses,
    unacceptedVulnerabilities: unaccepted.map(([name]) => name),
    acceptedHighVulnerabilities: acceptedHigh,
  });
}

function writeEvidence(evidence) {
  fs.mkdirSync(path.dirname(outputDirectory), { recursive: true });
  const stagingDirectory = fs.mkdtempSync(`${outputDirectory}.staging-`);
  const previousDirectory = `${outputDirectory}.previous-${process.pid}`;
  try {
    writeEvidenceFiles(stagingDirectory, evidence);
    if (fs.existsSync(outputDirectory)) fs.renameSync(outputDirectory, previousDirectory);
    fs.renameSync(stagingDirectory, outputDirectory);
    if (fs.existsSync(previousDirectory)) fs.rmSync(previousDirectory, { recursive: true });
  } catch (error) {
    if (!fs.existsSync(outputDirectory) && fs.existsSync(previousDirectory)) fs.renameSync(previousDirectory, outputDirectory);
    if (fs.existsSync(stagingDirectory)) fs.rmSync(stagingDirectory, { recursive: true });
    throw error;
  }
}

export function writeFailedEvidence(evidence, error, directory = failureOutputDirectory) {
  fs.mkdirSync(directory, { recursive: true });
  const stagingPrefix = `${directory}.staging-`;
  const stagingDirectory = fs.mkdtempSync(stagingPrefix);
  const runDirectory = path.join(directory, `run-${stagingDirectory.slice(stagingPrefix.length)}`);
  try {
    writeJson(stagingDirectory, "evidence.json", evidence);
    writeJson(stagingDirectory, "failure.json", {
      status: "failed",
      checkedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });
    fs.renameSync(stagingDirectory, runDirectory);
    console.error(`Failed supply-chain evidence retained in ${runDirectory}`);
  } catch (writeError) {
    fs.rmSync(stagingDirectory, { recursive: true, force: true });
    throw writeError;
  }
}

function validateAuditReport(audit, label) {
  if (!audit.metadata?.vulnerabilities || !audit.metadata.dependencies || !audit.vulnerabilities) {
    throw new Error(`${label} returned an incomplete report without vulnerability and dependency metadata`);
  }
}

function validateEvidence(evidence) {
  const { productionAudit, fullAudit, licenses, unapprovedLicenses, unaccepted, acceptedHigh = [] } = evidence;
  validateAuditReport(productionAudit, "npm production audit");
  validateAuditReport(fullAudit, "npm full audit");
  if (evidence.sbom.bomFormat !== "CycloneDX") {
    throw new Error("npm sbom returned an invalid CycloneDX document");
  }
  if (unapprovedLicenses.length || unaccepted.length) {
    throw new Error(
      `Supply-chain policy failed: ${unapprovedLicenses.length} license and ${unaccepted.length} vulnerability exception(s) require review`,
    );
  }
  console.log(
    `Supply-chain policy passed: ${licenses.length} package instances, ${fullAudit.metadata.vulnerabilities.moderate} accepted moderate, ${acceptedHigh.length} temporarily accepted high, 0 critical vulnerabilities`,
  );
}

export function runSupplyChain({
  collect = collectEvidence,
  validate = validateEvidence,
  write = writeEvidence,
  writeFailed = writeFailedEvidence,
} = {}) {
  const evidence = collect();
  try { validate(evidence); } catch (error) {
    try { writeFailed(evidence, error); } catch (writeError) {
      console.error(`Failed supply-chain evidence could not be retained: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
    }
    throw error;
  }
  write(evidence);
}

function main() {
  try { runSupplyChain(); } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
