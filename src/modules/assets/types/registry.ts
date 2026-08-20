import type { Prisma, AssetType } from "@/generated/prisma/client";
import type { AssetInput } from "../validators";
import { DETAIL_SCHEMAS } from "./schemas";

// ---------------------------------------------------------------------------
// The asset type registry — the ONE place per-type knowledge lives.
//
// Service, validators, forms, list pages, detail page, import, export and nav all read
// from here, so adding a field to a type (or a whole new type) is an edit to this file plus
// its Prisma model, not a hunt through the codebase. This is what replaces the old
// SIMPLIFIED_CATEGORY_FIELDS hack, which branched on category NAME string literals ("SIM",
// "Mobile") in two duplicated places and forced those categories to be isSystem-locked.
//
// Deliberately data-only (no JSX, no Prisma calls) so both server and client can import it.
// ---------------------------------------------------------------------------

export type FieldKind = "text" | "number" | "decimal" | "checkbox" | "select" | "date";

export type FieldDescriptor = {
  /** Matches the key in that type's detail schema AND its Prisma detail model column. */
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  /** For kind: "select". */
  options?: readonly { value: string; label: string }[];
};

/** Base-asset fields a type wants renamed — e.g. SIM calls the Vendor its Network Provider. */
export type BaseFieldOverrides = Partial<Record<keyof AssetInput, { label: string }>>;

export type AssetTypeDescriptor = {
  assetType: AssetType;
  /** URL + nav segment, e.g. /assets/computers. */
  slug: string;
  label: string;
  labelSingular: string;
  /**
   * The Prisma relation on Asset holding this type's detail row. `null` for OTHER, which
   * has no detail table — base fields only.
   */
  relationKey: "computer" | "monitor" | "printer" | "phone" | "simCard" | "networkDevice" | "peripheral" | null;
  /** Prisma model delegate name, used to build the detail-row writes generically. */
  modelKey: "computer" | "monitor" | "printer" | "phone" | "simCard" | "networkDevice" | "peripheral" | null;
  fields: readonly FieldDescriptor[];
  baseFieldOverrides?: BaseFieldOverrides;
  /** Base fields that make no sense for this type and are hidden from its form/detail page. */
  hiddenBaseFields?: readonly (keyof AssetInput)[];
  /** Extra columns this type's list shows, on top of the shared Asset Tag / Category / Status. */
  listColumns: readonly string[];
  /**
   * Search branches for fields that live in this type's detail table. Base columns are
   * searched directly; only relocated fields need a relation subquery, and only when the
   * list is filtered to this type (so a Computers search never queries phones.imei).
   */
  searchRelations?: readonly ((search: string) => Prisma.AssetWhereInput)[];
};

const COMPUTER: AssetTypeDescriptor = {
  assetType: "COMPUTER",
  slug: "computers",
  label: "Computers",
  labelSingular: "Computer",
  relationKey: "computer",
  modelKey: "computer",
  fields: [
    // Replaces the old Desktop/Laptop/Server categories — same distinction, fixed list.
    {
      key: "subType",
      label: "Type",
      kind: "select",
      options: [
        { value: "Desktop", label: "Desktop" },
        { value: "Laptop", label: "Laptop" },
        { value: "Server", label: "Server" },
      ],
    },
    { key: "osName", label: "Operating System", kind: "text", placeholder: "e.g. Windows 11 Business" },
    { key: "osVersion", label: "OS Version", kind: "text", placeholder: "e.g. 23H2" },
    { key: "osArchitecture", label: "Architecture", kind: "text", placeholder: "e.g. 64-bit" },
    { key: "osServicePack", label: "Service Pack", kind: "text" },
    { key: "osKernelVersion", label: "Kernel Version", kind: "text" },
    { key: "osProductKey", label: "Product Key", kind: "text" },
    { key: "osInstallDate", label: "OS Install Date", kind: "date" },
    { key: "localDomain", label: "Local Domain", kind: "text", placeholder: "e.g. corp.local" },
    { key: "workgroup", label: "Workgroup", kind: "text", placeholder: "e.g. WORKGROUP" },
    { key: "intuneEnrolled", label: "Intune Enrolled", kind: "checkbox" },
    { key: "uuid", label: "UUID", kind: "text", help: "Reported by inventory agents; unique per machine." },
    { key: "biosVersion", label: "BIOS Version", kind: "text" },
  ],
  listColumns: ["subType", "hostname", "osName", "assignedTo"],
};

