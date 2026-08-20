"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { departmentSchema, type DepartmentInput } from "@/modules/departments/validators";

type Department = {
  id: number;
  name: string;
  createdAt: string | Date;
};

function DepartmentFormDialog({
  department,
  trigger,
}: {
  department?: Department;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: department?.name ?? "" },
  });

  async function onSubmit(data: DepartmentInput) {
    const url = department ? `/api/departments/${department.id}` : "/api/departments";
    const method = department ? "PATCH" : "POST";
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
    toast.success(department ? "Department updated" : "Department created");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({ name: department?.name ?? "" });
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
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

export function CreateDepartmentButton() {
  return <DepartmentFormDialog trigger={<Button>New Department</Button>} />;
}

export function DepartmentsTable({
  items,
  total,
  page,
  pageSize,
  canEdit,
  canDelete,
}: {
  items: Department[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete department");
      return;
    }
    toast.success("Department deleted");
    router.refresh();
  }

  return (
    <DataTable
      columns={[
        { header: "Name", cell: (row) => row.name },
        { header: "Created", cell: (row) => new Date(row.createdAt).toLocaleDateString() },
      ]}
      rows={items}
      totalCount={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      searchPlaceholder="Search departments..."
      rowActions={
        canEdit || canDelete
          ? (row) => (
              <div className="flex justify-end gap-2">
                {canEdit && (
                  <DepartmentFormDialog
                    department={row}
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
                    title="Delete department"
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
