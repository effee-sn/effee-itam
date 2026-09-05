"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, Download, TriangleAlert, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";

export function BackupRestore({ databaseName }: { databaseName: string }) {
  const router = useRouter();
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function downloadBackup() {
    setBackingUp(true);
    try {
      const res = await fetch("/api/settings/backup");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? "Backup failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? `itam-backup-${databaseName}.sql`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBackingUp(false);
    }
  }

  async function restore() {
    if (!file) {
      toast.error("Choose a .sql backup file first");
      return;
    }
    if (confirmText !== databaseName) {
      toast.error(`Type "${databaseName}" to confirm`);
      return;
    }
    setRestoring(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/restore", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error?.message ?? "Restore failed");
      toast.success(`Database "${j.data.database}" restored. A safety snapshot was saved on the server first.`);
      setFile(null);
      setConfirmText("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  const canRestore = !!file && confirmText === databaseName && !restoring;
  const dbTag = <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{databaseName}</span>;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Backup &amp; Restore</h2>
          <p className="text-xs text-neutral-500">Backups and restores apply to the currently connected database: {dbTag}.</p>
        </div>
      </div>

      {/* Download */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-800/30">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-56 flex-1">
          <h3 className="text-sm font-semibold">Download a backup</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Generates a complete SQL dump of {dbTag} and downloads it to your computer. Keep it somewhere safe.
          </p>
          <button
            onClick={downloadBackup}
            disabled={backingUp}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Download className="h-4 w-4" /> {backingUp ? "Preparing backup…" : "Download Backup"}
          </button>
        </div>
      </div>

      {/* Restore */}
      <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-500/30 dark:bg-rose-500/5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div className="text-sm text-rose-700 dark:text-rose-300">
            <h3 className="font-semibold text-rose-700 dark:text-rose-300">Restore from a backup</h3>
            <p className="font-semibold">This overwrites the current database.</p>
            <p className="mt-1">
              Every table in <span className="font-mono">{databaseName}</span> is replaced with the contents of the file. The
              restore always applies to <span className="font-mono">{databaseName}</span> — never another database, regardless
              of what the file contains. A safety snapshot of the current data is saved on the server first, so a mistake can be
              undone.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="restoreFile" className="mb-1.5 block text-sm font-medium">Backup file (.sql)</label>
            <input
              id="restoreFile"
              ref={fileRef}
              type="file"
              accept=".sql,application/sql,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={restoring}
              className="block w-full max-w-md rounded-lg border border-neutral-200 bg-white text-sm text-neutral-600 file:mr-3 file:border-0 file:border-r file:border-neutral-200 file:bg-neutral-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:file:border-neutral-700 dark:file:bg-neutral-800"
            />
          </div>

          <div>
            <label htmlFor="restoreConfirm" className="mb-1.5 block text-sm font-medium">
              Type <span className="font-mono font-semibold">{databaseName}</span> to confirm <span className="text-rose-500">*</span>
            </label>
            <Input
              id="restoreConfirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={databaseName}
              disabled={restoring}
              autoComplete="off"
              className="h-11! max-w-md px-3!"
            />
          </div>

          <button
            onClick={restore}
            disabled={!canRestore}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> {restoring ? "Restoring…" : "Restore Database"}
          </button>
        </div>
      </div>
    </div>
  );
}
