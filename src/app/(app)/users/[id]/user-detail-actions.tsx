"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, KeyRound, Power, ShieldCheck, Building2 } from "lucide-react";
import { UserFormDialog, ResetPasswordDialog, type UserRow } from "../users-table";

type Option = { id: number; name: string };

function useDeactivate(user: UserRow) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = user.status === "ACTIVE";
  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        departmentId: user.departmentId,
        roleId: user.roleId,
        designation: user.designation ?? "",
        status: active ? "INACTIVE" : "ACTIVE",
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(active ? "User deactivated" : "User activated");
    router.refresh();
  }
  return { active, busy, toggle };
}

/** The three buttons in the detail-page header. */
export function UserHeaderActions({
  user,
  departments,
  roles,
  canEdit,
}: {
  user: UserRow;
  departments: Option[];
  roles: Option[];
  canEdit: boolean;
}) {
  const { active, busy, toggle } = useDeactivate(user);
  if (!canEdit) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserFormDialog
        mode="edit"
        user={user}
        departments={departments}
        roles={roles}
        trigger={
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <Pencil className="h-4 w-4" /> Edit User
          </button>
        }
      />
      <ResetPasswordDialog
        user={user}
        trigger={
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <KeyRound className="h-4 w-4" /> Reset Password
          </button>
        }
      />
      <button
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-60 ${
          active
            ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:hover:bg-rose-500/10"
            : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-neutral-900 dark:hover:bg-emerald-500/10"
        }`}
      >
        <Power className="h-4 w-4" /> {busy ? "…" : active ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

/** The Quick Actions card in the header row. */
export function UserQuickActions({
  user,
  departments,
  roles,
  canEdit,
}: {
  user: UserRow;
  departments: Option[];
  roles: Option[];
  canEdit: boolean;
}) {
  const { active, busy, toggle } = useDeactivate(user);
  const rowCls =
    "flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

  if (!canEdit) {
    return <p className="text-sm text-neutral-500">You don&apos;t have permission to manage this user.</p>;
  }

  const editTrigger = (label: string, icon: React.ReactNode, primary = false) => (
    <button
      className={
        primary
          ? "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          : rowCls
      }
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-2.5">
      <UserFormDialog mode="edit" user={user} departments={departments} roles={roles} trigger={editTrigger("Edit User", <Pencil className="h-4 w-4" />, true)} />
      <ResetPasswordDialog user={user} trigger={<button className={rowCls}><KeyRound className="h-4 w-4" /> Reset Password</button>} />
      <UserFormDialog mode="edit" user={user} departments={departments} roles={roles} trigger={editTrigger("Change Role", <ShieldCheck className="h-4 w-4" />)} />
      <UserFormDialog mode="edit" user={user} departments={departments} roles={roles} trigger={editTrigger("Change Department", <Building2 className="h-4 w-4" />)} />
      <button
        onClick={toggle}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-60 ${
          active
            ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-neutral-900 dark:hover:bg-rose-500/10"
            : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-neutral-900 dark:hover:bg-emerald-500/10"
        }`}
      >
        <Power className="h-4 w-4" /> {busy ? "…" : active ? "Deactivate User" : "Activate User"}
      </button>
    </div>
  );
}
