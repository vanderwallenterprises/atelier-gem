/** Shared gemstone vocabulary. Keys match the database enums in supabase/migrations. */

export const GEMSTONE_TYPES = {
  diamond: "Diamond",
  sapphire: "Sapphire",
  ruby: "Ruby",
  emerald: "Emerald",
  spinel: "Spinel",
  tourmaline: "Tourmaline",
  aquamarine: "Aquamarine",
  garnet: "Garnet",
  opal: "Opal",
  other: "Other gemstone",
} as const;
export type GemstoneType = keyof typeof GEMSTONE_TYPES;

export const SHAPES = {
  round: "Round",
  oval: "Oval",
  cushion: "Cushion",
  emerald_cut: "Emerald cut",
  pear: "Pear",
  princess: "Princess",
  marquise: "Marquise",
  radiant: "Radiant",
  asscher: "Asscher",
  heart: "Heart",
  other: "Other shape",
} as const;
export type Shape = keyof typeof SHAPES;

export const ORIGIN_CLASSES = {
  natural: "Natural",
  lab_grown: "Laboratory-grown",
  unknown: "Not stated",
} as const;
export type OriginClass = keyof typeof ORIGIN_CLASSES;

export const TREATMENT_STATUSES = {
  untreated: "Untreated",
  treated: "Treated",
  unknown: "Treatment unknown",
  not_applicable: "Not applicable",
} as const;
export type TreatmentStatus = keyof typeof TREATMENT_STATUSES;

export const GRADING_LABS = {
  GIA: "GIA",
  IGI: "IGI",
  AGS: "AGS",
  GRS: "GRS",
  SSEF: "SSEF",
  Gubelin: "Gübelin",
  AGL: "AGL",
  other: "Other laboratory",
  none: "No grading report",
} as const;
export type GradingLab = keyof typeof GRADING_LABS;

/** Report verification lifecycle (spec §11). */
export const VERIFICATION_STATUSES = {
  not_submitted: "No report submitted",
  submitted: "Report submitted",
  pending_review: "Report under review",
  verified: "Report verified",
  unable_to_verify: "Report could not be verified",
  rejected: "Report rejected",
  recheck_required: "Report needs recheck",
} as const;
export type VerificationStatus = keyof typeof VERIFICATION_STATUSES;

export const LISTING_STATUSES = {
  draft: "Draft",
  submitted: "Submitted for review",
  published: "Published",
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "Withdrawn",
} as const;
export type ListingStatus = keyof typeof LISTING_STATUSES;

export const SORTS = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  carat_desc: "Carat weight",
} as const;
export type Sort = keyof typeof SORTS;

/** Public listing as returned to browsers (no private seller or moderation fields). */
export type PublicListing = {
  id: string;
  slug: string;
  title: string;
  gemstone_type: GemstoneType;
  variety: string | null;
  natural_or_lab_grown: OriginClass;
  shape: Shape;
  carat_weight: string | null; // numeric from Postgres arrives as string; never float math on it
  length_mm: string | null;
  width_mm: string | null;
  depth_mm: string | null;
  color_description: string | null;
  clarity_grade: string | null;
  cut_grade: string | null;
  treatment_status: TreatmentStatus;
  treatment_description: string | null;
  origin_claim: string | null;
  origin_evidence_status: string | null;
  grading_lab: GradingLab;
  report_number: string | null;
  report_date: string | null;
  asking_price_minor_units: number;
  currency: string;
  inventory_quantity: number;
  listing_status: ListingStatus;
  verification_status: VerificationStatus;
  description: string | null;
  is_sample: boolean;
  created_at: string;
  seller: { id: string; business_name: string; slug: string | null } | null;
  primary_image: string | null;
};

export function labelFor<T extends Record<string, string>>(map: T, key: string | null | undefined): string {
  return key && key in map ? map[key as keyof T] : "";
}
