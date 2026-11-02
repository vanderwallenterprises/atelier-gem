import { z } from "zod";
import { uniqueSlug } from "@/lib/slug";
import { GEMSTONE_TYPES, GRADING_LABS, ORIGIN_CLASSES, SHAPES, TREATMENT_STATUSES } from "./gemstone";
import { parseMajorToMinor } from "./money";

/**
 * The seller listing wizard. Each step saves on its own, so a draft can be finished later.
 * Schemas turn raw form strings into column values; empty optional fields become null.
 */
export const WIZARD_STEPS = [
  { key: "stone", title: "The stone" },
  { key: "measurements", title: "Measurements and grades" },
  { key: "disclosures", title: "Treatment and origin" },
  { key: "report", title: "Grading report" },
  { key: "photos", title: "Photos" },
  { key: "price", title: "Price and shipping" },
  { key: "review", title: "Review and submit" },
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number]["key"];

export function stepIndex(step: string | undefined): number {
  const i = WIZARD_STEPS.findIndex((s) => s.key === step);
  return i === -1 ? 0 : i;
}

export function nextStep(step: WizardStep): WizardStep {
  return WIZARD_STEPS[Math.min(stepIndex(step) + 1, WIZARD_STEPS.length - 1)].key;
}

const keysOf = <T extends Record<string, string>>(m: T) => Object.keys(m) as [keyof T & string, ...(keyof T & string)[]];

/** Optional free text: trimmed, empty → null, length-capped. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === "" ? null : v));

/** Optional positive decimal kept as a string so Postgres numeric gets it exactly. */
const decimal = (intDigits: number, fracDigits: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || new RegExp(`^\\d{1,${intDigits}}(\\.\\d{1,${fracDigits}})?$`).test(v), {
      message: `Enter ${label} as a number with up to ${fracDigits} decimal places`,
    })
    .refine((v) => v === null || (Number(v) > 0 && Number(v) <= max), { message: `Enter ${label} between 0 and ${max}` });

export const stoneStep = z.object({
  title: z.string().trim().min(3, "Give the listing a title of at least 3 characters").max(140, "Keep the title under 140 characters"),
  gemstone_type: z.enum(keysOf(GEMSTONE_TYPES), "Choose the gemstone type"),
  variety: text(80),
  shape: z.enum(keysOf(SHAPES), "Choose the shape"),
  natural_or_lab_grown: z.enum(keysOf(ORIGIN_CLASSES), "Choose natural, laboratory-grown, or not stated"),
  description: text(6000),
});

export const measurementsStep = z.object({
  carat_weight: decimal(4, 3, 5000, "the carat weight"),
  length_mm: decimal(3, 2, 300, "the length"),
  width_mm: decimal(3, 2, 300, "the width"),
  depth_mm: decimal(3, 2, 300, "the depth"),
  color_description: text(80),
  clarity_grade: text(40),
  cut_grade: text(40),
});

export const disclosuresStep = z
  .object({
    treatment_status: z.enum(keysOf(TREATMENT_STATUSES), "Say whether the stone is treated"),
    treatment_description: text(2000),
    origin_claim: text(120),
    disclosure_notes: text(2000),
  })
  .refine((v) => v.treatment_status !== "treated" || v.treatment_description !== null, {
    path: ["treatment_description"],
    message: "Describe the treatment, for example heat or fracture filling",
  });

export const reportStep = z
  .object({
    grading_lab: z.enum(keysOf(GRADING_LABS), "Choose the laboratory, or no grading report"),
    report_number: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .refine((v) => v === null || /^[A-Za-z0-9-]{4,30}$/.test(v), { message: "Report numbers are 4 to 30 letters, digits or hyphens" }),
    report_date: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), { message: "Enter the date on the report" })
      .refine((v) => v === null || Date.parse(v) <= Date.now(), { message: "The report date can't be in the future" }),
    report_url: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .refine((v) => v === null || (/^https:\/\//.test(v) && URL.canParse(v) && v.length <= 500), { message: "Enter a full https:// link, or leave it empty" }),
  })
  .transform((v) => (v.grading_lab === "none" ? { grading_lab: "none" as const, report_number: null, report_date: null, report_url: null } : v))
  .refine((v) => v.grading_lab === "none" || v.report_number !== null, {
    path: ["report_number"],
    message: "Enter the report number printed on the report",
  });

