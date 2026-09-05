import { requirePageSession } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { MonitorForm } from "../monitor-form";
import { AssetFormHeader } from "../../_shared/asset-form-header";

export default async function NewMonitorPage() {
  await requirePageSession("assets.create");

  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  return (
    <div className="space-y-6 p-6">
      <AssetFormHeader
        assetType="MONITOR"
        mode="new"
        subtitle="Displays and screens. Enter the asset details below."
      />
      <MonitorForm vendors={vendors} departments={departments} />
    </div>
  );
}