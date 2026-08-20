import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { auditLog } from "@/modules/audit/log";
import { assertAssetTagAvailable } from "@/modules/assets/service";
import type { Prisma } from "@/generated/prisma/client";
import {
  inventorySchema,
  inventoryMonitorSchema,
  type InventoryInput,
  type InventoryComponentInput,
} from "./validators";

// ---------------------------------------------------------------------------------------------
// Inventory ingest — the server side of the PowerShell agent.
//
// A report either MATCHES an existing computer (by uuid, then serial) and updates it, or it's a
// machine we don't know yet and goes into `discovered_devices` for an admin to onboard with a
// real asset tag. External monitors work the same way: matched by serial and auto-connected, or
// parked as a discovered MONITOR. Assets are never auto-created — tags are human-assigned.
// ---------------------------------------------------------------------------------------------

function parseInstallDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Shared asset base-column mapping. `create` decides how a blank incoming value is treated:
 * on create it becomes null; on update it becomes `undefined` so Prisma SKIPS it, i.e. a field
 * the agent didn't report never erases what's already there.
 */
function baseFields(p: InventoryInput, create: boolean) {
  const blank = create ? null : undefined;
  return {
    hostname: p.hostname || blank,
    serialNumber: p.serialNumber || blank,
    macAddress: p.macAddress || blank,
    ipAddress: p.ipAddress || blank,
    brand: p.manufacturer || blank,
    model: p.model || blank,
  };
}

function detailFields(p: InventoryInput, create: boolean) {
  const blank = create ? null : undefined;
  return {
    uuid: p.uuid || blank,
    osName: p.os?.name || blank,
    osVersion: p.os?.version || blank,
    osArchitecture: p.os?.architecture || blank,
    osInstallDate: parseInstallDate(p.os?.installDate) ?? (create ? null : undefined),
    localDomain: p.domain || blank,
    workgroup: p.workgroup || blank,
    // Boolean, so treat it separately: apply a reported true/false, but on update leave the
    // existing value untouched when the agent didn't report it at all.
    intuneEnrolled: p.intuneEnrolled ?? (create ? false : undefined),
    biosVersion: p.biosVersion || blank,
  };
}

function componentRows(components: InventoryComponentInput[] | undefined, computerId: number) {
  return (components ?? []).map((c) => ({
    computerId,
    type: c.type,
    name: c.name,
    specification: c.specification || null,
    capacity: c.capacity || null,
    serialNumber: c.serialNumber || null,
    quantity: c.quantity ?? 1,
  }));
}

export type ReportedMonitor = NonNullable<InventoryInput["monitors"]>[number];

/** A reported display that resolved to a Monitor asset already in inventory. */
export type MonitorKnown = { assetTag: string; label: string; newlyLinked: boolean };

/** Human-readable name for a reported display, for messages back to whoever ran the agent. */
function monitorLabel(m: ReportedMonitor) {
  return [m.manufacturer, m.model].filter(Boolean).join(" ") || m.serialNumber || "display";
}

/** Assignable to both a Monitor create and a Monitor update — booleans are `true`-only by design. */
type MonitorDetailWrite = {
  sizeInches?: number;
  resolution?: string;
  refreshRateHz?: number;
  hasVga?: true;
  hasDvi?: true;
  hasHdmi?: true;
  hasDisplayPort?: true;
  hasSpeakers?: true;
  hasWebcam?: true;
};

/**
 * The Monitor detail fields the agent is authoritative for. Two rules keep it from destroying what a
 * person entered by hand:
 *
 * - A field the agent didn't report is left OUT (undefined), never set to null — so an unreported
 *   value keeps whatever is stored.
 * - Booleans are only ever set to `true`. The agent can prove a port is in use or that speakers
 *   exist; it cannot prove absence, so a `false` would be a guess overwriting a real answer. This is
 *   why plugging a monitor in over HDMI sets `hasHdmi` without clearing `hasVga`.
 *
 * `panelType`, `hasUsbC`, `hasUsbHub`, `hasMicrophone`, `hasPivot`, `heightAdjustable` and
 * `vesaMount` are deliberately absent: nothing in EDID or WMI reports them.
 */
