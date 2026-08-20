import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { requirePageSession, hasPermission } from "@/modules/rbac/permissions";
import { getAssetById } from "@/modules/assets/service";
import { getAssignmentHistory } from "@/modules/assignments/service";
import { listUserOptions } from "@/modules/users/service";
import { descriptorFor } from "@/modules/assets/types/registry";
import { listComponents, getConnections, listConnectableAssets } from "@/modules/assets/computers";
import { ComputerComponents } from "./computer-components";
import { ComputerConnections } from "./computer-connections";
import { AssetImages } from "./asset-images";
import { AssetDocuments } from "./asset-documents";
import { AssetAssignmentActions } from "./asset-assignment-actions";
import { AssetLabel } from "./asset-label";

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  UNDER_REPAIR: "Under Repair",
  RETIRED: "Retired",
  LOST: "Lost",
};

const ACTION_LABELS: Record<string, string> = {
  ASSIGN: "Assigned",
  RETURN: "Returned",
  TRANSFER: "Transferred",
};

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession("assets.view");
  const { id } = await params;
  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
  const asset = await getAssetById(Number(id), actor);
  if (!asset) notFound();

  const canEdit = hasPermission(session, "assets.edit");
  const canAssign = hasPermission(session, "assets.assign");
  const canReturn = hasPermission(session, "assets.return");
  const canViewAssignmentHistory = hasPermission(session, "assets.view_history");

  // Assignment history (who had this before the current holder) is the sensitive one and
  // stays behind its own permission.
  // Computers carry three extra sections (components, connected devices, installed software).
  // Only fetched for computers — every other type would get empty results anyway.
  const isComputer = asset.assetType === "COMPUTER";

  const [users, history, components, connections, connectableAssets] = await Promise.all([
    listUserOptions(),
    canViewAssignmentHistory ? getAssignmentHistory(asset.id) : Promise.resolve([]),
    isComputer ? listComponents(asset.id) : Promise.resolve([]),
    // Fetched for every type, not just computers: the other half of this — "which machine is
    // this monitor plugged into?" — is exactly what you want on the device's own page, and
    // without it a connected monitor looked unattached from its own side.
    getConnections(asset.id),
    isComputer && canEdit ? listConnectableAssets(asset.id) : Promise.resolve([]),
  ]);

  // Which fields this asset shows is now entirely registry-driven — the type decides what's
  // relevant, what's hidden, and what gets relabelled (a SIM's Vendor reads "Network
  // Provider"). This replaced a duplicated map that branched on category NAME strings.
  const descriptor = descriptorFor(asset.assetType);
  const hidden = new Set<string>(descriptor.hiddenBaseFields ?? []);
  const show = (key: string) => !hidden.has(key);
  const labelFor = (key: string, fallback: string) =>
    (descriptor.baseFieldOverrides as Record<string, { label: string } | undefined> | undefined)?.[key]?.label ??
    fallback;

  // The type's own detail row, flattened to label/value pairs in the registry's field order.
  const detailRow = (asset[descriptor.relationKey as keyof typeof asset] ?? null) as Record<string, unknown> | null;
  const detailFields: [string, string][] = descriptor.fields.map((field) => {
    const value = detailRow?.[field.key];
    if (field.kind === "checkbox") return [field.label, value ? "Yes" : "No"];
    if (value === null || value === undefined || value === "") return [field.label, "—"];
    return [field.label, String(value)];
  });

  const fields: [string, string][] = [
    ["Asset Tag", asset.assetTag],
    [labelFor("serialNumber", "Serial Number"), asset.serialNumber ?? "—"],
    ["Type", descriptor.labelSingular],
    ...detailFields,
    ...(show("hostname") ? ([["Hostname", asset.hostname ?? "—"]] as [string, string][]) : []),
    ...(show("macAddress") ? ([["MAC Address", asset.macAddress ?? "—"]] as [string, string][]) : []),
    ...(show("ipAddress") ? ([["IP Address", asset.ipAddress ?? "—"]] as [string, string][]) : []),
    ...(show("brand") ? ([["Brand", asset.brand ?? "—"]] as [string, string][]) : []),
    ...(show("model") ? ([["Model", asset.model ?? "—"]] as [string, string][]) : []),
    [labelFor("vendorId", "Vendor"), asset.vendor?.name ?? "—"],
    ["Department", asset.department?.name ?? "—"],
    ["Assigned To", asset.currentAssignedUser?.name ?? "—"],
    ["Status", STATUS_LABELS[asset.status] ?? asset.status],
    ...(show("purchaseDate")
      ? ([
          ["Purchase Date", formatDate(asset.purchaseDate)],
          ["Invoice Number", asset.invoiceNumber ?? "—"],
          ["Warranty Start", formatDate(asset.warrantyStart)],
          ["Warranty End", formatDate(asset.warrantyEnd)],
          ["Cost", asset.cost ? asset.cost.toString() : "—"],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{asset.assetTag}</h1>
        <div className="flex items-center gap-2">
          <AssetAssignmentActions
            assetId={asset.id}
            status={asset.status}
            currentAssignedUserId={asset.currentAssignedUserId}
            users={users}
            canAssign={canAssign}
            canReturn={canReturn}
          />
          {canEdit && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/assets/${asset.id}/edit`}>Edit</Link>}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 rounded-md border p-4 sm:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-neutral-500 uppercase">{label}</dt>
              <dd className="mt-0.5 text-sm">{value}</dd>
            </div>
          ))}
          {connections.connectedToComputer && (
            <div>
              <dt className="text-xs font-medium text-neutral-500 uppercase">Connected To</dt>
              <dd className="mt-0.5 text-sm">
                <Link
                  href={`/assets/${connections.connectedToComputer.computerAsset.id}`}
                  className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                >
                  {connections.connectedToComputer.computerAsset.assetTag}
                </Link>
                {(connections.connectedToComputer.computerAsset.brand ||
                  connections.connectedToComputer.computerAsset.model) && (
                  <span className="text-neutral-500">
                    {" "}
                    (
                    {[
                      connections.connectedToComputer.computerAsset.brand,
                      connections.connectedToComputer.computerAsset.model,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    )
                  </span>
                )}
              </dd>
            </div>
          )}
        </div>

        <div className="lg:w-64 lg:shrink-0">
          <AssetLabel assetTag={asset.assetTag} brand={asset.brand} model={asset.model} />
        </div>
      </div>

      {asset.notes && (
        <div className="rounded-md border p-4">
          <h2 className="text-sm font-medium text-neutral-500">Notes</h2>
          <p className="mt-1 text-sm whitespace-pre-wrap">{asset.notes}</p>
        </div>
      )}

      {/* Computers open on Components — the specification is what you usually came to check. */}
      <Tabs defaultValue={isComputer ? "components" : "images"}>
        <TabsList>
          {isComputer && <TabsTrigger value="components">Components</TabsTrigger>}
          {isComputer && <TabsTrigger value="connections">Connected Devices</TabsTrigger>}
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {canViewAssignmentHistory && <TabsTrigger value="assignment">Assignment History</TabsTrigger>}
        </TabsList>

        {isComputer && (
          <TabsContent value="components">
            <ComputerComponents assetId={asset.id} components={components} canEdit={canEdit} />
          </TabsContent>
        )}

        {isComputer && (
          <TabsContent value="connections">
            <ComputerConnections
              assetId={asset.id}
              connections={connections.connectedDevices}
              available={connectableAssets}
              canEdit={canEdit}
            />
          </TabsContent>
        )}

        <TabsContent value="images">
          <AssetImages assetId={asset.id} images={asset.images} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="documents">
          <AssetDocuments assetId={asset.id} documents={asset.documents} canEdit={canEdit} />
        </TabsContent>

        {canViewAssignmentHistory && (
          <TabsContent value="assignment">
            {history.length === 0 ? (
              <p className="text-sm text-neutral-500">No assignment history yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
                        <TableCell>{entry.fromUser?.name ?? "—"}</TableCell>
                        <TableCell>{entry.toUser?.name ?? "—"}</TableCell>
                        <TableCell>{entry.performedBy.name}</TableCell>
                        <TableCell>{new Date(entry.actionDate).toLocaleString()}</TableCell>
                        <TableCell>{entry.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
