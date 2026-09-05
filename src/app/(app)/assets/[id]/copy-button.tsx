"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Small inline copy-to-clipboard control shown next to fields like Serial / UUID / MAC. */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
