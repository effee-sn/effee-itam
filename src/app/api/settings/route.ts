import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { getSettings, updateSettings } from "@/modules/settings/service";
import { settingsSchema } from "@/modules/settings/validators";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "settings.view");

    const settings = await getSettings();
    return apiSuccess({ settings });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "settings.edit");

    const body = settingsSchema.parse(await request.json());
    const settings = await updateSettings(body, session.userId);

    return apiSuccess({ settings });
  } catch (error) {
    return apiError(error);
  }
}
