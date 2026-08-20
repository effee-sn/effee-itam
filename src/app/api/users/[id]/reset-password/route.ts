import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { resetUserPassword } from "@/modules/users/service";
import { resetPasswordSchema } from "@/modules/users/validators";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "users.edit");

    const { id } = await params;
    const body = resetPasswordSchema.parse(await request.json());
    await resetUserPassword(Number(id), body.password, session.userId);

    return apiSuccess({ reset: true });
  } catch (error) {
    return apiError(error);
  }
}