export const SHIPPING_REGIONS = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  EU: "European Union",
  AU: "Australia",
  INTL: "Other countries, on request",
} as const;

export const LISTING_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

export const priceStep = z
  .object({
    asking_price: z.string(),
    currency: z.enum(LISTING_CURRENCIES, "Choose a currency"),
    shipping_regions: z.array(z.enum(keysOf(SHIPPING_REGIONS))).min(1, "Choose at least one region you ship to"),
    handling_days: z
      .string()
      .trim()
      .refine((v) => /^\d{1,2}$/.test(v) && Number(v) <= 60, { message: "Enter handling time in days, 0 to 60" })
      .transform(Number),
    return_policy: text(2000),
    ships_insured: z.boolean(),
    ships_tracked: z.boolean(),
  })
  .transform(priceToMinor);

/** A live listing's price can change without review; nothing else is accepted. */
export const livePriceStep = z
  .object({ asking_price: z.string(), currency: z.enum(LISTING_CURRENCIES, "Choose a currency") })
  .transform(priceToMinor);

function priceToMinor<T extends { asking_price: string; currency: string }>({ asking_price, ...rest }: T, ctx: z.RefinementCtx) {
  const minor = parseMajorToMinor(asking_price, rest.currency);
  if (minor === null || minor <= 0 || minor >= 100_000_000_000) {
    ctx.addIssue({ code: "custom", path: ["asking_price"], message: "Enter the asking price, for example 4500 or 4500.50" });
    return z.NEVER;
  }
  return { ...rest, asking_price_minor_units: minor };
}

export const STEP_SCHEMAS = {
  stone: stoneStep,
  measurements: measurementsStep,
  disclosures: disclosuresStep,
  report: reportStep,
  price: priceStep,
} as const;
export type FormStep = keyof typeof STEP_SCHEMAS;

export function isFormStep(step: string): step is FormStep {
  return Object.hasOwn(STEP_SCHEMAS, step);
}

/** FormData → plain object for the given step (checkbox groups become arrays, toggles booleans). */
export function formToInput(step: FormStep, form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  }
  if (step === "price") {
    out.shipping_regions = form.getAll("shipping_regions").filter((v) => typeof v === "string");
    out.ships_insured = form.get("ships_insured") === "on";
    out.ships_tracked = form.get("ships_tracked") === "on";
  }
  return out;
}

/** The draft fields a submission check needs. */
export type DraftForReview = {
  title: string;
  carat_weight: string | number | null;
  treatment_status: string;
  treatment_description: string | null;
  grading_lab: string;
  report_number: string | null;
  asking_price_minor_units: number | null;
  shipping_regions: string[];
  handling_days: number | null;
};

/** What still blocks submission, each tied to the step that fixes it. Empty = ready. */
export function submissionProblems(l: DraftForReview, photoCount: number): { step: WizardStep; message: string }[] {
  const problems: { step: WizardStep; message: string }[] = [];
  if (l.carat_weight === null) problems.push({ step: "measurements", message: "Add the carat weight." });
  if (l.treatment_status === "treated" && !l.treatment_description) problems.push({ step: "disclosures", message: "Describe the treatment." });
  if (l.grading_lab !== "none" && !l.report_number) problems.push({ step: "report", message: "Add the report number, or choose no grading report." });
  if (photoCount < 1) problems.push({ step: "photos", message: "Add at least one photo of the stone." });
  if (l.asking_price_minor_units === null) problems.push({ step: "price", message: "Set an asking price." });
  if (l.shipping_regions.length === 0 || l.handling_days === null) problems.push({ step: "price", message: "Say where you ship and how long handling takes." });
  return problems;
}

/** URL-safe slug from a title plus a random suffix, matching the database check. */
export function listingSlug(title: string, suffix: string): string {
  return uniqueSlug(title, suffix, 100, "gemstone");
}
