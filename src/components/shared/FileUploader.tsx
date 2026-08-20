"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function FileUploader({
  accept,
  multiple = true,
  onFilesSelected,
  disabled,
  label = "Click or drag files here to upload",
}: {
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  }

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center text-sm text-neutral-500 transition-colors dark:border-neutral-700",
        dragActive && "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <p>{label}</p>
    </div>
  );
}
