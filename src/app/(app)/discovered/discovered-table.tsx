"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Monitor,
  Laptop,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Info,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { OptionSelect } from "@/components/shared/OptionSelect";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type DiscoveredRow = {
  id: number;
  deviceType: "COMPUTER" | "MONITOR";
  hostname: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  osName: string | null;
  sizeInches: number | null;
  seenOn: string | null;
  lastSeen: string;
  componentCount: number;
};

const NOTICE_KEY = "discovered-notice-dismissed";
const PAGE_SIZES = [20, 50, 100];

/** What this row will become, in the words shown to the user. */
function describe(row: DiscoveredRow) {
  if (row.deviceType === "MONITOR") {
    const size = row.sizeInches ? `${row.sizeInches}" ` : "";
    return {
      typeLabel: "Monitor",
      name: `${size}${[row.manufacturer, row.model].filter(Boolean).join(" ") || "Monitor"}`,
      detail: row.osName ?? "",
    };
  }
  return {
    typeLabel: "Computer",
    name: row.hostname ?? row.serialNumber ?? "Computer",
    detail: row.osName ?? "",
  };
}

/** The blue "detected from your network" banner beside the page title; dismissable per browser. */
export function DiscoveredNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(NOTICE_KEY) !== "true");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="flex max-w-xl items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      <p className="flex-1">These devices are detected from your network. Review the details and add them to your inventory.</p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(NOTICE_KEY, "true");
          } catch {
            /* ignore */
          }
          setShow(false);
        }}
        className="shrink-0 rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-500/20"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function TypePill({ deviceType }: { deviceType: "COMPUTER" | "MONITOR" }) {
  if (deviceType === "MONITOR") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <Monitor className="h-4 w-4 text-blue-500" />
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Monitor</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Laptop className="h-4 w-4 text-emerald-500" />
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Computer</span>
    </span>
  );
}

