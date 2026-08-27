import { defineGuideArticle } from "./article";

const markdown = `
## Start with what can be harmed

Security design protects confidentiality, integrity, and availability: who may see information, who may change it, and whether legitimate users can complete critical work. Apply this review to new data flows, identities, privileged operations, integrations, and deployment paths.

Begin with **assets**, the data, capabilities, identities, and services whose misuse matters. Classify sensitive data, name its allowed purpose, and describe the impact of disclosure, tampering, deletion, or outage. Encryption cannot compensate for unnecessary collection or excessive authority.

A compact security workflow is:

1. Inventory assets, actors, entry points, data flows, and privileged capabilities.
2. Draw every boundary where identity, control, ownership, or trust assumptions change.
3. Describe threats and abuse cases against a concrete flow.
4. Convert material threats into enforceable requirements and smallest-fit controls.
5. Verify controls and assign remaining risk to an owner.

*Evidence: [S27 — NIST Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final), [S29 — Microsoft Azure Well-Architected security checklist](https://learn.microsoft.com/en-us/azure/well-architected/security/checklist).*

## Draw actors, entry points, and trust boundaries

An **actor** is a human or machine identity: customer, administrator, service, job, vendor, or attacker. An **entry point** accepts input or an action, such as an API, queue, webhook, support console, or pipeline. A **trust boundary** marks a change in identity, authorization, data handling, or control.

NIST zero trust guidance rejects implicit trust based only on network location or ownership. Show internet, service, tenant, data-store, control-plane, build, and third-party boundaries when their assumptions differ.

For every crossing, name the identity, authenticator, authorized action and resource, data, validation, and recorded evidence.

## Turn threats and abuse cases into requirements

A **threat** is a plausible way an asset could be harmed. An **abuse case** shows misuse of a real flow: changing a tenant ID, replaying an export, stealing a link, or abusing support access.

Write threats before selecting products. Record the asset, actor, path, impact, requirement, verification, and owner. “Use a gateway” is not a requirement. “Only a permitted tenant member may export that tenant's invoices, and every attempt is auditable” is testable.

Controls prevent, detect, limit, or recover from harm. **Defense in depth** uses independent layers so one decision is not the only protection. Each layer must answer a named threat.

*Evidence: [S28 — OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/), [S29 — Microsoft Azure Well-Architected security checklist](https://learn.microsoft.com/en-us/azure/well-architected/security/checklist).*

## Separate identity from resource authorization

**Authentication** establishes which identity is making a request. **Authorization** decides whether that identity may perform this action on this resource now. A valid login does not authorize every record, tenant, administrative endpoint, or background job.

Enforce authorization server-side at every entry point and important capability. Bind it to identity, tenant, action, resource, and state. Hiding a button or trusting a supplied tenant ID leaves the boundary open.

Apply **least privilege**: only the permissions and duration required. Separate customer, support, deployment, and emergency roles, and prefer distinct workload identities. Recent authentication, a second approver, or time-limited elevation are optional techniques for high-impact threats.

## Compare control choices

| Choice | Appropriate when | Cost or limitation |
|---|---|---|
| Central policy service | Many services need consistent, frequently changing authorization policy. | Adds a critical dependency; callers need bounded failure behavior and resource context. |
| Service-owned authorization | The service owns the resource and can enforce its invariants locally. | Policy can drift across services without shared tests and governance. |
| Managed workload identity | The platform can issue short-lived credentials directly to a workload. | Requires platform integration and careful audience and permission scope. |
| Stored application secret | A dependency cannot accept workload identity. | Requires secure storage, distribution, rotation, revocation, and leak response. |
| Provider-managed encryption key | Standard data classification and platform controls are sufficient. | Less direct key lifecycle control. |
| Customer-managed encryption key | Regulation or threat ownership requires independent key control and revocation. | Adds availability, rotation, recovery, access, and operational burden. |

Prefer the simplest option that satisfies the classified risk. Unoperable controls add failure and attack surface.

## Worked threat model: export customer invoices

In a multi-tenant billing system, a customer requests invoices, the API creates a job, a worker reads them, object storage holds the file, and the API returns a time-limited link. Support may export only for an approved case.

Assets include invoices, tenant membership, permission, credentials, links, and audits. Boundaries cross browser, API, queue, worker, database, storage, support plane, and source-to-production pipeline.

| Threat or abuse case | Required control and secure failure | Verification evidence |
|---|---|---|
| A user changes tenant or invoice IDs. | Derive tenant from the session, authorize every invoice, and deny mismatches. | Cross-tenant and mixed-selection abuse tests. |
| A stolen session requests an export. | Bound session life, reauthenticate as risk requires, and support revocation. | Expiry, revocation, and reauthentication tests. |
| The worker has global data or storage administration. | Give its identity only required read and object-write scope. | Permission tests deny other tenants and administration. |
| A download link leaks. | Exclude it from logs, scope and expire it, then delete the export. | Log scan, expiry test, and deletion evidence. |
| Support access is abused. | Require case-bound, time-limited privilege and audit actor, reason, tenant, and outcome. | Elevation test, audit query, and alert exercise. |
| A compromised build publishes altered code. | Lock dependencies, protect credentials, scan artifacts, and bind deployment to reviewed source. | Scans, provenance, and deployment revision checks. |

If authorization, tenant lookup, or policy is unavailable, no file or link is created. The user sees a bounded error without tenant or policy details; internal telemetry records the reason without invoice data or credentials.

Residual risks include user mishandling, administrator collusion, and undetected supply-chain weakness. Record an accepting owner, review date, and revisit trigger.

## Protect data, secrets, and retention

Collect minimum data for a stated purpose. Define flows, access, retention, deletion across exports, backups, caches, logs, and vendors, and user notice. An encrypted unnecessary copy is still exposure.

Match encryption in transit and at rest to classification, and define key ownership, rotation, recovery, and failure. Keep secrets out of source, clients, logs, tickets, and prompts. Prefer short-lived, audience-restricted credentials; prove stored-secret rotation and revocation.

Separate audit from debugging. Record actor, action, resource, time, authorization context, and outcome. Minimize sensitive fields, protect audit integrity and access, define retention, and test retrieval.

## Secure privileged operations and the software supply chain

Administrative actions change identities, permissions, exposure, keys, and deployments. Use separate privileged identities, strong authentication, bounded elevation, change review, and alerts. Emergency access still needs an owner, revocation, and evidence.

The **software supply chain** includes source, dependencies, build tools, registries, artifacts, and deployment identities. Inventory and review dependencies, scan vulnerabilities and secrets, protect build credentials, and bind deployed artifacts to reviewed revisions. Scanners do not replace abuse tests.

## Fail securely and produce incident signals

On authorization or integrity uncertainty, deny the operation and avoid partial privileged effects. A reduced non-sensitive experience may preserve availability, but must never expand access or weaken encryption.

Observe authentication failures, authorization denials, privilege and key changes, secret access, unusual exports, artifact failures, and control outages. Alerts need an owner and asset impact without secret values or sensitive payloads.

Prepare revocation, containment, evidence, communication, and recovery. Test disabling credentials, stopping exports, finding affected tenants, and restoring safe service.

## Failure modes to challenge

- **Internal means trusted.** Compromised workloads and mistaken identities cross internal networks too.
- **Authentication equals authorization.** A known identity can still request the wrong tenant, action, or resource.
- **Role check only at the UI.** Clients and requests can be changed; enforcement belongs at the resource boundary.
- **One shared service credential.** Compromise gains every permission and audit ownership becomes unclear.
- **Encryption solves privacy.** It does not justify collection, broad access, indefinite retention, or unsafe decryption paths.
- **Log everything for security.** Secrets and sensitive payloads in logs create another breach surface.
- **Scanner equals verification.** Static, dependency, and vulnerability scans miss business authorization and abuse paths.
- **Fail open for availability.** Bypassing policy during dependency failure converts an outage into unauthorized access.
- **Accepted risk without an owner.** An unnamed, undated risk is merely deferred surprise.

## Verify controls and residual risk

Turn the threat model into tests: missing, forged, expired, and revoked identity; cross-tenant IDs; unauthorized actions; malformed input; replay; privilege expiry; secret rotation; export deletion; audit retrieval; and control outages. Verify final resource state, not only status codes.

Combine review, automated tests, scans, artifact verification, and targeted penetration testing by risk. Record the standard version; OWASP ASVS identifiers are version-sensitive, and the current stable release is 5.0.0.

For each material residual risk, record impact, evidence, owner, review date, incident signal, and treatment. Revisit after architecture, identity, data, vendor, deployment, or incident changes.

*Evidence: [S28 — OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/), [S29 — Microsoft Azure Well-Architected security checklist](https://learn.microsoft.com/en-us/azure/well-architected/security/checklist).*

## Security review checklist

1. Identify and classify assets, actors, entry points, privileged capabilities, and data flows.
2. Draw trust, tenant, identity, data, control-plane, build, and third-party boundaries that change assumptions.
3. Turn threats and abuse cases into resource-specific, testable requirements.
4. Authenticate every human and workload identity and authorize each sensitive action and resource.
5. Apply least privilege, bounded elevation, secure secret handling, and classification-appropriate encryption.
6. Define privacy purpose, minimization, access, retention, deletion, and vendor behavior.
7. Protect administrative paths and the source-to-artifact-to-deployment supply chain.
8. Fail closed on authorization or integrity uncertainty and emit useful, minimized incident signals.
9. Execute abuse, revocation, rotation, audit, incident, and control-failure tests.
10. Assign every accepted residual risk an owner and review trigger.

## Review questions

1. Which assets and capabilities would cause the most harm if disclosed, changed, deleted, or unavailable?
2. Where do identity, tenant, data, control, and ownership assumptions change?
3. Which abuse case is most likely, and which requirement stops or detects it?
4. Does every entry point authorize the identity, action, tenant, resource, and current state?
5. Which human or workload identity has more permission or duration than its task needs?
6. Where can secrets or sensitive data enter code, clients, logs, exports, backups, or vendors?
7. What happens when identity, policy, key, audit, or security-monitoring dependencies fail?
8. Which evidence proves the control, and who owns the remaining risk?

Continue in the complete handbook at [9. Security](/book/9-security) and its [security checklist](/book/9-security#checklist). See the [evidence and verification register](/book/references-and-verification-register#primary-official-government-and-research-sources) for the canonical sources.

_Evidence scope: NIST SP 800-207, OWASP ASVS 5.0.0, and the cited Microsoft security guidance were rechecked on 27 August 2026. Identity features, cryptographic options, provider controls, dependency advisories, and compliance obligations vary by deployed version and jurisdiction; verify them in the concrete environment._
`;

export const securityArticle = defineGuideArticle({
  markdown,
  slug: "security",
});
