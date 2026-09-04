import { apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { auditLog } from "@/modules/audit/log";
import { createBackup } from "@/modules/settings/backup";

// Needs the Node runtime — it spawns the mysqldump binary.
export const runtime = "nodejs";

/** Download a full SQL backup of the current database. Admin-only (settings.edit). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "settings.edit");

    const { filename, data } = await createBackup();

    await auditLog({
      userId: session.userId,
      action: "CREATE",
      module: "settings",
      entityType: "Backup",
      description: `Downloaded a database backup (${filename})`,
    });

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(data.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
