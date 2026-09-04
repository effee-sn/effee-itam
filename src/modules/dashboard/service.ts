import { prisma } from "@/lib/prisma";
import { getRoleScope, type ScopeActor } from "@/modules/assets/service";
import { descriptorFor } from "@/modules/assets/types/registry";

const WARRANTY_WINDOW_DAYS = 30;
const TREND_WINDOW_DAYS = 30;

/** Percent change vs `prev`. null when there's no basis to compare against. */
function trendPct(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? 100 : null;
  return Math.round(((current - prev) / prev) * 100);
}

export async function getDashboardStats(actor: ScopeActor) {
  const scope = getRoleScope(actor);
  const baseWhere = { deletedAt: null, ...scope };
  const now = new Date();
  const warrantyWindowEnd = new Date(now.getTime() + WARRANTY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const trendCutoff = new Date(now.getTime() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // "Existed as of `trendCutoff`": created on/before the cutoff and not yet deleted then. This is a
  // REAL reconstruction from creation history — the only trend the schema can honestly support.
  // Status-based counts (assigned/available/under-repair) have no history, so they get no trend.
  const existedThen = { createdAt: { lte: trendCutoff }, OR: [{ deletedAt: null }, { deletedAt: { gt: trendCutoff } }] };

  const [total, assigned, available, underRepair, warrantyExpiring, vendorCount, totalPrev, vendorPrev] =
    await Promise.all([
      prisma.asset.count({ where: baseWhere }),
      prisma.asset.count({ where: { ...baseWhere, status: "ASSIGNED" } }),
      prisma.asset.count({ where: { ...baseWhere, status: "AVAILABLE" } }),
      prisma.asset.count({ where: { ...baseWhere, status: "UNDER_REPAIR" } }),
      prisma.asset.count({ where: { ...baseWhere, warrantyEnd: { gte: now, lte: warrantyWindowEnd } } }),
      prisma.vendor.count({ where: { deletedAt: null } }),
      prisma.asset.count({ where: { ...scope, ...existedThen } }),
      prisma.vendor.count({ where: existedThen }),
    ]);

  return {
    total,
    assigned,
    available,
    underRepair,
    warrantyExpiring,
    vendorCount,
    // Real 30-day change where the data allows it; null elsewhere (rendered neutral).
    trends: {
      total: trendPct(total, totalPrev),
      vendorCount: trendPct(vendorCount, vendorPrev),
    },
  };
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
