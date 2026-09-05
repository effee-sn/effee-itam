import Link from "next/link";
import { ChevronRight, Users as UsersIcon, FileText, FileSpreadsheet } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listUsersForExport, listRoleOptions } from "@/modules/users/service";
import { listDepartmentOptions } from "@/modules/departments/service";
import { UsersTable, CreateUserButton } from "./users-table";
import { UserImportDialog } from "./users-import-dialog";

const outlineBtn =
  "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

export default async function UsersPage() {
  const session = await requirePageSession("users.view");

  const [users, departments, roles] = await Promise.all([
    listUsersForExport(),
    listDepartmentOptions(),
    listRoleOptions(),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    employeeId: u.employeeId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    designation: u.designation,
    status: u.status as "ACTIVE" | "INACTIVE",
    departmentId: u.departmentId,
    roleId: u.roleId,
    department: { name: u.department.name },
    role: { name: u.role.name },
  }));

  const canCreate = hasPermission(session, "users.create");
  const canEdit = hasPermission(session, "users.edit");

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Users</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <UsersIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Users</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage system users and their access.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download route, not a page */}
          <a href="/api/users/export?format=csv" className={outlineBtn}>
            <FileText className="h-4 w-4 text-neutral-500" /> Export CSV
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download route, not a page */}
          <a href="/api/users/export?format=xlsx" className={outlineBtn}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </a>
          {canCreate && <UserImportDialog />}
          {canCreate && <CreateUserButton departments={departments} roles={roles} />}
        </div>
      </div>

      <UsersTable items={items} departments={departments} roles={roles} canEdit={canEdit} canDelete={canEdit} />
    </div>
  );
}
