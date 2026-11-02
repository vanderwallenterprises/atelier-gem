import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import type { DraftForReview } from "@/lib/domain/listing-wizard";
import type { GemstoneType, GradingLab, ListingStatus, OriginClass, Shape, TreatmentStatus, VerificationStatus } from "@/lib/domain/gemstone";
import { publicObjectUrl } from "@/lib/storage";

export type SellerProfile = {
  id: string;
  business_name: string;
  slug: string | null;
  verification_status: string;
  payouts_enabled: boolean;
  approval_status: "pending" | "approved" | "rejected" | "revoked" | null;
};

/** The signed-in user's seller profile and seller-capability status (RLS: own rows only). */
export async function getMySeller(userId: string): Promise<SellerProfile | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const [{ data: profile }, { data: cap }] = await Promise.all([
    supabase.from("seller_profiles").select("id, business_name, slug, verification_status, payouts_enabled").eq("user_id", userId).maybeSingle(),
    supabase.from("user_capabilities").select("approval_status").eq("user_id", userId).eq("capability", "seller").maybeSingle(),
  ]);
  if (!profile) return null;
  return { ...profile, approval_status: cap?.approval_status ?? null };
}

export type SellerListingRow = {
  id: string;
  slug: string;
  title: string;
  gemstone_type: GemstoneType;
  carat_weight: string | null;
  asking_price_minor_units: number | null;
  currency: string;
  listing_status: ListingStatus;
  verification_status: VerificationStatus;
  moderation_status: string;
  updated_at: string;
};

export async function listMyListings(sellerId: string): Promise<SellerListingRow[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("gemstone_listings")
    .select("id, slug, title, gemstone_type, carat_weight, asking_price_minor_units, currency, listing_status, verification_status, moderation_status, updated_at")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false })
    .limit(200);
  return (data ?? []) as SellerListingRow[];
}

/** Full editable listing for its owner. RLS returns nothing for anyone else's listing. */
export type EditableListing = DraftForReview & {
  id: string;
  seller_id: string;
  slug: string;
  description: string | null;
  gemstone_type: GemstoneType;
  variety: string | null;
  shape: Shape;
  natural_or_lab_grown: OriginClass;
  length_mm: string | null;
  width_mm: string | null;
  depth_mm: string | null;
  color_description: string | null;
  clarity_grade: string | null;
  cut_grade: string | null;
  treatment_status: TreatmentStatus;
  origin_claim: string | null;
  disclosure_notes: string | null;
  grading_lab: GradingLab;
  report_date: string | null;
  report_url: string | null;
  currency: string;
  return_policy: string | null;
  ships_insured: boolean;
  ships_tracked: boolean;
  listing_status: ListingStatus;
  verification_status: VerificationStatus;
  moderation_status: string;
};

export async function getMyListing(id: string): Promise<EditableListing | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("gemstone_listings")
    .select(
      "id, seller_id, slug, title, description, gemstone_type, variety, shape, natural_or_lab_grown, carat_weight, length_mm, width_mm, depth_mm, color_description, clarity_grade, cut_grade, treatment_status, treatment_description, origin_claim, disclosure_notes, grading_lab, report_number, report_date, report_url, asking_price_minor_units, currency, shipping_regions, handling_days, return_policy, ships_insured, ships_tracked, listing_status, verification_status, moderation_status",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as EditableListing | null) ?? null;
}

export type ListingPhoto = { id: string; storage_path: string; url: string | null; is_primary: boolean; display_order: number };

export async function listListingPhotos(listingId: string): Promise<ListingPhoto[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("gemstone_images")
    .select("id, storage_path, is_primary, display_order")
    .eq("listing_id", listingId)
    .eq("media_type", "image")
    .order("is_primary", { ascending: false })
    .order("display_order")
    .order("created_at");
  return (data ?? []).map((p) => ({ ...p, url: publicObjectUrl("listing-photos", p.storage_path) }));
}

export type ListingDocument = { id: string; kind: string; storage_path: string; original_media_type: string; created_at: string };

export async function listListingDocuments(listingId: string): Promise<ListingDocument[]> {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("listing_documents")
    .select("id, kind, storage_path, original_media_type, created_at")
    .eq("listing_id", listingId)
    .order("created_at");
  return (data ?? []) as ListingDocument[];
}
