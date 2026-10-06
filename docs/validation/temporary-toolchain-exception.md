# Temporary Braces toolchain exception

Owner: @VDSnuff. Approved 6 October 2026. Expires 13 October 2026 at 23:59:59 Europe/Warsaw (21:59:59 UTC). No automatic renewal.

GHSA-vfj7-8cjw-p6xm remains unresolved. This exception accepts eight development-toolchain package paths to npm advisory 1240992, with Braces 3.0.3, only for the exact lockfile digest recorded in `dependency-policy.json`. The supply-chain summary reports the accepted high findings and expiry explicitly.

Every reported node must exist in the lockfile and be development-only. A fresh production audit must contain zero findings. Changed lock content, additional advisories or packages, production placement, critical findings, missing nodes, and expiry fail the gate. Existing license and moderate-advisory policies remain in force.

This is an availability-risk acceptance for development tools, not a vulnerability fix or production deployment approval. Avoid untrusted glob patterns and do not expose development servers to untrusted networks. Before expiry, review upstream fixes and remove the exception after upgrading and verifying a clean audit. Any extension requires a new owner decision.
