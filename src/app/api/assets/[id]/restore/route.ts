import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { restoreAsset } from "@/modules/assets/service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.delete");

    const { id } = await params;
    await restoreAsset(Number(id), session.userId);

    return apiSuccess({ restored: true });
  } catch (error) {
    return apiError(error);
  }
}
