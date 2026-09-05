import { requirePageSession } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import type { AssetType } from "@/generated/prisma/client";
import { AssetTypeForm } from "./asset-type-form";
import { AssetFormHeader } from "./asset-form-header";

/**
 * The "New <type>" page, one per asset type. Each type's route file is a one-liner calling
 * this — the page is locked to its type, so there is nothing to pick before you start typing.
 */
export async function NewAssetPage({ assetType }: { assetType: AssetType }) {
  await requirePageSession("assets.create");

  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  return (
    <div className="space-y-6 p-6">
      <AssetFormHeader assetType={assetType} mode="new" />
      <AssetTypeForm assetType={assetType} vendors={vendors} departments={departments} />
    </div>
  );
}