function OnboardDialog({ row }: { row: DiscoveredRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const info = describe(row);
  const isMonitor = row.deviceType === "MONITOR";

  async function submit() {
    setSaving(true);
    const res = await fetch(`/api/discovered/${row.id}/onboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetTag: tag }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Could not onboard this device");
      return;
    }
    toast.success(isMonitor ? "Monitor added and connected" : "Added to inventory");
    setOpen(false);
    router.push(`/assets/${json.data.asset.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTag("");
      }}
    >
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            <Plus className="h-3.5 w-3.5" /> Add to Inventory
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {info.name} to inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            {isMonitor ? (
              <>
                Creates a monitor with the make, model{row.serialNumber ? ", size and serial" : " and size"} the
                agent collected
                {row.seenOn ? (
                  <>
                    , and connects it to <span className="font-medium">{row.seenOn}</span>
                  </>
                ) : null}
                . Just give it your asset tag.
              </>
            ) : (
              <>
                Creates a computer from what the agent collected — OS, network and {row.componentCount} hardware
                component{row.componentCount === 1 ? "" : "s"}. Just give it your asset tag.
              </>
            )}
          </p>
          {row.serialNumber ? (
            <p className="text-xs text-neutral-500">
              Serial: <span className="font-mono">{row.serialNumber}</span>
            </p>
          ) : isMonitor ? (
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              This display reports no serial number, so it was identified by model and the machine
              it&apos;s plugged into. Check it isn&apos;t already in inventory before adding it — then
              type the serial from its sticker on the asset afterwards.
            </p>
          ) : null}
          <Field>
            <FieldLabel htmlFor={`tag-${row.id}`}>Asset Tag</FieldLabel>
            <Input
              id={`tag-${row.id}`}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={isMonitor ? "e.g. EII/MNT/26/002" : "e.g. EII/LAP/26/002"}
              autoFocus
            />
          </Field>
        </div>
        <DialogFooter>
          <button
            onClick={submit}
            disabled={saving || tag.trim().length === 0}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Adding..." : isMonitor ? "Create monitor" : "Create computer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DiscoveredTable({ rows }: { rows: DiscoveredRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [mfrFilter, setMfrFilter] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const manufacturers = useMemo(
    () => [...new Set(rows.map((r) => r.manufacturer).filter((m): m is string => !!m))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((row) => {
      if (typeFilter !== "all" && row.deviceType !== typeFilter) return false;
      if (mfrFilter !== "all" && row.manufacturer !== mfrFilter) return false;
      if (!q) return true;
      const info = describe(row);
      return [info.name, row.serialNumber, row.model, row.hostname, row.seenOn]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    out = [...out].sort((a, b) => {
      const cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
      return sortDesc ? -cmp : cmp;
    });
    return out;
  }, [rows, search, typeFilter, mfrFilter, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  // Reset to first page whenever the filters change the result set out from under us.
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, mfrFilter, pageSize]);

  const pageIds = pageRows.map((r) => r.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function dismiss(id: number) {
    const res = await fetch(`/api/discovered/${id}/dismiss`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Could not dismiss");
      return;
    }
    toast.success("Dismissed");
    router.refresh();
  }

  async function dismissSelected() {
    const ids = [...selected];
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/discovered/${id}/dismiss`, { method: "POST" })
          .then((r) => r.json())
          .then((j) => j.success)
          .catch(() => false),
      ),
    );
    const ok = results.filter(Boolean).length;
    setSelected(new Set());
    if (ok > 0) toast.success(`Dismissed ${ok} device${ok === 1 ? "" : "s"}`);
    if (ok < ids.length) toast.error(`Could not dismiss ${ids.length - ok} device(s)`);
    router.refresh();
  }

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  const cellMuted = "px-4 py-3 text-sm text-neutral-500";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 [&_[data-slot=input]]:h-10! [&_[data-slot=input]]:px-3! [&_[data-slot=select-trigger]]:h-10! [&_[data-slot=select-trigger]]:px-3!">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by device name, serial, model, tag..."
            className="pl-9!"
          />
        </div>
        <div className="w-40">
          <OptionSelect
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: "all", label: "All Types" },
              { value: "MONITOR", label: "Monitors" },
              { value: "COMPUTER", label: "Computers" },
            ]}
            placeholder="All Types"
          />
        </div>
        <div className="w-48">
          <OptionSelect
            value={mfrFilter}
            onValueChange={setMfrFilter}
            options={[
              { value: "all", label: "All Manufacturers" },
              ...manufacturers.map((m) => ({ value: m, label: m })),
            ]}
            placeholder="All Manufacturers"
          />
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <span className="font-medium text-blue-800 dark:text-blue-200">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2.5 py-1 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              Clear
            </button>
            <ConfirmDialog
              trigger={
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" /> Dismiss selected
                </button>
              }
              title="Dismiss selected devices"
              description={`Ignore ${selected.size} selected device(s)? They won't be onboarded. If the agent reports them again, they will reappear here.`}
              confirmLabel="Dismiss"
              destructive
              onConfirm={dismissSelected}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {rows.length === 0
            ? "Nothing waiting. When the inventory agent reports a computer or a monitor that isn't in inventory yet, it shows up here for you to onboard."
            : "No devices match your filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Found On</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSortDesc((d) => !d)}
                    className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    Last Seen
                    {sortDesc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const info = describe(row);
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800/60 ${
                      isSelected ? "bg-blue-50/50 dark:bg-blue-500/5" : "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
                        aria-label={`Select ${info.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <TypePill deviceType={row.deviceType} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">{info.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.serialNumber ? (
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">{row.serialNumber}</span>
                      ) : (
                        <span className="text-neutral-400">Not reported</span>
                      )}
                    </td>
                    <td className={cellMuted}>
                      {row.deviceType === "MONITOR"
                        ? row.sizeInches
                          ? `${row.sizeInches}"`
                          : "—"
                        : `${row.osName ?? "—"}${row.componentCount ? ` · ${row.componentCount} parts` : ""}`}
                    </td>
                    <td className={cellMuted}>{row.seenOn ?? "—"}</td>
                    <td className={cellMuted}>{new Date(row.lastSeen).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <OnboardDialog row={row} />
                        <ConfirmDialog
                          trigger={
                            <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:hover:bg-rose-500/10">
                              <Trash2 className="h-3.5 w-3.5" /> Dismiss
                            </button>
                          }
                          title="Dismiss device"
                          description={`Ignore "${info.name}"? It won't be onboarded. If the agent reports it again, it will reappear here.`}
                          confirmLabel="Dismiss"
                          destructive
                          onConfirm={() => dismiss(row.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
          <span>
            Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length} devices
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-sm font-semibold text-white">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <div className="w-20 [&_[data-slot=select-trigger]]:h-8!">
                <OptionSelect
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                  options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                  placeholder="20"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
