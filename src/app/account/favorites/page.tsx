import type { Metadata } from "next";
import { Suspense } from "react";
import { removeFavorite } from "../actions";
import { GemCard } from "@/components/gemstone/gem-card";
import { ResultsSkeleton } from "@/components/gemstone/listing-results";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/primitives";
import { requireAccount } from "@/lib/auth/session";
import type { PublicListing } from "@/lib/domain/gemstone";
import { publicObjectUrl } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved stones", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <Container className="py-12">
      <h1 className="text-4xl sm:text-5xl">Saved stones</h1>
      <div className="mt-10">
        <Suspense fallback={<ResultsSkeleton />}>
          <Favorites />
        </Suspense>
      </div>
    </Container>
  );
}

async function Favorites() {
  const account = await requireAccount("/account/favorites");
  const supabase = (await getSupabase())!;
  const { data: favs } = await supabase
    .from("favorites")
    .select("gemstone_listing_id, created_at")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const ids = (favs ?? []).map((f) => f.gemstone_listing_id);
  // Only stones that are still public; withdrawn ones simply drop out of the list.
  const { data } = ids.length
    ? await supabase
        .from("listing_cards")
        .select("id, slug, title, gemstone_type, variety, natural_or_lab_grown, shape, carat_weight, asking_price_minor_units, currency, inventory_quantity, listing_status, verification_status, grading_lab, is_sample, seller, primary_image")
        .in("id", ids)
    : { data: [] };
  const byId = new Map((data ?? []).map((r) => [r.id as string, r as unknown as PublicListing]));
  const listings = ids.flatMap((id) => {
    const l = byId.get(id);
    return l ? [{ ...l, primary_image: publicObjectUrl("listing-photos", l.primary_image) }] : [];
  });

  if (listings.length === 0) {
    return (
      <EmptyState title="Nothing saved yet" action={<ButtonLink href="/gemstones">Browse gemstones</ButtonLink>}>
        <p>Use Save on any stone&rsquo;s page to keep it here while you compare.</p>
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l) => (
        <li key={l.id} className="grid gap-2">
          <GemCard listing={l} />
          <form action={removeFavorite.bind(null, l.id)}>
            <button type="submit" className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">Remove from saved</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
