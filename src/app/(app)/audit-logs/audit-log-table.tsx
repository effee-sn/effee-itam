import Link from "next/link";
import { FileClock, FileText, ChevronLeft, ChevronRight } from "lucide-react";

type AuditLogRow = {
  id: number;
  action: string;
  module: string;
  entityType: string | null;
  entityId: number | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string | Date;
  user: { name: string } | null;
};

const ACTION_STYLE: Record<string, { label: string; cls: string }> = {
  LOGIN: { label: "Login", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  LOGOUT: { label: "Logout", cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  CREATE: { label: "Create", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  UPDATE: { label: "Update", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  DELETE: { label: "Delete", cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  ASSIGN: { label: "Assign", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  RETURN: { label: "Return", cls: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300" },
  PERMISSION_CHANGE: { label: "Permission Change", cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" },
};

function pageNumbers(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(totalPages - 1, current + 1);
  if (from > 2) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

export function AuditLogTable({
  items,
  total,
  page,
  pageSize,
  query,
  canExport,
}: {
  items: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  canExport: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const hrefFor = (n: number) => `/audit-logs?${query ? `${query}&` : ""}page=${n}`;

  const th = "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <FileClock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">
              Audit Logs <span className="text-neutral-400">({total})</span>
            </h2>
            <p className="text-xs text-neutral-500">Complete history of system activities</p>
          </div>
        </div>
        {canExport && (
          <a
            href={`/api/audit/export${query ? `?${query}` : ""}`}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <FileText className="h-4 w-4 text-neutral-500" /> Export CSV
          </a>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-y border-neutral-200 dark:border-neutral-800">
              <th className={`${th} w-12`}>#</th>
              <th className={th}>Timestamp</th>
              <th className={th}>User</th>
              <th className={th}>Action</th>
              <th className={th}>Module</th>
              <th className={th}>Entity</th>
              <th className={th}>Description</th>
              <th className={`${th} text-right`}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-neutral-500">No audit logs match your filters.</td></tr>
            ) : (
              items.map((log, i) => {
                const action = ACTION_STYLE[log.action] ?? { label: log.action, cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" };
                return (
                  <tr key={log.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                    <td className={`${td} tabular-nums text-neutral-400`}>{start + i + 1}</td>
                    <td className={`${td} whitespace-nowrap`}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className={`${td} font-medium text-neutral-800 dark:text-neutral-200`}>{log.user?.name ?? "System"}</td>
                    <td className={td}>
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${action.cls}`}>{action.label}</span>
                    </td>
                    <td className={td}>{log.module}</td>
                    <td className={td}>{log.entityType ? `${log.entityType} #${log.entityId}` : <span className="text-neutral-400">—</span>}</td>
                    <td className={`${td} max-w-md`}>{log.description ?? <span className="text-neutral-400">—</span>}</td>
                    <td className={`${td} text-right font-mono text-xs`}>{log.ipAddress ?? <span className="font-sans text-neutral-400">—</span>}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
          <span>Showing {start + 1}-{Math.min(start + pageSize, total)} of {total} logs</span>
          <div className="flex items-center gap-1">
            <PageLink href={hrefFor(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </PageLink>
            {pageNumbers(currentPage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="px-1.5 text-neutral-400">…</span>
              ) : (
                <Link
                  key={n}
                  href={hrefFor(n)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                    n === currentPage ? "bg-blue-600 text-white" : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                  }`}
                >
                  {n}
                </Link>
              ),
            )}
            <PageLink href={hrefFor(currentPage + 1)} disabled={currentPage >= totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </PageLink>
          </div>
        </div>
      )}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = "inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
  if (disabled) return <span className={`${cls} opacity-40`}>{children}</span>;
  return <Link href={href} className={`${cls} hover:bg-neutral-50`}>{children}</Link>;
}
