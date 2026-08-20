import { requirePageSession } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { ComputerForm } from "../computer-form";

export default async function NewComputerPage() {
  await requirePageSession("assets.create");

  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Computer</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Desktops, laptops and servers. Enter the asset tag from the label.
        </p>
      </div>
      <ComputerForm vendors={vendors} departments={departments} />
    </div>
  );
}