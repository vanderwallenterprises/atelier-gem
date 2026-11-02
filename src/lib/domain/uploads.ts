/**
 * File checks for seller uploads. The type comes from the file's first bytes, not from the
 * name or the browser-supplied content type, both of which the uploader controls.
 */
export type SniffedType = { mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; ext: "jpg" | "png" | "webp" | "pdf" };

export function sniffType(head: Uint8Array): SniffedType | null {
  const b = (i: number) => head[i];
  if (head.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (head.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)) return { mime: "image/png", ext: "png" };
  if (head.length >= 12 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (head.length >= 5 && ascii(head, 0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to));
}

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS = 12;
export const MAX_DOCUMENTS = 6;

export type UploadCheck = { ok: true; type: SniffedType } | { ok: false; message: string };

export function checkUpload(file: { size: number; head: Uint8Array }, kind: "photo" | "document"): UploadCheck {
  if (file.size === 0) return { ok: false, message: "Choose a file to upload." };
  const max = kind === "photo" ? PHOTO_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (file.size > max) return { ok: false, message: `Files can be up to ${max / 1024 / 1024} MB.` };
  const type = sniffType(file.head);
  if (!type) return { ok: false, message: kind === "photo" ? "Photos must be JPEG, PNG or WebP." : "Documents must be PDF, JPEG, PNG or WebP." };
  if (kind === "photo" && type.mime === "application/pdf") return { ok: false, message: "Photos must be JPEG, PNG or WebP." };
  return { ok: true, type };
}
