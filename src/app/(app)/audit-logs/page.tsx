import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listAuditLogs, listAuditModules } from "@/modules/audit/log";
import { listUserOptions } from "@/modules/users/service";
import type { AuditAction } from "@/generated/prisma/client";
import { AuditLogFilters } from "./audit-log-filters";
import { AuditLogTable } from "./audit-log-table";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    userId?: string;
    module?: string;
    action?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await requirePageSession("audit.view");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 15;

  const [{ items, total }, users, modules] = await Promise.all([
    listAuditLogs({
      search: params.search,
      userId: params.userId ? Number(params.userId) : undefined,
      module: params.module,
      action: params.action as AuditAction | undefined,
      from: params.from,
      to: params.to,
      page,
      pageSize,
    }),
    listUserOptions(),
    listAuditModules(),
  ]);

  // Current filters as a query string (without page), for pagination + export links.
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.userId) query.set("userId", params.userId);
  if (params.module) query.set("module", params.module);
  if (params.action) query.set("action", params.action);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const canExport = hasPermission(session, "audit.view");

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Audit Logs</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Audit Logs</h1>
          <p className="mt-1 text-sm text-neutral-500">Track all system activities and changes for security and compliance.</p>
        </div>
      </div>

      <AuditLogFilters
        users={users}
        modules={modules}
        currentUserId={params.userId}
        currentModule={params.module}
        currentAction={params.action}
        currentFrom={params.from}
        currentTo={params.to}
        currentSearch={params.search}
      />
      <AuditLogTable items={items} total={total} page={page} pageSize={pageSize} query={query.toString()} canExport={canExport} />
    </div>
  );
}
