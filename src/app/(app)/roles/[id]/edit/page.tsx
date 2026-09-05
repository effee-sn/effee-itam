import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requirePageSession } from "@/modules/rbac/permissions";
import { getRoleById, listAllPermissionsGrouped } from "@/modules/roles/service";
import { RoleForm } from "../../role-form";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession("roles.edit");
  const { id } = await params;

  const [role, permissionGroups] = await Promise.all([getRoleById(Number(id)), listAllPermissionsGrouped()]);
  if (!role) notFound();

  return (
    <div className="space-y-5 p-6">
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/roles" className="hover:text-neutral-700 dark:hover:text-neutral-300">Roles</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Edit Role</span>
      </nav>
      <RoleForm role={role} permissionGroups={permissionGroups} />
    </div>
  );
}
