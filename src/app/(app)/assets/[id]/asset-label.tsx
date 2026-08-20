"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function AssetLabel({
  assetTag,
  brand,
  model,
}: {
  assetTag: string;
  brand?: string | null;
  model?: string | null;
}) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, assetTag, { width: 120, margin: 1 });
    }
  }, [assetTag]);

  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-md border p-4">
      <canvas ref={qrRef} />
      <p className="text-sm font-semibold">{assetTag}</p>
      {(brand || model) && (
        <p className="text-xs text-neutral-500">{[brand, model].filter(Boolean).join(" ")}</p>
      )}
    </div>
  );
}
