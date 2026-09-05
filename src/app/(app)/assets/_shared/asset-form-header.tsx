import Link from "next/link";
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
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { descriptorFor } from "@/modules/assets/types/registry";
import type { AssetType } from "@/generated/prisma/client";

const TYPE_ICON: Record<AssetType, LucideIcon> = {
  COMPUTER: Laptop,
  MONITOR: Monitor,
  PRINTER: Printer,
  PHONE: Smartphone,
  SIM_CARD: CreditCard,
  NETWORK_DEVICE: Network,
  PERIPHERAL: Mouse,
  OTHER: Box,
};

/**
 * The breadcrumb + icon header + "Back to …" button shared by every asset add/edit page,
 * so a New Printer and an Edit Computer wear the same chrome. Server-safe (no hooks).
 */
export function AssetFormHeader({
  assetType,
  mode,
  assetTag,
  assetId,
  subtitle,
}: {
  assetType: AssetType;
  mode: "new" | "edit";
  assetTag?: string;
  assetId?: number;
  subtitle?: string;
}) {
  const descriptor = descriptorFor(assetType);
  const Icon = TYPE_ICON[assetType];
  const listHref = `/assets/${descriptor.slug}`;

  const title =
    mode === "new" ? `Add New ${descriptor.labelSingular}` : `Edit ${descriptor.labelSingular} — ${assetTag}`;
  const defaultSubtitle =
    mode === "new"
      ? `Enter the ${descriptor.labelSingular.toLowerCase()} details below.`
      : `Update the ${descriptor.labelSingular.toLowerCase()} details. Make the necessary changes and save.`;
  const backHref = mode === "new" ? listHref : `/assets/${assetId}`;
  const backLabel = mode === "new" ? `Back to ${descriptor.label}` : `Back to ${descriptor.labelSingular}`;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href={listHref} className="hover:text-neutral-700 dark:hover:text-neutral-300">
          {descriptor.label}
        </Link>
        {mode === "edit" && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/assets/${assetId}`} className="hover:text-neutral-700 dark:hover:text-neutral-300">
              {assetTag}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {mode === "new" ? `New ${descriptor.labelSingular}` : "Edit"}
        </span>
      </nav>

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{subtitle ?? defaultSubtitle}</p>
          </div>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      </div>
    </div>
  );
}
