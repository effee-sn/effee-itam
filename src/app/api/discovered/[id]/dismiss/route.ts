import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { dismissDiscoveredDevice } from "@/modules/inventory/service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.create");

    const { id } = await params;
    await dismissDiscoveredDevice(Number(id), session.userId);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
