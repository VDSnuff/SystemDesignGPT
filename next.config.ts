import type { NextConfig } from 'next';
import { securityHeaders } from './app/security-headers';

const nextConfig: NextConfig = {
  async headers() {
    const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: [...securityHeaders] },
      { source: "/api/:path*", headers: noIndex },
      { source: "/owner/:path*", headers: noIndex },
    ];
  },
};

export default nextConfig;
