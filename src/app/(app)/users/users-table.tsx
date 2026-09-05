"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  UserPlus,
  Hash,
  User as UserIcon,
  Mail,
  Briefcase,
  Phone as PhoneIcon,
  Lock,
  Eye,
  EyeOff,
  Search,
  Pencil,
  KeyRound,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/shared/OptionSelect";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/modules/users/validators";

type Option = { id: number; name: string };

export type UserRow = {
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

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const inputCls = "h-11!";

function labelCls(required = false) {
  return (
    <>
      {required && <span className="text-rose-500"> *</span>}
    </>
  );
}

/** An input (or select) row with a left icon, used throughout the user form. */
function FieldRow({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {labelCls(required)}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function IconInput({
  icon: Icon,
  ...props
}: { icon: React.ComponentType<{ className?: string }> } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <Input {...props} className={`pl-9! pr-3! ${inputCls} ${props.className ?? ""}`} />
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function UserFormDialog({
  mode,
  user,
  departments,
  roles,
  trigger,
}: {
  mode: "create" | "edit";
  user?: UserRow;
  departments: Option[];
  roles: Option[];
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isEdit = mode === "edit";

  const defaultValues: any = isEdit
    ? {
        employeeId: user?.employeeId ?? "",
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        departmentId: user?.departmentId,
        roleId: user?.roleId,
        designation: user?.designation ?? "",
        status: user?.status ?? "ACTIVE",
      }
    : { status: "ACTIVE" };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as any,
    defaultValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(data: any) {
    setErrors({});
    const url = isEdit ? `/api/users/${user!.id}` : "/api/users";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(isEdit ? "User updated" : "User created");
    setOpen(false);
    reset();
    router.refresh();
  }

  const onInvalid = (errs: any) => {
    const flat: Record<string, string> = {};
    for (const k of Object.keys(errs)) flat[k] = errs[k]?.message ?? "Invalid";
    setErrors(flat);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          reset(defaultValues);
          setErrors({});
          setShowPw(false);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:px-3!">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit User" : "New User"}</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              {isEdit ? "Update this user's details and access." : "Add a new system user to your organization."}
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label="Employee ID" required error={errors.employeeId}>
              <IconInput icon={Hash} placeholder="Enter employee ID (e.g. EII0075)" {...register("employeeId")} />
              {!isEdit && <p className="mt-1 text-xs text-neutral-500">Must be unique.</p>}
            </FieldRow>
            <FieldRow label="Department" required error={errors.departmentId}>
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <OptionSelect
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                    placeholder="Select department"
                  />
                )}
              />
            </FieldRow>

            <FieldRow label="Name" required error={errors.name}>
              <IconInput icon={UserIcon} placeholder="Enter full name" {...register("name")} />
            </FieldRow>
            <FieldRow label="Role" required error={errors.roleId}>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <OptionSelect
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={roles.map((r) => ({ value: String(r.id), label: r.name }))}
                    placeholder="Select role"
                  />
                )}
              />
            </FieldRow>

            <FieldRow label="Email" required error={errors.email}>
              <IconInput icon={Mail} type="email" placeholder="Enter email address" {...register("email")} />
            </FieldRow>
            <FieldRow label="Designation" error={errors.designation}>
              <IconInput icon={Briefcase} placeholder="Enter designation (e.g. Senior Engineer)" {...register("designation")} />
            </FieldRow>

            <FieldRow label="Phone" error={errors.phone}>
              <IconInput icon={PhoneIcon} placeholder="Enter phone number" {...register("phone")} />
            </FieldRow>
            <FieldRow label="Status" required error={errors.status}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <OptionSelect
                    value={field.value ?? "ACTIVE"}
                    onValueChange={field.onChange}
                    options={STATUS_OPTIONS}
                    placeholder="Select status"
                  />
                )}
              />
            </FieldRow>

            {!isEdit && (
              <FieldRow label="Initial Password" required error={errors.password}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Enter initial password"
                    autoComplete="new-password"
                    className={`px-9! ${inputCls}`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">User will be required to change this on first login.</p>
              </FieldRow>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function CreateUserButton({ departments, roles }: { departments: Option[]; roles: Option[] }) {
  return (
    <UserFormDialog
      mode="create"
      departments={departments}
      roles={roles}
      trigger={
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New User
        </button>
      }
    />
  );
}

export function ResetPasswordDialog({ user, trigger }: { user: { id: number; name: string }; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
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
        if (next) {
          reset({});
          setShowPw(false);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">Reset Password</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">Set a new password for {user.name}.</DialogDescription>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">New Password <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter new password"
                className={`px-9! ${inputCls}`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p>}
            <p className="mt-1 text-xs text-neutral-500">The user will be asked to change it on next login.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              {isSubmitting ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onConfirm }: { user: UserRow; onConfirm: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            title="Delete"
            aria-label={`Delete ${user.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-lg font-semibold">Delete user</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Are you sure you want to delete &quot;{user.name}&quot;? This cannot be undone.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RolePill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
      {name}
    </span>
  );
}

function StatusPill({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-neutral-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const PAGE_SIZE = 10;

function pageNumbers(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(totalPages - 1, current + 1);
  if (from > 2) out.push("…");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

export function UsersTable({
  items,
  departments,
  roles,
  canEdit,
  canDelete,
}: {
  items: UserRow[];
  departments: Option[];
  roles: Option[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [dept, setDept] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = applied.trim().toLowerCase();
    return items.filter((u) => {
      if (dept !== "all" && String(u.departmentId) !== dept) return false;
      if (role !== "all" && String(u.roleId) !== role) return false;
      if (status !== "all" && u.status !== status) return false;
      if (!q) return true;
      return [u.employeeId, u.name, u.email].some((f) => f.toLowerCase().includes(q));
    });
  }, [items, applied, dept, role, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [applied, dept, role, status]);

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

  const th = "px-4 py-3.5 text-sm font-semibold text-neutral-600 dark:text-neutral-300";
  const td = "px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-300";

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 [&_[data-slot=input]]:h-11! [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:px-3!">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setApplied(query)}
              placeholder="Search users..."
              className="pl-9!"
            />
          </div>
          <button
            type="button"
            onClick={() => setApplied(query)}
            className="inline-flex h-11 items-center rounded-lg border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Search
          </button>
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Department</label>
          <OptionSelect
            value={dept}
            onValueChange={setDept}
            options={[{ value: "all", label: "All Departments" }, ...departments.map((d) => ({ value: String(d.id), label: d.name }))]}
            placeholder="All Departments"
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Role</label>
          <OptionSelect
            value={role}
            onValueChange={setRole}
            options={[{ value: "all", label: "All Roles" }, ...roles.map((r) => ({ value: String(r.id), label: r.name }))]}
            placeholder="All Roles"
          />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <OptionSelect
            value={status}
            onValueChange={setStatus}
            options={[{ value: "all", label: "All Status" }, ...STATUS_OPTIONS]}
            placeholder="All Status"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className={th}>Employee ID</th>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Department</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm text-neutral-500">No users match your filters.</td>
                </tr>
              ) : (
                pageRows.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/70 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30">
                    <td className={`${td} font-medium text-neutral-700 dark:text-neutral-300`}>{u.employeeId}</td>
                    <td className={td}>
                      <Link href={`/users/${u.id}`} className="font-medium text-neutral-800 hover:text-blue-600 hover:underline dark:text-neutral-200 dark:hover:text-blue-400">
                        {u.name}
                      </Link>
                    </td>
                    <td className={td}>{u.email}</td>
                    <td className={td}>{u.department.name}</td>
                    <td className={td}><RolePill name={u.role.name} /></td>
                    <td className={td}><StatusPill status={u.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <UserFormDialog
                            mode="edit"
                            user={u}
                            departments={departments}
                            roles={roles}
                            trigger={
                              <button title="Edit" aria-label={`Edit ${u.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-blue-500 transition-colors hover:bg-blue-50 dark:border-neutral-700 dark:hover:bg-blue-500/10">
                                <Pencil className="h-4 w-4" />
                              </button>
                            }
                          />
                        )}
                        {canEdit && (
                          <ResetPasswordDialog
                            user={u}
                            trigger={
                              <button title="Reset password" aria-label={`Reset password for ${u.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-700 dark:hover:bg-neutral-800">
                                <KeyRound className="h-4 w-4" />
                              </button>
                            }
                          />
                        )}
                        {canDelete && <DeleteUserDialog user={u} onConfirm={() => handleDelete(u.id)} />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
          <span>
            Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} users
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            {pageNumbers(currentPage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="px-1.5 text-neutral-400">…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                    n === currentPage ? "bg-blue-600 text-white" : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                  }`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { UserFormDialog };
