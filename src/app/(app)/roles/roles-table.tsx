"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type RoleRow = {
  id: number;
  name: string;
  description: string | null;
  moduleScopes: Record<string, string>;
  isSystem: boolean;
  _count: { users: number; rolePermissions: number };
};

const SCOPE_LABELS: Record<string, string> = {
  ALL: "All",
  DEPARTMENT: "Own dept.",
  SELF: "Assigned to me",
};

export function RolesTable({
  roles,
  canEdit,
  canDelete,
}: {
  roles: RoleRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete role");
      return;
    }
    toast.success("Role deleted");
    router.refresh();
  }

  return (
    <DataTable
      columns={[
        {
          header: "Name",
          cell: (row) => (
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {row.name}
              {row.isSystem && (
                <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-500 dark:bg-neutral-800">
                  System
                </span>
              )}
            </span>
          ),
        },
        { header: "Description", cell: (row) => row.description ?? "—" },
        {
          header: "Assets Scope",
          cell: (row) => SCOPE_LABELS[row.moduleScopes.assets] ?? row.moduleScopes.assets ?? "—",
        },
        { header: "Permissions", cell: (row) => row._count.rolePermissions },
        { header: "Users", cell: (row) => row._count.users },
      ]}
      rows={roles}
      totalCount={roles.length}
      page={1}
      pageSize={Math.max(roles.length, 1)}
      getRowId={(row) => row.id}
      searchPlaceholder="Search roles..."
      rowActions={
        canEdit || canDelete
          ? (row) => (
              <div className="flex justify-end gap-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/roles/${row.id}/edit`}>Edit</Link>}
                  />
                )}
                {canDelete && !row.isSystem && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </Button>
                    }
                    title="Delete role"
                    description={`Are you sure you want to delete "${row.name}"? This cannot be undone.`}
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => handleDelete(row.id)}
                  />
                )}
              </div>
            )
          : undefined
      }
    />
  );
}
