import {
  LayoutDashboard,
  Laptop,
  Building2,
  Truck,
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  UserCog,
  Monitor,
  Printer,
  Smartphone,
  CreditCard,
  Network,
  Mouse,
  Boxes,
  Radar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RoleScope } from "@/generated/prisma/client";

export type NavConfigItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
  group: string;
  /**
   * Nests this item inside a collapsible parent within its group, keeping the sidebar short
   * when one area has many pages (the asset-type lists would otherwise dominate it).
   * Items sharing a `parent` value collapse together under that label.
   */
  parent?: string;
  /**
   * Show this item only when the user's scope for `dimension` is one of `levels`.
   *
   * This is what gives narrowly-scoped roles a different menu rather than a filtered version
   * of the same one: someone who can only ever see their own assets gets a single "My Assets"
   * entry instead of seven type pages that would each hold one or two rows. It's a display
   * rule only — the access boundary is `getRoleScope()` on the server, which applies no
   * matter which page is opened.
   */
  scopeIn?: { dimension: string; levels: RoleScope[] };
};

/** The collapsible parents, keyed by the `parent` value their children carry. */
export const NAV_PARENTS: Record<string, { label: string; icon: LucideIcon }> = {
  assets: { label: "Assets", icon: Boxes },
};

// `group` drives the Sidebar's section headers — order here is the render order, and a
// group with zero permission-visible items is skipped entirely (never rendered as an
// empty header), so a low-privilege role naturally sees fewer sections, not blank ones.
export const navConfig: NavConfigItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null, group: "Overview" },

  // Someone who can only see their own assets (or their department's) gets ONE combined list
  // instead of the type menu below — seven pages holding a row or two each is worse than one
  // page with a Type column. Same href; only the wording differs, and exactly one can match
  // since a user has a single assets scope.
  {
    label: "My Assets",
    href: "/assets/mine",
    icon: Boxes,
    permission: "assets.view",
    group: "Asset Management",
    scopeIn: { dimension: "assets", levels: ["SELF"] },
  },
  {
    label: "Department Assets",
    href: "/assets/mine",
    icon: Boxes,
    permission: "assets.view",
    group: "Asset Management",
    scopeIn: { dimension: "assets", levels: ["DEPARTMENT"] },
  },

  // One entry per asset type, each its own list with its own columns and its own add form —
  // all nested under a collapsible "Assets" parent so they don't dominate the sidebar. Only
  // for ALL-scope roles; everyone else gets the single combined list above. There is
  // deliberately no cross-type list here: each type page has its own search.
  {
    label: "Computers",
    href: "/assets/computers",
    icon: Laptop,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  {
    label: "Monitors",
    href: "/assets/monitors",
    icon: Monitor,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  {
    label: "Printers",
    href: "/assets/printers",
    icon: Printer,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  {
    label: "Phones",
    href: "/assets/phones",
    icon: Smartphone,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  {
    label: "SIM Cards",
    href: "/assets/sim-cards",
    icon: CreditCard,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  {
    label: "Network Devices",
    href: "/assets/network-devices",
    icon: Network,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  {
    label: "Peripherals",
    href: "/assets/peripherals",
    icon: Mouse,
    permission: "assets.view",
    group: "Asset Management",
    parent: "assets",
    scopeIn: { dimension: "assets", levels: ["ALL"] },
  },
  // Admin tool: machines the inventory agent found that aren't in inventory yet. Gated on
  // assets.create (onboarding creates an asset), so only full-access roles see it.
  { label: "Discovered", href: "/discovered", icon: Radar, permission: "assets.create", group: "Asset Management" },

  { label: "Departments", href: "/departments", icon: Building2, permission: "departments.view", group: "Organization" },
  { label: "Vendors", href: "/vendors", icon: Truck, permission: "vendors.view", group: "Organization" },
  { label: "Users", href: "/users", icon: Users, permission: "users.view", group: "Organization" },

  { label: "Roles", href: "/roles", icon: UserCog, permission: "roles.view", group: "Administration" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view", group: "Administration" },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldAlert, permission: "audit.view", group: "Administration" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings.view", group: "Administration" },
];
