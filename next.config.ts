import type { NextConfig } from 'next';
import { noIndexHeaders, securityHeaders } from './app/security-headers';

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: [...securityHeaders] },
      { source: "/api/:path*", headers: [...noIndexHeaders] },
      { source: "/owner/:path*", headers: [...noIndexHeaders] },
    ];
  },
};

export default nextConfig;
