"use client";

import { Building2, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SettingsForm } from "./settings-form";
import { BackupRestore } from "./backup-restore";

type SettingsData = { companyName: string; logoPath: string | null; address: string | null };

const tabCls =
  "h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-1 pb-3 text-neutral-500 data-active:border-blue-600 data-active:bg-transparent data-active:text-blue-600 data-active:shadow-none dark:data-active:bg-transparent";

function CompanySummary({ settings }: { settings: SettingsData }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">Company Information</h2>
            <p className="text-xs text-neutral-500">Current company details in the system.</p>
          </div>
        </div>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-neutral-500">Company Name</dt>
            <dd className="mt-0.5 font-medium text-neutral-800 dark:text-neutral-200">{settings.companyName}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Address</dt>
            <dd className="mt-0.5 whitespace-pre-line text-neutral-800 dark:text-neutral-200">{settings.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Version</dt>
            <dd className="mt-0.5 font-medium text-neutral-800 dark:text-neutral-200">v1.0.0</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p>Update your company information to keep the system details up to date.</p>
      </div>
    </aside>
  );
}

export function SettingsTabs({
  settings,
  canEdit,
  databaseName,
}: {
  settings: SettingsData;
  canEdit: boolean;
  databaseName: string | null;
}) {
  const showBackup = canEdit && !!databaseName;

  return (
    <Tabs defaultValue="company" className="gap-5">
      <TabsList className="h-auto justify-start gap-6 rounded-none border-b border-neutral-200 bg-transparent p-0 dark:border-neutral-800">
        <TabsTrigger value="company" className={tabCls}>Company Information</TabsTrigger>
        {showBackup && <TabsTrigger value="backup" className={tabCls}>Backup &amp; Restore</TabsTrigger>}
      </TabsList>

      <TabsContent value="company">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_360px]">
          <SettingsForm settings={settings} canEdit={canEdit} />
          <CompanySummary settings={settings} />
        </div>
      </TabsContent>

      {showBackup && (
        <TabsContent value="backup">
          <BackupRestore databaseName={databaseName!} />
        </TabsContent>
      )}
    </Tabs>
  );
}
