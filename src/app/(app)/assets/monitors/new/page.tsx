import { requirePageSession } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { MonitorForm } from "../monitor-form";

export default async function NewMonitorPage() {
  await requirePageSession("assets.create");

  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New Monitor</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Displays and screens. Enter the asset tag from the label.
        </p>
      </div>
      <MonitorForm vendors={vendors} departments={departments} />
    </div>
  );
}