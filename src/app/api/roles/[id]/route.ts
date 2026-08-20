import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getRoleById, updateRole, deleteRole } from "@/modules/roles/service";
import { roleSchema } from "@/modules/roles/validators";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "roles.view");

    const { id } = await params;
    const role = await getRoleById(Number(id));
    if (!role) throw new AppError("NOT_FOUND", "Role not found", 404);

    return apiSuccess({ role });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "roles.edit");

    const { id } = await params;
    const body = roleSchema.parse(await request.json());
    const role = await updateRole(Number(id), body, session.userId);

    return apiSuccess({ role });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "roles.delete");

    const { id } = await params;
    await deleteRole(Number(id), session.userId);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
