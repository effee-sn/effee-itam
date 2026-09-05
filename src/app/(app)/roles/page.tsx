import Link from "next/link";
import { UsersRound, Plus } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listRoles } from "@/modules/roles/service";
import { RolesTable } from "./roles-table";

export default async function RolesPage() {
  const session = await requirePageSession("roles.view");

  const roles = await listRoles();
  const canCreate = hasPermission(session, "roles.create");
  const canEdit = hasPermission(session, "roles.edit");
  const canDelete = hasPermission(session, "roles.delete");

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <UsersRound className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Roles</h1>
            <p className="mt-1 text-sm text-neutral-500">Create custom roles and control what each one can see and do.</p>
          </div>
        </div>
        {canCreate && (
          <Link href="/roles/new" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Role
          </Link>
        )}
      </div>

      <RolesTable roles={roles} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
