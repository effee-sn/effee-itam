import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listRoles } from "@/modules/roles/service";
import { RolesTable } from "./roles-table";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await requirePageSession("roles.view");
  const params = await searchParams;

  const roles = await listRoles(params.search);
  const canCreate = hasPermission(session, "roles.create");
  const canEdit = hasPermission(session, "roles.edit");
  const canDelete = hasPermission(session, "roles.delete");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Roles"
        description="Create custom roles and control what each one can see and do."
        action={canCreate && <Button nativeButton={false} render={<Link href="/roles/new">New Role</Link>} />}
      />
      <RolesTable roles={roles} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
