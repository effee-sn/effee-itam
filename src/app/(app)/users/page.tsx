import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listUsers, listRoleOptions } from "@/modules/users/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { UsersTable, CreateUserButton } from "./users-table";
import { UserImportDialog } from "./users-import-dialog";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await requirePageSession("users.view");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 20;

  const [{ items, total }, departments, roles] = await Promise.all([
    listUsers({ search: params.search, page, pageSize }),
    listDepartmentOptions(),
    listRoleOptions(),
  ]);

  const canCreate = hasPermission(session, "users.create");
  const canEdit = hasPermission(session, "users.edit");
  const exportQuery = params.search ? `search=${encodeURIComponent(params.search)}` : "";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Users"
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/users/export?format=csv&${exportQuery}`} label="Export CSV" />
            <ExportButton href={`/api/users/export?format=xlsx&${exportQuery}`} label="Export Excel" />
            {canCreate && <UserImportDialog />}
            {canCreate && <CreateUserButton departments={departments} roles={roles} />}
          </div>
        }
      />
      <UsersTable
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        departments={departments}
        roles={roles}
        canEdit={canEdit}
        canDelete={canEdit}
      />
    </div>
  );
}
