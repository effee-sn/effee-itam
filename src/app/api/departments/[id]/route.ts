import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { updateDepartment, deleteDepartment } from "@/modules/departments/service";
import { departmentSchema } from "@/modules/departments/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "departments.edit");

    const { id } = await params;
    const body = departmentSchema.parse(await request.json());
    const department = await updateDepartment(Number(id), body, session.userId);

    return apiSuccess({ department });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "departments.delete");

    const { id } = await params;
    await deleteDepartment(Number(id), session.userId);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
