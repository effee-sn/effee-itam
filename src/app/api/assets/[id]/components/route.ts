import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getAssetById } from "@/modules/assets/service";
import { addComponent } from "@/modules/assets/computers";
import { componentSchema } from "@/modules/assets/computers-validators";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.edit");

    const { id } = await params;
    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
    // Scope check: reuse the existing scoped lookup so someone can't add components to an
    // asset they can't even see.
    const asset = await getAssetById(Number(id), actor);
    if (!asset) throw new AppError("NOT_FOUND", "Asset not found", 404);

    const body = componentSchema.parse(await request.json());
    const component = await addComponent(asset.id, body, session.userId);

    return apiSuccess({ component }, 201);
  } catch (error) {
    return apiError(error);
  }
}
