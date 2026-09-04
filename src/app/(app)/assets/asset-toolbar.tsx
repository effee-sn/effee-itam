"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ListFilter } from "lucide-react";
import { OptionSelect } from "@/components/shared/OptionSelect";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
];

export function AssetToolbar({
  currentStatus,
  showDeleted,
  canViewDeleted,
  searchPlaceholder = "Search by tag, serial, IMEI, hostname, MAC, brand, model...",
}: {
  currentStatus?: string;
  showDeleted: boolean;
  canViewDeleted: boolean;
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-neutral-400" />
        <OptionSelect
          value={currentStatus ?? "all"}
          onValueChange={(v) => update({ status: v })}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          className="w-44"
        />
      </div>

      {canViewDeleted && (
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-300"
            checked={showDeleted}
            onChange={(e) => update({ deleted: e.target.checked ? "true" : "" })}
          />
          Show Deleted
        </label>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ search });
        }}
        className="ml-auto flex flex-1 items-center gap-2 sm:min-w-[320px] sm:flex-none"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Search
        </button>
      </form>
    </div>
  );
}
