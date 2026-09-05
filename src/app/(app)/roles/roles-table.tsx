"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Pencil, MoreVertical, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type RoleRow = {
  id: number;
  name: string;
  description: string | null;
  moduleScopes: Record<string, string>;
  isSystem: boolean;
  _count: { users: number; rolePermissions: number };
};

const SCOPE_STYLE: Record<string, { label: string; cls: string }> = {
  ALL: { label: "All", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  DEPARTMENT: { label: "Own dept.", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  SELF: { label: "Assigned to me", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

const PAGE_SIZE = 10;

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

function DeleteRoleDialog({ role, open, onOpenChange, onDeleted }: { role: RoleRow; open: boolean; onOpenChange: (v: boolean) => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete role");
      return;
    }
    toast.success("Role deleted");
    onOpenChange(false);
    onDeleted();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">Delete role</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Are you sure you want to delete &quot;{role.name}&quot;? This cannot be undone.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60">
            <Trash2 className="h-4 w-4" /> {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowMenu({ role, canDelete, onDeleted }: { role: RoleRow; canDelete: boolean; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-700 dark:hover:bg-neutral-800"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {role.isSystem || !canDelete ? (
            <div className="px-3 py-2 text-xs text-neutral-400">
              {role.isSystem ? "System role — cannot be deleted." : "No actions available."}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirm(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" /> Delete role
            </button>
          )}
        </div>
      )}
      <DeleteRoleDialog role={role} open={confirm} onOpenChange={setConfirm} onDeleted={onDeleted} />
    </div>
  );
}

export function RolesTable({ roles, canEdit, canDelete }: { roles: RoleRow[]; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = applied.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => [r.name, r.description].filter(Boolean).some((f) => String(f).toLowerCase().includes(q)));
  }, [roles, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [applied]);

  const th = "px-5 py-3.5 text-sm font-semibold text-neutral-600 dark:text-neutral-300";
  const td = "px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex items-center gap-2 [&_[data-slot=input]]:h-11!">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setApplied(query)}
            placeholder="Search roles..."
            className="pl-9!"
          />
        </div>
        <button type="button" onClick={() => setApplied(query)} className="inline-flex h-11 items-center rounded-lg border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
          Search
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className={th}>Name</th>
                <th className={th}>Type</th>
                <th className={th}>Description</th>
                <th className={th}>Assets Scope</th>
                <th className={th}>Permissions</th>
                <th className={th}>Users</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-neutral-500">No roles match your search.</td></tr>
              ) : (
                pageRows.map((role) => {
                  const scope = SCOPE_STYLE[role.moduleScopes.assets];
                  return (
                    <tr key={role.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                      <td className={`${td} font-semibold text-neutral-800 dark:text-neutral-200`}>{role.name}</td>
                      <td className={td}>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${role.isSystem ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" : "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"}`}>
                          {role.isSystem ? "System" : "Custom"}
                        </span>
                      </td>
                      <td className={`${td} max-w-md`}>{role.description ?? "—"}</td>
                      <td className={td}>
                        {scope ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${scope.cls}`}>{scope.label}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className={`${td} tabular-nums`}>{role._count.rolePermissions}</td>
                      <td className={`${td} font-medium tabular-nums text-blue-600 dark:text-blue-400`}>{role._count.users}</td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <Link href={`/roles/${role.id}/edit`} title="Edit" aria-label={`Edit ${role.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-blue-500 transition-colors hover:bg-blue-50 dark:border-neutral-700 dark:hover:bg-blue-500/10">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          <RowMenu role={role} canDelete={canDelete} onDeleted={() => router.refresh()} />
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

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
          <span>Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} roles</span>
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
  );
}
