"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Boxes } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { navConfig, NAV_PARENTS, type NavConfigItem } from "./nav-config";
import { NavItem } from "./NavItem";
import packageJson from "../../../package.json";

/** A group renders a flat item or a collapsible parent, in navConfig's own order. */
type GroupEntry = { kind: "item"; item: NavConfigItem } | { kind: "parent"; key: string; items: NavConfigItem[] };

export function Sidebar({ companyName, logoPath }: { companyName: string; logoPath: string | null }) {
  const { hasPermission, session } = usePermissions();
  const pathname = usePathname();
  const moduleScopes = session?.moduleScopes ?? {};
  const items = navConfig.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    // Scope-gated entries: a SELF-scoped user gets "My Assets", an ALL-scoped one gets the
    // per-type menu. Missing scope falls back to SELF, matching resolveScopeDimension's
    // fail-closed default, so an unexpected session shape shows the narrow menu, not the wide one.
    if (item.scopeIn && !item.scopeIn.levels.includes(moduleScopes[item.scopeIn.dimension] ?? "SELF")) {
      return false;
    }
    return true;
  });

  // Exactly one item is active: the longest href that matches the current path. Nested
  // routes (/assets vs /assets/computers) would otherwise both match a naive startsWith,
  // highlighting two entries at once.
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .reduce<string | null>((best, item) => (best && best.length >= item.href.length ? best : item.href), null);

  // Group in navConfig's own order (not alphabetical) — a group only appears once it has its
  // first visible item, so a group left empty by permission filtering is skipped entirely
  // rather than rendering as an empty header. Same rule applies to collapsible parents.
  const groups: { name: string; entries: GroupEntry[] }[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.name === item.group);
    if (!group) {
      group = { name: item.group, entries: [] };
      groups.push(group);
    }
    if (!item.parent) {
      group.entries.push({ kind: "item", item });
      continue;
    }
    const existing = group.entries.find((e) => e.kind === "parent" && e.key === item.parent);
    if (existing && existing.kind === "parent") {
      existing.items.push(item);
    } else {
      group.entries.push({ kind: "parent", key: item.parent, items: [item] });
    }
  }

  // Any parent containing the active page starts open, so a deep link lands with its section
  // already expanded rather than looking collapsed-and-lost.
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  function isParentOpen(key: string, children: NavConfigItem[]) {
    return openParents[key] ?? children.some((child) => child.href === activeHref);
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-2.5 px-4 py-4">
        {logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPath} alt={companyName} className="h-9 w-9 shrink-0 object-contain" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
            {companyName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-bold">{companyName}</div>
          <div className="truncate text-xs text-neutral-400">Asset Management</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group.name} className="flex flex-col gap-1">
            <span className="px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-600">
              {group.name}
            </span>
            {group.entries.map((entry) => {
              if (entry.kind === "item") {
                return (
                  <NavItem
                    key={entry.item.href}
                    href={entry.item.href}
                    label={entry.item.label}
                    icon={entry.item.icon}
                    isActive={entry.item.href === activeHref}
                  />
                );
              }

              const parent = NAV_PARENTS[entry.key];
              if (!parent) return null;
              const ParentIcon = parent.icon;
              const open = isParentOpen(entry.key, entry.items);
              const hasActiveChild = entry.items.some((child) => child.href === activeHref);

              return (
                <div key={entry.key} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setOpenParents((prev) => ({ ...prev, [entry.key]: !open }))}
                    aria-expanded={open}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      hasActiveChild && !open
                        ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <ParentIcon className="h-4 w-4" />
                    {parent.label}
                    {open ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>
                  {open && (
                    <div className="ml-3 flex flex-col gap-1 border-l pl-2 dark:border-neutral-800">
                      {entry.items.map((child) => (
                        <NavItem
                          key={child.href}
                          href={child.href}
                          label={child.label}
                          icon={child.icon}
                          isActive={child.href === activeHref}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-400">
            <Boxes className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-xs font-semibold">v{packageJson.version}</div>
            <div className="truncate text-[11px] text-neutral-400">{companyName}</div>
            <div className="truncate text-[11px] text-neutral-400">Asset Management System</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
