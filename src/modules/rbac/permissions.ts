import { redirect } from "next/navigation";
import { AppError } from "@/lib/api-response";
import { getSession, type SessionPayload } from "@/lib/session";

export function hasPermission(session: SessionPayload | null, code: string): boolean {
  return session?.permissions.includes(code) ?? false;
}

export function requirePermission(session: SessionPayload | null, code: string): void {
  if (!hasPermission(session, code)) {
    throw new AppError("FORBIDDEN", `Missing required permission: ${code}`, 403);
  }
}

/** For use in Server Component pages: redirects to /login if unauthenticated, or /dashboard if authenticated but missing the given permission. */
export async function requirePageSession(permission?: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (permission && !hasPermission(session, permission)) {
    redirect("/dashboard");
  }
  return session;
}
