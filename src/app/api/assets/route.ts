import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listAssets, createAsset } from "@/modules/assets/service";
import { assetSchema } from "@/modules/assets/validators";
import { assetSchemaFor } from "@/modules/assets/types/schemas";
import type { AssetStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.view");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const status = (searchParams.get("status") as AssetStatus | null) ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
    const { items, total } = await listAssets({ search, status, page, pageSize, actor });
    return apiSuccess({ items, total, page, pageSize });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.create");

    // Two-stage parse: the base schema first, purely to establish which type this is (it
    // validates assetType against the enum, so it can't be an arbitrary string), then the
    // full schema for that type so a Phone's IMEI is checked and a Monitor's screen size is
    // accepted. Each type has its own form, so the type arrives as that form's constant.
    const raw = await request.json();
    const base = assetSchema.parse(raw);
    const body = assetSchemaFor(base.assetType).parse(raw) as typeof base;

    const asset = await createAsset(body, session.userId);

    return apiSuccess({ asset }, 201);
  } catch (error) {
    return apiError(error);
  }
}
