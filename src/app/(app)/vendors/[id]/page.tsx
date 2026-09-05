import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  UserRound,
  PieChart,
  Boxes,
  CircleCheck,
  CalendarPlus,
  CalendarClock,
  ClipboardList,
  Eye,
} from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { prisma } from "@/lib/prisma";
import { descriptorFor } from "@/modules/assets/types/registry";
import type { AssetStatus } from "@/generated/prisma/client";
import { VendorDetailActions } from "./vendor-detail-actions";

const ASSET_STATUS: Record<AssetStatus, { label: string; dot: string; text: string }> = {
  AVAILABLE: { label: "Available", dot: "bg-slate-400", text: "text-slate-500" },
  ASSIGNED: { label: "In Use", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  UNDER_REPAIR: { label: "Under Repair", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  RETIRED: { label: "Retired", dot: "bg-neutral-400", text: "text-neutral-500" },
  LOST: { label: "Lost", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  const letters = words.length <= 1 ? (words[0] ?? "").slice(0, 2) : words.map((w) => w[0]).slice(0, 2).join("");
  return letters.toUpperCase() || "?";
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession("vendors.view");
  const { id } = await params;
  const vendorId = Number(id);

  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
  if (!vendor) notFound();

  const assets = await prisma.asset.findMany({
    where: { vendorId, deletedAt: null },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      assetTag: true,
      brand: true,
      model: true,
      hostname: true,
      assetType: true,
      serialNumber: true,
      purchaseDate: true,
      status: true,
      computer: { select: { subType: true } },
    },
  });

  const purchaseDates = assets.map((a) => a.purchaseDate).filter((d): d is Date => !!d);
  const firstPurchase = purchaseDates.length ? new Date(Math.min(...purchaseDates.map((d) => d.getTime()))) : null;
  const lastPurchase = purchaseDates.length ? new Date(Math.max(...purchaseDates.map((d) => d.getTime()))) : null;
  const inUse = assets.filter((a) => a.status === "ASSIGNED").length;

  const canEdit = hasPermission(session, "vendors.edit");
  const canDelete = hasPermission(session, "vendors.delete");

  const info: [string, React.ReactNode][] = [
    ["Name", vendor.name],
    ["Contact Person", vendor.contactPerson || "—"],
    ["Phone", vendor.phone || "—"],
    ["Email", vendor.email || "—"],
    ["Address", vendor.address || "—"],
    [
      "Status",
      <span key="s" className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="font-medium text-emerald-600 dark:text-emerald-400">Active</span>
      </span>,
    ],
  ];

  const stats = [
    { icon: Boxes, tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", value: String(assets.length), label: "Assets", sub: "Total assets from this vendor" },
    { icon: CircleCheck, tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", value: String(inUse), label: "In Use", sub: "Assets currently assigned" },
    { icon: CalendarPlus, tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", value: fmtDate(firstPurchase), label: "First Purchase", sub: "Earliest asset purchase" },
    { icon: CalendarClock, tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", value: fmtDate(lastPurchase), label: "Last Purchase", sub: "Most recent asset purchase" },
  ];

  const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/vendors" className="hover:text-neutral-700 dark:hover:text-neutral-300">Vendors</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/vendors/${vendor.id}`} className="hover:text-neutral-700 dark:hover:text-neutral-300">{vendor.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Details</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            {initialsOf(vendor.name)}
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold leading-tight">{vendor.name}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {vendor.contactPerson ? `Contact: ${vendor.contactPerson}` : "Vendor & supplier"}
            </p>
          </div>
        </div>
        <VendorDetailActions
          vendor={{
            id: vendor.id,
            name: vendor.name,
            contactPerson: vendor.contactPerson,
            phone: vendor.phone,
            email: vendor.email,
            address: vendor.address,
            createdAt: vendor.createdAt.toISOString(),
          }}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>

      {/* Info + Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Vendor Information */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold leading-tight">Vendor Information</h2>
              <p className="text-xs text-neutral-500">Basic details about the vendor</p>
            </div>
          </div>
          <dl className="space-y-3">
            {info.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[130px_1fr] gap-3 text-sm">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <PieChart className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold leading-tight">Summary</h2>
              <p className="text-xs text-neutral-500">Vendor statistics and quick info</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.tint}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">{s.value}</div>
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{s.label}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">{s.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assigned Assets */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3 p-6 pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold leading-tight">Assigned Assets</h2>
              <p className="text-xs text-neutral-500">Assets purchased from this vendor</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-y border-neutral-200 dark:border-neutral-800">
                <th className={th}>Asset Tag</th>
                <th className={th}>Asset Name</th>
                <th className={th}>Type</th>
                <th className={th}>Serial Number</th>
                <th className={th}>Purchase Date</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">
                    No assets recorded from this vendor yet.
                  </td>
                </tr>
              ) : (
                assets.map((a) => {
                  const st = ASSET_STATUS[a.status];
                  const name = [a.brand, a.model].filter(Boolean).join(" ") || a.hostname || "—";
                  const type = a.assetType === "COMPUTER" ? a.computer?.subType || "Computer" : descriptorFor(a.assetType).labelSingular;
                  return (
                    <tr key={a.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                      <td className={`${td} font-mono text-neutral-700 dark:text-neutral-300`}>{a.assetTag}</td>
                      <td className={`${td} font-medium text-neutral-800 dark:text-neutral-200`}>{name}</td>
                      <td className={td}>{type}</td>
                      <td className={`${td} font-mono`}>{a.serialNumber || "—"}</td>
                      <td className={td}>{fmtDate(a.purchaseDate)}</td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                          <span className={`font-medium ${st.text}`}>{st.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end">
                          <Link
                            href={`/assets/${a.id}`}
                            title="View asset"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
