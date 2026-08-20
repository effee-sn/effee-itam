"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGlobalProgress } from "@/components/shared/GlobalProgress";

export function ExportButton({ href, label }: { href: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const { start, stop } = useGlobalProgress();

  async function handleClick() {
    setLoading(true);
    start();
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error?.message ?? "Export failed");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? "export";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
      stop();
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {label}
    </Button>
  );
}
