"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/shared/OptionSelect";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { departmentSchema, type DepartmentInput } from "@/modules/departments/validators";

type Department = {
  id: number;
  name: string;
  createdAt: string;
};

function DepartmentFormDialog({
  department,
  trigger,
}: {
  department?: Department;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: department?.name ?? "" },
  });
  const isEdit = !!department;

  async function onSubmit(data: DepartmentInput) {
    const url = department ? `/api/departments/${department.id}` : "/api/departments";
    const method = department ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(department ? "Department updated" : "Department created");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({ name: department?.name ?? "" });
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              {isEdit ? "Update this department's details." : "Create a new department in your organization."}
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <Input id="name" placeholder="Enter department name" autoFocus className="h-10! px-3!" {...register("name")} />
            {errors.name ? (
              <p className="mt-1 text-sm text-rose-600">{errors.name.message}</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">E.g. IT, Finance, HR, Production, etc.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateDepartmentButton() {
  return (
    <DepartmentFormDialog
      trigger={
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700">
          <Plus className="h-4 w-4" /> New Department
        </button>
      }
    />
  );
}

/** A themed confirm dialog for deleting one department. */
function DeleteDepartmentDialog({ department, onConfirm }: { department: Department; onConfirm: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            title="Delete"
            aria-label={`Delete ${department.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">Delete department</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Are you sure you want to delete &quot;{department.name}&quot;? This cannot be undone.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SortField = "name" | "createdAt";
const PAGE_SIZES = [15, 30, 50];

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

export function DepartmentsTable({
  items,
  canEdit,
  canDelete,
}: {
  items: Department[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = items.filter((d) => {
      if (pick !== "all" && String(d.id) !== pick) return false;
      return !q || d.name.toLowerCase().includes(q);
    });
    out = [...out].sort((a, b) => {
      const cmp =
        sortField === "name"
          ? a.name.localeCompare(b.name)
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDesc ? -cmp : cmp;
    });
    return out;
  }, [items, search, pick, sortField, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pick, pageSize]);

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

  function sortBy(field: SortField) {
    if (sortField === field) setSortDesc((d) => !d);
    else {
      setSortField(field);
      setSortDesc(false);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete department");
      return;
    }
    toast.success("Department deleted");
    router.refresh();
  }

  async function deleteSelected() {
    const ids = [...selected];
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/departments/${id}`, { method: "DELETE" })
          .then((r) => r.json())
          .then((j) => j.success)
          .catch(() => false),
      ),
    );
    const ok = results.filter(Boolean).length;
    setSelected(new Set());
    if (ok > 0) toast.success(`Deleted ${ok} department${ok === 1 ? "" : "s"}`);
    if (ok < ids.length) toast.error(`Could not delete ${ids.length - ok} — they may still have people or assets.`);
    router.refresh();
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400" />;
    return sortDesc ? <ArrowDown className="h-3.5 w-3.5 text-blue-600" /> : <ArrowUp className="h-3.5 w-3.5 text-blue-600" />;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800 [&_[data-slot=input]]:h-11! [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:px-3!">
        <div className="relative w-full max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments..."
            className="bg-neutral-50 pl-9! dark:bg-neutral-800/50"
          />
        </div>
        <div className="w-52 sm:ml-auto">
          <OptionSelect
            value={pick}
            onValueChange={setPick}
            options={[
              { value: "all", label: "All Departments" },
              ...items.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
            placeholder="All Departments"
          />
        </div>
      </div>

      {/* Bulk bar */}
      {canDelete && selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <span className="font-medium text-blue-800 dark:text-blue-200">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2.5 py-1 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" /> Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-neutral-200 text-sm text-neutral-500 dark:border-neutral-800">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
                  aria-label="Select all on page"
                />
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => sortBy("name")} className="inline-flex items-center gap-1.5 font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                  Name <SortIcon field="name" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => sortBy("createdAt")} className="inline-flex items-center gap-1.5 font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                  Created <SortIcon field="createdAt" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-600 dark:text-neutral-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-neutral-500">
                  {items.length === 0 ? "No departments yet." : "No departments match your search."}
                </td>
              </tr>
            )}
            {pageRows.map((row) => {
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
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{row.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <DepartmentFormDialog
                          department={row}
                          trigger={
                            <button
                              title="Edit"
                              aria-label={`Edit ${row.name}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          }
                        />
                      )}
                      {canDelete && <DeleteDepartmentDialog department={row} onConfirm={() => handleDelete(row.id)} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
          <span>
            Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length} departments
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {pageNumbers(currentPage, totalPages).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} className="px-1.5 text-neutral-400">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                      n === currentPage
                        ? "bg-blue-600 text-white"
                        : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <div className="w-20 [&_[data-slot=select-trigger]]:h-9!">
                <OptionSelect
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                  options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                  placeholder="15"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
