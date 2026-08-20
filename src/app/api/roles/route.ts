import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listRoles, createRole } from "@/modules/roles/service";
import { roleSchema } from "@/modules/roles/validators";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "roles.view");

    const roles = await listRoles();
    return apiSuccess({ roles });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "roles.create");

    const body = roleSchema.parse(await request.json());
    const role = await createRole(body, session.userId);

    return apiSuccess({ role }, 201);
  } catch (error) {
    return apiError(error);
  }
}
