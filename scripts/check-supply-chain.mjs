import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const outputDirectory = "outputs/supply-chain";
const policyPath = "docs/validation/dependency-policy.json";

function runNpm(args) {
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (!result.stdout) {
    throw new Error(`npm ${args.join(" ")} produced no output: ${result.stderr}`);
  }
  return result.stdout;
}

function writeJson(fileName, value) {
  fs.writeFileSync(
    path.join(outputDirectory, fileName),
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
  const productionAudit = JSON.parse(runNpm(["audit", "--omit=dev", "--json"]));
  const fullAudit = JSON.parse(runNpm(["audit", "--json"]));
  const sbom = JSON.parse(runNpm(["sbom", "--sbom-format", "cyclonedx"]));
  const licenses = licenseInventory(lockfile, policy);
  const approvedLicenses = new Set(policy.approvedLicenseExpressions);
  const unapprovedLicenses = licenses.filter(({ license }) => !approvedLicenses.has(license));
  const unaccepted = unacceptedVulnerabilities(fullAudit, policy);
  return { productionAudit, fullAudit, sbom, licenses, unapprovedLicenses, unaccepted };
}

function writeEvidence(evidence) {
  const { productionAudit, fullAudit, sbom, licenses, unapprovedLicenses, unaccepted } = evidence;
  fs.mkdirSync(outputDirectory, { recursive: true });
  writeJson("production-audit.json", productionAudit);
  writeJson("full-audit.json", fullAudit);
  writeJson("licenses.json", licenses);
  writeJson("sbom.cdx.json", sbom);
  writeJson("summary.json", {
    production: auditSummary(productionAudit),
    full: auditSummary(fullAudit),
    licenseCount: licenses.length,
    unapprovedLicenses,
    unacceptedVulnerabilities: unaccepted.map(([name]) => name),
  });
}

function validateEvidence(evidence) {
  const { fullAudit, licenses, unapprovedLicenses, unaccepted } = evidence;
  if (unapprovedLicenses.length || unaccepted.length) {
    throw new Error(
      `Supply-chain policy failed: ${unapprovedLicenses.length} license and ${unaccepted.length} vulnerability exception(s) require review`,
    );
  }
  console.log(
    `Supply-chain policy passed: ${licenses.length} package instances, ${fullAudit.metadata.vulnerabilities.moderate} accepted moderate, 0 high/critical vulnerabilities`,
  );
}

const evidence = collectEvidence();
writeEvidence(evidence);
validateEvidence(evidence);
