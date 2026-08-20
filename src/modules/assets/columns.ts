import type { AssetType } from "@/generated/prisma/client";
import { descriptorFor, type FieldKind } from "./types/registry";


// ---------------------------------------------------------------------------
// The single definition of asset spreadsheet columns, shared by export and import so the
// two can't drift apart (they previously kept two hand-maintained header arrays in sync,
// and a renamed field silently broke import while export kept working).
//
// Base columns are the ones every asset type has. Type-specific columns are derived from
// the registry's own `fields`, so adding a field to a type puts it in that type's
// export/import automatically with no change here.
// ---------------------------------------------------------------------------

/** Loose shape — this only ever reads, and the detail relations vary by type. */
type ExportableAsset = Record<string, unknown> & {
  assetTag: string;
  vendor: { name: string } | null;
  department: { name: string } | null;
  currentAssignedUser: { name: string } | null;
};

export type ExportColumn = { header: string; get: (asset: ExportableAsset) => string | number };

function date(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : "";
}
function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export const BASE_EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Asset Tag", get: (a) => a.assetTag },
  // Written as the readable label ("SIM Card", not "SIM_CARD") because this doubles as the
  // import template, and import matches on either.
  {
    header: "Asset Type",
    get: (a) => (a.assetType ? descriptorFor(a.assetType as AssetType).labelSingular : ""),
  },
  { header: "Serial Number", get: (a) => text(a.serialNumber) },
  { header: "Hostname", get: (a) => text(a.hostname) },
  { header: "MAC Address", get: (a) => text(a.macAddress) },
  { header: "IP Address", get: (a) => text(a.ipAddress) },
  { header: "Brand", get: (a) => text(a.brand) },
  { header: "Model", get: (a) => text(a.model) },
  { header: "Vendor", get: (a) => a.vendor?.name ?? "" },
  { header: "Department", get: (a) => a.department?.name ?? "" },
  { header: "Assigned To", get: (a) => a.currentAssignedUser?.name ?? "" },
  { header: "Status", get: (a) => text(a.status) },
  { header: "Purchase Date", get: (a) => date(a.purchaseDate) },
  { header: "Invoice Number", get: (a) => text(a.invoiceNumber) },
  { header: "Warranty Start", get: (a) => date(a.warrantyStart) },
  { header: "Warranty End", get: (a) => date(a.warrantyEnd) },
  { header: "Cost", get: (a) => (a.cost ? String(a.cost) : "") },
  { header: "Notes", get: (a) => text(a.notes) },
];

/** Header names that must never be treated as a type-specific field. */
const BASE_HEADERS = new Set(BASE_EXPORT_COLUMNS.map((c) => c.header));

export type DetailColumn = { header: string; key: string; kind: FieldKind };

/** The type-specific spreadsheet columns for one asset type, from its registry fields. */
export function detailColumnsFor(assetType: AssetType): DetailColumn[] {
  const descriptor = descriptorFor(assetType);
  if (!descriptor.relationKey) return [];
  return descriptor.fields
    // A detail field whose label collides with a base column would make the header
    // ambiguous on import, so base always wins and the field is skipped.
    .filter((field) => !BASE_HEADERS.has(field.label))
    .map((field) => ({ header: field.label, key: field.key, kind: field.kind }));
}

/**
 * Export columns for a type. Without a type (the All Assets view) only base columns are
 * used: unioning every type's fields would produce mostly-empty columns, so cross-type
 * exports stay an overview and per-type exports carry the full detail.
 */
export function exportColumnsFor(assetType?: AssetType): ExportColumn[] {
  if (!assetType) return BASE_EXPORT_COLUMNS;
  const descriptor = descriptorFor(assetType);
  const relationKey = descriptor.relationKey;
  if (!relationKey) return BASE_EXPORT_COLUMNS;

  const detail: ExportColumn[] = detailColumnsFor(assetType).map((column) => ({
    header: column.header,
    get: (asset) => {
      const row = asset[relationKey] as Record<string, unknown> | null | undefined;
      const value = row?.[column.key];
      if (column.kind === "checkbox") return value ? "Yes" : "No";
      if (column.kind === "date") return date(value);
      return text(value);
    },
  }));

  return [...BASE_EXPORT_COLUMNS, ...detail];
}

/**
 * Every header the import parser should look for: base columns plus the detail columns of
 * every type, so one file can contain rows of different types and each row still finds its
 * own fields. Duplicated labels across types (e.g. "Operating System" on both Computers and
 * Phones) collapse to one column, and each row maps it to its own type's field — which is
 * exactly what's wanted.
 */
export function allImportHeaders(): string[] {
  const headers = BASE_EXPORT_COLUMNS.map((c) => c.header);
  const seen = new Set(headers);
  for (const type of [
    "COMPUTER",
    "MONITOR",
    "PRINTER",
    "PHONE",
    "SIM_CARD",
    "NETWORK_DEVICE",
    "PERIPHERAL",
  ] as AssetType[]) {
    for (const column of detailColumnsFor(type)) {
      if (!seen.has(column.header)) {
        seen.add(column.header);
        headers.push(column.header);
      }
    }
  }
  return headers;
}

/**
 * Legacy header aliases. Exports before the per-type split used one combined column for
 * both meanings; accepted on import so an older file still round-trips.
 */
export const HEADER_ALIASES: Record<string, string> = {
  "Serial Number / Mobile Number": "Serial Number",
  "Vendor / Network Provider": "Vendor",
  // Categories were removed; a file exported before that has a Category column where the
  // Asset Type column now goes. The names lined up closely enough (Laptop/Monitor/Printer…)
  // that mapping it across keeps old files importable.
  Category: "Asset Type",
};

/** Converts a spreadsheet cell into the value shape a detail column expects. */
export function parseDetailValue(raw: string, kind: FieldKind): unknown {
  const value = raw.trim();
  if (kind === "checkbox") return value.toLowerCase() === "yes" || value.toLowerCase() === "true";
  if (!value) return null;
  if (kind === "number") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (kind === "date") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return value;
}

/** Builds the detail-row payload for an imported asset of the given type. */
export function buildDetailFromRow(assetType: AssetType, row: Record<string, string>): Record<string, unknown> {
  const detail: Record<string, unknown> = {};
  for (const column of detailColumnsFor(assetType)) {
    detail[column.key] = parseDetailValue(row[column.header] ?? "", column.kind);
  }
  return detail;
}
