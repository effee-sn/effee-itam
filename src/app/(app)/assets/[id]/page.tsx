import Link from "next/link";
import { notFound } from "next/navigation";
import { Info, Pencil, MapPin, User, Building2, CalendarPlus, CalendarClock, Clock } from "lucide-react";
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
import { CopyButton } from "./copy-button";
import { AssetMoreMenu } from "./asset-more-menu";

const STATUS_STYLES: Record<string, { label: string; dot: string; pill: string }> = {
  AVAILABLE: { label: "Available", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  ASSIGNED: { label: "Assigned", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  UNDER_REPAIR: { label: "Under Repair", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  RETIRED: { label: "Retired", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" },
  LOST: { label: "Lost", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
};

const ACTION_LABELS: Record<string, string> = { ASSIGN: "Assigned", RETURN: "Returned", TRANSFER: "Transferred" };
const COPYABLE = new Set(["Asset Tag", "Serial Number", "UUID", "MAC Address"]);

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, dot: "bg-slate-400", pill: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function fmtDate(v: Date | null) {
  return v ? new Date(v).toLocaleDateString() : "—";
}
function fmtDateTime(v: Date | null) {
  return v ? new Date(v).toLocaleString() : "—";
}

const cardClass = "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession("assets.view");
  const { id } = await params;
  const actor = { moduleScopes: session.moduleScopes, userId: session.userId, departmentId: session.departmentId };
  const asset = await getAssetById(Number(id), actor);
  if (!asset) notFound();

  const canEdit = hasPermission(session, "assets.edit");
  const canAssign = hasPermission(session, "assets.assign");
  const canReturn = hasPermission(session, "assets.return");
  const canDelete = hasPermission(session, "assets.delete");
  const canViewAssignmentHistory = hasPermission(session, "assets.view_history");
  const isComputer = asset.assetType === "COMPUTER";

  const [users, history, components, connections, connectableAssets] = await Promise.all([
    listUserOptions(),
    canViewAssignmentHistory ? getAssignmentHistory(asset.id) : Promise.resolve([]),
    isComputer ? listComponents(asset.id) : Promise.resolve([]),
    getConnections(asset.id),
    isComputer && canEdit ? listConnectableAssets(asset.id) : Promise.resolve([]),
  ]);

  const descriptor = descriptorFor(asset.assetType);
  const hidden = new Set<string>(descriptor.hiddenBaseFields ?? []);
  const show = (key: string) => !hidden.has(key);
  const labelFor = (key: string, fallback: string) =>
    (descriptor.baseFieldOverrides as Record<string, { label: string } | undefined> | undefined)?.[key]?.label ?? fallback;

  const detailRow = (asset[descriptor.relationKey as keyof typeof asset] ?? null) as Record<string, unknown> | null;
  const detailFields: [string, string][] = descriptor.fields.map((field) => {
    const value = detailRow?.[field.key];
    if (field.kind === "checkbox") return [field.label, value ? "Yes" : "No"];
    if (value === null || value === undefined || value === "") return [field.label, "—"];
    return [field.label, String(value)];
  });

  // A type whose detail fields already include a "Type" row (a computer's Desktop/Laptop/Server
  // sub-type) doesn't also need the generic "Computer" row — that's the same column twice.
  const hasTypeDetail = detailFields.some(([label]) => label === "Type");

  const fields: [string, string][] = [
    ["Asset Tag", asset.assetTag],
    [labelFor("serialNumber", "Serial Number"), asset.serialNumber ?? "—"],
    ...(hasTypeDetail ? ([] as [string, string][]) : ([["Type", descriptor.labelSingular]] as [string, string][])),
    ...detailFields,
    ...(show("hostname") ? ([["Hostname", asset.hostname ?? "—"]] as [string, string][]) : []),
    ...(show("macAddress") ? ([["MAC Address", asset.macAddress ?? "—"]] as [string, string][]) : []),
    ...(show("ipAddress") ? ([["IP Address", asset.ipAddress ?? "—"]] as [string, string][]) : []),
    ...(show("brand") ? ([["Brand", asset.brand ?? "—"]] as [string, string][]) : []),
    ...(show("model") ? ([["Model", asset.model ?? "—"]] as [string, string][]) : []),
    [labelFor("vendorId", "Vendor"), asset.vendor?.name ?? "—"],
    ["Department", asset.department?.name ?? "—"],
    ["Assigned To", asset.currentAssignedUser?.name ?? "—"],
    ["Status", STATUS_STYLES[asset.status]?.label ?? asset.status],
    ...(show("purchaseDate")
      ? ([
          ["Purchase Date", fmtDate(asset.purchaseDate)],
          ["Invoice Number", asset.invoiceNumber ?? "—"],
          ["Warranty Start", fmtDate(asset.warrantyStart)],
          ["Warranty End", fmtDate(asset.warrantyEnd)],
          ["Cost", asset.cost ? asset.cost.toString() : "—"],
        ] as [string, string][])
      : []),
  ];

  const subtitle = [isComputer ? (detailRow?.subType as string) : null, asset.brand, asset.model].filter(Boolean).join(" • ");

  const meta: { icon: typeof MapPin; label: string; value: string }[] = [
    { icon: MapPin, label: "Location", value: "—" },
    { icon: User, label: "Assigned To", value: asset.currentAssignedUser?.name ?? "—" },
    { icon: Building2, label: "Department", value: asset.department?.name ?? "—" },
    { icon: Clock, label: "Last Seen", value: fmtDateTime(asset.updatedAt) },
    { icon: CalendarPlus, label: "Added On", value: fmtDateTime(asset.createdAt) },
    { icon: CalendarClock, label: "Updated On", value: fmtDateTime(asset.updatedAt) },
  ];

  const tabTrigger =
    "h-9 flex-none rounded-lg border border-neutral-200 bg-white px-4 text-neutral-600 shadow-sm data-active:border-blue-600 data-active:bg-blue-600 data-active:text-white data-active:shadow dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";

  return (
    <div className="space-y-5 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700 dark:hover:text-neutral-300">Dashboard</Link>
        <span>/</span>
        <Link href="/assets/computers" className="hover:text-neutral-700 dark:hover:text-neutral-300">Assets</Link>
        <span>/</span>
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{asset.assetTag}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{asset.assetTag}</h1>
            <StatusPill status={asset.status} />
          </div>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        </div>
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
            <Link
              href={`/assets/${asset.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          )}
          {canDelete && <AssetMoreMenu assetId={asset.id} assetTag={asset.assetTag} />}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* General information */}
        <div className={cardClass}>
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <Info className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold leading-tight">General Information</h2>
              <p className="text-xs text-neutral-500">Basic details about this asset</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            {fields.map(([label, value], i) => (
              <div key={`${label}-${i}`} className="min-w-0">
                <dt className="text-[13px] text-neutral-400">{label}</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {label === "Status" ? (
                    <StatusPill status={asset.status} />
                  ) : (
                    <span className="truncate">{value}</span>
                  )}
                  {COPYABLE.has(label) && value !== "—" && <CopyButton value={value} />}
                </dd>
              </div>
            ))}
            {connections.connectedToComputer && (
              <div className="min-w-0">
                <dt className="text-[13px] text-neutral-400">Connected To</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  <Link href={`/assets/${connections.connectedToComputer.computerAsset.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    {connections.connectedToComputer.computerAsset.assetTag}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Right sidebar: QR + meta */}
        <div className="space-y-5">
          <div className={`${cardClass} flex flex-col items-center text-center`}>
            <AssetLabel assetTag={asset.assetTag} brand={asset.brand} model={asset.model} />
          </div>
          <div className={cardClass}>
            <dl className="space-y-3.5">
              {meta.map(({ icon: MetaIcon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <MetaIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                  <dt className="text-sm text-neutral-500">{label}</dt>
                  <dd className="ml-auto truncate text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {asset.notes && (
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-neutral-500">Notes</h2>
          <p className="mt-1 text-sm whitespace-pre-wrap">{asset.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={isComputer ? "components" : "images"}>
        <TabsList className="h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0">
          {isComputer && <TabsTrigger value="components" className={tabTrigger}>Components</TabsTrigger>}
          {isComputer && <TabsTrigger value="connections" className={tabTrigger}>Connected Devices</TabsTrigger>}
          <TabsTrigger value="images" className={tabTrigger}>Images</TabsTrigger>
          <TabsTrigger value="documents" className={tabTrigger}>Documents</TabsTrigger>
          {canViewAssignmentHistory && <TabsTrigger value="assignment" className={tabTrigger}>Assignment History</TabsTrigger>}
        </TabsList>

        {isComputer && (
          <TabsContent value="components">
            <ComputerComponents assetId={asset.id} components={components} canEdit={canEdit} />
          </TabsContent>
        )}
        {isComputer && (
          <TabsContent value="connections">
            <ComputerConnections assetId={asset.id} connections={connections.connectedDevices} available={connectableAssets} canEdit={canEdit} />
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
              <div className={`${cardClass} text-center text-sm text-neutral-500`}>No assignment history yet.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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
