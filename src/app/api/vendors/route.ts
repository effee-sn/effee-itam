import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listVendors, createVendor } from "@/modules/vendors/service";
import { vendorSchema } from "@/modules/vendors/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "vendors.view");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const { items, total } = await listVendors({ search, page, pageSize });
    return apiSuccess({ items, total, page, pageSize });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "vendors.create");

    const body = vendorSchema.parse(await request.json());
    const vendor = await createVendor(body, session.userId);

    return apiSuccess({ vendor }, 201);
  } catch (error) {
    return apiError(error);
  }
}
