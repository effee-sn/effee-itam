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
  FileText,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listAssets } from "@/modules/assets/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import { availableScopeLevels, clampScope } from "@/lib/scope";
import type { AssetStatus, AssetType } from "@/generated/prisma/client";
import { ScopeSwitcher } from "@/components/shared/ScopeSwitcher";
import { AssetsTable } from "../assets-table";
import { AssetToolbar } from "../asset-toolbar";
import { AssetImportDialog } from "../asset-import-dialog";

export type AssetListSearchParams = {
  search?: string;
  page?: string;
  pageSize?: string;
  category?: string;
  status?: string;
  view?: string;
  deleted?: string;
};

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

const PAGE_SIZES = [20, 50, 100];

/** One type's asset list — /assets/computers, /assets/monitors, and so on. */
export async function AssetTypeListPage({
  assetType,
  searchParams,
}: {
  assetType: AssetType;
  searchParams: Promise<AssetListSearchParams>;
}) {
  const session = await requirePageSession("assets.view");

  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = PAGE_SIZES.includes(Number(params.pageSize)) ? Number(params.pageSize) : 20;
  const canViewDeleted = hasPermission(session, "assets.view_deleted");
  const showDeleted = canViewDeleted && params.deleted === "true";

  const descriptor = descriptorFor(assetType);
  const Icon = TYPE_ICON[assetType];

  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
  const scopeCeiling = session.moduleScopes["assets"];
  const availableScopes = availableScopeLevels(scopeCeiling);
  const currentScope = clampScope(scopeCeiling, params.view);

  const { items, total } = await listAssets({
    search: params.search,
    status: params.status as AssetStatus | undefined,
    page,
    pageSize,
    actor,
    view: params.view,
    deleted: showDeleted,
    assetType,
  });

  const rows = items.map((item) => ({
    ...item,
    cost: item.cost ? item.cost.toString() : null,
    monitor: item.monitor ? { ...item.monitor, sizeInches: item.monitor.sizeInches?.toString() ?? null } : null,
  }));

  const canCreate = hasPermission(session, "assets.create");
  const canEdit = hasPermission(session, "assets.edit");
  const canDelete = hasPermission(session, "assets.delete");

  const exportParams = new URLSearchParams();
  if (params.search) exportParams.set("search", params.search);
  if (params.status) exportParams.set("status", params.status);
  if (params.view) exportParams.set("view", params.view);
  exportParams.set("type", descriptor.slug);
  const exportQuery = exportParams.toString();

  const outlineBtn =
    "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{descriptor.label}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{descriptor.label}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Manage and track all {descriptor.label.toLowerCase()} in your organization.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/assets/export?format=csv&${exportQuery}`} className={outlineBtn}>
            <FileText className="h-4 w-4 text-neutral-500" /> Export CSV
          </a>
          <a href={`/api/assets/export?format=xlsx&${exportQuery}`} className={outlineBtn}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </a>
          {canCreate && <AssetImportDialog />}
          {canCreate && (
            <Link
              href={`/assets/${descriptor.slug}/new`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              <Plus className="h-4 w-4" /> New {descriptor.labelSingular}
            </Link>
          )}
        </div>
      </div>

      {availableScopes.length > 1 && (
        <ScopeSwitcher available={availableScopes} current={currentScope} total={total} />
      )}

      <AssetToolbar currentStatus={params.status} showDeleted={showDeleted} canViewDeleted={canViewDeleted} />

      <AssetsTable
        items={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        canEdit={canEdit}
        canDelete={canDelete}
        showDeleted={showDeleted}
        extraColumns={[...descriptor.listColumns]}
      />
    </div>
  );
}
