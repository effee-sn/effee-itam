import { NextRequest } from "next/server";
import { apiError, AppError } from "@/lib/api-response";
import { csvResponse, xlsxResponse } from "@/lib/export";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listUsersForExport } from "@/modules/users/service";

// Note: no "Password" column — nothing to export (only a hash is stored, and it isn't
// reusable anyway). Import adds its own required "Password" column instead; re-importing
// an exported file needs that column added manually. See modules/users/import.ts.
const HEADERS = ["Employee ID", "Name", "Email", "Phone", "Department", "Role", "Designation", "Status"];

function toRow(user: Awaited<ReturnType<typeof listUsersForExport>>[number]): (string | number)[] {
  return [
    user.employeeId,
    user.name,
    user.email,
    user.phone ?? "",
    user.department.name,
    user.role.name,
    user.designation ?? "",
    user.status,
  ];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "users.view");

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const search = searchParams.get("search") ?? undefined;

    const users = await listUsersForExport(search);
    const rows = users.map(toRow);

    if (format === "csv") {
      return csvResponse("users-export", HEADERS, rows);
    }
    return await xlsxResponse("users-export", "Users", HEADERS, rows);
  } catch (error) {
    return apiError(error);
  }
}
