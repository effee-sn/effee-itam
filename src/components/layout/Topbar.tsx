"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Bell, ChevronDown, KeyRound, LogOut } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function prettyRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Topbar({
  pendingCount = 0,
  canViewDiscovered = false,
}: {
  pendingCount?: number;
  canViewDiscovered?: boolean;
}) {
  const { session } = usePermissions();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/assets/computers?search=${encodeURIComponent(q)}`);
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      {/* Global search */}
      <form onSubmit={onSearch} className="relative w-full max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets, users, departments..."
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-16 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-neutral-900"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:block dark:border-neutral-700 dark:bg-neutral-800">
          Ctrl + K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Notifications — real count of items waiting in Discovered */}
        {canViewDiscovered && (
          <Link
            href="/discovered"
            title={pendingCount > 0 ? `${pendingCount} device(s) waiting to be onboarded` : "Nothing waiting in Discovered"}
            className="relative rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Link>
        )}

        {/* User avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 outline-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">
              {session ? initialsOf(session.name) : "?"}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-100">{session?.name}</span>
              <span className="block text-xs text-neutral-500">{session ? prettyRole(session.roleName) : ""}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <div className="truncate text-sm font-medium">{session?.name}</div>
              <div className="truncate text-xs text-neutral-500">{session?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/change-password" />}>
              <KeyRound className="h-4 w-4" /> Change Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} disabled={loggingOut} className="text-red-600 dark:text-red-400">
              <LogOut className="h-4 w-4" /> {loggingOut ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
