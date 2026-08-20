import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { returnAsset } from "@/modules/assignments/service";
import { returnAssetSchema } from "@/modules/assignments/validators";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.return");

    const { id } = await params;
    const body = returnAssetSchema.parse(await request.json());
    const assignment = await returnAsset(Number(id), body.notes, session.userId);

    return apiSuccess({ assignment });
  } catch (error) {
    return apiError(error);
  }
}
