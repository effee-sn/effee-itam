"use client";

import { DataTable } from "@/components/shared/DataTable";

type AuditLogRow = {
  id: number;
  action: string;
  module: string;
  entityType: string | null;
  entityId: number | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string | Date;
  user: { name: string } | null;
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  ASSIGN: "Assign",
  RETURN: "Return",
  PERMISSION_CHANGE: "Permission Change",
};

export function AuditLogTable({
  items,
  total,
  page,
  pageSize,
}: {
  items: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  return (
    <DataTable
      columns={[
        { header: "Timestamp", cell: (row) => new Date(row.createdAt).toLocaleString() },
        { header: "User", cell: (row) => row.user?.name ?? "System" },
        { header: "Action", cell: (row) => ACTION_LABELS[row.action] ?? row.action },
        { header: "Module", cell: (row) => row.module },
        { header: "Entity", cell: (row) => (row.entityType ? `${row.entityType} #${row.entityId}` : "—") },
        { header: "Description", cell: (row) => row.description ?? "—" },
        { header: "IP Address", cell: (row) => row.ipAddress ?? "—" },
      ]}
      rows={items}
      totalCount={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      searchPlaceholder="Search description..."
    />
  );
}
