"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { vendorSchema, type VendorInput } from "@/modules/vendors/validators";

type Vendor = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string | Date;
};

function VendorFormDialog({ vendor, trigger }: { vendor?: Vendor; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const defaultValues: VendorInput = {
    name: vendor?.name ?? "",
    contactPerson: vendor?.contactPerson ?? undefined,
    phone: vendor?.phone ?? undefined,
    email: vendor?.email ?? undefined,
    address: vendor?.address ?? undefined,
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues,
  });

  async function onSubmit(data: VendorInput) {
    const url = vendor ? `/api/vendors/${vendor.id}` : "/api/vendors";
    const method = vendor ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(vendor ? "Vendor updated" : "Vendor created");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultValues);
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "New Vendor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactPerson">Contact Person</FieldLabel>
            <Input id="contactPerson" {...register("contactPerson")} />
            <FieldError errors={[errors.contactPerson]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Textarea id="address" rows={3} {...register("address")} />
            <FieldError errors={[errors.address]} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateVendorButton() {
  return <VendorFormDialog trigger={<Button>New Vendor</Button>} />;
}

export function VendorsTable({
  items,
  total,
  page,
  pageSize,
  canEdit,
  canDelete,
}: {
  items: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete vendor");
      return;
    }
    toast.success("Vendor deleted");
    router.refresh();
  }

  return (
    <DataTable
      columns={[
        { header: "Name", cell: (row) => row.name },
        { header: "Contact", cell: (row) => row.contactPerson ?? "—" },
        { header: "Phone", cell: (row) => row.phone ?? "—" },
        { header: "Email", cell: (row) => row.email ?? "—" },
      ]}
      rows={items}
      totalCount={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      searchPlaceholder="Search vendors..."
      rowActions={
        canEdit || canDelete
          ? (row) => (
              <div className="flex justify-end gap-2">
                {canEdit && (
                  <VendorFormDialog
                    vendor={row}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                )}
                {canDelete && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </Button>
                    }
                    title="Delete vendor"
                    description={`Are you sure you want to delete "${row.name}"? This cannot be undone.`}
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
