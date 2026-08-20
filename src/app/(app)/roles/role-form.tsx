"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useGlobalProgress } from "@/components/shared/GlobalProgress";
import { roleBaseSchema, type RoleInput } from "@/modules/roles/validators";
import { SCOPE_DIMENSIONS, SCOPE_LEVELS, isScopeCode } from "@/lib/scope";

type PermissionGroup = {
  module: string;
  permissions: { id: number; code: string; description: string | null }[];
};

type RoleDetail = {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCodes: string[];
};

const metadataSchema = roleBaseSchema.omit({ permissionCodes: true });
type MetadataInput = Omit<RoleInput, "permissionCodes">;

function scopeKey(codePrefix: string, level: string) {
  return `${codePrefix}_${level.toLowerCase()}`;
}

export function RoleForm({
  role,
  permissionGroups,
}: {
  role?: RoleDetail;
  permissionGroups: PermissionGroup[];
}) {
  const isEdit = !!role;
  const [permissionCodes, setPermissionCodes] = useState<Set<string>>(() => {
    const initial = new Set(role?.permissionCodes ?? []);
    // New roles start with every scope dimension defaulted to "All" (matches the old
    // dropdown's default) so a fresh role isn't created with no scope selected at all,
    // which the server-side refine would reject.
    if (!role) {
      for (const dimension of SCOPE_DIMENSIONS) initial.add(scopeKey(dimension.codePrefix, "ALL"));
    }
    return initial;
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MetadataInput>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
    },
  });
  const { isPending, navigate } = useGlobalProgress();

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

  // Data-visibility scope levels are real permission codes too (e.g.
  // "assets.scope_department"), but exactly one per dimension must be selected — these
  // two helpers keep that invariant despite plain checkbox styling, by clearing the other
  // 2 levels for that dimension before setting the clicked one.
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

  async function onSubmit(data: MetadataInput) {
    const payload: RoleInput = { ...data, permissionCodes: Array.from(permissionCodes) };
    const url = isEdit ? `/api/roles/${role.id}` : "/api/roles";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" disabled={role?.isSystem} {...register("name")} />
        <FieldError errors={[errors.name]} />
        {role?.isSystem && <p className="text-xs text-neutral-500">System roles cannot be renamed.</p>}
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" rows={2} {...register("description")} />
        <FieldError errors={[errors.description]} />
      </Field>
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Permissions</h2>
          <p className="text-xs text-neutral-500">Permission changes apply the next time affected users log in.</p>
        </div>
        {permissionGroups.map((group) => {
          // Data-visibility scope codes (e.g. "assets.scope_department") are real
          // permissions but rendered as their own mutually-exclusive row(s), not mixed
          // into the regular action grid or the "select all" toggle below — a module's
          // "select all" shouldn't be able to check all 3 conflicting scope levels at
          // once. A module can have more than one independent scope dimension.
          const dimensions = SCOPE_DIMENSIONS.filter((d) => d.module === group.module);
          const actionPermissions = group.permissions.filter((p) => !isScopeCode(p.code));
          const codes = actionPermissions.map((p) => p.code);
          const allChecked = codes.length > 0 && codes.every((code) => permissionCodes.has(code));
          const someChecked = codes.some((code) => permissionCodes.has(code));
          return (
            <div key={group.module} className="rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium capitalize">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = !allChecked && someChecked;
                  }}
                  onChange={(event) => toggleModule(codes, event.target.checked)}
                />
                {group.module}
              </label>

              {dimensions.map((dimension) => (
                <div key={dimension.id} className="mt-2 pl-6">
                  <p className="text-xs font-medium text-neutral-500">{dimension.label}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
                    {SCOPE_LEVELS.map((level) => (
                      <label key={level.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={getScope(dimension.codePrefix) === level.value}
                          onChange={() => setScope(dimension.codePrefix, level.value)}
                        />
                        {level.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-2 grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-2">
                {actionPermissions.map((permission) => (
                  <label key={permission.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={permissionCodes.has(permission.code)}
                      onChange={() => togglePermission(permission.code)}
                    />
                    {permission.description ?? permission.code}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : isEdit ? "Save Changes" : "Create Role"}
      </Button>
    </form>
  );
}
