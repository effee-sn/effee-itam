"use client";

import { useState } from "react";
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
          <Button variant="outline" size="sm">
            Add Component
          </Button>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
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

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <AddComponentDialog assetId={assetId} />
        </div>
      )}
      {components.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No components recorded yet. Add processors, memory, storage and other parts to build up the
          machine&apos;s full specification.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Specification</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Qty</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>
                    {COMPONENT_TYPE_LABELS[component.type as (typeof COMPONENT_TYPES)[number]] ?? component.type}
                  </TableCell>
                  <TableCell className="font-medium">{component.name}</TableCell>
                  <TableCell>{component.capacity ?? "—"}</TableCell>
                  <TableCell>{component.specification ?? "—"}</TableCell>
                  <TableCell>{component.serialNumber ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{component.quantity}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive">
                            Remove
                          </Button>
                        }
                        title="Remove component"
                        description={`Remove "${component.name}" from this computer?`}
                        confirmLabel="Remove"
                        destructive
                        onConfirm={() => handleDelete(component.id)}
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
