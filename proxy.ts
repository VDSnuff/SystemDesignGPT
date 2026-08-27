import { NextResponse } from "next/server";
import { securityHeaders } from "./app/security-headers";

export function proxy() {
  const response = NextResponse.next();
  for (const header of securityHeaders) response.headers.set(header.key, header.value);
  return response;
}

export const config = { matcher: "/:path*" };
