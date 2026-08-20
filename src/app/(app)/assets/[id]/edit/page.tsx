import { notFound } from "next/navigation";
import { requirePageSession } from "@/modules/rbac/permissions";
import { getAssetById } from "@/modules/assets/service";
import { listVendorOptions } from "@/modules/vendors/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import { ComputerForm } from "../../computers/computer-form";
import { MonitorForm } from "../../monitors/monitor-form";
import { AssetTypeForm } from "../../_shared/asset-type-form";

function toDateInput(value: Date | null | undefined): string | undefined {
  return value ? new Date(value).toISOString().slice(0, 10) : undefined;
}

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession("assets.edit");
  const { id } = await params;
  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };

  const asset = await getAssetById(Number(id), actor);
  if (!asset) notFound();

  const descriptor = descriptorFor(asset.assetType);
  const [vendors, departments] = await Promise.all([listVendorOptions(), listDepartmentOptions()]);

  // The fields every type shares, in the shape all three forms expect.
  const base = {
    id: asset.id,
    assetTag: asset.assetTag,
    assetType: asset.assetType,
    serialNumber: asset.serialNumber ?? undefined,
    hostname: asset.hostname ?? undefined,
    macAddress: asset.macAddress ?? undefined,
    ipAddress: asset.ipAddress ?? undefined,
    brand: asset.brand ?? undefined,
    model: asset.model ?? undefined,
    vendorId: asset.vendorId ?? undefined,
    purchaseDate: toDateInput(asset.purchaseDate),
    invoiceNumber: asset.invoiceNumber ?? undefined,
    warrantyStart: toDateInput(asset.warrantyStart),
    warrantyEnd: toDateInput(asset.warrantyEnd),
    cost: asset.cost ? asset.cost.toString() : undefined,
    departmentId: asset.departmentId ?? undefined,
    notes: asset.notes ?? undefined,
    status: asset.status,
  };

  const heading = `Edit ${descriptor.labelSingular} — ${asset.assetTag}`;

  // Computers and Monitors have hand-grouped forms; everything else is registry-driven.
  if (asset.assetType === "COMPUTER") {
    const c = asset.computer;
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <ComputerForm
          asset={{
            ...base,
            assetType: "COMPUTER",
            subType: c?.subType ?? undefined,
            osName: c?.osName ?? undefined,
            osVersion: c?.osVersion ?? undefined,
            osArchitecture: c?.osArchitecture ?? undefined,
            osServicePack: c?.osServicePack ?? undefined,
            osKernelVersion: c?.osKernelVersion ?? undefined,
            osProductKey: c?.osProductKey ?? undefined,
            osInstallDate: toDateInput(c?.osInstallDate),
            localDomain: c?.localDomain ?? undefined,
            workgroup: c?.workgroup ?? undefined,
            intuneEnrolled: c?.intuneEnrolled ?? false,
            uuid: c?.uuid ?? undefined,
            biosVersion: c?.biosVersion ?? undefined,
          }}
          vendors={vendors}
          departments={departments}
        />
      </div>
    );
  }

  if (asset.assetType === "MONITOR") {
    const m = asset.monitor;
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <MonitorForm
          asset={{
            ...base,
            assetType: "MONITOR",
            // Decimal and Int come back out as text: the form fields are digit-strings (see
            // optionalDecimalText/optionalIntText — Zod coercion breaks zodResolver's typing).
            partNumber: m?.partNumber ?? undefined,
            sizeInches: m?.sizeInches?.toString() ?? undefined,
            resolution: m?.resolution ?? undefined,
            refreshRateHz: m?.refreshRateHz != null ? String(m.refreshRateHz) : undefined,
            panelType: m?.panelType ?? undefined,
            hasVga: m?.hasVga ?? false,
            hasDvi: m?.hasDvi ?? false,
            hasHdmi: m?.hasHdmi ?? false,
            hasDisplayPort: m?.hasDisplayPort ?? false,
            hasUsbC: m?.hasUsbC ?? false,
            hasUsbHub: m?.hasUsbHub ?? false,
            hasSpeakers: m?.hasSpeakers ?? false,
            hasMicrophone: m?.hasMicrophone ?? false,
            hasWebcam: m?.hasWebcam ?? false,
            hasPivot: m?.hasPivot ?? false,
            heightAdjustable: m?.heightAdjustable ?? false,
            vesaMount: m?.vesaMount ?? undefined,
          }}
          vendors={vendors}
          departments={departments}
        />
      </div>
    );
  }

  // Flatten whichever detail row this type has into the form's flat field set. Numbers and
  // decimals become strings for the same digit-string reason as above.
  const detailRow = (asset[descriptor.relationKey as keyof typeof asset] ?? null) as Record<string, unknown> | null;
  const detail: Record<string, unknown> = {};
  for (const field of descriptor.fields) {
    const value = detailRow?.[field.key];
    if (value === null || value === undefined) continue;
    detail[field.key] =
      field.kind === "checkbox"
        ? Boolean(value)
        : field.kind === "date"
          ? toDateInput(value as Date)
          : String(value);
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <AssetTypeForm
        assetType={asset.assetType}
        asset={{ ...base, ...detail }}
        vendors={vendors}
        departments={departments}
      />
    </div>
  );
}
