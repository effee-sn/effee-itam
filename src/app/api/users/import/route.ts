import { NextRequest } from "next/server";
import { apiSuccess, apiError, AppError } from "@/lib/api-response";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/modules/rbac/permissions";
import { parseUserImportFile, importUserRows } from "@/modules/users/import";

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", "Not signed in", 401);
    requirePermission(session, "users.create");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "No file provided", 400);
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new AppError("VALIDATION_ERROR", "File exceeds the 5MB import limit", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseUserImportFile(buffer);
    if ("error" in parsed) {
      throw new AppError("VALIDATION_ERROR", parsed.error, 400);
    }
    if (parsed.rows.length === 0) {
      throw new AppError("VALIDATION_ERROR", "No data rows found in this file", 400);
    }

    const summary = await importUserRows(parsed.rows, session.userId);

    return apiSuccess(summary, 201);
  } catch (error) {
    return apiError(error);
  }
}