const MONITOR: AssetTypeDescriptor = {
  assetType: "MONITOR",
  slug: "monitors",
  label: "Monitors",
  labelSingular: "Monitor",
  relationKey: "monitor",
  modelKey: "monitor",
  fields: [
    // The sticker on the back. Manual by necessity — EDID has no part-number field, so the
    // inventory agent can never fill this in (unlike resolution/refresh rate, which it does).
    { key: "partNumber", label: "Part Number (MTM)", kind: "text", placeholder: "e.g. 62B9GAR1WW" },
    { key: "sizeInches", label: "Screen Size (inches)", kind: "decimal", placeholder: "24" },
    { key: "resolution", label: "Resolution", kind: "text", placeholder: "e.g. 1920x1080" },
    { key: "refreshRateHz", label: "Refresh Rate (Hz)", kind: "number", placeholder: "60" },
    { key: "panelType", label: "Panel Type", kind: "text", placeholder: "e.g. IPS, VA, TN" },
    // One flag per port rather than a free-text list, so a spare monitor can be matched to a
    // machine's outputs without reading prose.
    { key: "hasVga", label: "VGA", kind: "checkbox" },
    { key: "hasDvi", label: "DVI", kind: "checkbox" },
    { key: "hasHdmi", label: "HDMI", kind: "checkbox" },
    { key: "hasDisplayPort", label: "DisplayPort", kind: "checkbox" },
    { key: "hasUsbC", label: "USB-C", kind: "checkbox" },
    { key: "hasUsbHub", label: "USB Hub", kind: "checkbox" },
    { key: "hasSpeakers", label: "Speakers", kind: "checkbox" },
    { key: "hasMicrophone", label: "Microphone", kind: "checkbox" },
    { key: "hasWebcam", label: "Webcam", kind: "checkbox" },
    { key: "hasPivot", label: "Pivot / Rotate", kind: "checkbox" },
    { key: "heightAdjustable", label: "Height Adjustable", kind: "checkbox" },
    { key: "vesaMount", label: "VESA Mount", kind: "text", placeholder: "e.g. 100x100" },
  ],
  hiddenBaseFields: ["hostname", "macAddress", "ipAddress"],
  listColumns: ["sizeInches", "resolution", "assignedTo"],
};

const PRINTER: AssetTypeDescriptor = {
  assetType: "PRINTER",
  slug: "printers",
  label: "Printers",
  labelSingular: "Printer",
  relationKey: "printer",
  modelKey: "printer",
  fields: [
    {
      key: "printerType",
      label: "Type",
      kind: "select",
      options: [
        { value: "Laser", label: "Laser" },
        { value: "Inkjet", label: "Inkjet" },
        { value: "Dot Matrix", label: "Dot Matrix" },
        { value: "Thermal", label: "Thermal" },
        { value: "Multifunction", label: "Multifunction" },
        { value: "Plotter", label: "Plotter" },
      ],
    },
    {
      key: "connectionType",
      label: "Connection",
      kind: "select",
      options: [
        { value: "Network", label: "Network" },
        { value: "USB", label: "USB" },
        { value: "Wi-Fi", label: "Wi-Fi" },
        { value: "Bluetooth", label: "Bluetooth" },
      ],
    },
    { key: "pageCount", label: "Page Count", kind: "number", placeholder: "0" },
  ],
  hiddenBaseFields: [],
  listColumns: ["printerType", "ipAddress", "department"],
};

const PHONE: AssetTypeDescriptor = {
  assetType: "PHONE",
  slug: "phones",
  label: "Phones",
  labelSingular: "Phone",
  relationKey: "phone",
  modelKey: "phone",
  fields: [
    { key: "imei", label: "IMEI", kind: "text", placeholder: "15-digit IMEI" },
    { key: "os", label: "Operating System", kind: "text", placeholder: "e.g. Android 14, iOS 17" },
    { key: "phoneNumber", label: "Phone Number", kind: "text" },
  ],
  hiddenBaseFields: ["hostname"],
  listColumns: ["imei", "phoneNumber", "assignedTo"],
};

// SIM deliberately keeps the base `vendorId` relabelled rather than a free-text provider —
// a string would drop the real Vendor FK and with it vendor reporting and vendor-scoped
// maintenance. `mobileNumber` is its own column (historically it was crammed into
// serialNumber, which is why the export header had to read "Serial Number / Mobile Number").
const SIM_CARD: AssetTypeDescriptor = {
  assetType: "SIM_CARD",
  slug: "sim-cards",
  label: "SIM Cards",
  labelSingular: "SIM Card",
  relationKey: "simCard",
  modelKey: "simCard",
  fields: [
    { key: "mobileNumber", label: "Mobile Number", kind: "text" },
    { key: "iccid", label: "ICCID", kind: "text", help: "The SIM's own serial number, printed on the card." },
    { key: "planName", label: "Plan", kind: "text", placeholder: "e.g. Corporate 50GB" },
  ],
  baseFieldOverrides: { vendorId: { label: "Network Provider" } },
  hiddenBaseFields: [
    "hostname",
    "macAddress",
    "brand",
    "model",
    "purchaseDate",
    "invoiceNumber",
    "warrantyStart",
    "warrantyEnd",
    "cost",
  ],
  listColumns: ["mobileNumber", "planName", "assignedTo"],
};

