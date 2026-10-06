const PACKAGE_SEGMENT = "node_modules/";

function packageName(node) {
  return node.split(PACKAGE_SEGMENT).at(-1);
}

function advisorySources(name, audit, seen = new Set()) {
  if (seen.has(name) || !audit.vulnerabilities?.[name]) return [undefined];
  seen.add(name);
  return (audit.vulnerabilities?.[name]?.via ?? []).flatMap((item) =>
    typeof item === "object" ? [item.source] : advisorySources(item, audit, new Set(seen)));
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

function developmentNodesMatch(name, vulnerability, lockfile) {
  return vulnerability.nodes?.length > 0 && vulnerability.nodes.every((node) =>
    packageName(node) === name && lockfile.packages[node]?.dev === true);
}

function exceptionMatches(accepted, name, vulnerability, context) {
  const { productionAudit, fullAudit, policy, lockfile, lockfileSha256, now } = context;
  if (accepted.severity !== vulnerability.severity || accepted.owner !== policy.owner
      || !accepted.affectedPackages.includes(name)
      || accepted.lockfileSha256 !== lockfileSha256
      || !(Date.parse(accepted.expiresAt) > now.getTime())) return false;
  if (productionAudit.metadata?.vulnerabilities?.total !== 0
      || !productionAudit.vulnerabilities
      || Object.keys(productionAudit.vulnerabilities).length !== 0) return false;
  const sources = advisorySources(name, fullAudit);
  const roots = Object.entries(lockfile.packages)
    .filter(([node]) => packageName(node) === accepted.package);
  return sources.length > 0 && sources.every((source) => source === accepted.source)
    && developmentNodesMatch(name, vulnerability, lockfile)
    && roots.length > 0 && roots.every(([, metadata]) =>
      metadata.dev === true && metadata.version === accepted.version);
}

export function classifyVulnerabilities(input) {
  const context = { ...input, now: input.now ?? new Date() };
  const { fullAudit, policy, now } = context;
  const today = now.toISOString().slice(0, 10);
  const unaccepted = [], acceptedHigh = [];
  for (const [name, vulnerability] of Object.entries(fullAudit.vulnerabilities ?? {})) {
    if (vulnerability.severity === "critical") {
      unaccepted.push([name, vulnerability]);
    } else if (vulnerability.severity === "high") {
      const accepted = (policy.temporaryToolchainAdvisories ?? [])
        .find((item) => exceptionMatches(item, name, vulnerability, context));
      if (accepted) acceptedHigh.push({ name, advisory: accepted.advisory,
        expiresAt: accepted.expiresAt, owner: accepted.owner });
      else unaccepted.push([name, vulnerability]);
    } else if (!isAccepted(name, vulnerability, fullAudit, policy, today)) {
      unaccepted.push([name, vulnerability]);
    }
  }
  return { unaccepted, acceptedHigh };
}
