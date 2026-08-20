"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Decided by Sidebar rather than here: with nested routes like /assets and
   * /assets/computers, a local `startsWith` check would light up both. Sidebar picks the
   * single longest matching nav href instead.
   */
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-brand text-brand-foreground"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
