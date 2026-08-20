import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { signSession, type SessionPayload } from "@/lib/session";
import { resolveModuleScopes } from "@/lib/scope";
import { auditLog } from "@/modules/audit/log";

const PASSWORD_SALT_ROUNDS = 12;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function login(email: string, password: string, ipAddress: string | null) {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
    },
  });

  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(
      "ACCOUNT_LOCKED",
      `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      423,
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockingOut = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockingOut ? 0 : attempts,
        lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });
    if (lockingOut) {
      await auditLog({
        userId: user.id,
        action: "UPDATE",
        module: "auth",
        entityType: "User",
        entityId: user.id,
        description: "Account locked after repeated failed login attempts",
        ipAddress,
      });
    }
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, 401);
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const { token, payload } = await buildSession(user.id);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await auditLog({
    userId: user.id,
    action: "LOGIN",
    module: "auth",
    entityType: "User",
    entityId: user.id,
    ipAddress,
  });

  return { token, payload };
}

// Builds and signs a fresh session token from the current DB state for a user — the single
// source of truth for what goes into a SessionPayload, used both at login and whenever a
// change (e.g. changePassword clearing mustChangePassword) needs to take effect immediately
// rather than waiting for the next login, which is otherwise this app's accepted tradeoff
// for JWT-baked session data (see the permissions system: role changes apply next login).
export async function buildSession(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });

  const permissions = user.role.rolePermissions.map((rp) => rp.permission.code);

  const payload: SessionPayload = {
    userId: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    moduleScopes: resolveModuleScopes(permissions),
    departmentId: user.departmentId,
    permissions,
    mustChangePassword: user.mustChangePassword,
  };

  const token = await signSession(payload);
  return { token, payload };
}

export async function logout(userId: number, ipAddress: string | null) {
  await auditLog({
    userId,
    action: "LOGOUT",
    module: "auth",
    entityType: "User",
    entityId: userId,
    ipAddress,
  });
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const currentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentPasswordValid) {
    throw new AppError("INVALID_PASSWORD", "Current password is incorrect", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });

  await auditLog({
    userId,
    action: "UPDATE",
    module: "auth",
    entityType: "User",
    entityId: userId,
    description: "Password changed",
  });
}
