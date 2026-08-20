import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listVendors } from "@/modules/vendors/service";
import { VendorsTable, CreateVendorButton } from "./vendors-table";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await requirePageSession("vendors.view");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 20;

  const { items, total } = await listVendors({ search: params.search, page, pageSize });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Vendors"
        action={hasPermission(session, "vendors.create") ? <CreateVendorButton /> : undefined}
      />
      <VendorsTable
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        canEdit={hasPermission(session, "vendors.edit")}
        canDelete={hasPermission(session, "vendors.delete")}
      />
    </div>
  );
}
