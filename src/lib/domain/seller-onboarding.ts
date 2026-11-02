import { z } from "zod";
import { uniqueSlug } from "@/lib/slug";

/** Recorded with the seller profile; the database stamps the acceptance time. */
export const SELLER_TERMS_VERSION = "2026-10-27-draft";

export const SELLER_TYPES = {
  individual: "Individual collector",
  dealer: "Gem dealer",
  cutter: "Lapidary or cutter",
  wholesaler: "Wholesaler",
  retailer: "Jewelry retailer",
  other: "Something else",
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === "" ? null : v));

export const sellerOnboardingSchema = z.object({
  business_name: z.string().trim().min(2, "Enter the name buyers will see, at least 2 characters").max(120, "Keep it under 120 characters"),
  seller_type: z.enum(Object.keys(SELLER_TYPES) as [keyof typeof SELLER_TYPES], "Choose what kind of seller you are"),
  contact_email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .refine((v) => v === null || (v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)), { message: "Enter a valid email, or leave it empty" }),
  location_city: optionalText(80),
  location_region: optionalText(80),
  location_country: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{2}$/.test(v), { message: "Enter a two-letter country code, for example US" }),
  shipping_policy: optionalText(4000),
  return_policy: optionalText(4000),
});

export const SELLER_TERMS_ERROR = "Agree to the seller terms to continue";

export function sellerSlug(name: string, suffix: string): string {
  return uniqueSlug(name, suffix, 60, "seller");
}
