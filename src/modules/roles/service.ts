import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import { resolveModuleScopes } from "@/lib/scope";
import type { RoleInput } from "./validators";

export async function listRoles(search?: string) {
  const roles = await prisma.role.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: "asc" },
    include: {
      rolePermissions: { include: { permission: { select: { code: true } } } },
      _count: { select: { users: { where: { deletedAt: null } }, rolePermissions: true } },
    },
  });

  return roles.map((role) => ({
    ...role,
    moduleScopes: resolveModuleScopes(role.rolePermissions.map((rp) => rp.permission.code)),
  }));
}

export async function listAllPermissionsGrouped() {
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { code: "asc" }] });
  const grouped = new Map<string, typeof permissions>();
  for (const permission of permissions) {
    const list = grouped.get(permission.module) ?? [];
    list.push(permission);
    grouped.set(permission.module, list);
  }
  return Array.from(grouped.entries()).map(([module, items]) => ({ module, permissions: items }));
}

export async function getRoleById(id: number) {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { users: { where: { deletedAt: null } } } },
    },
  });
  if (!role) return null;
  return { ...role, permissionCodes: role.rolePermissions.map((rp) => rp.permission.code) };
}

async function assertNameAvailable(name: string, excludeId?: number) {
  const existing = await prisma.role.findFirst({
    where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("DUPLICATE", "A role with this name already exists", 409);
  }
}

async function assertRolesEditRetained(excludeRoleId: number) {
  const rolesWithEdit = await prisma.role.findMany({
    where: {
      id: { not: excludeRoleId },
      rolePermissions: { some: { permission: { code: "roles.edit" } } },
      users: { some: { deletedAt: null } },
    },
    select: { id: true },
  });
  if (rolesWithEdit.length === 0) {
    throw new AppError("LOCKOUT_RISK", "This would leave no active role able to manage roles", 400);
  }
}

export async function createRole(data: RoleInput, actorUserId: number) {
  await assertNameAvailable(data.name);
  const permissions = await prisma.permission.findMany({ where: { code: { in: data.permissionCodes } } });

  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description || null,
      rolePermissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
    },
  });

  await auditLog({ userId: actorUserId, action: "CREATE", module: "roles", entityType: "Role", entityId: role.id });

  return role;
}

export async function updateRole(id: number, data: RoleInput, actorUserId: number) {
  const existing = await prisma.role.findUniqueOrThrow({
    where: { id },
    include: { rolePermissions: { include: { permission: true } } },
  });

  if (existing.isSystem && data.name !== existing.name) {
    throw new AppError("SYSTEM_ROLE", "System roles cannot be renamed", 400);
  }
  if (!existing.isSystem) {
    await assertNameAvailable(data.name, id);
  }

  const currentCodes = new Set(existing.rolePermissions.map((rp) => rp.permission.code));
  const nextCodes = new Set(data.permissionCodes);
  const added = [...nextCodes].filter((code) => !currentCodes.has(code));
  const removed = [...currentCodes].filter((code) => !nextCodes.has(code));
  const permissionsChanged = added.length > 0 || removed.length > 0;

  if (removed.includes("roles.edit")) {
    await assertRolesEditRetained(id);
  }

  const metadataChanged =
    data.name !== existing.name ||
    (data.description || null) !== existing.description;

  const nextPermissions = permissionsChanged
    ? await prisma.permission.findMany({ where: { code: { in: data.permissionCodes } } })
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id },
      data: {
        name: existing.isSystem ? existing.name : data.name,
        description: data.description || null,
      },
    });

    if (permissionsChanged) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: nextPermissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
      });
    }
  });

  if (metadataChanged) {
    await auditLog({ userId: actorUserId, action: "UPDATE", module: "roles", entityType: "Role", entityId: id });
  }
  if (permissionsChanged) {
    const parts: string[] = [];
    if (added.length) parts.push(`Added: ${added.join(", ")}`);
    if (removed.length) parts.push(`Removed: ${removed.join(", ")}`);
    await auditLog({
      userId: actorUserId,
      action: "PERMISSION_CHANGE",
      module: "roles",
      entityType: "Role",
      entityId: id,
      description: parts.join("; "),
    });
  }

  return prisma.role.findUniqueOrThrow({ where: { id } });
}

export async function deleteRole(id: number, actorUserId: number) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { id },
    include: { rolePermissions: { include: { permission: true } } },
  });

  if (role.isSystem) {
    throw new AppError("SYSTEM_ROLE", "System roles cannot be deleted", 400);
  }

  // A required FK (User.roleId) still points here even for soft-deleted users, so the
  // DB rejects a hard delete unless every referencing user row (active or not) is gone.
  const [activeUserCount, totalUserCount] = await Promise.all([
    prisma.user.count({ where: { roleId: id, deletedAt: null } }),
    prisma.user.count({ where: { roleId: id } }),
  ]);
  if (activeUserCount > 0) {
    throw new AppError(
      "ROLE_IN_USE",
      `This role is assigned to ${activeUserCount} active user(s) and cannot be deleted`,
      409,
    );
  }
  if (totalUserCount > 0) {
    throw new AppError(
      "ROLE_IN_USE",
      `This role has ${totalUserCount} historical user record(s) on file and cannot be deleted`,
      409,
    );
  }

  const hasRolesEdit = role.rolePermissions.some((rp) => rp.permission.code === "roles.edit");
  if (hasRolesEdit) {
    await assertRolesEditRetained(id);
  }

  await prisma.role.delete({ where: { id } });

  await auditLog({ userId: actorUserId, action: "DELETE", module: "roles", entityType: "Role", entityId: id });
}