function monitorDetailWrite(m: ReportedMonitor): MonitorDetailWrite {
  const d: MonitorDetailWrite = {};
  if (m.sizeInches !== undefined) d.sizeInches = m.sizeInches;
  if (m.resolution) d.resolution = m.resolution;
  if (m.refreshRateHz) d.refreshRateHz = m.refreshRateHz;
  if (m.connectedVia === "VGA") d.hasVga = true;
  if (m.connectedVia === "DVI") d.hasDvi = true;
  if (m.connectedVia === "HDMI") d.hasHdmi = true;
  if (m.connectedVia === "DisplayPort") d.hasDisplayPort = true;
  if (m.hasSpeakers) d.hasSpeakers = true;
  if (m.hasWebcam) d.hasWebcam = true;
  return d;
}

/**
 * Refresh a Monitor asset from what the agent just reported. Technical specs are the agent's to own;
 * identity is not, so Brand is only filled when it's empty or still holds the bare EDID PnP code
 * ("LEN") that an older agent wrote — that way "Lenovo" replaces "LEN" once, and a name someone
 * typed themselves is never touched.
 */
async function refreshMonitorAsset(
  asset: { id: number; brand: string | null; model: string | null },
  m: ReportedMonitor,
) {
  const base: { brand?: string; model?: string } = {};
  const brandIsAutoCode =
    !asset.brand?.trim() ||
    (!!m.manufacturerCode && asset.brand.trim().toUpperCase() === m.manufacturerCode.trim().toUpperCase());
  if (m.manufacturer && brandIsAutoCode) base.brand = m.manufacturer;
  if (m.model && !asset.model?.trim()) base.model = m.model;

  const detail = monitorDetailWrite(m);
  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      ...base,
      // upsert covers a MONITOR asset created by hand that has no detail row yet.
      monitor: { upsert: { create: detail, update: detail } },
    },
  });
}

/**
 * Which Monitor asset — if any — a reported display already is. Two routes, because not every
 * monitor publishes a serial:
 *
 * 1. **Serial** — the reliable identity. Matches the Monitor asset carrying that serial.
 * 2. **No serial** — the only identity left is (model + the machine it's plugged into), which is
 *    recorded on the DiscoveredDevice row that was onboarded into an asset. So a serial-less display
 *    is recognised by finding its own ONBOARDED discovery row for THIS computer. Without this route
 *    such a display could never be recognised again: the asset it became has no serial to match on,
 *    so every run would park it as new, forever.
 *
 * Deliberately NOT done for route 2: matching any Monitor asset that merely has the same model.
 * Two identical monitors are indistinguishable, so that would link the wrong physical unit.
 */
async function resolveMonitorAsset(m: ReportedMonitor, computerAssetId: number) {
  if (m.serialNumber) {
    return prisma.asset.findFirst({
      where: { assetType: "MONITOR", deletedAt: null, serialNumber: m.serialNumber },
      select: { id: true, assetTag: true, brand: true, model: true },
    });
  }
  const onboarded = await prisma.discoveredDevice.findFirst({
    where: {
      status: "ONBOARDED",
      deviceType: "MONITOR",
      serialNumber: null,
      model: m.model ?? null,
      seenOnAssetId: computerAssetId,
      onboardedAssetId: { not: null },
    },
    select: { onboardedAssetId: true },
  });
  if (!onboarded?.onboardedAssetId) return null;
  // The asset may since have been deleted — then it's genuinely not in inventory any more and
  // should be treated as new, so this must be scoped by deletedAt.
  return prisma.asset.findFirst({
    where: { id: onboarded.onboardedAssetId, assetType: "MONITOR", deletedAt: null },
    select: { id: true, assetTag: true, brand: true, model: true },
  });
}

/**
 * Connect the monitors this machine reported to the computer, for the ones already in inventory.
 * Unrecognised ones are returned whole so the caller can park them under Discovered.
 *
 * A monitor that was connected to a DIFFERENT computer is moved here — it physically moved desks,
 * and `AssetConnection.connectedAssetId` is unique so it can only sit in one place. A monitor whose
 * connection was deleted by hand is re-connected, so the link self-heals on the next run.
 *
 * Runs after the computer write (not inside its transaction): a monitor link failing must never
 * roll back the computer's own inventory update.
 */
