# Security policy

## Supported version

Only the revision currently deployed from `main` receives security fixes.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository. Include the
affected route or component, impact, reproduction steps, and the smallest safe
evidence needed to confirm the issue. Do not include real user data, access
tokens, provider keys, prompts, comments, or database exports.

Do not open a public issue for a suspected vulnerability until the repository
owner has assessed disclosure risk. The owner will acknowledge the report,
triage severity and affected versions, and coordinate remediation and
disclosure through the private report.

## Release gate

Critical and high dependency findings block release. An accepted lower-severity
finding must be recorded in `docs/validation/dependency-policy.json` with its
owner, compensating control, upstream reference, and review date.
