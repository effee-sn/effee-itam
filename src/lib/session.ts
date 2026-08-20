import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { cookies } from "next/headers";
import type { RoleScope } from "@/generated/prisma/client";

const SESSION_COOKIE_NAME = "session";

export type SessionPayload = {
  userId: number;
  employeeId: string;
  name: string;
  email: string;
  roleId: number;
  roleName: string;
  // Per-module row-level visibility (assets/email_accounts -> ALL/DEPARTMENT/
  // SELF), derived at login from the role's granted `<module>.scope_*` permission codes —
  // see resolveModuleScopes in src/modules/auth/service.ts.
  moduleScopes: Record<string, RoleScope>;
  departmentId: number;
  permissions: string[];
  mustChangePassword: boolean;
};

function getSecretKey() {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "1d")
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const { exp } = decodeJwt(token);
  const maxAge = exp ? exp - Math.floor(Date.now() / 1000) : undefined;

  // NODE_ENV === "production" does NOT mean "served over HTTPS" — PM2 always sets
  // NODE_ENV=production regardless of whether TLS is actually in front of the app yet.
  // A `Secure` cookie is silently dropped by the browser over plain HTTP, which looks
  // exactly like "login succeeds but nothing persists". Controlled by its own explicit
  // env var instead, set to "true" once nginx+certbot (or equivalent) is actually serving
  // HTTPS in front of this app.
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME };
