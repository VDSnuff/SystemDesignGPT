export const securityHeaders = [
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
] as const;

export const contentSecurityPolicyHeader = "Content-Security-Policy";

const mermaidStyleHashes = [
  "'sha256-Ue6oi+bj7pTRyN90VZ3b6is/Ff5xJTEMVwZ/HpEgNtk='",
  "'sha256-gxjIY1vCJzzNJkS2/la7BJNrV/UMhjh+jz6EGOyH624='",
  "'sha256-r7jJ8vjPbUCkar80dnQxpTqZ3C2VArB+Rw9CdNEJJVE='",
  "'sha256-szDSOe2y5fnOGvgoxlJl0xXyyj+KbTZ9fKw9AkGYGzk='",
  "'sha256-NvQsb08H2sDzcsWTPeAyBA6aiH0RrncPp4A+AfD1h5s='",
  "'sha256-gyMZwcwfgkigKCwVKqHBaC5qIjZu1Q3IwQzLApW5bAA='",
  "'sha256-m046mj5TH6UsVZmI164gyaNmO6d1uhyB+r/vfF7vStA='",
  "'sha256-KGYq4ukoi8anY0zsO2V9yO8/WDLg4ZKuo+laKih4H9I='",
  "'sha256-WUQ6x4vrgPQIboo1vZ3AasMTU3nvo+ZfODkLdILxfTM='",
] as const;

export function contentSecurityPolicy(nonce: string) {
  const styleSources = [`'nonce-${nonce}'`, ...mermaidStyleHashes].join(" ");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
    "img-src 'self' data: https://*.oaiusercontent.com",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' ${styleSources}`,
    `style-src-elem 'self' ${styleSources}`,
    "style-src-attr 'unsafe-inline'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const noIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
] as const;
