import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  UserRound,
  ShieldCheck,
  Settings,
  Laptop,
  KeyRound,
  Clock,
  Plus,
  Eye,
  Monitor,
  ClipboardList,
  LogIn,
  CalendarDays,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getUserDetailById, listRoleOptions } from "@/modules/users/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { SCOPE_DIMENSIONS, resolveModuleScopes } from "@/lib/scope";
import { UserHeaderActions, UserQuickActions } from "./user-detail-actions";

const ACTION_LABELS: Record<string, string> = { ASSIGN: "Assigned", RETURN: "Returned", TRANSFER: "Transferred", REPLACEMENT: "Replaced" };
const SCOPE_LABELS: Record<string, string> = { ALL: "All", DEPARTMENT: "Own department only", SELF: "Assigned to them only" };
const ASSET_TYPE_LABELS: Record<string, string> = {
  COMPUTER: "Computer", MONITOR: "Monitor", PRINTER: "Printer", PHONE: "Phone",
  SIM_CARD: "SIM Card", NETWORK_DEVICE: "Network Device", PERIPHERAL: "Peripheral", OTHER: "Other",
};
const ASSET_STATUS: Record<string, { label: string; dot: string; text: string }> = {
  AVAILABLE: { label: "Available", dot: "bg-slate-400", text: "text-slate-500" },
  ASSIGNED: { label: "Assigned", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  UNDER_REPAIR: { label: "Under Repair", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  RETIRED: { label: "Retired", dot: "bg-neutral-400", text: "text-neutral-500" },
  LOST: { label: "Lost", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

function fmtDateTime(value: Date | null) {
  return value ? new Date(value).toLocaleString() : "—";
}
function fmtDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "—";
}
function initialsOf(name: string): string {
  const w = name.split(/\s+/).filter((x) => /[a-z0-9]/i.test(x));
  return (w.length <= 1 ? (w[0] ?? "").slice(0, 2) : w.map((x) => x[0]).slice(0, 2).join("")).toUpperCase() || "?";
}
function sinceLabel(date: Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}

const cardCls = "rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const iconSq = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
const tabCls = "h-auto flex-none rounded-none border-0 border-b-2 border-transparent px-1 pb-3 text-neutral-500 data-active:border-blue-600 data-active:bg-transparent data-active:text-blue-600 data-active:shadow-none dark:data-active:bg-transparent";

function CardHeader({ icon: Icon, title, subtitle, action }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className={iconSq}><Icon className="h-5 w-5" /></span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-neutral-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession("users.view");
  const { id } = await params;

  const detail = await getUserDetailById(Number(id));
  if (!detail) notFound();
  const { user, assetHistory, auditLogs } = detail;

  const canEdit = hasPermission(session, "users.edit");
  const canViewRoles = hasPermission(session, "roles.view");
  const [departments, roles] = await Promise.all([listDepartmentOptions(), listRoleOptions()]);

  const permissionCodes = user.role.rolePermissions.map((rp) => rp.permission.code);
  const moduleScopes = resolveModuleScopes(permissionCodes);
  const actionPermissions = permissionCodes.filter((c) => !SCOPE_DIMENSIONS.some((d) => c.startsWith(`${d.codePrefix}_`))).sort();
  const isLocked = !!user.lockedUntil && user.lockedUntil > new Date();
  const active = user.status === "ACTIVE";

  const userRow = {
    id: user.id, employeeId: user.employeeId, name: user.name, email: user.email,
    phone: user.phone, designation: user.designation, status: user.status as "ACTIVE" | "INACTIVE",
    departmentId: user.departmentId, roleId: user.roleId,
    department: { name: user.department.name }, role: { name: user.role.name },
  };

  const personal: [string, string][] = [
    ["Employee ID", user.employeeId],
    ["Full Name", user.name],
    ["Email", user.email],
    ["Phone", user.phone ?? "—"],
    ["Department", user.department.name],
    ["Role", user.role.name],
    ["Designation", user.designation ?? "—"],
  ];
  const security: [string, React.ReactNode][] = [
    ["Last Login", fmtDateTime(user.lastLoginAt)],
    ["Account Locked", isLocked ? <span className="font-medium text-amber-600">Yes</span> : "No"],
    ["Failed Login Attempts", String(user.failedLoginAttempts)],
    ["Must Change Password", user.mustChangePassword ? <span className="font-medium text-amber-600">Yes — on next login</span> : "No"],
    ["Password Last Changed", "—"],
    ["Created", fmtDateTime(user.createdAt)],
  ];

  const accessPills: string[] = [];
  if (permissionCodes.some((c) => c.startsWith("assets"))) accessPills.push("Asset Portal");
  if (permissionCodes.includes("reports.view")) accessPills.push("Reports (View)");
  if (permissionCodes.some((c) => c.startsWith("users"))) accessPills.push("User Management");
  if (permissionCodes.some((c) => c.startsWith("settings"))) accessPills.push("Settings");

  const summaryTiles = [
    { icon: Monitor, value: String(user.assetsCurrentlyHeld.length), label: "Assets", sub: "Currently assigned" },
    { icon: ClipboardList, value: String(assetHistory.length), label: "Assignments", sub: "History records" },
    { icon: LogIn, value: String(user.failedLoginAttempts), label: "Failed Logins", sub: "Total attempts" },
    { icon: CalendarDays, value: sinceLabel(user.createdAt), label: "Member Since", sub: new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
  ];

  const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/users" className="hover:text-neutral-700 dark:hover:text-neutral-300">Users</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{user.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
            {initialsOf(user.name)}
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold leading-tight">{user.name}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-neutral-400"}`} /> {active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {user.employeeId} · {user.department.name} · {user.role.name}
            </p>
          </div>
        </div>
        <UserHeaderActions user={userRow} departments={departments} roles={roles} canEdit={canEdit} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className={cardCls}>
          <CardHeader icon={UserRound} title="Personal Information" subtitle="Basic details about the user" />
          <dl className="space-y-3">
            {personal.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={cardCls}>
          <CardHeader icon={ShieldCheck} title="Account & Security" subtitle="Login and security information" />
          <dl className="space-y-3">
            {security.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[150px_1fr] gap-3 text-sm">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={cardCls}>
          <CardHeader icon={Settings} title="Quick Actions" subtitle="Common user actions" />
          <UserQuickActions user={userRow} departments={departments} roles={roles} canEdit={canEdit} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="holdings" className="gap-5">
        <TabsList className="h-auto justify-start gap-6 rounded-none border-b border-neutral-200 bg-transparent p-0 dark:border-neutral-800">
          <TabsTrigger value="holdings" className={tabCls}>Currently Held</TabsTrigger>
          <TabsTrigger value="permissions" className={tabCls}>Permissions &amp; Scope</TabsTrigger>
          <TabsTrigger value="history" className={tabCls}>Assignment History</TabsTrigger>
          <TabsTrigger value="activity" className={tabCls}>Recent Activity</TabsTrigger>
        </TabsList>

        {/* Currently Held */}
        <TabsContent value="holdings" className="space-y-5">
          <div className={`${cardCls} p-0`}>
            <div className="p-6 pb-4">
              <CardHeader
                icon={Laptop}
                title={`Assets (${user.assetsCurrentlyHeld.length})`}
                subtitle="Assets currently assigned to this user"
                action={
                  <Link href="/assets/computers" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                    <Plus className="h-4 w-4" /> Assign Asset
                  </Link>
                }
              />
            </div>
            {user.assetsCurrentlyHeld.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-neutral-500">No assets currently assigned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-y border-neutral-200 dark:border-neutral-800">
                      <th className={th}>Asset Tag</th>
                      <th className={th}>Type</th>
                      <th className={th}>Brand / Model</th>
                      <th className={th}>Serial / Mobile No.</th>
                      <th className={th}>Purchase Date</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.assetsCurrentlyHeld.map((a) => {
                      const st = ASSET_STATUS[a.status];
                      return (
                        <tr key={a.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                          <td className={`${td} font-mono font-medium text-neutral-800 dark:text-neutral-200`}>{a.assetTag}</td>
                          <td className={td}>{ASSET_TYPE_LABELS[a.assetType] ?? a.assetType}</td>
                          <td className={td}>{[a.brand, a.model].filter(Boolean).join(" / ") || "—"}</td>
                          <td className={`${td} font-mono`}>{a.serialNumber ?? "—"}</td>
                          <td className={td}>{fmtDate(a.purchaseDate)}</td>
                          <td className={td}>
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                              <span className={`font-medium ${st.text}`}>{st.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex justify-end">
                              <Link href={`/assets/${a.id}`} title="View asset" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className={cardCls}>
              <CardHeader icon={KeyRound} title="Permissions & Scope" subtitle="Roles and access permissions" />
              <dl className="space-y-3 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-neutral-500">Role</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-200">{user.role.name}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-neutral-500">Department</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200">{user.department.name}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <dt className="text-neutral-500">System Access</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {accessPills.length ? (
                      accessPills.map((p) => (
                        <span key={p} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{p}</span>
                      ))
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className={cardCls}>
              <CardHeader icon={Clock} title="Activity Summary" subtitle="Recent user activity" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {summaryTiles.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div key={t.label} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/30">
                      <span className={iconSq}><Icon className="h-5 w-5" /></span>
                      <div className="mt-3 text-xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">{t.value}</div>
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.label}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">{t.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Permissions & Scope */}
        <TabsContent value="permissions" className="space-y-5">
          <div className={cardCls}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Data Visibility — from role{" "}
                {canViewRoles ? (
                  <Link href={`/roles/${user.roleId}/edit`} className="text-blue-600 underline underline-offset-2 dark:text-blue-400">{user.role.name}</Link>
                ) : (
                  <span className="font-semibold">{user.role.name}</span>
                )}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              {SCOPE_DIMENSIONS.map((d) => (
                <div key={d.id}>
                  <dt className="text-xs font-medium uppercase text-neutral-500">{d.label}</dt>
                  <dd className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">{SCOPE_LABELS[moduleScopes[d.id]] ?? moduleScopes[d.id]}</dd>
                </div>
              ))}
            </div>
          </div>
          <div className={cardCls}>
            <h3 className="mb-3 text-sm font-semibold">Granted Permissions ({actionPermissions.length})</h3>
            {actionPermissions.length === 0 ? (
              <p className="text-sm text-neutral-500">This role has no permissions granted.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {actionPermissions.map((code) => (
                  <span key={code} className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{code}</span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-neutral-500">
              Permissions come from the role, not the individual user — changing them affects everyone with the {user.role.name} role, and applies on their next login.
            </p>
          </div>
        </TabsContent>

        {/* Assignment History */}
        <TabsContent value="history">
          <div className={`${cardCls} p-0`}>
            <div className="p-6 pb-2">
              <h3 className="text-sm font-semibold">Asset Assignments ({assetHistory.length})</h3>
            </div>
            {assetHistory.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-neutral-500">No asset assignment history.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-y border-neutral-200 dark:border-neutral-800">
                      <th className={th}>Action</th><th className={th}>Asset</th><th className={th}>From</th>
                      <th className={th}>To</th><th className={th}>Performed By</th><th className={th}>Date</th><th className={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetHistory.map((e) => (
                      <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                        <td className={td}>{ACTION_LABELS[e.action] ?? e.action}</td>
                        <td className={td}><Link href={`/assets/${e.asset.id}`} className="font-mono font-medium text-blue-600 hover:underline dark:text-blue-400">{e.asset.assetTag}</Link></td>
                        <td className={td}>{e.fromUser?.name ?? "—"}</td>
                        <td className={td}>{e.toUser?.name ?? "—"}</td>
                        <td className={td}>{e.performedBy.name}</td>
                        <td className={td}>{fmtDateTime(e.actionDate)}</td>
                        <td className={`${td} max-w-xs`}>{e.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Recent Activity */}
        <TabsContent value="activity">
          <div className={`${cardCls} p-0`}>
            {auditLogs.length === 0 ? (
              <p className="p-6 text-sm text-neutral-500">No recorded activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800">
                      <th className={th}>Action</th><th className={th}>Module</th><th className={th}>Entity</th><th className={th}>Description</th><th className={th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((e) => (
                      <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                        <td className={td}>{e.action}</td>
                        <td className={td}>{e.module}</td>
                        <td className={td}>{e.entityType ? `${e.entityType}${e.entityId ? ` #${e.entityId}` : ""}` : "—"}</td>
                        <td className={`${td} max-w-xs`}>{e.description ?? "—"}</td>
                        <td className={td}>{fmtDateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-6 py-3 text-xs text-neutral-500">Showing this user&apos;s 20 most recent entries. Full history is on the Audit Logs page.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
