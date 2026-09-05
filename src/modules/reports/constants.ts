export type ReportType = "asset-inventory" | "department-assets" | "warranty-expiry";

export const REPORT_TYPES: { value: ReportType; label: string; subtitle: string }[] = [
  { value: "asset-inventory", label: "Asset Inventory", subtitle: "Complete list of all assets in the organization." },
  { value: "department-assets", label: "Department Assets", subtitle: "All assets grouped by the department they belong to." },
  { value: "warranty-expiry", label: "Warranty Expiry", subtitle: "Assets with a warranty, ordered by when it expires." },
];

export function isReportType(value: string | null | undefined): value is ReportType {
  return REPORT_TYPES.some((type) => type.value === value);
}
