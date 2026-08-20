import { z } from "zod";
import type { AssetType } from "@/generated/prisma/client";
import {
  assetSchema,
  imeiPattern,
  optionalText,
  optionalIntText,
  optionalDecimalText,
} from "../validators";

// Per-type detail schemas — the fields that live in each type's own table, on top of the
// shared base every asset has. Composed with the base via `.merge()` in assetSchemaFor().
//
// Every field here is optional: an asset is valid the moment it has a category, and the
// type-specific detail is filled in as it becomes known. Numeric fields are digit-strings
// (see optionalIntText in ../validators) — the service converts them to real numbers.

// GLPI splits the OS into its own set of fields rather than one text box, so you can filter
// on version/architecture. Hardware itself is NOT here — CPUs, RAM and disks are repeatable
// rows in computer_components, since a machine can have several of each.
export const computerDetailSchema = z.object({
  subType: optionalText(30),
  osName: optionalText(150),
  osVersion: optionalText(100),
  osArchitecture: optionalText(50),
  osServicePack: optionalText(50),
  osKernelVersion: optionalText(100),
  osProductKey: optionalText(100),
  osInstallDate: optionalText(20),
  localDomain: optionalText(150),
  workgroup: optionalText(100),
  intuneEnrolled: z.boolean().optional(),
  uuid: optionalText(64),
  biosVersion: optionalText(100),
});

export const phoneDetailSchema = z.object({
  imei: z.string().trim().regex(imeiPattern, "Enter a valid 15-digit IMEI").optional().or(z.literal("")),
  os: optionalText(150),
  phoneNumber: optionalText(30),
});

export const simCardDetailSchema = z.object({
  mobileNumber: optionalText(30),
  iccid: optionalText(30),
  planName: optionalText(150),
});

// Video inputs and built-in extras are per-port booleans, the way GLPI records them — one
// free-text "connectors" box couldn't answer "which spare monitors take DisplayPort".
export const monitorDetailSchema = z.object({
  partNumber: optionalText(64),
  sizeInches: optionalDecimalText("Screen size"),
  resolution: optionalText(50),
  panelType: optionalText(50),
  refreshRateHz: optionalIntText("Refresh rate"),
  hasVga: z.boolean().optional(),
  hasDvi: z.boolean().optional(),
  hasHdmi: z.boolean().optional(),
  hasDisplayPort: z.boolean().optional(),
  hasUsbC: z.boolean().optional(),
  hasUsbHub: z.boolean().optional(),
  hasSpeakers: z.boolean().optional(),
  hasMicrophone: z.boolean().optional(),
  hasWebcam: z.boolean().optional(),
  hasPivot: z.boolean().optional(),
  heightAdjustable: z.boolean().optional(),
  vesaMount: optionalText(20),
});

export const printerDetailSchema = z.object({
  printerType: optionalText(50),
  connectionType: optionalText(50),
  pageCount: optionalIntText("Page count"),
});

export const networkDeviceDetailSchema = z.object({
  deviceType: optionalText(50),
  portCount: optionalIntText("Port count"),
  firmwareVersion: optionalText(100),
});

export const peripheralDetailSchema = z.object({
  peripheralType: optionalText(50),
  interface: optionalText(50),
});

// OTHER has no detail table — an empty object keeps the merge below uniform.
export const emptyDetailSchema = z.object({});

export const DETAIL_SCHEMAS: Record<AssetType, z.ZodObject<z.ZodRawShape>> = {
  COMPUTER: computerDetailSchema,
  PHONE: phoneDetailSchema,
  SIM_CARD: simCardDetailSchema,
  MONITOR: monitorDetailSchema,
  PRINTER: printerDetailSchema,
  NETWORK_DEVICE: networkDeviceDetailSchema,
  PERIPHERAL: peripheralDetailSchema,
  OTHER: emptyDetailSchema,
};

// Cached because the asset form calls this on every render.
const schemaCache = new Map<AssetType, z.ZodObject<z.ZodRawShape>>();

/**
 * The full validation schema for one asset type: shared base fields + that type's detail
 * fields, merged flat.
 *
 * Deliberately `.merge()` and NOT `z.discriminatedUnion`. A union is the textbook answer
 * here and it silently breaks the form: zodResolver maps errors by path, but union members
 * emit `invalid_union` issues that never resolve to `errors.<field>`, so every
 * `<FieldError errors={[errors.x]} />` in asset-form.tsx would stop showing messages.
 * Merging two ZodObjects keeps error paths flat.
 */
export function assetSchemaFor(assetType: AssetType): z.ZodObject<z.ZodRawShape> {
  const cached = schemaCache.get(assetType);
  if (cached) return cached;
  const merged = assetSchema.merge(DETAIL_SCHEMAS[assetType]);
  schemaCache.set(assetType, merged);
  return merged;
}
