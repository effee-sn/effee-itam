import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getSettings } from "@/modules/settings/service";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await requirePageSession("settings.view");
  const settings = await getSettings();
  const canEdit = hasPermission(session, "settings.edit");

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Settings" description="Company details and system configuration" />
      <SettingsForm settings={settings} canEdit={canEdit} />
    </div>
  );
}