async function linkReportedMonitors(
  computerAssetId: number,
  monitors: InventoryInput["monitors"],
): Promise<{ linked: number; known: MonitorKnown[]; unmatched: ReportedMonitor[] }> {
  const known: MonitorKnown[] = [];
  const unmatched: ReportedMonitor[] = [];
  if (!monitors || monitors.length === 0) return { linked: 0, known, unmatched };
  let linked = 0;
  for (const m of monitors) {
    const monitorAsset = await resolveMonitorAsset(m, computerAssetId);
    if (!monitorAsset) {
      // Returned so the operator can SEE which display was found and what happened to it —
      // silently ignoring it is why "nothing happened" is baffling.
      unmatched.push(m);
      continue;
    }
    if (monitorAsset.id === computerAssetId) continue; // paranoia: never link a thing to itself

    // Refresh its specs every run, not just at onboarding — resolution, refresh rate, size, the port
    // it's on and its speakers/webcam are re-reported each time, so a monitor added before those
    // were collected fills itself in.
    await refreshMonitorAsset(monitorAsset, m);

    const existing = await prisma.assetConnection.findUnique({ where: { connectedAssetId: monitorAsset.id } });
    if (existing?.computerAssetId === computerAssetId) {
      known.push({ assetTag: monitorAsset.assetTag, label: monitorLabel(m), newlyLinked: false });
      continue; // already linked here
    }
    if (existing) await prisma.assetConnection.delete({ where: { id: existing.id } });
    await prisma.assetConnection.create({
      data: { computerAssetId, connectedAssetId: monitorAsset.id, notes: "Auto-linked by inventory agent" },
    });
    known.push({ assetTag: monitorAsset.assetTag, label: monitorLabel(m), newlyLinked: true });
    linked++;
  }
  return { linked, known, unmatched };
}

/** Find the one existing computer this report belongs to — uuid first (survives re-imaging and
 *  renames), then serial. Only non-deleted computers. */
async function findMatchingComputer(p: InventoryInput) {
  const or: Prisma.AssetWhereInput[] = [];
  if (p.uuid) or.push({ computer: { uuid: p.uuid } });
  if (p.serialNumber) or.push({ serialNumber: p.serialNumber });
  if (or.length === 0) return null;
  return prisma.asset.findFirst({
    where: { assetType: "COMPUTER", deletedAt: null, OR: or },
    include: { computer: true },
  });
}

export type IngestResult =
  | {
      outcome: "updated";
      assetId: number;
      assetTag: string;
      /** How many connections were newly made or moved this run. */
      monitorsLinked: number;
      /** Every reported display that IS in inventory, with the asset it is. Echoed back so a steady
       *  state reads as "these monitors are tracked", not as silence. */
      monitorsKnown: MonitorKnown[];
      /** Displays the machine reported that aren't in inventory — echoed back so the agent can
       *  tell the operator exactly which display was parked for review. */
      monitorsUnmatched: ReportedMonitor[];
    }
  | { outcome: "discovered"; discoveredId: number; isNew: boolean };

