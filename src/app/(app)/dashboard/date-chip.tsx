"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export function DateChip() {
  // Rendered on the client so it shows the viewer's local date/time (and avoids a
  // server/client hydration mismatch on the timestamp).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const date = now?.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = now?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <CalendarDays className="h-4 w-4 text-neutral-400" />
      <div className="leading-tight">
        <div className="font-medium text-neutral-700 dark:text-neutral-200">{date ?? "—"}</div>
        <div className="text-xs text-neutral-400">{time ?? ""}</div>
      </div>
    </div>
  );
}
