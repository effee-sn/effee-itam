import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { updateVendor, deleteVendor } from "@/modules/vendors/service";
import { vendorSchema } from "@/modules/vendors/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "vendors.edit");

    const { id } = await params;
    const body = vendorSchema.parse(await request.json());
    const vendor = await updateVendor(Number(id), body, session.userId);

    return apiSuccess({ vendor });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "vendors.delete");

    const { id } = await params;
    await deleteVendor(Number(id), session.userId);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
