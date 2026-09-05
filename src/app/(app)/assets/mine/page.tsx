import { Boxes, FileSpreadsheet } from "lucide-react";
import { requirePageSession } from "@/modules/rbac/permissions";
import { listAssets, countAssetsByType } from "@/modules/assets/service";
import { ASSET_TYPES_ORDERED, descriptorForSlug, descriptorFor } from "@/modules/assets/types/registry";
import type { AssetStatus } from "@/generated/prisma/client";
import { AssetsTable } from "../assets-table";
import { AssetFilters } from "../asset-filters";
import { AssetTypeTabs } from "./asset-type-tabs";
import type { AssetListSearchParams } from "../_shared/asset-type-list-page";

/**
 * The combined asset list for people who don't manage the whole estate: everything assigned
 * to them (SELF scope) or to their department (DEPARTMENT scope), of every type, on one page.
 *
 * The per-type pages exist for ALL-scope roles, where each type holds enough rows to be worth
 * its own screen. For an employee with a laptop and a monitor, seven pages holding one row
 * each is strictly worse than one list with a Type column — so this page is what the sidebar
 * offers them instead, and the type pages redirect here.
 *
 * There is no create/import here: this is a "what do I have?" view, and neither scoped role
 * holds assets.create anyway.
 */
export default async function MyAssetsPage({
  searchParams,
}: {
  searchParams: Promise<AssetListSearchParams & { type?: string }>;
}) {
  const session = await requirePageSession("assets.view");
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 20;

  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
  const scope = session.moduleScopes["assets"] ?? "SELF";
  const title = scope === "DEPARTMENT" ? "Department Assets" : "My Assets";
  const description =
    scope === "DEPARTMENT"
      ? "Every asset assigned to someone in your department."
      : "Everything currently assigned to you.";

  // One tab per type the person actually has (scope-only count, so it doesn't shift as they
  // filter by status). No "All" tab: each tab shows that type's OWN columns, so a mixed view
  // would have nothing to put in them.
  const typeCounts = await countAssetsByType(actor);
  const typeTabs = ASSET_TYPES_ORDERED.filter((d) => (typeCounts[d.assetType] ?? 0) > 0).map((d) => ({
    slug: d.slug,
    label: d.label,
    count: typeCounts[d.assetType] ?? 0,
  }));

  const Header = ({ action }: { action?: React.ReactNode }) => (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Boxes className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );

  // Nothing assigned at all — no tabs, no table.
  if (typeTabs.length === 0) {
    return (
      <div className="space-y-5 p-6">
        <Header />
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {scope === "DEPARTMENT"
            ? "No assets are assigned to anyone in your department yet."
            : "You don't have any assets assigned to you yet."}
        </div>
      </div>
    );
  }

  // The selected type: the `type` param if it's one the person actually has, otherwise their
  // first type. Defaulting here (rather than redirecting) avoids Server-Component redirect(),
  // which doesn't produce a real HTTP redirect in this app, and means a stale ?type bookmark
  // falls back gracefully instead of showing an empty table.
  const selectedTab = typeTabs.find((t) => t.slug === params.type) ?? typeTabs[0];
  const descriptor = descriptorFor(descriptorForSlug(selectedTab.slug)!.assetType);
  const assetType = descriptor.assetType;

  const { items, total } = await listAssets({
    search: params.search,
    status: params.status as AssetStatus | undefined,
    page,
    pageSize,
    actor,
    assetType,
  });

  // Prisma's Decimal can't cross the Server->Client boundary as-is.
  const rows = items.map((item) => ({
    ...item,
    cost: item.cost ? item.cost.toString() : null,
    monitor: item.monitor ? { ...item.monitor, sizeInches: item.monitor.sizeInches?.toString() ?? null } : null,
  }));

  const exportParams = new URLSearchParams();
  if (params.search) exportParams.set("search", params.search);
  if (params.status) exportParams.set("status", params.status);
  exportParams.set("type", selectedTab.slug);

  return (
    <div className="space-y-5 p-6">
      <Header
        action={
          <a
            href={`/api/assets/export?format=xlsx&${exportParams.toString()}`}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </a>
        }
      />
      {/* A single tab is just a non-interactive label, so only show the strip to switch between types. */}
      {typeTabs.length > 1 && <AssetTypeTabs tabs={typeTabs} current={selectedTab.slug} />}
      <AssetFilters currentStatus={params.status} showDeleted={false} canViewDeleted={false} />
      <AssetsTable
        items={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        canEdit={false}
        canDelete={false}
        showDeleted={false}
        // This type's own columns — the whole point of dropping the combined view.
        extraColumns={[...descriptor.listColumns]}
      />
    </div>
  );
}
