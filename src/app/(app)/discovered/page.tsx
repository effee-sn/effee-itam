import { PageHeader } from "@/components/shared/PageHeader";
import { requirePageSession } from "@/modules/rbac/permissions";
import { listDiscoveredDevices } from "@/modules/inventory/service";
import { prisma } from "@/lib/prisma";
import { DiscoveredTable } from "./discovered-table";

/**
 * Devices the inventory agent reported that don't match any existing asset — machines it found,
 * and external monitors plugged into them. They wait here until an admin onboards them (creating
 * the asset with a real tag) or dismisses them. Gated on assets.create, so only full-access roles
 * see it.
 */
export default async function DiscoveredPage() {
  await requirePageSession("assets.create");
  const items = await listDiscoveredDevices();

  // Resolve the "seen on" computer tags in one query so each monitor row can say where it was found.
  const hostIds = [...new Set(items.map((d) => d.seenOnAssetId).filter((id): id is number => id !== null))];
  const hosts = hostIds.length
    ? await prisma.asset.findMany({ where: { id: { in: hostIds } }, select: { id: true, assetTag: true } })
    : [];
  const hostTagById = new Map(hosts.map((h) => [h.id, h.assetTag]));

  const rows = items.map((d) => {
    const payload = d.payload as { components?: unknown[]; sizeInches?: number } | null;
    return {
      id: d.id,
      deviceType: d.deviceType as "COMPUTER" | "MONITOR",
      hostname: d.hostname,
      manufacturer: d.manufacturer,
      model: d.model,
      serialNumber: d.serialNumber,
      osName: d.osName,
      sizeInches: typeof payload?.sizeInches === "number" ? payload.sizeInches : null,
      seenOn: d.seenOnAssetId ? (hostTagById.get(d.seenOnAssetId) ?? null) : null,
      lastSeen: d.lastSeen.toISOString(),
      componentCount: Array.isArray(payload?.components) ? payload.components.length : 0,
    };
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Discovered Devices" />
      <p className="-mt-3 text-sm text-neutral-500">
        Hardware the inventory agent found that isn&apos;t in inventory yet. Onboard one to create it with your
        own asset tag — everything else is filled in from what the agent collected, and a monitor is connected
        to the computer it was found on automatically.
      </p>
      <DiscoveredTable rows={rows} />
    </div>
  );
}
