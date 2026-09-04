"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  type LucideIcon,
  Laptop,
  Monitor,
  Printer,
  Smartphone,
  CreditCard,
  Network,
  Mouse,
  Box,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type AssetRow = {
  id: number;
  assetTag: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  hostname: string | null;
  ipAddress: string | null;
  status: string;
  assetType: string;
  department: { name: string } | null;
  currentAssignedUser: { name: string } | null;
  computer?: { osName: string | null; subType: string | null } | null;
  monitor?: { sizeInches: string | null; resolution: string | null } | null;
  printer?: { printerType: string | null } | null;
  phone?: { imei: string | null; phoneNumber: string | null } | null;
  simCard?: { mobileNumber: string | null; planName: string | null } | null;
  networkDevice?: { deviceType: string | null } | null;
  peripheral?: { peripheralType: string | null; interface: string | null } | null;
};

const TYPE_ICON: Record<string, LucideIcon> = {
  COMPUTER: Laptop,
  MONITOR: Monitor,
  PRINTER: Printer,
  PHONE: Smartphone,
  SIM_CARD: CreditCard,
  NETWORK_DEVICE: Network,
  PERIPHERAL: Mouse,
  OTHER: Box,
};

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  AVAILABLE: { label: "Available", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
  ASSIGNED: { label: "Assigned", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  UNDER_REPAIR: { label: "Under Repair", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  RETIRED: { label: "Retired", dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-400" },
  LOST: { label: "Lost", dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
};

// Sub-type pill colours (Desktop / Laptop / Server, and equivalents on other types).
const SUBTYPE_STYLES: Record<string, string> = {
  desktop: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  laptop: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  server: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
};
function subTypePill(value: string) {
  const cls = SUBTYPE_STYLES[value.toLowerCase()] ?? "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{value}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, dot: "bg-slate-400", text: "text-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// Middle-column renderers, keyed by the type registry's `listColumns`.
const CELL: Record<string, { header: string; cell: (row: AssetRow) => React.ReactNode; center?: boolean }> = {
  type: { header: "Type", cell: (r) => r.assetType },
  hostname: { header: "Hostname", cell: (r) => r.hostname || "—" },
  ipAddress: { header: "IP Address", cell: (r) => r.ipAddress || "—" },
  serialNumber: { header: "Serial Number", cell: (r) => r.serialNumber || "—" },
  brandModel: { header: "Brand / Model", cell: (r) => [r.brand, r.model].filter(Boolean).join(" / ") || "—" },
  department: { header: "Department", cell: (r) => r.department?.name ?? "—" },
  assignedTo: { header: "Assigned To", cell: (r) => r.currentAssignedUser?.name ?? "—" },
  subType: { header: "Type", cell: (r) => (r.computer?.subType ? subTypePill(r.computer.subType) : "—") },
  osName: { header: "Operating System", cell: (r) => r.computer?.osName || "—" },
  sizeInches: { header: "Size", cell: (r) => (r.monitor?.sizeInches ? `${r.monitor.sizeInches}"` : "—") },
  resolution: { header: "Resolution", cell: (r) => r.monitor?.resolution || "—" },
  printerType: { header: "Type", cell: (r) => r.printer?.printerType || "—" },
  imei: { header: "IMEI", cell: (r) => r.phone?.imei || "—" },
  phoneNumber: { header: "Phone Number", cell: (r) => r.phone?.phoneNumber || "—" },
  mobileNumber: { header: "Mobile Number", cell: (r) => r.simCard?.mobileNumber || "—" },
  planName: { header: "Plan", cell: (r) => r.simCard?.planName || "—" },
  deviceType: { header: "Device Type", cell: (r) => r.networkDevice?.deviceType || "—" },
  peripheralType: { header: "Type", cell: (r) => r.peripheral?.peripheralType || "—" },
  interface: { header: "Interface", cell: (r) => r.peripheral?.interface || "—" },
};

export function AssetsTable({
  items,
  total,
  page,
  pageSize,
  canEdit,
  canDelete,
  showDeleted,
  extraColumns,
}: {
  items: AssetRow[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canDelete: boolean;
  showDeleted: boolean;
  extraColumns: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }
  function setPageSize(size: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", String(size));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) return toast.error(json.error?.message ?? "Failed to delete asset");
    toast.success("Asset deleted");
    router.refresh();
  }
  async function handleRestore(id: number) {
    const res = await fetch(`/api/assets/${id}/restore`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.success) return toast.error(json.error?.message ?? "Failed to restore asset");
    toast.success("Asset restored");
    router.refresh();
  }

  const middle = extraColumns.map((k) => ({ key: k, ...CELL[k] })).filter((c) => c.header);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const allSelected = items.length > 0 && items.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((r) => r.id)));
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className={th}>Asset Tag</th>
              {middle.map((c) => (
                <th key={c.key} className={th}>{c.header}</th>
              ))}
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={middle.length + 4} className="px-4 py-12 text-center text-sm text-neutral-500">
                  No results found.
                </td>
              </tr>
            )}
            {items.map((row) => {
              const Icon = TYPE_ICON[row.assetType] ?? Box;
              return (
                <tr key={row.id} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50 dark:border-neutral-800/70 dark:hover:bg-neutral-800/40">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-neutral-300" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} aria-label={`Select ${row.assetTag}`} />
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        <Icon className="h-4 w-4" />
                      </span>
                      {showDeleted ? (
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.assetTag}</span>
                      ) : (
                        <Link href={`/assets/${row.id}`} className="font-medium text-neutral-900 hover:text-blue-600 dark:text-neutral-100 dark:hover:text-blue-400">
                          {row.assetTag}
                        </Link>
                      )}
                    </div>
                  </td>
                  {middle.map((c) => (
                    <td key={c.key} className={td}>{c.cell(row)}</td>
                  ))}
                  <td className={td}><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {showDeleted ? (
                        canDelete && (
                          <button onClick={() => handleRestore(row.id)} title="Restore" className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600 dark:hover:bg-neutral-800">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )
                      ) : (
                        <>
                          {canEdit && (
                            <Link href={`/assets/${row.id}/edit`} title="Edit" className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-blue-600 dark:hover:bg-neutral-800">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          {canDelete && (
                            <ConfirmDialog
                              trigger={
                                <button title="Delete" className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              }
                              title="Delete asset"
                              description={`Are you sure you want to delete "${row.assetTag}"? You can restore it later from Show Deleted.`}
                              confirmLabel="Delete"
                              destructive
                              onConfirm={() => handleDelete(row.id)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: count + numbered pagination + rows per page */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
        <span className="text-neutral-500">
          {total === 0 ? "0 results" : `Showing ${from}-${to} of ${total} results`}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-neutral-600 disabled:opacity-40 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            {pageNumbers(page, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="px-1.5 text-neutral-400">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => goToPage(n)}
                  className={`min-w-8 rounded-md border px-2.5 py-1.5 ${n === page ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"}`}
                >
                  {n}
                </button>
              ),
            )}
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-neutral-600 disabled:opacity-40 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <label className="flex items-center gap-2 text-neutral-500">
            Rows per page
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              {[20, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

/** Compact page list like 1 … 4 5 6 … 20. */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
