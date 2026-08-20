"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCOPE_LEVELS } from "@/lib/scope";
import type { RoleScope } from "@/generated/prisma/client";

// A user-facing "narrow my own view" control — not a permission editor. `available` is
// already clamped server-side to whatever the user's role actually permits for this
// module (see availableScopeLevels in src/lib/scope.ts); this component just lets them
// pick among those without ever being able to request anything broader. Hidden entirely
// by the caller when there's only one available level (nothing to switch between).
export function ScopeSwitcher({ available, current }: { available: RoleScope[]; current: RoleScope }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: unknown) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", String(value).toLowerCase());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const levels = SCOPE_LEVELS.filter((level) => available.includes(level.value));

  return (
    <Tabs value={current} onValueChange={handleChange}>
      <TabsList>
        {levels.map((level) => (
          <TabsTrigger key={level.value} value={level.value}>
            {level.value === "ALL" ? "All" : level.value === "DEPARTMENT" ? "Department" : "Mine"}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
