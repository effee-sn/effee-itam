import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma/client";

type AuditLogEntry = {
  userId?: number | null;
  action: AuditAction;
  module: string;
  entityType?: string;
  entityId?: number;
  description?: string;
  ipAddress?: string | null;
};

export async function auditLog(entry: AuditLogEntry) {
  await prisma.auditLog.create({ data: entry });
}

type AuditFilters = {
  search?: string;
  userId?: number;
  module?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
};

function buildWhere({ search, userId, module, action, from, to }: AuditFilters) {
  return {
    ...(userId ? { userId } : {}),
    ...(module ? { module } : {}),
    ...(action ? { action } : {}),
    // Matches the "Search by user, description, IP address…" box.
    ...(search
      ? {
          OR: [
            { description: { contains: search } },
            { ipAddress: { contains: search } },
            { user: { name: { contains: search } } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
}

export async function listAuditLogs(filters: AuditFilters & { page: number; pageSize: number }) {
  const { page, pageSize, ...rest } = filters;
  const where = buildWhere(rest);

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}

export async function listAuditLogsForExport(filters: AuditFilters) {
  return prisma.auditLog.findMany({
    where: buildWhere(filters),
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function listAuditModules() {
  const results = await prisma.auditLog.findMany({
    distinct: ["module"],
    select: { module: true },
    orderBy: { module: "asc" },
  });
  return results.map((result) => result.module);
}
