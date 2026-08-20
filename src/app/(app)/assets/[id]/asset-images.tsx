"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUploader } from "@/components/shared/FileUploader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Images</h2>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.filePath} alt="Asset" className="h-full w-full object-cover" />
              {canEdit && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      ×
                    </Button>
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
    </div>
  );
}
