import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getAssetById } from "@/modules/assets/service";
import { removeComponent } from "@/modules/assets/computers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.edit");

    const { id, componentId } = await params;
    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
    const asset = await getAssetById(Number(id), actor);
    if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);

    await removeComponent(Number(componentId), session.userId);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
