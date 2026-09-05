"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  type LucideIcon,
  Cpu,
  MemoryStick,
  HardDrive,
  Box,
  Network,
  CircuitBoard,
  Zap,
  Volume2,
  Battery,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  componentSchema,
  COMPONENT_TYPES,
  COMPONENT_TYPE_LABELS,
  type ComponentInput,
} from "@/modules/assets/computers-validators";

type Component = {
  id: number;
  type: string;
  name: string;
  specification: string | null;
  capacity: string | null;
  serialNumber: string | null;
  quantity: number;
};

const TYPE_OPTIONS = COMPONENT_TYPES.map((value) => ({ value, label: COMPONENT_TYPE_LABELS[value] }));

const COMPONENT_META: Record<string, { icon: LucideIcon; color: string }> = {
  PROCESSOR: { icon: Cpu, color: "text-blue-500" },
  MEMORY: { icon: MemoryStick, color: "text-violet-500" },
  STORAGE: { icon: HardDrive, color: "text-amber-500" },
  GRAPHICS: { icon: Box, color: "text-emerald-500" },
  NETWORK_CARD: { icon: Network, color: "text-cyan-500" },
  MOTHERBOARD: { icon: CircuitBoard, color: "text-rose-500" },
  POWER_SUPPLY: { icon: Zap, color: "text-orange-500" },
  SOUND_CARD: { icon: Volume2, color: "text-pink-500" },
  CASE: { icon: Box, color: "text-slate-500" },
  BATTERY: { icon: Battery, color: "text-green-500" },
  OTHER: { icon: Box, color: "text-slate-400" },
};

function AddComponentDialog({ assetId }: { assetId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComponentInput>({
    resolver: zodResolver(componentSchema),
    defaultValues: { type: "PROCESSOR", name: "", quantity: "1" },
  });

  async function onSubmit(data: ComponentInput) {
    const res = await fetch(`/api/assets/${assetId}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to add component");
      return;
    }
    toast.success("Component added");
    setOpen(false);
    reset({ type: "PROCESSOR", name: "", quantity: "1" });
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({ type: "PROCESSOR", name: "", quantity: "1" });
      }}
    >
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Component
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Component</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Type</FieldLabel>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ?? "PROCESSOR"}
                  onValueChange={field.onChange}
                  options={TYPE_OPTIONS}
                  placeholder="Select type"
                />
              )}
            />
            <FieldError errors={[errors.type]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" placeholder="e.g. Intel Core i7-1265U" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
              <Input id="capacity" placeholder="e.g. 16 GB, 512 GB" {...register("capacity")} />
              <FieldError errors={[errors.capacity]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
              <Input id="quantity" inputMode="numeric" placeholder="1" {...register("quantity")} />
              <FieldError errors={[errors.quantity]} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="specification">Specification</FieldLabel>
            <Input id="specification" placeholder="e.g. 10 cores @ 4.8GHz, DDR5-4800" {...register("specification")} />
            <FieldError errors={[errors.specification]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="serialNumber">Serial Number</FieldLabel>
            <Input id="serialNumber" {...register("serialNumber")} />
            <FieldError errors={[errors.serialNumber]} />
          </Field>
          <DialogFooter>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Adding…" : "Add Component"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ComputerComponents({
  assetId,
  components,
  canEdit,
}: {
  assetId: number;
  components: Component[];
  canEdit: boolean;
}) {
  const router = useRouter();

  async function handleDelete(componentId: number) {
    const res = await fetch(`/api/assets/${assetId}/components/${componentId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to remove component");
      return;
    }
    toast.success("Component removed");
    router.refresh();
  }

  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500";
  const td = "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <Cpu className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">Hardware Components</h2>
            <p className="text-xs text-neutral-500">Detailed hardware information for this asset</p>
          </div>
        </div>
        {canEdit && <AddComponentDialog assetId={assetId} />}
      </div>

      {components.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-neutral-500">
          No components recorded yet. Add processors, memory, storage and other parts to build up the
          machine&apos;s full specification.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className={th}>Type</th>
                <th className={th}>Name</th>
                <th className={th}>Capacity</th>
                <th className={th}>Specification</th>
                <th className={th}>Serial</th>
                <th className={`${th} text-center`}>Qty</th>
                {canEdit && <th className={`${th} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {components.map((component) => {
                const meta = COMPONENT_META[component.type] ?? COMPONENT_META.OTHER;
                const Icon = meta.icon;
                return (
                  <tr key={component.id} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50 dark:border-neutral-800/70 dark:hover:bg-neutral-800/40">
                    <td className={td}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                        {COMPONENT_TYPE_LABELS[component.type as (typeof COMPONENT_TYPES)[number]] ?? component.type}
                      </span>
                    </td>
                    <td className={`${td} font-medium text-neutral-900 dark:text-neutral-100`}>{component.name}</td>
                    <td className={td}>{component.capacity ?? "—"}</td>
                    <td className={td}>{component.specification ?? "—"}</td>
                    <td className={`${td} font-mono text-xs`}>{component.serialNumber ?? "—"}</td>
                    <td className={`${td} text-center tabular-nums`}>{component.quantity}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <ConfirmDialog
                          trigger={
                            <button title="Remove" className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                          title="Remove component"
                          description={`Remove "${component.name}" from this computer?`}
                          confirmLabel="Remove"
                          destructive
                          onConfirm={() => handleDelete(component.id)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
