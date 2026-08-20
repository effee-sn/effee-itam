import { z } from "zod";
import { optionalText, optionalIntText } from "./validators";

export const COMPONENT_TYPES = [
  "PROCESSOR",
  "MEMORY",
  "STORAGE",
  "GRAPHICS",
  "NETWORK_CARD",
  "MOTHERBOARD",
  "POWER_SUPPLY",
  "SOUND_CARD",
  "CASE",
  "BATTERY",
  "OTHER",
] as const;

export const COMPONENT_TYPE_LABELS: Record<(typeof COMPONENT_TYPES)[number], string> = {
  PROCESSOR: "Processor",
  MEMORY: "Memory",
  STORAGE: "Storage",
  GRAPHICS: "Graphics Card",
  NETWORK_CARD: "Network Card",
  MOTHERBOARD: "Motherboard",
  POWER_SUPPLY: "Power Supply",
  SOUND_CARD: "Sound Card",
  CASE: "Case",
  BATTERY: "Battery",
  OTHER: "Other",
};

export const componentSchema = z.object({
  type: z.enum(COMPONENT_TYPES),
  name: z.string().trim().min(1, "Name is required").max(150),
  specification: optionalText(200),
  capacity: optionalText(100),
  serialNumber: optionalText(150),
  // Digit-string rather than a coerced number, for the same zodResolver typing reason as
  // the other numeric fields in this module (see optionalIntText).
  quantity: optionalIntText("Quantity"),
  notes: optionalText(500),
});
export type ComponentInput = z.infer<typeof componentSchema>;

export const connectionSchema = z.object({
  connectedAssetId: z.number().int().positive("Select a device"),
  notes: optionalText(200),
});
export type ConnectionInput = z.infer<typeof connectionSchema>;
