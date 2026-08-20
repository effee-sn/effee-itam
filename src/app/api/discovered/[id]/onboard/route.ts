import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { onboardDiscoveredDevice } from "@/modules/inventory/service";

const bodySchema = z.object({ assetTag: z.string().trim().min(1, "Asset tag is required").max(50) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.create");

    const { id } = await params;
    const { assetTag } = bodySchema.parse(await request.json());
    const asset = await onboardDiscoveredDevice(Number(id), assetTag, session.userId);
    return apiSuccess({ asset }, 201);
  } catch (error) {
    return apiError(error);
  }
}
