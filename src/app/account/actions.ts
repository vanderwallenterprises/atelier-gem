"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/session";
import { getSupabase } from "@/lib/supabase/server";

/** Save or unsave a stone. Signed-out visitors are sent to sign in and brought back. */
export async function toggleFavorite(listingId: string, slug: string): Promise<void> {
  // Both values come from a bound action the client can replay with anything.
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !/^[a-z0-9][a-z0-9-]{2,120}$/.test(slug)) redirect("/gemstones");
  const back = `/gemstones/${slug}`;
  const account = await requireAccount(back);
  const supabase = (await getSupabase())!;
  const { data: existing } = await supabase
    .from("favorites")
    .select("gemstone_listing_id")
    .eq("user_id", account.id)
    .eq("gemstone_listing_id", listingId)
    .maybeSingle();
  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", account.id).eq("gemstone_listing_id", listingId);
  } else {
    await supabase.from("favorites").insert({ user_id: account.id, gemstone_listing_id: listingId });
  }
  revalidatePath(back);
  revalidatePath("/account/favorites");
  redirect(back);
}

export async function removeFavorite(listingId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) redirect("/account/favorites");
  const account = await requireAccount("/account/favorites");
  const supabase = (await getSupabase())!;
  await supabase.from("favorites").delete().eq("user_id", account.id).eq("gemstone_listing_id", listingId);
  revalidatePath("/account/favorites");
  redirect("/account/favorites");
}
