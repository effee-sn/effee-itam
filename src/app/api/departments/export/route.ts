import { NextRequest } from "next/server";
import { apiError, AppError } from "@/lib/api-response";
import { csvResponse, xlsxResponse } from "@/lib/export";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listDepartmentsForExport } from "@/modules/departments/service";

const HEADERS = ["Name"];

function toRow(department: Awaited<ReturnType<typeof listDepartmentsForExport>>[number]): (string | number)[] {
  return [department.name];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "departments.view");

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const search = searchParams.get("search") ?? undefined;

    const departments = await listDepartmentsForExport(search);
    const rows = departments.map(toRow);

    if (format === "csv") {
      return csvResponse("departments-export", HEADERS, rows);
    }
    return await xlsxResponse("departments-export", "Departments", HEADERS, rows);
  } catch (error) {
    return apiError(error);
  }
}
