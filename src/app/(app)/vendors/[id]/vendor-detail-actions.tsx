"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VendorFormDialog } from "../vendors-table";

type Vendor = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
};

export function VendorDetailActions({
  vendor,
  canEdit,
  canDelete,
}: {
  vendor: Vendor;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    const res = await fetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete vendor");
      return;
    }
    toast.success("Vendor deleted");
    setOpen(false);
    router.push("/vendors");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <VendorFormDialog
          vendor={vendor}
          trigger={
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          }
        />
      )}
      {canDelete && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:hover:bg-rose-500/10">
                <Trash2 className="h-4 w-4" /> Delete
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
                onClick={confirmDelete}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
