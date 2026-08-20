import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { HorizontalBarChart } from "@/components/shared/HorizontalBarChart";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import {
  getDashboardStats,
  getAssetsByType,
  getAssetsByDepartment,
  getRecentActivity,
} from "@/modules/dashboard/service";

export default async function DashboardPage() {
  const session = await requirePageSession();
  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };

  const canViewAssets = hasPermission(session, "assets.view");
  const canViewVendors = hasPermission(session, "vendors.view");
  const canViewAudit = hasPermission(session, "audit.view");
  const canCreateAsset = hasPermission(session, "assets.create");
  const canAssignAsset = hasPermission(session, "assets.assign");
  const canCreateUser = hasPermission(session, "users.create");

  const [stats, typeData, departmentData, recentActivity] = await Promise.all([
    canViewAssets || canViewVendors ? getDashboardStats(actor) : null,
    canViewAssets ? getAssetsByType(actor) : [],
    canViewAssets ? getAssetsByDepartment(actor) : [],
    canViewAudit ? getRecentActivity() : [],
  ]);

  const hasQuickActions = canCreateAsset || canAssignAsset || canCreateUser;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {canViewAssets && (
            <>
              <StatCard label="Total Assets" value={stats.total} />
              <StatCard label="Assigned Assets" value={stats.assigned} />
              <StatCard label="Available Assets" value={stats.available} />
              <StatCard label="Under Repair" value={stats.underRepair} />
              <StatCard label="Warranty Expiring" value={stats.warrantyExpiring} />
            </>
          )}
          {canViewVendors && <StatCard label="Vendors" value={stats.vendorCount} />}
        </div>
      )}

      {canViewAssets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border p-4">
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Assets by Type</h2>
            <HorizontalBarChart data={typeData} valueLabel="Assets" />
          </div>
          <div className="rounded-md border p-4">
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Assets by Department</h2>
            <HorizontalBarChart data={departmentData} valueLabel="Assets" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewAudit && (
          <div className="rounded-md border p-4">
            <h2 className="mb-3 text-sm font-medium text-neutral-500">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span>{entry.description}</span>
                    <span className="ml-2 text-xs text-neutral-400">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {hasQuickActions && (
          <div className="rounded-md border p-4">
            <h2 className="mb-3 text-sm font-medium text-neutral-500">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              {/* Adding starts from a type — Computers is the most common, and the sidebar
                  covers the rest. There is no generic "new asset" page or cross-type list. */}
              {canCreateAsset && (
                <Button nativeButton={false} render={<Link href="/assets/computers/new">Add Computer</Link>} />
              )}
              {canAssignAsset && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/assets/computers?status=AVAILABLE">Assign Computer</Link>}
                />
              )}
              {canCreateUser && (
                <Button variant="outline" nativeButton={false} render={<Link href="/users">Add User</Link>} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
