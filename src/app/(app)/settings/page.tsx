import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getSettings } from "@/modules/settings/service";
import { currentDbConfig } from "@/modules/settings/backup";
import { SettingsForm } from "./settings-form";
import { BackupRestore } from "./backup-restore";

export default async function SettingsPage() {
  const session = await requirePageSession("settings.view");
  const settings = await getSettings();
  const canEdit = hasPermission(session, "settings.edit");

  // Only parses DATABASE_URL — no DB connection or process spawn on page load.
  const databaseName = canEdit ? currentDbConfig().database : null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Settings" description="Company details and system configuration" />
      <SettingsForm settings={settings} canEdit={canEdit} />

      {canEdit && databaseName && (
        <>
          <hr className="border-neutral-200 dark:border-neutral-800" />
          <BackupRestore databaseName={databaseName} />
        </>
      )}
    </div>
  );
}
