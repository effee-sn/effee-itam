"use client";

import { useSessionContext } from "@/components/providers/session-provider";

export function usePermissions() {
  const session = useSessionContext();
  const permissions = session?.permissions ?? [];

  return {
    session,
    permissions,
    hasPermission: (code: string) => permissions.includes(code),
  };
}
