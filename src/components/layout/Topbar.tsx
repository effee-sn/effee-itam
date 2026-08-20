"use client";

import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/shared/LogoutButton";
import packageJson from "../../../package.json";

export function Topbar() {
  const { session } = usePermissions();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      <span className="text-xs text-neutral-400 dark:text-neutral-600">v{packageJson.version}</span>
      <div className="flex items-center gap-3">
        {session && <span className="text-sm text-neutral-600 dark:text-neutral-400">{session.name}</span>}
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/change-password">Change Password</Link>} />
        <LogoutButton />
      </div>
    </header>
  );
}
