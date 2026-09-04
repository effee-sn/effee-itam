"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Backup &amp; Restore</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Backups and restores apply to the currently connected database:{" "}
          <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{databaseName}</span>.
        </p>
      </div>

      {/* Backup */}
      <div className="rounded-md border p-4">
        <h3 className="font-medium">Download a backup</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Generates a complete SQL dump of <span className="font-mono">{databaseName}</span> and downloads it to your
          computer. Keep it somewhere safe.
        </p>
        <div className="mt-3">
          <Button onClick={downloadBackup} disabled={backingUp}>
            {backingUp ? "Preparing backup…" : "Download Backup"}
          </Button>
        </div>
      </div>

      {/* Restore */}
      <div className="rounded-md border border-destructive/40 p-4">
        <h3 className="font-medium text-destructive">Restore from a backup</h3>
        <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-semibold">This overwrites the current database.</p>
          <p className="mt-1">
            Every table in <span className="font-mono">{databaseName}</span> is replaced with the contents of the file.
            The restore always applies to <span className="font-mono">{databaseName}</span> — never another database,
            regardless of what the file contains. A safety snapshot of the current data is saved on the server first, so
            a mistake can be undone.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="restoreFile">Backup file (.sql)</FieldLabel>
            <input
              id="restoreFile"
              ref={fileRef}
              type="file"
              accept=".sql,application/sql,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={restoring}
              className="block text-sm"
            />
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="restoreConfirm">
              Type <span className="font-mono font-semibold">{databaseName}</span> to confirm
            </FieldLabel>
            <Input
              id="restoreConfirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={databaseName}
              disabled={restoring}
              autoComplete="off"
              className="max-w-xs"
            />
          </div>

          <Button variant="destructive" onClick={restore} disabled={!canRestore}>
            {restoring ? "Restoring…" : "Restore Database"}
          </Button>
        </div>
      </div>
    </div>
  );
}
