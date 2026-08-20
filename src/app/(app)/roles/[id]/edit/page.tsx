import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession } from "@/modules/rbac/permissions";
import { getRoleById, listAllPermissionsGrouped } from "@/modules/roles/service";
import { RoleForm } from "../../role-form";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession("roles.edit");
  const { id } = await params;

  const [role, permissionGroups] = await Promise.all([
    getRoleById(Number(id)),
    listAllPermissionsGrouped(),
  ]);
  if (!role) notFound();

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={`Edit Role: ${role.name}`} />
      <RoleForm role={role} permissionGroups={permissionGroups} />
    </div>
  );
}
