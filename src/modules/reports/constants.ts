export type ReportType = "asset-inventory" | "department-assets" | "warranty-expiry";

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "asset-inventory", label: "Asset Inventory" },
  { value: "department-assets", label: "Department Assets" },
  { value: "warranty-expiry", label: "Warranty Expiry" },
];

export function isReportType(value: string | null | undefined): value is ReportType {
  return REPORT_TYPES.some((type) => type.value === value);
}
