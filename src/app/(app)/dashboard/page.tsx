import Link from "next/link";
import {
  type LucideIcon,
  Layers,
  Monitor,
  Wrench,
  ShieldCheck,
  Store,
  PackageCheck,
  FileText,
  Network,
  Clock,
  Zap,
  ArrowRight,
  Plus,
  LogIn,
  LogOut,
  Pencil,
  Trash2,
  UserCheck,
  Undo2,
  ShieldAlert,
  Laptop,
  UserPlus,
  Building2,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { HorizontalBarChart } from "@/components/shared/HorizontalBarChart";
import { DateChip } from "./date-chip";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getDashboardStats, getAssetsByType, getAssetsByDepartment, getRecentActivity } from "@/modules/dashboard/service";

const ACTIVITY_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  LOGIN: { icon: LogIn, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
  LOGOUT: { icon: LogOut, className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
  CREATE: { icon: Plus, className: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  UPDATE: { icon: Pencil, className: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  DELETE: { icon: Trash2, className: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
  ASSIGN: { icon: UserCheck, className: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
  RETURN: { icon: Undo2, className: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400" },
  PERMISSION_CHANGE: { icon: ShieldAlert, className: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400" },
};

const cardClass =
  "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {action.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requirePageSession();
  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };

  const canViewAssets = hasPermission(session, "assets.view");
  const canViewVendors = hasPermission(session, "vendors.view");
  const canViewAudit = hasPermission(session, "audit.view");
  const canCreateAsset = hasPermission(session, "assets.create");
  const canAssignAsset = hasPermission(session, "assets.assign");
  const canCreateUser = hasPermission(session, "users.create");
  const canCreateDept = hasPermission(session, "departments.create");
  const canCreateVendor = hasPermission(session, "vendors.create");
  const canViewReports = hasPermission(session, "reports.view");

  const [stats, typeData, departmentData, recentActivity] = await Promise.all([
    canViewAssets || canViewVendors ? getDashboardStats(actor) : null,
    canViewAssets ? getAssetsByType(actor) : [],
    canViewAssets ? getAssetsByDepartment(actor) : [],
    canViewAudit ? getRecentActivity() : [],
  ]);

  const quickActions = [
    { show: canCreateAsset, href: "/assets/computers/new", icon: Laptop, label: "Add Computer", sub: "Register a new computer" },
    { show: canAssignAsset, href: "/assets/computers?status=AVAILABLE", icon: UserCheck, label: "Assign Asset", sub: "Assign to a user" },
    { show: canCreateUser, href: "/users", icon: UserPlus, label: "Add User", sub: "Create a new user" },
    { show: canCreateDept, href: "/departments", icon: Building2, label: "Add Department", sub: "Create a department" },
    { show: canCreateVendor, href: "/vendors", icon: Store, label: "Add Vendor", sub: "Register a vendor" },
    { show: canViewReports, href: "/reports", icon: BarChart3, label: "View Reports", sub: "Generate reports" },
  ].filter((a) => a.show);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Welcome back, <span className="font-medium text-neutral-700 dark:text-neutral-200">{session.name}</span>!
            Here&apos;s what&apos;s happening with your assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateChip />
          {canCreateAsset && (
            <Link
              href="/assets/computers/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </Link>
          )}
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {canViewAssets && (
            <>
              <StatCard label="Total Assets" value={stats.total} caption="All registered assets" icon={Layers} tone="blue" trend={stats.trends.total} />
              <StatCard label="Assigned Assets" value={stats.assigned} caption="In use by employees" icon={Monitor} tone="green" />
              <StatCard label="Available Assets" value={stats.available} caption="Ready to assign" icon={PackageCheck} tone="purple" />
              <StatCard label="Under Repair" value={stats.underRepair} caption="Currently in service" icon={Wrench} tone="orange" />
              <StatCard label="Warranty Expiring" value={stats.warrantyExpiring} caption="In next 30 days" icon={ShieldCheck} tone="red" />
            </>
          )}
          {canViewVendors && <StatCard label="Vendors" value={stats.vendorCount} caption="Active vendors" icon={Store} tone="slate" trend={stats.trends.vendorCount} />}
        </div>
      )}

      {/* Charts */}
      {canViewAssets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={cardClass}>
            <SectionHeader
              icon={FileText}
              title="Assets by Type"
              subtitle="Distribution of assets across different categories"
              action={{ label: "View Details", href: "/reports" }}
            />
            <HorizontalBarChart data={typeData} valueLabel="Assets" />
          </div>
          <div className={cardClass}>
            <SectionHeader
              icon={Network}
              title="Assets by Department"
              subtitle="Asset allocation across departments"
              action={{ label: "View Details", href: "/departments" }}
            />
            <HorizontalBarChart data={departmentData} valueLabel="Assets" />
          </div>
        </div>
      )}

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewAudit && (
          <div className={cardClass}>
            <SectionHeader
              icon={Clock}
              title="Recent Activity"
              subtitle="Latest actions performed in the system"
              action={{ label: "View All", href: "/audit-logs" }}
            />
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">No activity yet.</p>
            ) : (
              <ul className="space-y-1">
                {recentActivity.map((entry) => {
                  const meta = ACTIVITY_ICON[entry.action] ?? ACTIVITY_ICON.UPDATE;
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{entry.description}</span>
                      <span className="shrink-0 text-xs text-neutral-400">{new Date(entry.createdAt).toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {quickActions.length > 0 && (
          <div className={cardClass}>
            <SectionHeader icon={Zap} title="Quick Actions" subtitle="Common tasks to manage your assets" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{a.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{a.sub}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">All systems operational</p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Asset management system is running smoothly.</p>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
