"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Phone as PhoneIcon,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { vendorSchema, type VendorInput } from "@/modules/vendors/validators";

type Vendor = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

export function VendorFormDialog({ vendor, trigger }: { vendor?: Vendor; trigger: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!vendor;
  const defaultValues: VendorInput = {
    name: vendor?.name ?? "",
    contactPerson: vendor?.contactPerson ?? undefined,
    phone: vendor?.phone ?? undefined,
    email: vendor?.email ?? undefined,
    address: vendor?.address ?? undefined,
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues,
  });

  async function onSubmit(data: VendorInput) {
    const url = vendor ? `/api/vendors/${vendor.id}` : "/api/vendors";
    const method = vendor ? "PATCH" : "POST";
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
    toast.success(vendor ? "Vendor updated" : "Vendor created");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultValues);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg [&_[data-slot=input]]:h-10! [&_[data-slot=input]]:px-3!">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Vendor" : "New Vendor"}</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              {isEdit ? "Update this vendor's details." : "Add a new vendor to your organization."}
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Name <span className="text-rose-500">*</span>
            </label>
            <Input id="name" placeholder="Enter vendor name" autoFocus {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-rose-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="contactPerson" className="mb-1.5 block text-sm font-medium">Contact Person</label>
            <Input id="contactPerson" placeholder="Enter contact person name" {...register("contactPerson")} />
            {errors.contactPerson && <p className="mt-1 text-sm text-rose-600">{errors.contactPerson.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Phone</label>
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input id="phone" placeholder="Enter phone number" className="pl-9!" {...register("phone")} />
            </div>
            {errors.phone && <p className="mt-1 text-sm text-rose-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input id="email" type="email" placeholder="Enter email address" className="pl-9!" {...register("email")} />
            </div>
            {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="address" className="mb-1.5 block text-sm font-medium">Address</label>
            <Textarea id="address" rows={3} placeholder="Enter complete address" {...register("address")} />
            {errors.address && <p className="mt-1 text-sm text-rose-600">{errors.address.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const darkBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200";
const blueBtn =
  "inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700";

export function CreateVendorButton({ variant = "dark" }: { variant?: "dark" | "blue" }) {
  return (
    <VendorFormDialog
      trigger={
        <button className={variant === "dark" ? darkBtn : blueBtn}>
          <Plus className="h-4 w-4" /> New Vendor
        </button>
      }
    />
  );
}

/** A themed confirm dialog for deleting one vendor. */
function DeleteVendorDialog({ vendor, onConfirm }: { vendor: Vendor; onConfirm: () => void | Promise<void> }) {
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
            aria-label={`Delete ${vendor.name}`}
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
            <DialogTitle className="text-lg font-semibold">Delete vendor</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Are you sure you want to delete &quot;{vendor.name}&quot;? This cannot be undone.
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

export function VendorsTable({
  items,
  canCreate,
  canEdit,
  canDelete,
}: {
  items: Vendor[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = applied.trim().toLowerCase();
    if (!q) return items;
    return items.filter((v) =>
      [v.name, v.contactPerson, v.phone, v.email].filter(Boolean).some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [items, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [applied]);

  function runSearch() {
    setApplied(query);
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete vendor");
      return;
    }
    toast.success("Vendor deleted");
    router.refresh();
  }

  const th = "px-5 py-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300";
  const td = "px-5 py-3.5 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2 [&_[data-slot=input]]:h-11!">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search vendors..."
            className="pl-9!"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          className="inline-flex h-11 items-center rounded-lg border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Search
        </button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className={th}>Name</th>
                <th className={th}>Contact</th>
                <th className={th}>Phone</th>
                <th className={th}>Email</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                        <Building2 className="h-7 w-7" />
                      </span>
                      <h3 className="mt-4 text-base font-semibold text-neutral-800 dark:text-neutral-200">No vendors found</h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        {applied ? "No vendors match your search." : "Get started by adding your first vendor."}
                      </p>
                      {canCreate && !applied && (
                        <div className="mt-5">
                          <CreateVendorButton variant="blue" />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30"
                  >
                    <td className={td}>
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="font-medium text-neutral-800 hover:text-blue-600 hover:underline dark:text-neutral-200 dark:hover:text-blue-400"
                      >
                        {vendor.name}
                      </Link>
                    </td>
                    <td className={td}>{vendor.contactPerson || <span className="text-neutral-400">—</span>}</td>
                    <td className={td}>{vendor.phone || <span className="text-neutral-400">—</span>}</td>
                    <td className={td}>{vendor.email || <span className="text-neutral-400">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <VendorFormDialog
                            vendor={vendor}
                            trigger={
                              <button
                                title="Edit"
                                aria-label={`Edit ${vendor.name}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            }
                          />
                        )}
                        {canDelete && <DeleteVendorDialog vendor={vendor} onConfirm={() => handleDelete(vendor.id)} />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
        <span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
