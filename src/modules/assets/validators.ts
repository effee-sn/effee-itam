import { z } from "zod";

export const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

// Numeric fields are validated as digit-strings rather than z.coerce.number(), on purpose:
// coercion (like .default()) makes a schema's input and output types diverge, which
// zodResolver can't reconcile with useForm's single type parameter. The existing `cost`
// field already uses this string-with-regex approach; the service converts on the way in.
export const optionalIntText = (label: string) =>
  z.string().trim().regex(/^\d*$/, `${label} must be a whole number`).optional().or(z.literal(""));

export const optionalDecimalText = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d*(\.\d{1,2})?$/, `${label} must be a number`)
    .optional()
    .or(z.literal(""));

export const macAddressPattern = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
export const imeiPattern = /^\d{15}$/;

// Fields shared by every asset type. Anything type-specific (OS, domain, workgroup, Intune,
// IMEI, mobile number…) belongs to that type's detail schema in ./types/schemas.ts and is
// merged on top by assetSchemaFor().
export const ASSET_TYPES = [
  "COMPUTER",
  "MONITOR",
  "PRINTER",
  "PHONE",
  "SIM_CARD",
  "NETWORK_DEVICE",
  "PERIPHERAL",
  "OTHER",
] as const;

export const assetSchema = z.object({
  // Which kind of asset this is. Each type has its own form, so the form supplies this as a
  // constant rather than the user picking it. Plainly required, NOT `.default()` — a Zod
  // default makes the schema's input and output types diverge, which zodResolver can't
  // reconcile with useForm's single type parameter.
  assetType: z.enum(ASSET_TYPES),
  // Typed in by hand — nothing is generated, so it's required and must be unique (checked in
  // the service, which is where the DB is).
  assetTag: z.string().trim().min(1, "Asset tag is required").max(50, "Asset tag is too long"),
  serialNumber: optionalText(150),
  hostname: optionalText(150),
  macAddress: z
    .string()
    .trim()
    .regex(macAddressPattern, "Enter a valid MAC address (e.g. 00:1A:2B:3C:4D:5E)")
    .optional()
    .or(z.literal("")),
  ipAddress: optionalText(45),
  brand: optionalText(100),
  model: optionalText(100),
  vendorId: z.number().int().positive().optional(),
  purchaseDate: optionalText(20),
  invoiceNumber: optionalText(100),
  warrantyStart: optionalText(20),
  warrantyEnd: optionalText(20),
  cost: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
    .optional()
    .or(z.literal("")),
  departmentId: z.number().int().positive().optional(),
  notes: optionalText(2000),
  status: z.enum(["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED", "LOST"]).optional(),
});
export type AssetInput = z.infer<typeof assetSchema>;
