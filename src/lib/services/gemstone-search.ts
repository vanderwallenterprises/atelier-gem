import "server-only";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase/server";
import type { PublicListing } from "@/lib/domain/gemstone";
import type { ListingSearch } from "@/lib/domain/search-params";
import { publicObjectUrl } from "@/lib/storage";

function toPublic(row: PublicListing): PublicListing {
  return { ...row, primary_image: publicObjectUrl("listing-photos", row.primary_image) };
}

export const PAGE_SIZE = 24;

/** Columns exposed by the `listing_cards` view (published + approved listings only, RLS-backed). */
const CARD_COLUMNS =
  "id, slug, title, gemstone_type, variety, natural_or_lab_grown, shape, carat_weight, length_mm, width_mm, depth_mm, color_description, clarity_grade, cut_grade, treatment_status, treatment_description, origin_claim, origin_evidence_status, grading_lab, report_number, report_date, asking_price_minor_units, currency, inventory_quantity, listing_status, verification_status, description, is_sample, created_at, seller, primary_image";

type SortKey = { column: string; ascending: boolean };
const SORT_KEYS: Record<ListingSearch["sort"], SortKey> = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "asking_price_minor_units", ascending: true },
  price_desc: { column: "asking_price_minor_units", ascending: false },
  carat_desc: { column: "carat_weight", ascending: false },
};

type Cursor = { v: string | number; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const okValue = typeof c?.v === "string" || typeof c?.v === "number";
    const okId = typeof c?.id === "string" && /^[0-9a-f-]{36}$/i.test(c.id);
    return okValue && okId ? { v: c.v, id: c.id } : null;
  } catch {
    return null;
  }
}

/** Quote a value for a PostgREST filter string so commas/parens can't change its meaning. */
function pgrstValue(v: string | number): string {
  return typeof v === "number" ? String(v) : `"${String(v).replace(/["\\]/g, "")}"`;
}

export type SearchResult =
  | { status: "ok"; listings: PublicListing[]; nextCursor: string | null }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function searchListings(s: ListingSearch, limit = PAGE_SIZE): Promise<SearchResult> {
  const supabase = await getSupabase();
  if (!supabase) return { status: "unconfigured" };

  let q = supabase.from("listing_cards").select(CARD_COLUMNS);
  if (s.q) q = q.textSearch("search_vector", s.q, { type: "websearch", config: "english" });
  if (s.type) q = q.eq("gemstone_type", s.type);
  if (s.shape) q = q.eq("shape", s.shape);
  if (s.origin) q = q.eq("natural_or_lab_grown", s.origin);
  if (s.treatment) q = q.eq("treatment_status", s.treatment);
  if (s.lab) q = q.eq("grading_lab", s.lab);
  if (s.verified) q = q.eq("verification_status", "verified");
  if (s.seller) q = q.eq("seller_id", s.seller);
  if (s.color) q = q.ilike("color_description", `%${s.color.replace(/[%_\\]/g, "")}%`);
  if (s.available) q = q.eq("listing_status", "published");
  // Price filters and price sorts compare USD amounts only; other currencies aren't converted.
  const priceSensitive = s.min_price || s.max_price || s.sort === "price_asc" || s.sort === "price_desc";
  if (priceSensitive) q = q.eq("currency", "USD");
  if (s.min_price) q = q.gte("asking_price_minor_units", s.min_price * 100);
  if (s.max_price) q = q.lte("asking_price_minor_units", s.max_price * 100);
  if (s.min_carat) q = q.gte("carat_weight", s.min_carat);
  if (s.max_carat) q = q.lte("carat_weight", s.max_carat);

  const { column, ascending } = SORT_KEYS[s.sort];
  if (column === "carat_weight") q = q.not("carat_weight", "is", null);
  const cursor = decodeCursor(s.cursor);
  if (cursor) {
    const op = ascending ? "gt" : "lt";
    const v = pgrstValue(cursor.v);
    q = q.or(`${column}.${op}.${v},and(${column}.eq.${v},id.${op}.${pgrstValue(cursor.id)})`);
  }
  q = q.order(column, { ascending }).order("id", { ascending }).limit(limit + 1);

  const { data, error } = await q;
  if (error) return { status: "error", message: "Gemstones couldn't be loaded. Try again in a moment." };
  const rows = (data ?? []) as unknown as PublicListing[];
  const page = rows.slice(0, limit).map(toPublic);
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({ v: (last as unknown as Record<string, string | number>)[column], id: last.id })
      : null;
  return { status: "ok", listings: page, nextCursor };
}

export type ListingDetail = PublicListing & {
  report_url: string | null;
  disclosure_notes: string | null;
  shipping_regions: string[];
  handling_days: number | null;
  return_policy: string | null;
  ships_insured: boolean;
  ships_tracked: boolean;
  published_at: string | null;
};

const DETAIL_COLUMNS = `${CARD_COLUMNS}, report_url, disclosure_notes, shipping_regions, handling_days, return_policy, ships_insured, ships_tracked, published_at`;

/** Cached per request: generateMetadata and the page both ask for the same stone. */
export const getListingBySlug = cache(async (slug: string): Promise<ListingDetail | null> => {
  if (!/^[a-z0-9][a-z0-9-]{2,120}$/.test(slug)) return null;
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("listing_cards").select(DETAIL_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as ListingDetail;
  return { ...row, primary_image: publicObjectUrl("listing-photos", row.primary_image) };
});

/** Public photos of a public listing (the images policy follows the listing's visibility). */
export async function getListingPhotos(listingId: string): Promise<{ id: string; url: string }[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("gemstone_images")
    .select("id, storage_path")
    .eq("listing_id", listingId)
    .eq("media_type", "image")
    .order("is_primary", { ascending: false })
    .order("display_order")
    .order("created_at");
  return (data ?? []).flatMap((p) => {
    const url = publicObjectUrl("listing-photos", p.storage_path);
    return url ? [{ id: p.id, url }] : [];
  });
}

export type CheckResult = "not_checked" | "passed" | "failed" | "inconclusive";
export type VerificationSummary = {
  is_current: boolean;
  verification_method: string | null;
  record_check: CheckResult;
  consistency_check: CheckResult;
  physical_match_check: CheckResult;
  verified_at: string | null;
};

/** The latest report check, without reviewer identity, notes, or evidence. Null if never checked. */
export async function getVerificationSummary(listingId: string): Promise<VerificationSummary | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("listing_verification_summary")
    .select("is_current, verification_method, record_check, consistency_check, physical_match_check, verified_at")
    .eq("listing_id", listingId)
    .maybeSingle();
  return (data as VerificationSummary | null) ?? null;
}
