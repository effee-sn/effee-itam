import { NextRequest } from "next/server";
import { apiError, AppError } from "@/lib/api-response";
import { csvResponse, xlsxResponse } from "@/lib/export";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { listAssetsForExport } from "@/modules/assets/service";
import { descriptorForSlug } from "@/modules/assets/types/registry";
import { exportColumnsFor } from "@/modules/assets/columns";
import type { AssetStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "assets.view");

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const search = searchParams.get("search") ?? undefined;
    const status = (searchParams.get("status") as AssetStatus | null) ?? undefined;
    const view = searchParams.get("view") ?? undefined;

    // `?type=computers` narrows both the rows AND the columns, so a Computers export carries
    // OS/UUID/BIOS and no IMEI column. Without it you get the cross-type overview.
    const typeSlug = searchParams.get("type") ?? undefined;
    const descriptor = typeSlug ? descriptorForSlug(typeSlug) : undefined;
    const assetType = descriptor?.assetType;

    const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
    const assets = await listAssetsForExport({ search, status, actor, view, assetType });

    const columns = exportColumnsFor(assetType);
    const headers = columns.map((column) => column.header);
    // The cast is safe: listAssetsForExport includes every relation the columns read.
    const rows = assets.map((asset) =>
      columns.map((column) => column.get(asset as unknown as Parameters<typeof column.get>[0])),
    );

    const filename = descriptor ? `${descriptor.slug}-export` : "assets-export";
    const sheetName = descriptor ? descriptor.label : "Assets";

    if (format === "csv") {
      return csvResponse(filename, headers, rows);
    }
    return await xlsxResponse(filename, sheetName, headers, rows);
  } catch (error) {
    return apiError(error);
  }
}
