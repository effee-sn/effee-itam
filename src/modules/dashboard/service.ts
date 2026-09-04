import { prisma } from "@/lib/prisma";
import { getRoleScope, type ScopeActor } from "@/modules/assets/service";
import { descriptorFor } from "@/modules/assets/types/registry";

const WARRANTY_WINDOW_DAYS = 30;

export async function getDashboardStats(actor: ScopeActor) {
  const baseWhere = { deletedAt: null, ...getRoleScope(actor) };
  const now = new Date();
  const warrantyWindowEnd = new Date(now.getTime() + WARRANTY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [total, assigned, available, underRepair, warrantyExpiring, vendorCount] = await Promise.all([
    prisma.asset.count({ where: baseWhere }),
    prisma.asset.count({ where: { ...baseWhere, status: "ASSIGNED" } }),
    prisma.asset.count({ where: { ...baseWhere, status: "AVAILABLE" } }),
    prisma.asset.count({ where: { ...baseWhere, status: "UNDER_REPAIR" } }),
    prisma.asset.count({
      where: { ...baseWhere, warrantyEnd: { gte: now, lte: warrantyWindowEnd } },
    }),
    prisma.vendor.count({ where: { deletedAt: null } }),
  ]);

  return { total, assigned, available, underRepair, warrantyExpiring, vendorCount };
}

/** Assets grouped by their type — what "by category" meant before categories were removed. */
export async function getAssetsByType(actor: ScopeActor) {
  const where = { deletedAt: null, ...getRoleScope(actor) };

  const grouped = await prisma.asset.groupBy({
    by: ["assetType"],
    where,
    _count: { _all: true },
    orderBy: { _count: { assetType: "desc" } },
  });

  return grouped.map((g) => ({
    label: descriptorFor(g.assetType).label,
    value: g._count._all,
  }));
}

export async function getAssetsByDepartment(actor: ScopeActor) {
  const where = { deletedAt: null, departmentId: { not: null }, ...getRoleScope(actor) };

  const grouped = await prisma.asset.groupBy({
    by: ["departmentId"],
    where,
    _count: true,
    orderBy: { _count: { departmentId: "desc" } },
  });

  const departments = await prisma.department.findMany({
    where: { id: { in: grouped.map((g) => g.departmentId).filter((id): id is number => id !== null) } },
    select: { id: true, name: true },
  });

  return grouped.map((g) => ({
    label: departments.find((d) => d.id === g.departmentId)?.name ?? "Unknown",
    value: g._count,
  }));
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "logged in",
  LOGOUT: "logged out",
  CREATE: "created a record",
  UPDATE: "updated a record",
  DELETE: "deleted a record",
  ASSIGN: "assigned an asset",
  RETURN: "returned an asset",
  PERMISSION_CHANGE: "changed permissions",
};

export async function getRecentActivity(limit = 10) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    description: `${log.user?.name ?? "System"} ${ACTION_LABELS[log.action] ?? log.action.toLowerCase()}${log.description ? ` — ${log.description}` : ""}`,
    module: log.module,
    createdAt: log.createdAt,
  }));
}
