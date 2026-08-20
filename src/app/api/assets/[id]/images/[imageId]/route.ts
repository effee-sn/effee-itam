import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { removeAssetImage } from "@/modules/assets/service";
import { deleteUploadedFile } from "@/lib/uploads";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.edit");

    const { imageId } = await params;
    const image = await removeAssetImage(Number(imageId), session.userId);
    await deleteUploadedFile(image.filePath);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
