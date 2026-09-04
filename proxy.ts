import { type NextRequest, NextResponse } from "next/server";
import {
  contentSecurityPolicy,
  contentSecurityPolicyHeader,
  securityHeaders,
} from "./app/security-headers";

export function proxy(request: NextRequest) {
  const policy = contentSecurityPolicy(crypto.randomUUID());
  const reportOnlyHeader = `${contentSecurityPolicyHeader}-Report-Only`;
  if (request.headers.has(contentSecurityPolicyHeader) || request.headers.has(reportOnlyHeader)) {
    return secureResponse(new NextResponse(null, { status: 400 }), policy);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(contentSecurityPolicyHeader, policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secureResponse(response, policy);
}

function secureResponse(response: NextResponse, policy: string) {
  response.headers.set(contentSecurityPolicyHeader, policy);
  for (const header of securityHeaders) response.headers.set(header.key, header.value);
  return response;
}

export const config = { matcher: "/:path*" };
