import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outputDirectory = "outputs/supply-chain";
const policyPath = "docs/validation/dependency-policy.json";
export const supplyChainCommandTimeoutMs = 60_000;
const npmDnsOption = "--dns-result-order=ipv4first";

export function npmEnvironment(environment = process.env) {
  const nodeOptions = [environment.NODE_OPTIONS, npmDnsOption].filter(Boolean).join(" ");
  return { ...environment, NODE_OPTIONS: nodeOptions };
}

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
    env: npmEnvironment(),
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

function advisorySources(name, audit, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  return (audit.vulnerabilities?.[name]?.via ?? []).flatMap((item) =>
    typeof item === "object" ? [item.source] : advisorySources(item, audit, seen));
}

function isAccepted(name, vulnerability, audit, policy, today) {
  const sources = advisorySources(name, audit);
  return policy.acceptedAdvisories.some((accepted) =>
    accepted.affectedPackages.includes(name)
      && accepted.severity === vulnerability.severity
      && accepted.reviewBy >= today
      && sources.length > 0
      && sources.every((source) => source === accepted.source));
}

function unacceptedVulnerabilities(audit, policy) {
  const today = new Date().toISOString().slice(0, 10);
  return Object.entries(audit.vulnerabilities ?? {}).filter(([name, vulnerability]) => {
    if (["high", "critical"].includes(vulnerability.severity)) return true;
    return !isAccepted(name, vulnerability, audit, policy, today);
  });
}

function auditSummary(audit) {
  return {
    vulnerabilities: audit.metadata.vulnerabilities,
    dependencies: audit.metadata.dependencies,
  };
}

function collectEvidence() {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  const lockfile = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
  const productionAudit = runNpm(["audit", "--omit=dev", "--json"]);
  const fullAudit = runNpm(["audit", "--json"]);
  const sbom = runNpm(["sbom", "--sbom-format", "cyclonedx"]);
  const licenses = licenseInventory(lockfile, policy);
  const approvedLicenses = new Set(policy.approvedLicenseExpressions);
  const unapprovedLicenses = licenses.filter(({ license }) => !approvedLicenses.has(license));
  const unaccepted = unacceptedVulnerabilities(fullAudit, policy);
  return { productionAudit, fullAudit, sbom, licenses, unapprovedLicenses, unaccepted };
}

function writeEvidenceFiles(directory, evidence) {
  const { productionAudit, fullAudit, sbom, licenses, unapprovedLicenses, unaccepted } = evidence;
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

function validateAuditReport(audit, label) {
  if (!audit.metadata?.vulnerabilities || !audit.metadata.dependencies || !audit.vulnerabilities) {
    throw new Error(`${label} returned an incomplete report without vulnerability and dependency metadata`);
  }
}

function validateEvidence(evidence) {
  const { productionAudit, fullAudit, licenses, unapprovedLicenses, unaccepted } = evidence;
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
    `Supply-chain policy passed: ${licenses.length} package instances, ${fullAudit.metadata.vulnerabilities.moderate} accepted moderate, 0 high/critical vulnerabilities`,
  );
}

export function runSupplyChain({
  collect = collectEvidence,
  validate = validateEvidence,
  write = writeEvidence,
} = {}) {
  const evidence = collect();
  validate(evidence);
  write(evidence);
}

function main() {
  try { runSupplyChain(); } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
