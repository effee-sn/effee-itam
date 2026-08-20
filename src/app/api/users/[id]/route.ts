import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { updateUser, deleteUser } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "users.edit");

    const { id } = await params;
    const body = updateUserSchema.parse(await request.json());
    const user = await updateUser(Number(id), body, session.userId);

    return apiSuccess({ user });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "users.edit");

    const { id } = await params;
    await deleteUser(Number(id), session.userId);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
