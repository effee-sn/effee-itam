import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getAssetById } from "@/modules/assets/service";
import { connectAsset } from "@/modules/assets/computers";
import { connectionSchema } from "@/modules/assets/computers-validators";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.edit");

    const { id } = await params;
    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
    const asset = await getAssetById(Number(id), actor);
    if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);

    const body = connectionSchema.parse(await request.json());
    const connection = await connectAsset(asset.id, body, session.userId);

    return apiSuccess({ connection }, 201);
  } catch (error) {
    return apiError(error);
  }
}