const NETWORK_DEVICE: AssetTypeDescriptor = {
  assetType: "NETWORK_DEVICE",
  slug: "network-devices",
  label: "Network Devices",
  labelSingular: "Network Device",
  relationKey: "networkDevice",
  modelKey: "networkDevice",
  fields: [
    {
      key: "deviceType",
      label: "Type",
      kind: "select",
      options: [
        { value: "Switch", label: "Switch" },
        { value: "Router", label: "Router" },
        { value: "Firewall", label: "Firewall" },
        { value: "Access Point", label: "Access Point" },
        { value: "Modem", label: "Modem" },
        { value: "NAS", label: "NAS" },
      ],
    },
    { key: "portCount", label: "Port Count", kind: "number", placeholder: "24" },
    { key: "firmwareVersion", label: "Firmware Version", kind: "text" },
  ],
  hiddenBaseFields: [],
  listColumns: ["deviceType", "ipAddress", "department"],
};

const PERIPHERAL: AssetTypeDescriptor = {
  assetType: "PERIPHERAL",
  slug: "peripherals",
  label: "Peripherals",
  labelSingular: "Peripheral",
  relationKey: "peripheral",
  modelKey: "peripheral",
  fields: [
    {
      key: "peripheralType",
      label: "Type",
      kind: "select",
      options: [
        { value: "Keyboard", label: "Keyboard" },
        { value: "Mouse", label: "Mouse" },
        { value: "Docking Station", label: "Docking Station" },
        { value: "Headset", label: "Headset" },
        { value: "Webcam", label: "Webcam" },
        { value: "Scanner", label: "Scanner" },
        { value: "External Drive", label: "External Drive" },
        { value: "UPS", label: "UPS" },
        { value: "Other", label: "Other" },
      ],
    },
    {
      key: "interface",
      label: "Interface",
      kind: "select",
      options: [
        { value: "USB-A", label: "USB-A" },
        { value: "USB-C", label: "USB-C" },
        { value: "Bluetooth", label: "Bluetooth" },
        { value: "Wireless (dongle)", label: "Wireless (dongle)" },
        { value: "Thunderbolt", label: "Thunderbolt" },
      ],
    },
  ],
  hiddenBaseFields: ["hostname"],
  listColumns: ["peripheralType", "interface", "assignedTo"],
};

// RETIRED as a user-facing type — no page, no form, no nav entry, and import rejects it (see
// ASSET_TYPES_ORDERED below). It stays in the registry only so `descriptorFor("OTHER")` keeps
// working for any row that still carries the value: `AssetType.OTHER` remains in the Prisma
// enum as the column's default, so removing this entry would make those rows crash on render.
// Peripherals covers the odds and ends now — its type list includes "Other".
const OTHER: AssetTypeDescriptor = {
  assetType: "OTHER",
  slug: "other",
  label: "Other Assets",
  // Not just "Asset": this label appears in a list of types on the import error and as the
  // form's "Create …" button, where a bare "Asset" would read as if it were the default.
  labelSingular: "Other Asset",
  relationKey: null,
  modelKey: null,
  fields: [],
  listColumns: ["brandModel", "department", "assignedTo"],
};

export const ASSET_TYPE_REGISTRY: Record<AssetType, AssetTypeDescriptor> = {
  COMPUTER,
  MONITOR,
  PRINTER,
  PHONE,
  SIM_CARD,
  NETWORK_DEVICE,
  PERIPHERAL,
  OTHER,
};

/**
 * The user-facing types, in nav/menu order. Each has its own page, its own form and its own
 * import label. This is the list everything iterates — nav, routing, import — so OTHER's
 * absence here is what makes it unreachable rather than any check for it by name.
 */
export const ASSET_TYPES_ORDERED: readonly AssetTypeDescriptor[] = [
  COMPUTER,
  MONITOR,
  PRINTER,
  PHONE,
  SIM_CARD,
  NETWORK_DEVICE,
  PERIPHERAL,
];

const BY_SLUG = new Map(ASSET_TYPES_ORDERED.map((d) => [d.slug, d]));

export function descriptorForSlug(slug: string): AssetTypeDescriptor | undefined {
  return BY_SLUG.get(slug);
}

export function descriptorFor(assetType: AssetType): AssetTypeDescriptor {
  return ASSET_TYPE_REGISTRY[assetType];
}

/** True when `key` is one of that type's detail fields (rather than a base Asset column). */
export function isDetailField(assetType: AssetType, key: string): boolean {
  return ASSET_TYPE_REGISTRY[assetType].fields.some((f) => f.key === key);
}

/** The detail-field keys for a type — used to split form input into base vs detail writes. */
export function detailFieldKeys(assetType: AssetType): string[] {
  return ASSET_TYPE_REGISTRY[assetType].fields.map((f) => f.key);
}

export { DETAIL_SCHEMAS };
