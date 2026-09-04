import fs from "node:fs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SECRET_KEY_PATTERN = /(authorization|cookie|credential|secret|token)/i;
export const provenanceMaxAgeMs = 15 * 60_000;

function requireString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
  return value;
}

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function requireTimestamp(value, name) {
  const timestamp = requireString(value, name);
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error(`${name} must be an ISO timestamp`);
  return timestamp;
}

function requireOrigin(value, name) {
  const url = new URL(requireString(value, name));
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin without a path`);
  }
  return url.origin;
}

function findSecretKey(value, path = "provenance") {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY_PATTERN.test(key)) return `${path}.${key}`;
    const nested = findSecretKey(child, `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
}

export function loadProductionProvenance(filePath) {
  if (!filePath) throw new Error("a sanitized Sites provenance file is required");
  let raw;
  try { raw = fs.readFileSync(filePath, "utf8"); } catch (error) {
    throw new Error(`unable to read Sites provenance file: ${error instanceof Error ? error.message : String(error)}`);
  }
  try { return JSON.parse(raw); } catch {
    throw new Error("Sites provenance file contains invalid JSON");
  }
}

function resolvedProvenance(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Sites provenance must be a JSON object");
  }
  const secretKey = findSecretKey(snapshot);
  if (secretKey) throw new Error(`Sites provenance contains forbidden secret field ${secretKey}`);
  return {
    lookupTime: requireTimestamp(snapshot.lookupTime, "provenance lookup time"),
    projectId: requireString(snapshot.site?.projectId, "site project ID"),
    origin: requireOrigin(snapshot.site?.origin, "site origin"),
    latestVersion: requirePositiveInteger(snapshot.site?.latestVersion, "site latest version"),
    versionId: requireString(snapshot.version?.id, "saved version ID"),
    sitesVersion: requirePositiveInteger(snapshot.version?.number, "saved version number"),
    commitSha: requireString(snapshot.version?.commitSha, "saved version commit SHA"),
    deploymentId: requireString(snapshot.deployment?.id, "deployment ID"),
    deployedVersionId: requireString(snapshot.deployment?.versionId, "deployed version ID"),
    deploymentStatus: requireString(snapshot.deployment?.status, "deployment status"),
    deploymentOrigin: requireOrigin(snapshot.deployment?.origin, "deployment origin"),
    deploymentUpdatedAt: requireTimestamp(snapshot.deployment?.updatedAt, "deployment update time"),
  };
}

function validateResolved(config, resolved, now) {
  if (now - Date.parse(resolved.lookupTime) > provenanceMaxAgeMs || Date.parse(resolved.lookupTime) > now + 60_000) {
    throw new Error("Sites provenance lookup is stale or in the future; resolve the active deployment again");
  }
  if (resolved.deploymentStatus !== "succeeded") throw new Error(`deployment status is ${resolved.deploymentStatus}, expected succeeded`);
  if (resolved.versionId !== resolved.deployedVersionId) throw new Error("deployed version ID does not match the resolved saved version");
  if (resolved.latestVersion !== resolved.sitesVersion) throw new Error("active site version does not match the resolved saved version");
  if (resolved.origin !== resolved.deploymentOrigin || resolved.origin !== new URL(config.origin).origin) {
    throw new Error("active site, deployment, and expected origins do not match");
  }
  if (!SHA_PATTERN.test(resolved.commitSha)) throw new Error("resolved commit SHA must be 40 hexadecimal characters");
  if (resolved.commitSha.toLowerCase() !== config.commitSha.toLowerCase()) throw new Error("expected commit SHA does not match the active Sites version");
  if (String(resolved.sitesVersion) !== config.sitesVersion) throw new Error("expected Sites version does not match the active deployment");
}

export function verifyProductionProvenance(config, snapshot, now = Date.now()) {
  const resolved = resolvedProvenance(snapshot);
  validateResolved(config, resolved, now);
  return resolved;
}
