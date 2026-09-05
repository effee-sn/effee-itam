import { requirePageSession } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { ComputerForm } from "../computer-form";
import { AssetFormHeader } from "../../_shared/asset-form-header";

export default async function NewComputerPage() {
  await requirePageSession("assets.create");

  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  return (
    <div className="space-y-6 p-6">
      <AssetFormHeader
        assetType="COMPUTER"
        mode="new"
        subtitle="Desktops, laptops and servers. Enter the asset details below."
      />
      <ComputerForm vendors={vendors} departments={departments} />
    </div>
  );
}