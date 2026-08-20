"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { OptionSelect } from "@/components/shared/OptionSelect";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type ResetPasswordInput,
} from "@/modules/users/validators";

type Option = { id: number; name: string };

type UserRow = {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: "ACTIVE" | "INACTIVE";
  departmentId: number;
  roleId: number;
  department: { name: string };
  role: { name: string };
};

function CreateUserDialog({ departments, roles }: { departments: Option[]; roles: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) });

  async function onSubmit(data: CreateUserInput) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success("User created");
    setOpen(false);
    reset();
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
      <DialogTrigger render={<Button>New User</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="employeeId">Employee ID</FieldLabel>
            <Input id="employeeId" {...register("employeeId")} />
            <FieldError errors={[errors.employeeId]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
          <Field>
            <FieldLabel>Department</FieldLabel>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                  options={departments.map((department) => ({
                    value: String(department.id),
                    label: department.name,
                  }))}
                  placeholder="Select department"
                />
              )}
            />
            <FieldError errors={[errors.departmentId]} />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Controller
              control={control}
              name="roleId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                  options={roles.map((role) => ({ value: String(role.id), label: role.name }))}
                  placeholder="Select role"
                />
              )}
            />
            <FieldError errors={[errors.roleId]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="designation">Designation</FieldLabel>
            <Input id="designation" {...register("designation")} />
            <FieldError errors={[errors.designation]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Initial Password</FieldLabel>
            <Input id="password" type="password" {...register("password")} />
            <FieldError errors={[errors.password]} />
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

export function CreateUserButton({ departments, roles }: { departments: Option[]; roles: Option[] }) {
  return <CreateUserDialog departments={departments} roles={roles} />;
}

function EditUserDialog({
  user,
  departments,
  roles,
  trigger,
}: {
  user: UserRow;
  departments: Option[];
  roles: Option[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const defaultValues: UpdateUserInput = {
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    departmentId: user.departmentId,
    roleId: user.roleId,
    designation: user.designation ?? undefined,
    status: user.status,
  };
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({ resolver: zodResolver(updateUserSchema), defaultValues });

  async function onSubmit(data: UpdateUserInput) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success("User updated");
    setOpen(false);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="employeeId">Employee ID</FieldLabel>
            <Input id="employeeId" {...register("employeeId")} />
            <FieldError errors={[errors.employeeId]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
          <Field>
            <FieldLabel>Department</FieldLabel>
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                  options={departments.map((department) => ({
                    value: String(department.id),
                    label: department.name,
                  }))}
                  placeholder="Select department"
                />
              )}
            />
            <FieldError errors={[errors.departmentId]} />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Controller
              control={control}
              name="roleId"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                  options={roles.map((role) => ({ value: String(role.id), label: role.name }))}
                  placeholder="Select role"
                />
              )}
            />
            <FieldError errors={[errors.roleId]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="designation">Designation</FieldLabel>
            <Input id="designation" {...register("designation")} />
            <FieldError errors={[errors.designation]} />
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <OptionSelect
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                  ]}
                  placeholder="Select status"
                />
              )}
            />
            <FieldError errors={[errors.status]} />
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

function ResetPasswordDialog({ user, trigger }: { user: UserRow; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(data: ResetPasswordInput) {
    const res = await fetch(`/api/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(`Password reset for ${user.name}. They'll be asked to change it on next login.`);
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({});
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password — {user.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="password">New Password</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            <FieldError errors={[errors.password]} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersTable({
  items,
  total,
  page,
  pageSize,
  departments,
  roles,
  canEdit,
  canDelete,
}: {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  departments: Option[];
  roles: Option[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: number) {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete user");
      return;
    }
    toast.success("User deleted");
    router.refresh();
  }

  return (
    <DataTable
      columns={[
        { header: "Employee ID", cell: (row) => row.employeeId },
        {
          header: "Name",
          cell: (row) => (
            <Link
              href={`/users/${row.id}`}
              className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
            >
              {row.name}
            </Link>
          ),
        },
        { header: "Email", cell: (row) => row.email },
        { header: "Department", cell: (row) => row.department.name },
        { header: "Role", cell: (row) => row.role.name },
        {
          header: "Status",
          cell: (row) => (row.status === "ACTIVE" ? "Active" : "Inactive"),
        },
      ]}
      rows={items}
      totalCount={total}
      page={page}
      pageSize={pageSize}
      getRowId={(row) => row.id}
      searchPlaceholder="Search users..."
      rowActions={
        canEdit || canDelete
          ? (row) => (
              <div className="flex justify-end gap-2">
                {canEdit && (
                  <EditUserDialog
                    user={row}
                    departments={departments}
                    roles={roles}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                )}
                {canEdit && (
                  <ResetPasswordDialog
                    user={row}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Reset Password
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
                    title="Delete user"
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
