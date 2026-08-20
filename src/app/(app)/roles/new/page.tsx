import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession } from "@/modules/rbac/permissions";
import { listAllPermissionsGrouped } from "@/modules/roles/service";
import { RoleForm } from "../role-form";

export default async function NewRolePage() {
  await requirePageSession("roles.create");
  const permissionGroups = await listAllPermissionsGrouped();

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="New Role" />
      <RoleForm permissionGroups={permissionGroups} />
    </div>
  );
}
