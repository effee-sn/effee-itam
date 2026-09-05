import Link from "next/link";
import { ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getSettings } from "@/modules/settings/service";
import { currentDbConfig } from "@/modules/settings/backup";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const session = await requirePageSession("settings.view");
  const settings = await getSettings();
  const canEdit = hasPermission(session, "settings.edit");

  // Only parses DATABASE_URL — no DB connection or process spawn on page load.
  const databaseName = canEdit ? currentDbConfig().database : null;

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Settings</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <SettingsIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold leading-tight">Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your company details and system configuration.</p>
        </div>
      </div>

      <SettingsTabs
        settings={{ companyName: settings.companyName, logoPath: settings.logoPath, address: settings.address }}
        canEdit={canEdit}
        databaseName={databaseName}
      />
    </div>
  );
}
