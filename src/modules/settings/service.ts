import { prisma } from "@/lib/prisma";
import { auditLog } from "@/modules/audit/log";
import { deleteUploadedFile } from "@/lib/uploads";
import type { SettingsInput } from "./validators";

/** The default the singleton row is created with when it's missing. */
const DEFAULT_COMPANY_NAME = "Company Name";

/**
 * The single Settings row (id 1). Self-healing on purpose: this is read by the `(app)` layout and by
 * /login, so a missing row used to 500 *every page in the app* — including the login page, which
 * renders before anyone could possibly have seeded the database. `findUniqueOrThrow` turned "the
 * seed hasn't run yet" into an opaque P2025 with no hint of the cause.
 *
 * Creating the default row instead means a fresh deployment serves a usable login page, and the seed
 * (which upserts the same id) stays the thing that sets real values.
 */
export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  try {
    return await prisma.settings.create({ data: { id: 1, companyName: DEFAULT_COMPANY_NAME } });
  } catch {
    // A concurrent request won the race and created it first — read theirs rather than failing.
    return prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  }
}

export async function updateSettings(data: SettingsInput, actorUserId: number) {
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      companyName: data.companyName,
      address: data.address || null,
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "settings",
    entityType: "Settings",
    entityId: settings.id,
  });

  return settings;
}

export async function updateLogo(filePath: string, actorUserId: number) {
  const current = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  const settings = await prisma.settings.update({ where: { id: 1 }, data: { logoPath: filePath } });

  if (current.logoPath) {
    await deleteUploadedFile(current.logoPath);
  }

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "settings",
    entityType: "Settings",
    entityId: settings.id,
    description: "Updated company logo",
  });

  return settings;
}
