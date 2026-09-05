import { NextRequest } from "next/server";
import { apiError, AppError } from "@/lib/api-response";
import { csvResponse } from "@/lib/export";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listAuditLogsForExport } from "@/modules/audit/log";
import type { AuditAction } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "audit.view");

    const { searchParams } = new URL(request.url);
    const logs = await listAuditLogsForExport({
      search: searchParams.get("search") ?? undefined,
      userId: searchParams.get("userId") ? Number(searchParams.get("userId")) : undefined,
      module: searchParams.get("module") ?? undefined,
      action: (searchParams.get("action") as AuditAction) ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    const headers = ["Timestamp", "User", "Action", "Module", "Entity", "Description", "IP Address"];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.name ?? "System",
      log.action,
      log.module,
      log.entityType ? `${log.entityType} #${log.entityId}` : "",
      log.description ?? "",
      log.ipAddress ?? "",
    ]);

    return csvResponse("audit-logs", headers, rows);
  } catch (error) {
    return apiError(error);
  }
}
