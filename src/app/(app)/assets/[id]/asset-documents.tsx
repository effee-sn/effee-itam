"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Files, Trash2 } from "lucide-react";
import { FileUploader } from "@/components/shared/FileUploader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type AssetDocument = { id: number; filePath: string; label: string | null };

export function AssetDocuments({
  assetId,
  documents,
  canEdit,
}: {
  assetId: number;
  documents: AssetDocument[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/assets/${assetId}/documents`, { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error?.message ?? "Failed to upload document");
        }
      }
      toast.success("Document(s) uploaded");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: number) {
    const res = await fetch(`/api/assets/${assetId}/documents/${documentId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete document");
      return;
    }
    toast.success("Document deleted");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <Files className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Documents</h2>
          <p className="text-xs text-neutral-500">Invoices, warranties and other files for this asset</p>
        </div>
      </div>

      {documents.length > 0 && (
        <ul className="mb-4 space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-neutral-800"
            >
              <a
                href={document.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2.5 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="truncate font-medium">{document.filePath.split("/").pop()}</span>
              </a>
              {canEdit && (
                <ConfirmDialog
                  trigger={
                    <button title="Delete" className="shrink-0 rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  }
                  title="Delete document"
                  description="Are you sure you want to delete this document?"
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => handleDelete(document.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <FileUploader
          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
          label={uploading ? "Uploading..." : "Click or drag documents here to upload"}
          disabled={uploading}
          onFilesSelected={handleUpload}
        />
      )}
      {documents.length === 0 && !canEdit && <p className="text-sm text-neutral-500">No documents uploaded.</p>}
    </div>
  );
}
