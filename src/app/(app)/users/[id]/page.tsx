import Link from "next/link";
import { notFound } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getUserDetailById } from "@/modules/users/service";
import { SCOPE_DIMENSIONS, resolveModuleScopes } from "@/lib/scope";

const ACTION_LABELS: Record<string, string> = {
  ASSIGN: "Assigned",
  RETURN: "Returned",
  TRANSFER: "Transferred",
  REPLACEMENT: "Replaced",
};

const SCOPE_LABELS: Record<string, string> = {
  ALL: "All",
  DEPARTMENT: "Own department only",
  SELF: "Assigned to them only",
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  UNDER_REPAIR: "Under Repair",
  RETIRED: "Retired",
  LOST: "Lost",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  COMPUTER: "Computer",
  MONITOR: "Monitor",
  PRINTER: "Printer",
  PHONE: "Phone",
  SIM_CARD: "SIM Card",
  NETWORK_DEVICE: "Network Device",
  PERIPHERAL: "Peripheral",
  OTHER: "Other",
};

function formatDateTime(value: Date | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession("users.view");
  const { id } = await params;

  const detail = await getUserDetailById(Number(id));
  if (!detail) notFound();

  const { user, assetHistory, auditLogs } = detail;
  const canViewRoles = hasPermission(session, "roles.view");

  const permissionCodes = user.role.rolePermissions.map((rp) => rp.permission.code);
  const moduleScopes = resolveModuleScopes(permissionCodes);
  // Scope codes are permission codes too — show them as the labelled scope rows below
  // instead of repeating them raw in the action-permission list.
  const actionPermissions = permissionCodes
    .filter((code) => !SCOPE_DIMENSIONS.some((d) => code.startsWith(`${d.codePrefix}_`)))
    .sort();

  const isLocked = !!user.lockedUntil && user.lockedUntil > new Date();

  const profileFields: [string, string][] = [
    ["Employee ID", user.employeeId],
    ["Name", user.name],
    ["Email", user.email],
    ["Phone", user.phone ?? "—"],
    ["Department", user.department.name],
    ["Role", user.role.name],
    ["Designation", user.designation ?? "—"],
    ["Status", user.status === "ACTIVE" ? "Active" : "Inactive"],
  ];

  const securityFields: [string, string][] = [
    ["Last Login", formatDateTime(user.lastLoginAt)],
    ["Account Locked", isLocked ? `Yes — until ${formatDateTime(user.lockedUntil)}` : "No"],
    ["Failed Login Attempts", String(user.failedLoginAttempts)],
    ["Must Change Password", user.mustChangePassword ? "Yes — on next login" : "No"],
    ["Created", formatDateTime(user.createdAt)],
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <p className="text-sm text-neutral-500">
            {user.employeeId} · {user.department.name} · {user.role.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-md border p-4 sm:grid-cols-4">
        {profileFields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-neutral-500 uppercase">{label}</dt>
            <dd className="mt-0.5 text-sm">{value}</dd>
          </div>
        ))}
      </div>

      <div className="rounded-md border p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Security & Login</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-5">
          {securityFields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-neutral-500 uppercase">{label}</dt>
              <dd
                className={`mt-0.5 text-sm ${
                  (label === "Account Locked" && isLocked) ||
                  (label === "Must Change Password" && user.mustChangePassword)
                    ? "font-medium text-amber-600 dark:text-amber-500"
                    : ""
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Currently Held</TabsTrigger>
          <TabsTrigger value="permissions">Permissions & Scope</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">Assets ({user.assetsCurrentlyHeld.length})</h3>
              {user.assetsCurrentlyHeld.length === 0 ? (
                <p className="text-sm text-neutral-500">No assets currently assigned.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Tag</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Brand / Model</TableHead>
                        <TableHead>Serial / Mobile No.</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.assetsCurrentlyHeld.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <Link
                              href={`/assets/${asset.id}`}
                              className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                            >
                              {asset.assetTag}
                            </Link>
                          </TableCell>
                          <TableCell>{ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}</TableCell>
                          <TableCell>{[asset.brand, asset.model].filter(Boolean).join(" / ") || "—"}</TableCell>
                          <TableCell>{asset.serialNumber ?? "—"}</TableCell>
                          <TableCell>{ASSET_STATUS_LABELS[asset.status] ?? asset.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <div className="space-y-6">
            <div className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Data Visibility — from role{" "}
                  {canViewRoles ? (
                    <Link href={`/roles/${user.roleId}/edit`} className="underline underline-offset-2">
                      {user.role.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{user.role.name}</span>
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                {SCOPE_DIMENSIONS.map((dimension) => (
                  <div key={dimension.id}>
                    <dt className="text-xs font-medium text-neutral-500 uppercase">{dimension.label}</dt>
                    <dd className="mt-0.5 text-sm">
                      {SCOPE_LABELS[moduleScopes[dimension.id]] ?? moduleScopes[dimension.id]}
                    </dd>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-4">
              <h3 className="mb-3 text-sm font-medium">Granted Permissions ({actionPermissions.length})</h3>
              {actionPermissions.length === 0 ? (
                <p className="text-sm text-neutral-500">This role has no permissions granted.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {actionPermissions.map((code) => (
                    <span
                      key={code}
                      className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-neutral-500">
                Permissions come from the role, not the individual user — changing them affects everyone
                with the {user.role.name} role, and applies on their next login.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">Asset Assignments ({assetHistory.length})</h3>
              {assetHistory.length === 0 ? (
                <p className="text-sm text-neutral-500">No asset assignment history.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
                          <TableCell>
                            <Link
                              href={`/assets/${entry.asset.id}`}
                              className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                            >
                              {entry.asset.assetTag}
                            </Link>
                          </TableCell>
                          <TableCell>{entry.fromUser?.name ?? "—"}</TableCell>
                          <TableCell>{entry.toUser?.name ?? "—"}</TableCell>
                          <TableCell>{entry.performedBy.name}</TableCell>
                          <TableCell>{formatDateTime(entry.actionDate)}</TableCell>
                          <TableCell className="max-w-xs">{entry.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-neutral-500">No recorded activity yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.module}</TableCell>
                      <TableCell>
                        {entry.entityType ? `${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-xs">{entry.description ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-neutral-500">
            Showing this user&apos;s 20 most recent entries. Full history is on the Audit Logs page.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
