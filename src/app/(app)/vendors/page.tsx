import Link from "next/link";
import { ChevronRight, Contact } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { VendorsTable, CreateVendorButton } from "./vendors-table";

export default async function VendorsPage() {
  const session = await requirePageSession("vendors.view");

  const vendors = await listVendorOptions();
  const items = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    contactPerson: v.contactPerson,
    phone: v.phone,
    email: v.email,
    address: v.address,
    createdAt: v.createdAt.toISOString(),
  }));

  const canCreate = hasPermission(session, "vendors.create");
  const canEdit = hasPermission(session, "vendors.edit");
  const canDelete = hasPermission(session, "vendors.delete");

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Vendors</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Contact className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Vendors</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage your vendors and suppliers.</p>
          </div>
        </div>
        {canCreate && <CreateVendorButton variant="dark" />}
      </div>

      <VendorsTable items={items} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
