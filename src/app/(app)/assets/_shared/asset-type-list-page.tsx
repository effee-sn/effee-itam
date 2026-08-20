import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/shared/ExportButton";
import { ScopeSwitcher } from "@/components/shared/ScopeSwitcher";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listAssets } from "@/modules/assets/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import { availableScopeLevels, clampScope } from "@/lib/scope";
import type { AssetStatus, AssetType } from "@/generated/prisma/client";
import { AssetsTable } from "../assets-table";
import { AssetFilters } from "../asset-filters";
import { AssetImportDialog } from "../asset-import-dialog";

export type AssetListSearchParams = {
  search?: string;
  page?: string;
  category?: string;
  status?: string;
  view?: string;
  deleted?: string;
};

/**
 * One type's asset list — /assets/computers, /assets/monitors and so on.
 *
 * `assetType` is required: there is no cross-type "All Assets" view any more, so every page
 * that renders this is filtered to exactly one type. They all share this component so the
 * scope switcher, deleted-view gating, filters, export and pagination can't drift apart.
 */
export async function AssetTypeListPage({
  assetType,
  searchParams,
}: {
  assetType: AssetType;
  searchParams: Promise<AssetListSearchParams>;
}) {
  // Narrower-than-ALL scopes are bounced to /assets/mine by middleware before reaching here
  // (a Server Component redirect() doesn't produce a real HTTP redirect in this app — see
  // src/middleware.ts). This page still filters through getRoleScope() regardless, so it
  // shows the right rows even if it is somehow reached directly.
  const session = await requirePageSession("assets.view");

  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = 20;
  const canViewDeleted = hasPermission(session, "assets.view_deleted");
  // Fail closed: a tampered ?deleted=true query string is ignored for anyone without the
  // permission, not just hidden behind an unchecked UI toggle.
  const showDeleted = canViewDeleted && params.deleted === "true";

  const descriptor = descriptorFor(assetType);

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

  // Prisma's Decimal isn't a plain object, so it can't cross the Server->Client boundary as-is.
  // Monitors carry a second Decimal (sizeInches) inside their detail row.
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={descriptor.label}
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/assets/export?format=csv&${exportQuery}`} label="Export CSV" />
            <ExportButton href={`/api/assets/export?format=xlsx&${exportQuery}`} label="Export Excel" />
            {canCreate && <AssetImportDialog />}
            {canCreate && (
              <Button
                nativeButton={false}
                render={<Link href={`/assets/${descriptor.slug}/new`}>New {descriptor.labelSingular}</Link>}
              />
            )}
          </div>
        }
      />
      {availableScopes.length > 1 && <ScopeSwitcher available={availableScopes} current={currentScope} />}
      <AssetFilters
        currentStatus={params.status}
        showDeleted={showDeleted}
        canViewDeleted={canViewDeleted}
      />
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
