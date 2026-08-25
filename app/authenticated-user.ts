export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}

export function authenticatedUser(request: Request): AuthenticatedUser | null {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  const email = request.headers.get("oai-authenticated-user-email")?.trim();
  return id && email ? { id, email } : null;
}

export function isOwner(user: AuthenticatedUser) {
  const ownerEmail = process.env.SITE_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(ownerEmail && user.email.toLowerCase() === ownerEmail);
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
