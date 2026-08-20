import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { addAssetDocument } from "@/modules/assets/service";
import { saveAssetDocument, UploadError } from "@/lib/uploads";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.edit");

    const { id } = await params;
    const assetId = Number(id);

    const formData = await request.formData();
    const file = formData.get("file");
    const label = formData.get("label");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "No file provided", 400);
    }

    const filePath = await saveAssetDocument(assetId, file);
    const document = await addAssetDocument(
      assetId,
      filePath,
      typeof label === "string" && label ? label : undefined,
      session.userId,
    );

    return apiSuccess({ document }, 201);
  } catch (error) {
    if (error instanceof UploadError) {
      return apiError(new AppError("UPLOAD_ERROR", error.message, 400));
    }
    return apiError(error);
  }
}
