"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  type LucideIcon,
  UsersRound,
  Info,
  Save,
  ChevronDown,
  Monitor,
  Shield,
  Building2,
  BarChart3,
  KeyRound,
  Settings,
  UserRound,
  Truck,
  Boxes,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGlobalProgress } from "@/components/shared/GlobalProgress";
import { roleBaseSchema, type RoleInput } from "@/modules/roles/validators";
import { SCOPE_DIMENSIONS, SCOPE_LEVELS, isScopeCode } from "@/lib/scope";

type PermissionGroup = { module: string; permissions: { id: number; code: string; description: string | null }[] };
type RoleDetail = { id: number; name: string; description: string | null; isSystem: boolean; permissionCodes: string[] };

const metadataSchema = roleBaseSchema.omit({ permissionCodes: true });
type MetadataInput = Omit<RoleInput, "permissionCodes">;

const MODULE_META: Record<string, { icon: LucideIcon; subtitle: string }> = {
  assets: { icon: Monitor, subtitle: "Data visibility and asset management" },
  audit: { icon: Shield, subtitle: "Access audit logs and system activity" },
  departments: { icon: Building2, subtitle: "Manage departments" },
  reports: { icon: BarChart3, subtitle: "Generate and export reports" },
  roles: { icon: KeyRound, subtitle: "Manage roles and permissions" },
  settings: { icon: Settings, subtitle: "Configure system settings" },
  users: { icon: UserRound, subtitle: "Manage system users" },
  vendors: { icon: Truck, subtitle: "Manage vendor information" },
};

function scopeKey(codePrefix: string, level: string) {
  return `${codePrefix}_${level.toLowerCase()}`;
}

const checkbox = "h-4 w-4 shrink-0 rounded border-neutral-300 accent-blue-600 dark:border-neutral-600";

export function RoleForm({ role, permissionGroups }: { role?: RoleDetail; permissionGroups: PermissionGroup[] }) {
  const isEdit = !!role;
  const [permissionCodes, setPermissionCodes] = useState<Set<string>>(() => {
    const initial = new Set(role?.permissionCodes ?? []);
    if (!role) {
      for (const dimension of SCOPE_DIMENSIONS) initial.add(scopeKey(dimension.codePrefix, "ALL"));
    }
    return initial;
  });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(permissionGroups.map((g) => g.module)));

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MetadataInput>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { name: role?.name ?? "", description: role?.description ?? "" },
  });
  const { isPending, navigate } = useGlobalProgress();

  const watchedName = watch("name");
  const watchedDescription = watch("description") ?? "";

  function togglePermission(code: string) {
    setPermissionCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }
  function toggleModule(codes: string[], checked: boolean) {
    setPermissionCodes((prev) => {
      const next = new Set(prev);
      for (const code of codes) {
        if (checked) next.add(code);
        else next.delete(code);
      }
      return next;
    });
  }
  function getScope(codePrefix: string): string {
    return SCOPE_LEVELS.find((level) => permissionCodes.has(scopeKey(codePrefix, level.value)))?.value ?? "";
  }
  function setScope(codePrefix: string, level: string) {
    setPermissionCodes((prev) => {
      const next = new Set(prev);
      for (const l of SCOPE_LEVELS) next.delete(scopeKey(codePrefix, l.value));
      next.add(scopeKey(codePrefix, level));
      return next;
    });
  }
  function toggleExpand(module: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  async function onSubmit(data: MetadataInput) {
    const payload: RoleInput = { ...data, permissionCodes: Array.from(permissionCodes) };
    const url = isEdit ? `/api/roles/${role.id}` : "/api/roles";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Something went wrong");
      return;
    }
    toast.success(isEdit ? "Role updated" : "Role created");
    navigate("/roles");
  }

  const pending = isSubmitting || isPending;
  const title = isEdit ? `Edit Role: ${role.name}` : "New Role";
  const subtitle = isEdit ? "Update role details and permissions." : "Define a new role and its permissions.";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
      {/* Left column */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <UsersRound className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Name <span className="text-rose-500">*</span></label>
          <Input id="name" disabled={role?.isSystem} className="h-11! px-3!" {...register("name")} />
          {errors.name ? (
            <p className="mt-1 text-sm text-rose-600">{errors.name.message}</p>
          ) : role?.isSystem ? (
            <p className="mt-1 text-xs text-neutral-500">System roles cannot be renamed.</p>
          ) : null}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Description</label>
          <Textarea id="description" rows={3} maxLength={500} {...register("description")} />
          <div className="mt-1 flex justify-between">
            <span className="text-sm text-rose-600">{errors.description?.message}</span>
            <span className="text-xs text-neutral-400">{watchedDescription.length}/500</span>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Permissions</h2>
              <p className="text-xs text-neutral-500">Permission changes apply the next time affected users log in.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setExpanded(new Set(permissionGroups.map((g) => g.module)))} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                Expand All
              </button>
              <button type="button" onClick={() => setExpanded(new Set())} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                Collapse All
              </button>
            </div>
          </div>

          {permissionGroups.map((group) => {
            const meta = MODULE_META[group.module] ?? { icon: Boxes, subtitle: "" };
            const Icon = meta.icon;
            const dimensions = SCOPE_DIMENSIONS.filter((d) => d.module === group.module);
            const actionPermissions = group.permissions.filter((p) => !isScopeCode(p.code));
            const codes = actionPermissions.map((p) => p.code);
            const allChecked = codes.length > 0 && codes.every((c) => permissionCodes.has(c));
            const someChecked = codes.some((c) => permissionCodes.has(c));
            const isOpen = expanded.has(group.module);
            return (
              <div key={group.module} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    className={checkbox}
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                    onChange={(e) => toggleModule(codes, e.target.checked)}
                    aria-label={`Select all ${group.module} permissions`}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold capitalize leading-tight">{group.module}</h3>
                    {meta.subtitle && <p className="text-xs text-neutral-500">{meta.subtitle}</p>}
                  </div>
                  <button type="button" onClick={() => toggleExpand(group.module)} className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800" aria-label={isOpen ? "Collapse" : "Expand"}>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-neutral-100 px-4 py-4 pl-14 dark:border-neutral-800">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {dimensions.flatMap((dimension) =>
                        SCOPE_LEVELS.map((level) => (
                          <label key={`${dimension.id}-${level.value}`} className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                            <input
                              type="checkbox"
                              className={checkbox}
                              checked={getScope(dimension.codePrefix) === level.value}
                              onChange={() => setScope(dimension.codePrefix, level.value)}
                            />
                            {level.label}
                          </label>
                        )),
                      )}
                      {actionPermissions.map((p) => (
                        <label key={p.code} className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <input type="checkbox" className={checkbox} checked={permissionCodes.has(p.code)} onChange={() => togglePermission(p.code)} />
                          {p.description ?? p.code}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60">
            <Save className="h-4 w-4" /> {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
          </button>
          <Link href="/roles" className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Cancel
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <Info className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold leading-tight">Role Information</h2>
              <p className="text-xs text-neutral-500">Current role details and summary.</p>
            </div>
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-neutral-500">Name</dt>
              <dd className="mt-0.5 font-medium text-neutral-800 dark:text-neutral-200">{watchedName || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Description</dt>
              <dd className="mt-0.5 text-neutral-800 dark:text-neutral-200">{watchedDescription || "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Total Permissions</dt>
              <dd className="mt-0.5 font-semibold text-neutral-800 dark:text-neutral-200">{permissionCodes.size}</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p>Changes to permissions will apply to users with this role the next time they log in.</p>
        </div>
      </aside>
    </form>
  );
}
