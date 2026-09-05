"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";
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
  currentSearch,
}: {
  users: { id: number; name: string }[];
  modules: string[];
  currentUserId?: string;
  currentModule?: string;
  currentAction?: string;
  currentFrom?: string;
  currentTo?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(currentUserId ?? "all");
  const [mod, setMod] = useState(currentModule ?? "all");
  const [action, setAction] = useState(currentAction ?? "all");
  const [from, setFrom] = useState(currentFrom ?? "");
  const [to, setTo] = useState(currentTo ?? "");
  const [search, setSearch] = useState(currentSearch ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (userId !== "all") params.set("userId", userId);
    if (mod !== "all") params.set("module", mod);
    if (action !== "all") params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", "1");
    router.push(`/audit-logs?${params.toString()}`);
  }
  function reset() {
    setUserId("all");
    setMod("all");
    setAction("all");
    setFrom("");
    setTo("");
    setSearch("");
    router.push("/audit-logs");
  }

  const labelCls = "mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-300";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 [&_[data-slot=input]]:h-11! [&_[data-slot=select-trigger]]:h-11! [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:px-3!">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={labelCls}>User</label>
          <OptionSelect value={userId} onValueChange={setUserId} options={[{ value: "all", label: "All users" }, ...users.map((u) => ({ value: String(u.id), label: u.name }))]} placeholder="All users" />
        </div>
        <div>
          <label className={labelCls}>Module</label>
          <OptionSelect value={mod} onValueChange={setMod} options={[{ value: "all", label: "All modules" }, ...modules.map((m) => ({ value: m, label: m }))]} placeholder="All modules" />
        </div>
        <div>
          <label className={labelCls}>Action</label>
          <OptionSelect value={action} onValueChange={setAction} options={[{ value: "all", label: "All actions" }, ...ACTION_OPTIONS]} placeholder="All actions" />
        </div>
        <div>
          <label className={labelCls}>From Date</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3!" />
        </div>
        <div>
          <label className={labelCls}>To Date</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3!" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder="Search by user, description, IP address..." className="pl-9!" />
        </div>
        <button type="button" onClick={apply} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
          <Search className="h-4 w-4" /> Search
        </button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>
    </div>
  );
}
