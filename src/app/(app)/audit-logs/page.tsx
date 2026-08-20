import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession } from "@/modules/rbac/permissions";
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
  await requirePageSession("audit.view");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 20;

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

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Audit Logs" />
      <AuditLogFilters
        users={users}
        modules={modules}
        currentUserId={params.userId}
        currentModule={params.module}
        currentAction={params.action}
        currentFrom={params.from}
        currentTo={params.to}
      />
      <AuditLogTable items={items} total={total} page={page} pageSize={pageSize} />
    </div>
  );
}
