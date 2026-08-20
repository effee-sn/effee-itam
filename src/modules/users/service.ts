import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import type { CreateUserInput, UpdateUserInput } from "./validators";

const PASSWORD_SALT_ROUNDS = 12;

export async function listUsers({
  search,
  page,
  pageSize,
}: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { employeeId: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { department: true, role: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

// Everything shown on the user detail page, in one call. Deliberately fetched here rather
// than page-side so the page stays a thin renderer, matching getAssetById's shape.
export async function getUserDetailById(id: number) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      department: true,
      role: { include: { rolePermissions: { include: { permission: true } } } },
      assetsCurrentlyHeld: {
        where: { deletedAt: null },
        orderBy: { assetTag: "asc" },
      },
    },
  });
  if (!user) return null;

  // Assignment history is "anything that moved to or from this person" — the assignments
  // table records both sides, so a transfer shows up on both users' pages.
  const [assetHistory, auditLogs] = await Promise.all([
    prisma.assetAssignment.findMany({
      where: { OR: [{ toUserId: id }, { fromUserId: id }] },
      orderBy: [{ actionDate: "desc" }, { id: "desc" }],
      include: {
        asset: { select: { id: true, assetTag: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
        performedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { user, assetHistory, auditLogs };
}

export async function listUsersForExport(search?: string) {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { employeeId: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: { department: true, role: true },
  });
}

export async function listRoleOptions() {
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

export async function listUserOptions() {
  return prisma.user.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, employeeId: true },
  });
}

async function assertEmailAvailable(email: string, excludeId?: number) {
  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "A user with this email already exists", 409);
  }
}

async function assertEmployeeIdAvailable(employeeId: string, excludeId?: number) {
  const existing = await prisma.user.findFirst({
    where: { employeeId, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "A user with this employee ID already exists", 409);
  }
}

export async function createUser(data: CreateUserInput, actorUserId: number) {
  await assertEmailAvailable(data.email);
  await assertEmployeeIdAvailable(data.employeeId);

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      employeeId: data.employeeId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      departmentId: data.departmentId,
      roleId: data.roleId,
      designation: data.designation || null,
      passwordHash,
      // An admin (or an import) is choosing this password, not the user themselves — force
      // it to be changed on first login, same as the seeded Super Admin account.
      mustChangePassword: true,
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "users",
    entityType: "User",
    entityId: user.id,
  });

  return user;
}

export async function updateUser(id: number, data: UpdateUserInput, actorUserId: number) {
  await assertEmailAvailable(data.email, id);
  await assertEmployeeIdAvailable(data.employeeId, id);

  const user = await prisma.user.update({
    where: { id },
    data: {
      employeeId: data.employeeId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      departmentId: data.departmentId,
      roleId: data.roleId,
      designation: data.designation || null,
      status: data.status,
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "users",
    entityType: "User",
    entityId: user.id,
  });

  return user;
}

// Admin-initiated reset — unlike self-service changePassword (src/modules/auth/service.ts),
// this doesn't require knowing the current password. Forces a change on next login, same
// as a freshly created/imported account, since the admin (not the user) chose this password.
export async function resetUserPassword(id: number, newPassword: string, actorUserId: number) {
  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "users",
    entityType: "User",
    entityId: id,
    description: "Password reset by admin",
  });
}

export async function deleteUser(id: number, actorUserId: number) {
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditLog({
    userId: actorUserId,
    action: "DELETE",
    module: "users",
    entityType: "User",
    entityId: id,
  });
}
