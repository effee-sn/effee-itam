import Link from "next/link";
import { ChevronRight, Network, Boxes, Monitor, Laptop, CircleAlert } from "lucide-react";
import { requirePageSession } from "@/modules/rbac/permissions";
import { listDiscoveredDevices } from "@/modules/inventory/service";
import { prisma } from "@/lib/prisma";
import { DiscoveredTable, DiscoveredNotice } from "./discovered-table";

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

  const total = rows.length;
  const monitors = rows.filter((r) => r.deviceType === "MONITOR").length;
  const computers = rows.filter((r) => r.deviceType === "COMPUTER").length;
  const missingSerial = rows.filter((r) => !r.serialNumber).length;

  const stats = [
    { label: "Discovered Devices", value: total, icon: Boxes, tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
    { label: "Monitors", value: monitors, icon: Monitor, tint: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
    { label: "Computers", value: computers, icon: Laptop, tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
    { label: "Missing Serial", value: missingSerial, icon: CircleAlert, tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Discovered Devices</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Network className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Discovered Devices</h1>
            <p className="mt-1 text-sm text-neutral-500">Devices found by the inventory agent but not yet added to your inventory.</p>
          </div>
        </div>
        <DiscoveredNotice />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold leading-none tabular-nums">{s.value}</div>
                <div className="mt-1 text-xs text-neutral-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <DiscoveredTable rows={rows} />
    </div>
  );
}
