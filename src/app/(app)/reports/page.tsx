import Link from "next/link";
import { ChevronRight, BarChart3, FileText, FileSpreadsheet } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getReport } from "@/modules/reports/service";
import { isReportType, REPORT_TYPES, type ReportType } from "@/modules/reports/constants";
import { ReportView } from "./report-view";

const outlineBtn =
  "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const session = await requirePageSession("reports.view");
  const params = await searchParams;
  const type: ReportType = isReportType(params.type) ? params.type : "asset-inventory";
  const meta = REPORT_TYPES.find((r) => r.value === type)!;

  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
  const report = await getReport(type, actor);
  const canExport = hasPermission(session, "reports.export");

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/reports" className="hover:text-neutral-700 dark:hover:text-neutral-300">Reports</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{meta.label}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <BarChart3 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{meta.label}</h1>
            <p className="mt-1 text-sm text-neutral-500">{meta.subtitle}</p>
          </div>
        </div>
        {canExport && (
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/reports/export?type=${type}&format=csv`} className={outlineBtn}>
              <FileText className="h-4 w-4 text-neutral-500" /> Export CSV
            </a>
            <a href={`/api/reports/export?type=${type}&format=xlsx`} className={outlineBtn}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
            </a>
          </div>
        )}
      </div>

      {/* Report-type tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800">
        {REPORT_TYPES.map((rt) => {
          const active = rt.value === type;
          return (
            <Link
              key={rt.value}
              href={`/reports?type=${rt.value}`}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {rt.label}
            </Link>
          );
        })}
      </div>

      <ReportView report={report} subtitle={meta.subtitle} />
    </div>
  );
}
