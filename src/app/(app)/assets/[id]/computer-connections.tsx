"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Cable, Plus, Unlink } from "lucide-react";
import { Input } from "@/components/ui/input";
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
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Connect Device
          </button>
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
            <button
              type="submit"
              disabled={isSubmitting || available.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Connecting…" : "Connect Device"}
            </button>
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

  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Cable className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">Connected Devices</h2>
            <p className="text-xs text-neutral-500">Monitors, printers and peripherals attached to this computer</p>
          </div>
        </div>
        {canEdit && <ConnectDeviceDialog assetId={assetId} available={available} />}
      </div>

      {connections.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-neutral-500">
          No devices connected. Attach the monitors, printers and peripherals used with this machine so
          they show up here instead of looking unassigned.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className={th}>Asset Tag</th>
                <th className={th}>Type</th>
                <th className={th}>Brand / Model</th>
                <th className={th}>Connected</th>
                <th className={th}>Notes</th>
                {canEdit && <th className={`${th} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {connections.map((connection) => (
                <tr key={connection.id} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50 dark:border-neutral-800/70 dark:hover:bg-neutral-800/40">
                  <td className={td}>
                    <Link href={`/assets/${connection.connectedAsset.id}`} className="font-medium text-neutral-900 hover:text-blue-600 dark:text-neutral-100 dark:hover:text-blue-400">
                      {connection.connectedAsset.assetTag}
                    </Link>
                  </td>
                  <td className={td}>{TYPE_LABELS[connection.connectedAsset.assetType] ?? connection.connectedAsset.assetType}</td>
                  <td className={td}>{[connection.connectedAsset.brand, connection.connectedAsset.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td className={td}>{new Date(connection.connectedAt).toLocaleDateString()}</td>
                  <td className={td}>{connection.notes ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <ConfirmDialog
                        trigger={
                          <button title="Disconnect" className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
                            <Unlink className="h-4 w-4" />
                          </button>
                        }
                        title="Disconnect device"
                        description={`Disconnect "${connection.connectedAsset.assetTag}" from this computer? The device itself isn't changed.`}
                        confirmLabel="Disconnect"
                        destructive
                        onConfirm={() => handleDisconnect(connection.id)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
