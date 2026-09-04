"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Building2, User } from "lucide-react";
import { SCOPE_LEVELS } from "@/lib/scope";
import type { RoleScope } from "@/generated/prisma/client";

const META: Record<RoleScope, { label: string; icon: typeof LayoutGrid }> = {
  ALL: { label: "All", icon: LayoutGrid },
  DEPARTMENT: { label: "Department", icon: Building2 },
  SELF: { label: "Mine", icon: User },
};

/**
 * A user-facing "narrow my own view" control — not a permission editor. `available` is already
 * clamped server-side to the levels the role permits; this only picks among those. Styled as the
 * All / Department / Mine pill tabs; `total` shows a count badge on the active tab.
 */
export function ScopeSwitcher({
  available,
  current,
  total,
}: {
  available: RoleScope[];
  current: RoleScope;
  total?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: RoleScope) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value.toLowerCase());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const levels = SCOPE_LEVELS.filter((l) => available.includes(l.value)).map((l) => l.value);

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {levels.map((level) => {
        const { label, icon: Icon } = META[level];
        const active = level === current;
        return (
          <button
            key={level}
            onClick={() => select(level)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {active && total !== undefined && (
              <span className="ml-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                {total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
