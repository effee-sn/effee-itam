import { NextRequest } from "next/server";
import { apiError, AppError } from "@/lib/api-response";
import { csvResponse, xlsxResponse } from "@/lib/export";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getReport } from "@/modules/reports/service";
import { isReportType } from "@/modules/reports/constants";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "reports.export");

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const typeParam = searchParams.get("type");
    const type = isReportType(typeParam) ? typeParam : "asset-inventory";
    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };

    const report = await getReport(type, actor);

    if (format === "csv") {
      return csvResponse(type, report.headers, report.rows);
    }
    return await xlsxResponse(type, report.title, report.headers, report.rows);
  } catch (error) {
    return apiError(error);
  }
}
