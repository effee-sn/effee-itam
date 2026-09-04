import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { auditLog } from "@/modules/audit/log";
import { restoreBackup } from "@/modules/settings/backup";

// Needs the Node runtime — it spawns the mysql binary.
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 500 * 1024 * 1024; // 500MB

/**
 * Restore an uploaded SQL backup INTO THE CURRENT DATABASE. Admin-only (settings.edit).
 * The target database is resolved from DATABASE_URL inside restoreBackup — never from the
 * uploaded file — and a safety snapshot is taken before anything is applied.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "settings.edit");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "No backup file was uploaded.", 400);
    if (file.size === 0) throw new AppError("VALIDATION", "The uploaded file is empty.", 400);
    if (file.size > MAX_BYTES) throw new AppError("VALIDATION", "Backup file is too large (max 500 MB).", 400);

    const sql = Buffer.from(await file.arrayBuffer()).toString("utf8");
    const result = await restoreBackup(sql);

    await auditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "settings",
      entityType: "Backup",
      description: `Restored the database from an uploaded backup into "${result.database}"`,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
