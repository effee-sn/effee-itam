import { z } from "zod";

// The shape the PowerShell agent POSTs to /api/inventory. Everything is optional except that
// a machine must be identifiable by SOMETHING — enforced below — otherwise it can't be matched
// or meaningfully onboarded. Kept deliberately loose (all strings) so a quirky WMI value never
// rejects an otherwise-good report; the service normalises.
const componentTypes = [
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

export const inventoryComponentSchema = z.object({
  type: z.enum(componentTypes),
  name: z.string().trim().min(1).max(255),
  specification: z.string().trim().max(255).optional(),
  capacity: z.string().trim().max(255).optional(),
  serialNumber: z.string().trim().max(255).optional(),
  quantity: z.number().int().positive().optional(),
});

/**
 * One external display the agent found attached. Exported because a discovered monitor's payload is
 * stored as JSON and re-validated when it's onboarded — never trusted straight out of the column.
 *
 * Only what Windows can genuinely report is here. Panel type (IPS/TN/VA), the vendor's MTM/part
 * number, the monitor's OTHER ports, USB hub, microphone, pivot, height adjustment and VESA size are
 * not exposed by EDID or WMI at all, so they stay manual fields on the asset.
 */
export const inventoryMonitorSchema = z
  .object({
    serialNumber: z.string().trim().max(191).optional(),
    /** Expanded vendor name ("Lenovo"). */
    manufacturer: z.string().trim().max(191).optional(),
    /** Raw EDID PnP ID ("LEN"). Lets the server recognise — and replace — a Brand that was
     *  auto-filled with the bare code by an older agent. */
    manufacturerCode: z.string().trim().max(16).optional(),
    model: z.string().trim().max(191).optional(),
    sizeInches: z.number().positive().optional(),
    /** Native mode, e.g. "1920x1080". */
    resolution: z.string().trim().max(64).optional(),
    refreshRateHz: z.number().int().positive().max(1000).optional(),
    /** The port in use right now — the only one Windows can know about. */
    connectedVia: z.enum(["VGA", "DVI", "HDMI", "DisplayPort"]).optional(),
    /** Only ever sent as true, when there is positive evidence. */
    hasSpeakers: z.literal(true).optional(),
    hasWebcam: z.literal(true).optional(),
  })
  .refine((m) => (m.serialNumber && m.serialNumber.length > 0) || (m.model && m.model.length > 0), {
    message: "Each monitor needs a serialNumber or a model",
  });

export const inventorySchema = z
  .object({
    uuid: z.string().trim().max(191).optional(),
    serialNumber: z.string().trim().max(191).optional(),
    hostname: z.string().trim().max(191).optional(),
    manufacturer: z.string().trim().max(191).optional(),
    model: z.string().trim().max(191).optional(),
    macAddress: z.string().trim().max(191).optional(),
    ipAddress: z.string().trim().max(191).optional(),
    os: z
      .object({
        name: z.string().trim().max(191).optional(),
        version: z.string().trim().max(191).optional(),
        architecture: z.string().trim().max(191).optional(),
        installDate: z.string().trim().max(191).optional(),
      })
      .optional(),
    domain: z.string().trim().max(191).optional(),
    workgroup: z.string().trim().max(191).optional(),
    intuneEnrolled: z.boolean().optional(),
    biosVersion: z.string().trim().max(191).optional(),
    components: z.array(inventoryComponentSchema).max(200).optional(),
    // External displays plugged into this machine, from EDID (built-in panels are dropped by the
    // agent, identified by connection type). See inventoryMonitorSchema above: serialNumber is
    // optional because plenty of real monitors publish none.
    monitors: z.array(inventoryMonitorSchema).max(20).optional(),
  })
  // Some junk hardware reports a blank/placeholder serial and no UUID. Require at least one
  // real identifier so a report can be matched to (or later become) exactly one machine.
  .refine((d) => (d.uuid && d.uuid.length > 0) || (d.serialNumber && d.serialNumber.length > 0), {
    message: "Report must include a uuid or a serialNumber",
  });

export type InventoryInput = z.infer<typeof inventorySchema>;
export type InventoryComponentInput = z.infer<typeof inventoryComponentSchema>;
