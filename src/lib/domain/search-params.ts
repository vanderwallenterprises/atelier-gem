import { z } from "zod";
import { GEMSTONE_TYPES, GRADING_LABS, ORIGIN_CLASSES, SHAPES, SORTS, TREATMENT_STATUSES } from "./gemstone";

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Turn "" / garbage into undefined so a bad URL never errors, it just drops the filter. */
const optional = <S extends z.ZodType>(schema: S) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional()).catch(undefined);

const decimal = optional(z.coerce.number().finite().positive().max(10_000));
const money = optional(z.coerce.number().int().positive().max(1_000_000_000));

export const listingSearchSchema = z.object({
  q: optional(z.string().trim().max(120)),
  type: optional(z.enum(keys(GEMSTONE_TYPES))),
  shape: optional(z.enum(keys(SHAPES))),
  origin: optional(z.enum(keys(ORIGIN_CLASSES))),
  treatment: optional(z.enum(keys(TREATMENT_STATUSES))),
  lab: optional(z.enum(keys(GRADING_LABS))),
  verified: optional(z.enum(["1"])),
  color: optional(z.string().trim().max(40)),
  seller: optional(z.uuid()),
  /** Whole major units in the URL (e.g. min_price=2000); converted to minor units in the query. */
  min_price: money,
  max_price: money,
  min_carat: decimal,
  max_carat: decimal,
  available: optional(z.enum(["1"])),
  sort: z.enum(keys(SORTS)).catch("newest").default("newest"),
  cursor: optional(z.string().max(200)),
});

export type ListingSearch = z.infer<typeof listingSearchSchema>;

export function parseListingSearch(input: Record<string, string | string[] | undefined>): ListingSearch {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(input)) flat[k] = Array.isArray(v) ? v[0] : v;
  return listingSearchSchema.parse(flat);
}

/** Serialize back to a query string, dropping empty values and the cursor. */
export function toQueryString(s: Partial<ListingSearch>, overrides: Partial<ListingSearch> = {}): string {
  const merged = { ...s, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "" || k === "cursor") continue;
    if (k === "sort" && v === "newest") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function activeFilterCount(s: ListingSearch): number {
  const ignore = new Set(["sort", "cursor", "q"]);
  return Object.entries(s).filter(([k, v]) => !ignore.has(k) && v !== undefined).length;
}
