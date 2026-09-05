import { listAssetsForExport, type ScopeActor } from "@/modules/assets/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import type { ReportType } from "./constants";

function formatDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export type Report = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  // Asset id per row (aligned with `rows`), so the UI can link each row to its asset.
  ids: number[];
};

async function assetInventoryReport(actor: ScopeActor): Promise<Report> {
  const assets = await listAssetsForExport({ actor });
  return {
    title: "Asset Inventory",
    headers: ["Asset Tag", "Type", "Brand", "Model", "Vendor", "Department", "Assigned To", "Status", "Cost"],
    ids: assets.map((asset) => asset.id),
    rows: assets.map((asset) => [
      asset.assetTag,
      descriptorFor(asset.assetType).labelSingular,
      asset.brand ?? "",
      asset.model ?? "",
      asset.vendor?.name ?? "",
      asset.department?.name ?? "",
      asset.currentAssignedUser?.name ?? "",
      asset.status,
      asset.cost ? asset.cost.toString() : "",
    ]),
  };
}

async function departmentAssetsReport(actor: ScopeActor): Promise<Report> {
  const assets = await listAssetsForExport({ actor });
  const sorted = [...assets].sort(
    (a, b) =>
      (a.department?.name ?? "zzz").localeCompare(b.department?.name ?? "zzz") ||
      a.assetTag.localeCompare(b.assetTag),
  );
  return {
    title: "Department Assets",
    headers: ["Department", "Asset Tag", "Type", "Brand", "Model", "Assigned To", "Status"],
    ids: sorted.map((asset) => asset.id),
    rows: sorted.map((asset) => [
      asset.department?.name ?? "Unassigned",
      asset.assetTag,
      descriptorFor(asset.assetType).labelSingular,
      asset.brand ?? "",
      asset.model ?? "",
      asset.currentAssignedUser?.name ?? "",
      asset.status,
    ]),
  };
}

async function warrantyExpiryReport(actor: ScopeActor): Promise<Report> {
  const assets = await listAssetsForExport({ actor });
  const withWarranty = assets
    .filter((asset) => asset.warrantyEnd)
    .sort((a, b) => a.warrantyEnd!.getTime() - b.warrantyEnd!.getTime());
  return {
    title: "Warranty Expiry",
    headers: ["Asset Tag", "Type", "Assigned To", "Warranty Start", "Warranty End"],
    ids: withWarranty.map((asset) => asset.id),
    rows: withWarranty.map((asset) => [
      asset.assetTag,
      descriptorFor(asset.assetType).labelSingular,
      asset.currentAssignedUser?.name ?? "",
      formatDate(asset.warrantyStart),
      formatDate(asset.warrantyEnd),
    ]),
  };
}

export async function getReport(type: ReportType, actor: ScopeActor): Promise<Report> {
  switch (type) {
    case "asset-inventory":
      return assetInventoryReport(actor);
    case "department-assets":
      return departmentAssetsReport(actor);
    case "warranty-expiry":
      return warrantyExpiryReport(actor);
  }
}
