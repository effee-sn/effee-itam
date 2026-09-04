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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-red-600 text-white shadow-sm"
          : "text-slate-300 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </Link>
  );
}