/** The entry point the /api/inventory route calls with an already-parsed payload. */
export async function ingestInventory(payload: InventoryInput): Promise<IngestResult> {
  const match = await findMatchingComputer(payload);

  if (match) {
    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: match.id },
        data: {
          ...baseFields(payload, false),
          // Nested upsert covers the (shouldn't-happen) case of a COMPUTER with no detail row.
          computer: { upsert: { create: detailFields(payload, true), update: detailFields(payload, false) } },
        },
      });
      // Replace the hardware list only when the agent actually reported components, so a
      // partial run never wipes a machine's known parts.
      if (payload.components && payload.components.length > 0) {
        const computer = await tx.computer.findUniqueOrThrow({ where: { assetId: match.id }, select: { id: true } });
        await tx.computerComponent.deleteMany({ where: { computerId: computer.id } });
        await tx.computerComponent.createMany({ data: componentRows(payload.components, computer.id) });
      }
    });

    // Connect any reported monitors that are already in inventory (after the computer write).
    const {
      linked: monitorsLinked,
      known: monitorsKnown,
      unmatched: monitorsUnmatched,
    } = await linkReportedMonitors(match.id, payload.monitors);

    // Park the ones we couldn't match so they show up under Discovered for onboarding.
    if (monitorsUnmatched.length > 0) await recordDiscoveredMonitors(monitorsUnmatched, match.id);

    const monitorNote =
      monitorsLinked > 0 ? ` (linked ${monitorsLinked} monitor(s))` : monitorsUnmatched.length > 0 ? ` (${monitorsUnmatched.length} monitor(s) sent to Discovered)` : "";
    await auditLog({
      userId: null,
      action: "UPDATE",
      module: "assets",
      entityType: "Asset",
      entityId: match.id,
      description: `Updated from inventory agent${monitorNote}`,
    });
    return {
      outcome: "updated",
      assetId: match.id,
      assetTag: match.assetTag,
      monitorsLinked,
      monitorsKnown,
      monitorsUnmatched,
    };
  }

  // Unknown machine → record/refresh a discovered row. Matched among PENDING ones by the same
  // identifiers, so re-running the agent updates the same row instead of stacking duplicates.
  const discOr: Prisma.DiscoveredDeviceWhereInput[] = [];
  if (payload.uuid) discOr.push({ uuid: payload.uuid });
  if (payload.serialNumber) discOr.push({ serialNumber: payload.serialNumber });
  const existing = await prisma.discoveredDevice.findFirst({
    where: { status: "PENDING", deviceType: "COMPUTER", OR: discOr },
  });

  const identity = {
    deviceType: "COMPUTER" as const,
    uuid: payload.uuid || null,
    serialNumber: payload.serialNumber || null,
    hostname: payload.hostname || null,
    manufacturer: payload.manufacturer || null,
    model: payload.model || null,
    osName: payload.os?.name || null,
    payload: payload as unknown as Prisma.InputJsonValue,
  };

  if (existing) {
    await prisma.discoveredDevice.update({ where: { id: existing.id }, data: { ...identity, lastSeen: new Date() } });
    return { outcome: "discovered", discoveredId: existing.id, isNew: false };
  }
  const created = await prisma.discoveredDevice.create({ data: identity });
  return { outcome: "discovered", discoveredId: created.id, isNew: true };
}

/**
 * Park an external monitor the agent found that isn't in inventory yet, so an admin can onboard it
 * with a tag instead of typing all its details by hand. Re-running the agent must refresh the same
 * row rather than stack duplicates, and identity depends on whether the display publishes a serial:
 *
 * - **With a serial** — deduped by serial.
 * - **Without a serial** — deduped by (model + the machine it's plugged into), the only identity
 *   available. Accepted limit: two identical serial-less monitors on one machine collapse into a
 *   single entry.
 *
 * Only PENDING rows are considered. An already-ONBOARDED display never reaches here — it is
 * recognised upstream by `resolveMonitorAsset` and linked instead, which is what stops a serial-less
 * monitor being parked as new on every single run.
 *
 * `seenOnAssetId` is the computer it was plugged into — onboarding uses it to connect the new
 * monitor straight away, and it is half the identity of a serial-less display.
 */
async function recordDiscoveredMonitors(monitors: ReportedMonitor[], seenOnAssetId: number | null) {
  for (const m of monitors) {
    const identity: Prisma.DiscoveredDeviceWhereInput = m.serialNumber
      ? { serialNumber: m.serialNumber }
      : { serialNumber: null, model: m.model ?? null, seenOnAssetId };

    const existing = await prisma.discoveredDevice.findFirst({
      where: { status: "PENDING", deviceType: "MONITOR", ...identity },
    });
    const data = {
      deviceType: "MONITOR" as const,
      serialNumber: m.serialNumber || null,
      manufacturer: m.manufacturer || null,
      model: m.model || null,
      seenOnAssetId,
      payload: m as unknown as Prisma.InputJsonValue,
    };
    if (existing) {
      await prisma.discoveredDevice.update({ where: { id: existing.id }, data: { ...data, lastSeen: new Date() } });
    } else {
      await prisma.discoveredDevice.create({ data });
    }
  }
}

// --- Admin-facing: review + onboard/dismiss --------------------------------------------------

export async function listDiscoveredDevices() {
  return prisma.discoveredDevice.findMany({
    where: { status: "PENDING" },
    orderBy: [{ deviceType: "asc" }, { lastSeen: "desc" }],
  });
}

export async function countPendingDiscovered() {
  return prisma.discoveredDevice.count({ where: { status: "PENDING" } });
}

/**
 * Turn a discovered device into a real asset with the admin-supplied tag, then mark the row
 * onboarded. Everything else comes from what the agent already collected — a computer gets its
 * base fields, OS detail and hardware components; a monitor gets its make/model/size and is
 * connected to the machine it was found on.
 */
