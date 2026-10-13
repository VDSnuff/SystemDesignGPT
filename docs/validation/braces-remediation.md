# Braces removal from the development toolchain

The two fast-glob paths in Next.js ESLint and Vinext's Vite dynamic-import plugin pulled in micromatch and Braces 3.0.3. Braces has no patched release for GHSA-vfj7-8cjw-p6xm. The npm override aliases fast-glob to pinned tinyglobby 0.2.17, removing Braces and micromatch from the lockfile and installed graph. The temporary advisory is removed from the active policy; the prior acceptance survives only as historical documentation and a test fixture. The existing moderate-advisory and license policies are unchanged.

The consumers require globSync and sync exports with directory and extension-pattern behavior. `tools/toolchain-glob.mjs` exposes those names and preserves fast-glob's directory results without trailing slashes. It delegates matching to tinyglobby; it does not patch or rename Braces.

`npm ci` runs `scripts/patch-toolchain-glob.mjs` after installation. Before changing any import, it verifies the exact versions and original SHA256 of all three pinned consumer files (Next.js root discovery plus Vite CommonJS and ESM). It changes only their glob import to the adapter. An unknown version or source fails installation, and a second invocation verifies the same reviewed source without further changes. Consumer updates require reviewing the manifest and compatibility contracts. Normal CI must run lifecycle scripts; no audit flag or peer-resolution bypass is used.

Contracts cover actual Next.js root discovery, actual Vite dynamic-import discovery, extension braces, nested files, excluded paths, directory formatting and an 8,193-character deeply nested pattern. That pattern exhausts the original Braces call stack and returns no matches with the replacement. Full test, lint, typecheck, generated-content, supply-chain, build and browser checks remain required.

The package is an explicit development dependency already used transitively by Vite and Vitest. No production dependency, deployment or exception renewal is introduced.
