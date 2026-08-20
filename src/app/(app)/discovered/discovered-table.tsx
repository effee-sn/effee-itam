"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type DiscoveredRow = {
  id: number;
  deviceType: "COMPUTER" | "MONITOR";
  hostname: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  osName: string | null;
  sizeInches: number | null;
  seenOn: string | null;
  lastSeen: string;
  componentCount: number;
};

/** What this row will become, in the words shown to the user. */
function describe(row: DiscoveredRow) {
  if (row.deviceType === "MONITOR") {
    const size = row.sizeInches ? `${row.sizeInches}" ` : "";
    return {
      typeLabel: "Monitor",
      name: `${size}${[row.manufacturer, row.model].filter(Boolean).join(" ") || "Monitor"}`,
      detail: row.osName ?? "",
    };
  }
  return {
    typeLabel: "Computer",
    name: row.hostname ?? row.serialNumber ?? "Computer",
    detail: row.osName ?? "",
  };
}

function OnboardDialog({ row }: { row: DiscoveredRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const info = describe(row);
  const isMonitor = row.deviceType === "MONITOR";

  async function submit() {
    setSaving(true);
    const res = await fetch(`/api/discovered/${row.id}/onboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetTag: tag }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Could not onboard this device");
      return;
    }
    toast.success(isMonitor ? "Monitor added and connected" : "Added to inventory");
    setOpen(false);
    router.push(`/assets/${json.data.asset.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTag("");
      }}
    >
      <DialogTrigger render={<Button size="sm">Add to inventory</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {info.name} to inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            {isMonitor ? (
              <>
                Creates a monitor with the make, model{row.serialNumber ? ", size and serial" : " and size"} the
                agent collected
                {row.seenOn ? (
                  <>
                    , and connects it to <span className="font-medium">{row.seenOn}</span>
                  </>
                ) : null}
                . Just give it your asset tag.
              </>
            ) : (
              <>
                Creates a computer from what the agent collected — OS, network and {row.componentCount} hardware
                component{row.componentCount === 1 ? "" : "s"}. Just give it your asset tag.
              </>
            )}
          </p>
          {row.serialNumber ? (
            <p className="text-xs text-neutral-500">
              Serial: <span className="font-mono">{row.serialNumber}</span>
            </p>
          ) : isMonitor ? (
            // Without a serial this display was identified only by model + the machine it's on, so
            // it can't be told apart from an identical unit. Say so, rather than let someone create
            // a second asset for a monitor they already have.
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              This display reports no serial number, so it was identified by model and the machine
              it&apos;s plugged into. Check it isn&apos;t already in inventory before adding it — then
              type the serial from its sticker on the asset afterwards.
            </p>
          ) : null}
          <Field>
            <FieldLabel htmlFor={`tag-${row.id}`}>Asset Tag</FieldLabel>
            <Input
              id={`tag-${row.id}`}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={isMonitor ? "e.g. EII/MNT/26/002" : "e.g. EII/LAP/26/002"}
              autoFocus
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || tag.trim().length === 0}>
            {saving ? "Adding..." : isMonitor ? "Create monitor" : "Create computer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DiscoveredTable({ rows }: { rows: DiscoveredRow[] }) {
  const router = useRouter();

  async function dismiss(id: number) {
    const res = await fetch(`/api/discovered/${id}/dismiss`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Could not dismiss");
      return;
    }
    toast.success("Dismissed");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-neutral-500">
        Nothing waiting. When the inventory agent reports a computer or a monitor that isn&apos;t in inventory
        yet, it shows up here for you to onboard.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Serial</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Found On</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const info = describe(row);
            return (
              <TableRow key={row.id}>
                <TableCell>{info.typeLabel}</TableCell>
                <TableCell className="font-medium">{info.name}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.serialNumber ?? <span className="font-sans text-neutral-500">not reported</span>}
                </TableCell>
                <TableCell className="text-sm text-neutral-500">
                  {row.deviceType === "MONITOR"
                    ? row.sizeInches
                      ? `${row.sizeInches}"`
                      : "—"
                    : `${row.osName ?? "—"}${row.componentCount ? ` · ${row.componentCount} parts` : ""}`}
                </TableCell>
                <TableCell>{row.seenOn ?? "—"}</TableCell>
                <TableCell>{new Date(row.lastSeen).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <OnboardDialog row={row} />
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Dismiss
                        </Button>
                      }
                      title="Dismiss device"
                      description={`Ignore "${info.name}"? It won't be onboarded. If the agent reports it again, it will reappear here.`}
                      confirmLabel="Dismiss"
                      destructive
                      onConfirm={() => dismiss(row.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
