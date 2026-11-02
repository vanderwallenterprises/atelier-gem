import { publicEnv } from "@/lib/env";

/** Public URL for an object in a public bucket. Paths come from the database, never from users. */
export function publicObjectUrl(bucket: "listing-photos" | "avatars", path: string | null): string | null {
  if (!path || !publicEnv.supabaseUrl) return null;
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) return null;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
