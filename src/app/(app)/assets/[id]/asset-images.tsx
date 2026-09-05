"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";
import { FileUploader } from "@/components/shared/FileUploader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type AssetImage = { id: number; filePath: string };

export function AssetImages({
  assetId,
  images,
  canEdit,
}: {
  assetId: number;
  images: AssetImage[];
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
        const res = await fetch(`/api/assets/${assetId}/images`, { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.error?.message ?? "Failed to upload image");
        }
      }
      toast.success("Image(s) uploaded");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId: number) {
    const res = await fetch(`/api/assets/${assetId}/images/${imageId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json.error?.message ?? "Failed to delete image");
      return;
    }
    toast.success("Image deleted");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
          <ImageIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Images</h2>
          <p className="text-xs text-neutral-500">Photos of this asset</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.filePath} alt="Asset" className="h-full w-full object-cover" />
              {canEdit && (
                <ConfirmDialog
                  trigger={
                    <button className="absolute right-1.5 top-1.5 rounded-md bg-rose-600 p-1 text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  }
                  title="Delete image"
                  description="Are you sure you want to delete this image?"
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => handleDelete(image.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <FileUploader
          accept="image/*"
          label={uploading ? "Uploading..." : "Click or drag images here to upload"}
          disabled={uploading}
          onFilesSelected={handleUpload}
        />
      )}
      {images.length === 0 && !canEdit && <p className="text-sm text-neutral-500">No images uploaded.</p>}
    </div>
  );
}
