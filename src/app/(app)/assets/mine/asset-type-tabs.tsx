"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TypeTab = { slug: string; label: string; count: number };

/**
 * Type tabs for the combined My/Department Assets list.
 *
 * One tab per type the person actually has — someone with a laptop and a monitor sees
 * Computers / Monitors, not seven tabs with five of them empty. There is deliberately no "All"
 * tab: each tab shows that type's OWN columns (a monitor's size/resolution, a phone's IMEI), so
 * a combined view would have nothing sensible to put in those columns. Driven by the `type`
 * query param (same mechanism as ScopeSwitcher) so filtering is server-side and the chosen tab
 * survives a refresh or a shared link.
 */
export function AssetTypeTabs({ tabs, current }: { tabs: TypeTab[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: unknown) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", String(value));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={current} onValueChange={handleChange}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.slug} value={tab.slug}>
            {tab.label} ({tab.count})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
