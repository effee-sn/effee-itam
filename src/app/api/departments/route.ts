import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listDepartments, createDepartment } from "@/modules/departments/service";
import { departmentSchema } from "@/modules/departments/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "departments.view");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const { items, total } = await listDepartments({ search, page, pageSize });
    return apiSuccess({ items, total, page, pageSize });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "departments.create");

    const body = departmentSchema.parse(await request.json());
    const department = await createDepartment(body, session.userId);

    return apiSuccess({ department }, 201);
  } catch (error) {
    return apiError(error);
  }
}
