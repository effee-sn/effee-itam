"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, RotateCcw, ClipboardList, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/shared/OptionSelect";

type Report = { title: string; headers: string[]; rows: (string | number)[][]; ids: number[] };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Available", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  ASSIGNED: { label: "Assigned", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  UNDER_REPAIR: { label: "Under Repair", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  RETIRED: { label: "Retired", cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" },
  LOST: { label: "Lost", cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
};
const STATUS_DOT: Record<string, string> = {
  AVAILABLE: "bg-blue-500",
  ASSIGNED: "bg-emerald-500",
  UNDER_REPAIR: "bg-amber-500",
  RETIRED: "bg-neutral-400",
  LOST: "bg-rose-500",
};

const PAGE_SIZE = 15;

function pageNumbers(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(totalPages - 1, current + 1);
  if (from > 2) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

function distinctValues(rows: (string | number)[][], idx: number): string[] {
  if (idx < 0) return [];
  const set = new Set<string>();
  for (const r of rows) {
    const v = String(r[idx] ?? "").trim();
    if (v) set.add(v);
  }
  return [...set].sort();
}

function StatusCell({ value }: { value: string }) {
  const style = STATUS_STYLE[value];
  if (!style) return <span>{value || "—"}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[value]}`} />
      {style.label}
    </span>
  );
}

export function ReportView({ report, subtitle }: { report: Report; subtitle: string }) {
  const { headers, rows, ids } = report;
  const typeIdx = headers.indexOf("Type");
  const deptIdx = headers.indexOf("Department");
  const statusIdx = headers.indexOf("Status");

  const typeOptions = useMemo(() => distinctValues(rows, typeIdx), [rows, typeIdx]);
  const deptOptions = useMemo(() => distinctValues(rows, deptIdx), [rows, deptIdx]);
  const statusOptions = useMemo(() => distinctValues(rows, statusIdx), [rows, statusIdx]);

  const [type, setType] = useState("all");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);

  // Keep row+id together while filtering.
  const indexed = useMemo(() => rows.map((row, i) => ({ row, id: ids[i] })), [rows, ids]);

  const filtered = useMemo(() => {
    const q = applied.trim().toLowerCase();
    return indexed.filter(({ row }) => {
      if (type !== "all" && String(row[typeIdx] ?? "") !== type) return false;
      if (dept !== "all" && String(row[deptIdx] ?? "") !== dept) return false;
      if (status !== "all" && String(row[statusIdx] ?? "") !== status) return false;
      if (!q) return true;
      return row.some((cell) => String(cell ?? "").toLowerCase().includes(q));
    });
  }, [indexed, type, dept, status, applied, typeIdx, deptIdx, statusIdx]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [type, dept, status, applied]);

  function reset() {
    setType("all");
    setDept("all");
    setStatus("all");
    setQuery("");
    setApplied("");
  }

  const th = "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="space-y-5">
      {/* Filter card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 [&_[data-slot=input]]:h-11! [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:px-3!">
        <div className="flex flex-wrap items-end gap-4">
          {typeIdx >= 0 && (
            <div className="w-44">
              <label className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Asset Type</label>
              <OptionSelect value={type} onValueChange={setType} options={[{ value: "all", label: "All Types" }, ...typeOptions.map((v) => ({ value: v, label: v }))]} placeholder="All Types" />
            </div>
          )}
          {deptIdx >= 0 && (
            <div className="w-52">
              <label className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Department</label>
              <OptionSelect value={dept} onValueChange={setDept} options={[{ value: "all", label: "All Departments" }, ...deptOptions.map((v) => ({ value: v, label: v }))]} placeholder="All Departments" />
            </div>
          )}
          {statusIdx >= 0 && (
            <div className="w-44">
              <label className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-300">Status</label>
              <OptionSelect value={status} onValueChange={setStatus} options={[{ value: "all", label: "All Status" }, ...statusOptions.map((v) => ({ value: v, label: STATUS_STYLE[v]?.label ?? v }))]} placeholder="All Status" />
            </div>
          )}
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setApplied(query)}
              placeholder="Search by asset tag, brand, model, serial..."
              className="pl-9!"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setApplied(query)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            <Search className="h-4 w-4" /> Search
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Report table card */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start gap-3 p-5 pb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">
              Assets <span className="text-neutral-400">({filtered.length})</span>
            </h2>
            <p className="text-xs text-neutral-500">{subtitle}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-y border-neutral-200 dark:border-neutral-800">
                <th className={`${th} w-12`}>#</th>
                {headers.map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={headers.length + 2} className="px-4 py-14 text-center text-sm text-neutral-500">No matching records.</td></tr>
              ) : (
                pageRows.map(({ row, id }, i) => (
                  <tr key={`${id}-${i}`} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                    <td className={`${td} tabular-nums text-neutral-400`}>{start + i + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`${td} ${ci === 0 ? "font-medium text-neutral-800 dark:text-neutral-200" : ""}`}>
                        {ci === statusIdx ? (
                          <StatusCell value={String(cell)} />
                        ) : String(cell ?? "").trim() ? (
                          String(cell)
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <Link href={`/assets/${id}`} title="View asset" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:border-neutral-700 dark:hover:bg-blue-500/10">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
            <span>Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} assets</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {pageNumbers(currentPage, totalPages).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} className="px-1.5 text-neutral-400">…</span>
                ) : (
                  <button key={n} type="button" onClick={() => setPage(n)} className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${n === currentPage ? "bg-blue-600 text-white" : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"}`}>
                    {n}
                  </button>
                ),
              )}
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