export async function onboardDiscoveredDevice(id: number, assetTag: string, actorUserId: number) {
  const disc = await prisma.discoveredDevice.findUniqueOrThrow({ where: { id } });
  if (disc.status !== "PENDING") {
    throw new AppError("INVALID_STATE", "This device has already been onboarded or dismissed", 409);
  }

  const tag = assetTag.trim();
  if (!tag) throw new AppError("VALIDATION", "Asset tag is required", 400);
  await assertAssetTagAvailable(tag);

  if (disc.deviceType === "MONITOR") return onboardDiscoveredMonitor(disc, tag, actorUserId);

  // Re-validate the stored payload rather than trusting the column blindly.
  const payload = inventorySchema.parse(disc.payload);

  const asset = await prisma.$transaction(async (tx) => {
    const created = await tx.asset.create({
      data: {
        assetTag: tag,
        assetType: "COMPUTER",
        ...baseFields(payload, true),
        computer: { create: detailFields(payload, true) },
      },
      include: { computer: true },
    });
    if (payload.components && payload.components.length > 0 && created.computer) {
      await tx.computerComponent.createMany({ data: componentRows(payload.components, created.computer.id) });
    }
    await tx.discoveredDevice.update({ where: { id }, data: { status: "ONBOARDED", onboardedAssetId: created.id } });
    return created;
  });

  // If any monitors this machine reported are already in inventory, connect them to the new
  // computer straight away (so you don't have to re-run the agent just to link them), and park the
  // rest for review — they were found on a machine that only now became a real asset.
  const { unmatched } = await linkReportedMonitors(asset.id, payload.monitors);
  if (unmatched.length > 0) await recordDiscoveredMonitors(unmatched, asset.id);

  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "assets",
    entityType: "Asset",
    entityId: asset.id,
    description: "Onboarded from discovered inventory",
  });
  return asset;
}

/** Create a Monitor asset from a discovered display, and connect it to the machine it was on. */
async function onboardDiscoveredMonitor(
  disc: { id: number; serialNumber: string | null; manufacturer: string | null; model: string | null; seenOnAssetId: number | null; payload: unknown },
  tag: string,
  actorUserId: number,
) {
  // Re-validate the stored payload rather than trusting the column blindly. If it's somehow not a
  // usable monitor report, fall back to the identity columns alone rather than failing the onboard.
  const parsed = inventoryMonitorSchema.safeParse(disc.payload);
  const details: MonitorDetailWrite = parsed.success ? monitorDetailWrite(parsed.data) : {};

  const asset = await prisma.$transaction(async (tx) => {
    const created = await tx.asset.create({
      data: {
        assetTag: tag,
        assetType: "MONITOR",
        serialNumber: disc.serialNumber,
        brand: disc.manufacturer,
        model: disc.model,
        monitor: { create: details },
      },
    });
    await tx.discoveredDevice.update({ where: { id: disc.id }, data: { status: "ONBOARDED", onboardedAssetId: created.id } });
    return created;
  });

  // Connect it to the computer it was plugged into, if that machine still exists. Best-effort:
  // a missing/deleted computer must not undo the monitor we just created.
  if (disc.seenOnAssetId) {
    const host = await prisma.asset.findFirst({
      where: { id: disc.seenOnAssetId, deletedAt: null, assetType: "COMPUTER" },
      select: { id: true },
    });
    if (host) {
      await prisma.assetConnection.create({
        data: { computerAssetId: host.id, connectedAssetId: asset.id, notes: "Auto-linked by inventory agent" },
      });
    }
  }

  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "assets",
    entityType: "Asset",
    entityId: asset.id,
    description: "Onboarded discovered monitor from inventory agent",
  });
  return asset;
}

export async function dismissDiscoveredDevice(id: number, actorUserId: number) {
  const disc = await prisma.discoveredDevice.findUniqueOrThrow({ where: { id } });
  if (disc.status !== "PENDING") {
    throw new AppError("INVALID_STATE", "This device has already been onboarded or dismissed", 409);
  }
  await prisma.discoveredDevice.update({ where: { id }, data: { status: "DISMISSED" } });
  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "assets",
    entityType: "DiscoveredDevice",
    entityId: id,
    description: "Dismissed discovered device",
  });
}
