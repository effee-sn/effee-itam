import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getAssetById, updateAsset, deleteAsset } from "@/modules/assets/service";
import { assetSchema } from "@/modules/assets/validators";
import { assetSchemaFor } from "@/modules/assets/types/schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.view");

    const { id } = await params;
    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
    const asset = await getAssetById(Number(id), actor);
    if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);

    return apiSuccess({ asset });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.edit");

    const { id } = await params;
    // Same two-step as POST: base parse to learn the type, then re-parse against that type's
    // schema. Note updateAsset ignores this type and reads the stored one — an asset's type
    // is fixed at creation, so this only decides which field validations run.
    const raw = await request.json();
    const base = assetSchema.parse(raw);
    const body = assetSchemaFor(base.assetType).parse(raw) as typeof base;

    const asset = await updateAsset(Number(id), body, session.userId);

    return apiSuccess({ asset });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.delete");

    const { id } = await params;
    await deleteAsset(Number(id), session.userId);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
