import { requirePageSession } from "@/modules/rbac/permissions";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import type { AssetType } from "@/generated/prisma/client";
import { AssetTypeForm } from "./asset-type-form";

/**
 * The "New <type>" page, one per asset type. Each type's route file is a one-liner calling
 * this — the page is locked to its type, so there is nothing to pick before you start typing.
 */
export async function NewAssetPage({ assetType }: { assetType: AssetType }) {
  await requirePageSession("assets.create");
  const descriptor = descriptorFor(assetType);

  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New {descriptor.labelSingular}</h1>
        <p className="mt-1 text-sm text-neutral-500">Enter the asset tag from the label — it must be unique.</p>
      </div>
      <AssetTypeForm assetType={assetType} vendors={vendors} departments={departments} />
    </div>
  );
}
