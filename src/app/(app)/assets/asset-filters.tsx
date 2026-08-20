"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OptionSelect } from "@/components/shared/OptionSelect";

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
];

export function AssetFilters({
  currentStatus,
  showDeleted,
  canViewDeleted,
}: {
  currentStatus?: string;
  showDeleted: boolean;
  canViewDeleted: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
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
    <div className="flex items-center gap-4">
      <div className="flex gap-2">
        <OptionSelect
          value={currentStatus ?? "all"}
          onValueChange={(value) => updateFilter("status", value)}
          options={[{ value: "all", label: "All statuses" }, ...STATUS_OPTIONS]}
          placeholder="All statuses"
          className="w-48"
        />
      </div>
      {canViewDeleted && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showDeleted}
            onChange={(e) => updateFilter("deleted", e.target.checked ? "true" : "")}
          />
          Show Deleted
        </label>
      )}
    </div>
  );
}
