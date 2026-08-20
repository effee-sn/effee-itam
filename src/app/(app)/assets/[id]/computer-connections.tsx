"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { OptionSelect } from "@/components/shared/OptionSelect";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { connectionSchema, type ConnectionInput } from "@/modules/assets/computers-validators";

const TYPE_LABELS: Record<string, string> = {
  MONITOR: "Monitor",
  PRINTER: "Printer",
  PHONE: "Phone",
  SIM_CARD: "SIM Card",
  NETWORK_DEVICE: "Network Device",
  PERIPHERAL: "Peripheral",
  OTHER: "Other",
};

type ConnectableAsset = {
  id: number;
  assetTag: string;
  assetType: string;
  brand: string | null;
  model: string | null;
};

type Connection = {
  id: number;
  connectedAt: string | Date;
  notes: string | null;
  connectedAsset: ConnectableAsset;
};

function ConnectDeviceDialog({ assetId, available }: { assetId: number; available: ConnectableAsset[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConnectionInput>({ resolver: zodResolver(connectionSchema) });

  async function onSubmit(data: ConnectionInput) {
    const res = await fetch(`/api/assets/${assetId}/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to connect device");
      return;
    }
    toast.success("Device connected");
    setOpen(false);
    reset({});
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({});
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Connect Device
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Device</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Device</FieldLabel>
            <Controller
              control={control}
              name="connectedAssetId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                  options={available.map((a) => ({
                    value: String(a.id),
                    label: `${[a.assetTag, a.brand, a.model].filter(Boolean).join(" — ")} (${TYPE_LABELS[a.assetType] ?? a.assetType})`,
                  }))}
                  placeholder="Select a device"
                />
              )}
            />
            <FieldError errors={[errors.connectedAssetId]} />
            <p className="text-xs text-neutral-500">
              Only devices that aren&apos;t already connected to another computer are listed.
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Input id="notes" placeholder="e.g. left-hand monitor, via dock" {...register("notes")} />
            <FieldError errors={[errors.notes]} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || available.length === 0}>
              {isSubmitting ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ComputerConnections({
  assetId,
  connections,
  available,
  canEdit,
}: {
  assetId: number;
  connections: Connection[];
  available: ConnectableAsset[];
  canEdit: boolean;
}) {
  const router = useRouter();

  async function handleDisconnect(connectionId: number) {
    const res = await fetch(`/api/assets/${assetId}/connections/${connectionId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to disconnect device");
      return;
    }
    toast.success("Device disconnected");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <ConnectDeviceDialog assetId={assetId} available={available} />
        </div>
      )}
      {connections.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No devices connected. Attach the monitors, printers and peripherals used with this machine so
          they show up here instead of looking unassigned.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Brand / Model</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Notes</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell>
                    <Link
                      href={`/assets/${connection.connectedAsset.id}`}
                      className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
                    >
                      {connection.connectedAsset.assetTag}
                    </Link>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[connection.connectedAsset.assetType] ?? connection.connectedAsset.assetType}</TableCell>
                  <TableCell>
                    {[connection.connectedAsset.brand, connection.connectedAsset.model].filter(Boolean).join(" / ") ||
                      "—"}
                  </TableCell>
                  <TableCell>{new Date(connection.connectedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{connection.notes ?? "—"}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive">
                            Disconnect
                          </Button>
                        }
                        title="Disconnect device"
                        description={`Disconnect "${connection.connectedAsset.assetTag}" from this computer? The device itself isn't changed.`}
                        confirmLabel="Disconnect"
                        destructive
                        onConfirm={() => handleDisconnect(connection.id)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
