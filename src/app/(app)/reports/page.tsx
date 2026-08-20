import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getReport } from "@/modules/reports/service";
import { isReportType, type ReportType } from "@/modules/reports/constants";
import { ReportTypeSelector } from "./report-type-selector";
import { ReportTable } from "./report-table";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requirePageSession("reports.view");
  const params = await searchParams;
  const type: ReportType = isReportType(params.type) ? params.type : "asset-inventory";

  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
  const report = await getReport(type, actor);

  const canExport = hasPermission(session, "reports.export");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reports"
        action={
          canExport ? (
            <div className="flex items-center gap-2">
              <ExportButton href={`/api/reports/export?type=${type}&format=csv`} label="Export CSV" />
              <ExportButton href={`/api/reports/export?type=${type}&format=xlsx`} label="Export Excel" />
            </div>
          ) : undefined
        }
      />
      <ReportTypeSelector currentType={type} />
      <div className="space-y-3">
        <h2 className="text-lg font-medium">{report.title}</h2>
        <ReportTable headers={report.headers} rows={report.rows} />
      </div>
    </div>
  );
}
