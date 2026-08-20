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

export async function listAuditLogs({
  search,
  userId,
  module,
  action,
  from,
  to,
  page,
  pageSize,
}: {
  search?: string;
  userId?: number;
  module?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(userId ? { userId } : {}),
    ...(module ? { module } : {}),
    ...(action ? { action } : {}),
    ...(search ? { description: { contains: search } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

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

export async function listAuditModules() {
  const results = await prisma.auditLog.findMany({
    distinct: ["module"],
    select: { module: true },
    orderBy: { module: "asc" },
  });
  return results.map((result) => result.module);
}
