import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listDepartments } from "@/modules/departments/service";
import { DepartmentsTable, CreateDepartmentButton } from "./departments-table";
import { DepartmentImportDialog } from "./departments-import-dialog";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await requirePageSession("departments.view");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 20;

  const { items, total } = await listDepartments({ search: params.search, page, pageSize });

  const canCreate = hasPermission(session, "departments.create");
  const exportQuery = params.search ? `search=${encodeURIComponent(params.search)}` : "";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Departments"
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/departments/export?format=csv&${exportQuery}`} label="Export CSV" />
            <ExportButton href={`/api/departments/export?format=xlsx&${exportQuery}`} label="Export Excel" />
            {canCreate && <DepartmentImportDialog />}
            {canCreate && <CreateDepartmentButton />}
          </div>
        }
      />
      <DepartmentsTable
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        canEdit={hasPermission(session, "departments.edit")}
        canDelete={hasPermission(session, "departments.delete")}
      />
    </div>
  );
}
