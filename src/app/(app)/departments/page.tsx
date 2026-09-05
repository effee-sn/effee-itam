import Link from "next/link";
import { ChevronRight, Building2, FileText, FileSpreadsheet } from "lucide-react";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { listDepartmentsForExport } from "@/modules/departments/service";
import { DepartmentsTable, CreateDepartmentButton } from "./departments-table";
import { DepartmentImportDialog } from "./departments-import-dialog";

const outlineBtn =
  "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

export default async function DepartmentsPage() {
  const session = await requirePageSession("departments.view");

  const departments = await listDepartmentsForExport();
  const items = departments.map((d) => ({ id: d.id, name: d.name, createdAt: d.createdAt.toISOString() }));

  const canCreate = hasPermission(session, "departments.create");
  const canEdit = hasPermission(session, "departments.edit");
  const canDelete = hasPermission(session, "departments.delete");

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">Departments</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Departments</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage departments within your organization.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download route, not a page */}
          <a href="/api/departments/export?format=csv" className={outlineBtn}>
            <FileText className="h-4 w-4 text-neutral-500" /> Export CSV
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download route, not a page */}
          <a href="/api/departments/export?format=xlsx" className={outlineBtn}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export Excel
          </a>
          {canCreate && <DepartmentImportDialog />}
          {canCreate && <CreateDepartmentButton />}
        </div>
      </div>

      <DepartmentsTable items={items} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
