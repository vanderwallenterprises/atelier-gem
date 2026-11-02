import "server-only";
import sharp from "sharp";
import type { SniffedType } from "@/lib/domain/uploads";

const MAX_EDGE = 3200;

/**
 * Re-encodes an uploaded listing photo before it goes into the public bucket: applies the
 * EXIF orientation, then drops all metadata (camera GPS location included), caps the size,
 * and rejects files that only look like images.
 */
export async function cleanPhoto(bytes: Uint8Array, type: SniffedType): Promise<Uint8Array | null> {
  try {
    let img = sharp(bytes, { limitInputPixels: 60_000_000, failOn: "error" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    if (type.ext === "png") img = img.png({ compressionLevel: 9 });
    else if (type.ext === "webp") img = img.webp({ quality: 90 });
    else img = img.jpeg({ quality: 90, mozjpeg: true });
    return new Uint8Array(await img.toBuffer());
  } catch {
    return null;
  }
}
