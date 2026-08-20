"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type AssetRow = {
  id: number;
  assetTag: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  hostname: string | null;
  ipAddress: string | null;
  status: string;
  assetType: string;
  department: { name: string } | null;
  currentAssignedUser: { name: string } | null;
  // Per-type detail. Exactly one is ever non-null (none for OTHER).
  computer?: { osName: string | null; subType: string | null } | null;
  monitor?: { sizeInches: string | null; resolution: string | null } | null;
  printer?: { printerType: string | null } | null;
  phone?: { imei: string | null; phoneNumber: string | null } | null;
  simCard?: { mobileNumber: string | null; planName: string | null } | null;
  networkDevice?: { deviceType: string | null } | null;
  peripheral?: { peripheralType: string | null; interface: string | null } | null;
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

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  UNDER_REPAIR: "Under Repair",
  RETIRED: "Retired",
  LOST: "Lost",
};

// Column key -> how to render it. Keys come from a type's `listColumns` in the asset type
// registry, so adding a column there needs a matching entry here and nothing else.
const COLUMN_RENDERERS: Record<string, { header: string; cell: (row: AssetRow) => React.ReactNode }> = {
  // Base columns
  // `type` is only meaningful on the combined My/Department Assets list — a type's own page
  // is already filtered to one type, so it would repeat the same word on every row there.
  type: { header: "Type", cell: (row) => ASSET_TYPE_LABELS[row.assetType] ?? row.assetType },
  hostname: { header: "Hostname", cell: (row) => row.hostname || "—" },
  ipAddress: { header: "IP Address", cell: (row) => row.ipAddress || "—" },
  serialNumber: { header: "Serial Number", cell: (row) => row.serialNumber || "—" },
  brandModel: {
    header: "Brand / Model",
    cell: (row) => [row.brand, row.model].filter(Boolean).join(" / ") || "—",
  },
  department: { header: "Department", cell: (row) => row.department?.name ?? "—" },
  assignedTo: { header: "Assigned To", cell: (row) => row.currentAssignedUser?.name ?? "—" },
  // Detail-table columns
  subType: { header: "Type", cell: (row) => row.computer?.subType || "—" },
  osName: { header: "Operating System", cell: (row) => row.computer?.osName || "—" },
  sizeInches: { header: "Size", cell: (row) => (row.monitor?.sizeInches ? `${row.monitor.sizeInches}"` : "—") },
  resolution: { header: "Resolution", cell: (row) => row.monitor?.resolution || "—" },
  printerType: { header: "Type", cell: (row) => row.printer?.printerType || "—" },
  imei: { header: "IMEI", cell: (row) => row.phone?.imei || "—" },
  phoneNumber: { header: "Phone Number", cell: (row) => row.phone?.phoneNumber || "—" },
  mobileNumber: { header: "Mobile Number", cell: (row) => row.simCard?.mobileNumber || "—" },
  planName: { header: "Plan", cell: (row) => row.simCard?.planName || "—" },
  deviceType: { header: "Device Type", cell: (row) => row.networkDevice?.deviceType || "—" },
  peripheralType: { header: "Type", cell: (row) => row.peripheral?.peripheralType || "—" },
  interface: { header: "Interface", cell: (row) => row.peripheral?.interface || "—" },
};

export function AssetsTable({
  items,
  total,
  page,
  pageSize,
  canEdit,
  canDelete,
  showDeleted,
  extraColumns,
}: {
  items: AssetRow[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canDelete: boolean;
  showDeleted: boolean;
  /** Column keys from the type's registry entry. */
  extraColumns: string[];
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete asset");
      return;
    }
    toast.success("Asset deleted");
    router.refresh();
  }

  async function handleRestore(id: number) {
    const res = await fetch(`/api/assets/${id}/restore`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to restore asset");
      return;
    }
    toast.success("Asset restored");
    router.refresh();
  }

  // Asset Tag and Status always bookend the table; what sits between them is what the type
  // actually cares about (a SIM shows its mobile number, a computer its OS).
  const middleColumns = extraColumns.map((key) => COLUMN_RENDERERS[key]).filter(Boolean);

  return (
    <DataTable
      columns={[
        {
          header: "Asset Tag",
          cell: (row) =>
            showDeleted ? (
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.assetTag}</span>
            ) : (
              <Link
                href={`/assets/${row.id}`}
                className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
              >
                {row.assetTag}
              </Link>
            ),
        },
        // No Type column: every list is already filtered to one type, so repeating
        // "Computer" on every row would be noise.
        ...middleColumns,
        { header: "Status", cell: (row) => STATUS_LABELS[row.status] ?? row.status },
      ]}
      rows={items}
      totalCount={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      searchPlaceholder="Search by tag, serial, IMEI, hostname, MAC, brand, model..."
      rowActions={
        showDeleted
          ? canDelete
            ? (row) => (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleRestore(row.id)}>
                    Restore
                  </Button>
                </div>
              )
            : undefined
          : canEdit || canDelete
            ? (row) => (
                <div className="flex justify-end gap-2">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/assets/${row.id}/edit`}>Edit</Link>}
                    />
                  )}
                  {canDelete && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Delete
                        </Button>
                      }
                      title="Delete asset"
                      description={`Are you sure you want to delete "${row.assetTag}"? You can restore it later from Show Deleted.`}
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
