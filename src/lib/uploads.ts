import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export class UploadError extends Error {}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

async function saveFile(file: File, subDir: string, allowedTypes: string[], maxSize: number) {
  if (!allowedTypes.includes(file.type)) {
    throw new UploadError(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > maxSize) {
    throw new UploadError(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  const dir = path.join(UPLOAD_ROOT, subDir);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const filePath = path.join(dir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return `/uploads/${subDir}/${fileName}`.replace(/\\/g, "/");
}

export async function saveAssetImage(assetId: number, file: File) {
  return saveFile(file, `assets/${assetId}/images`, IMAGE_MIME_TYPES, MAX_IMAGE_SIZE);
}

export async function saveAssetDocument(assetId: number, file: File) {
  return saveFile(file, `assets/${assetId}/documents`, DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE);
}

export async function saveCompanyLogo(file: File) {
  return saveFile(file, "settings/logo", IMAGE_MIME_TYPES, MAX_LOGO_SIZE);
}

export async function deleteUploadedFile(publicPath: string) {
  const relative = publicPath.replace(/^\/uploads\//, "");
  const filePath = path.join(UPLOAD_ROOT, relative);
  try {
    await unlink(filePath);
  } catch {
    // File already gone; nothing to clean up.
  }
}
