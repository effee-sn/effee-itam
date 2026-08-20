"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/shared/OptionSelect";

const ACTION_OPTIONS = [
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "ASSIGN", label: "Assign" },
  { value: "RETURN", label: "Return" },
  { value: "PERMISSION_CHANGE", label: "Permission Change" },
];

export function AuditLogFilters({
  users,
  modules,
  currentUserId,
  currentModule,
  currentAction,
  currentFrom,
  currentTo,
}: {
  users: { id: number; name: string }[];
  modules: string[];
  currentUserId?: string;
  currentModule?: string;
  currentAction?: string;
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OptionSelect
        value={currentUserId ?? "all"}
        onValueChange={(value) => updateParam("userId", value)}
        options={[
          { value: "all", label: "All users" },
          ...users.map((user) => ({ value: String(user.id), label: user.name })),
        ]}
        placeholder="All users"
        className="w-48"
      />
      <OptionSelect
        value={currentModule ?? "all"}
        onValueChange={(value) => updateParam("module", value)}
        options={[{ value: "all", label: "All modules" }, ...modules.map((mod) => ({ value: mod, label: mod }))]}
        placeholder="All modules"
        className="w-40"
      />
      <OptionSelect
        value={currentAction ?? "all"}
        onValueChange={(value) => updateParam("action", value)}
        options={[{ value: "all", label: "All actions" }, ...ACTION_OPTIONS]}
        placeholder="All actions"
        className="w-48"
      />
      <div className="flex items-center gap-1">
        <Input
          type="date"
          defaultValue={currentFrom}
          onChange={(event) => updateParam("from", event.target.value)}
          className="w-40"
        />
        <span className="text-sm text-neutral-500">to</span>
        <Input
          type="date"
          defaultValue={currentTo}
          onChange={(event) => updateParam("to", event.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
