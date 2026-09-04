"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/shared/FileUploader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

type ImportRowResult = {
  row: number;
  status: "created" | "error";
  assetTag?: string;
  message?: string;
};

type ImportSummary = {
  total: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
};

export function AssetImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFile(files: File[]) {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assets/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "Import failed");
        return;
      }
      setSummary(json.data as ImportSummary);
      if (json.data.created > 0) {
        toast.success(`Imported ${json.data.created} of ${json.data.total} asset(s)`);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSummary(null);
      }}
    >
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <Upload className="h-4 w-4 text-neutral-500" /> Import
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Assets</DialogTitle>
          <DialogDescription>
            Upload an .xlsx file with a header row — the same columns Export produces, so exporting
            once gives you a ready-made template. <strong>Export from a type&apos;s own page</strong>{" "}
            (Computers, Phones…) to get that type&apos;s specific columns too, such as OS version or
            IMEI. The <strong>Asset Type</strong> of each row decides which type it becomes (Computer,
            Phone, Monitor…), so one file can mix types. Unknown Vendor/Department names are created
            automatically. Existing Asset Tags or Serial Numbers are rejected, not overwritten.
          </DialogDescription>
        </DialogHeader>

        {!summary && (
          <FileUploader
            accept=".xlsx"
            multiple={false}
            label={uploading ? "Importing..." : "Click or drag an .xlsx file here"}
            disabled={uploading}
            onFilesSelected={handleFile}
          />
        )}

        {summary && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium text-green-700 dark:text-green-500">{summary.created} created</span>
              {summary.failed > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-destructive">{summary.failed} failed</span>
                </>
              )}
              {" "}out of {summary.total} row(s).
            </p>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {summary.results.map((result) => (
                    <tr key={result.row} className="border-b last:border-0">
                      <td className="px-3 py-1.5 text-neutral-500 tabular-nums">Row {result.row}</td>
                      <td className="px-3 py-1.5">
                        {result.status === "created" ? (
                          <span className="text-green-700 dark:text-green-500">
                            Created {result.assetTag}
                            {result.message && (
                              <span className="text-neutral-500"> — {result.message}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-destructive">{result.message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FileUploader
              accept=".xlsx"
              multiple={false}
              label={uploading ? "Importing..." : "Import another file"}
              disabled={uploading}
              onFilesSelected={handleFile}
            />
          </div>
        )}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
