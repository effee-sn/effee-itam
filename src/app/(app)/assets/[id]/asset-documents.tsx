"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { FileUploader } from "@/components/shared/FileUploader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Documents</h2>
      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <a
                href={document.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <FileText className="h-4 w-4" />
                {document.filePath.split("/").pop()}
              </a>
              {canEdit && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Delete
                    </Button>
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
    </div>
  );
}
