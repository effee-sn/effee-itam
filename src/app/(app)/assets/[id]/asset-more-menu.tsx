"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/** The "…" overflow menu in the asset header. Currently just Delete, gated on permission. */
export function AssetMoreMenu({ assetId, assetTag }: { assetId: number; assetTag: string }) {
  const router = useRouter();

  async function del() {
    if (!confirm(`Delete "${assetTag}"? You can restore it later from Show Deleted.`)) return;
    const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      toast.error(json?.error?.message ?? "Failed to delete asset");
      return;
    }
    toast.success("Asset deleted");
    router.push(`/assets/computers`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
        <MoreHorizontal className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={del} className="text-rose-600 dark:text-rose-400">
          <Trash2 className="h-4 w-4" /> Delete asset
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
