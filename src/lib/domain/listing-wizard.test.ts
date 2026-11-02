import { describe, expect, it } from "vitest";
import {
  disclosuresStep,
  formToInput,
  isFormStep,
  listingSlug,
  livePriceStep,
  measurementsStep,
  nextStep,
  priceStep,
  reportStep,
  stepIndex,
  stoneStep,
  submissionProblems,
  type DraftForReview,
} from "./listing-wizard";
import { formValues, isChecked } from "@/lib/forms";

describe("wizard steps", () => {
  it("falls back to the first step for unknown keys and stops at review", () => {
    expect(stepIndex("nope")).toBe(0);
    expect(nextStep("stone")).toBe("measurements");
    expect(nextStep("price")).toBe("review");
    expect(nextStep("review")).toBe("review");
  });

  it("only treats real form steps as saveable, not inherited keys", () => {
    expect(isFormStep("price")).toBe(true);
    expect(isFormStep("photos")).toBe(false);
    expect(isFormStep("constructor")).toBe(false);
  });
});

describe("stone step", () => {
  it("requires a title, type and shape and turns empty optionals into null", () => {
    const r = stoneStep.safeParse({ title: "  Blue oval sapphire ", gemstone_type: "sapphire", shape: "oval", natural_or_lab_grown: "natural", variety: "", description: "" });
    expect(r.success && r.data).toEqual({ title: "Blue oval sapphire", gemstone_type: "sapphire", shape: "oval", natural_or_lab_grown: "natural", variety: null, description: null });
    expect(stoneStep.safeParse({ title: "x", gemstone_type: "kryptonite", shape: "oval", natural_or_lab_grown: "natural", variety: "", description: "" }).success).toBe(false);
  });
});

describe("measurements step", () => {
  it("keeps decimals as exact strings and rejects malformed or out-of-range numbers", () => {
    const ok = measurementsStep.parse({ carat_weight: "1.523", length_mm: "7.9", width_mm: "", depth_mm: "", color_description: "", clarity_grade: "VS1", cut_grade: "" });
    expect(ok.carat_weight).toBe("1.523");
    expect(ok.width_mm).toBeNull();
    for (const bad of ["1.5234", "-1", "0", "1e3", "abc", "6000"]) {
      expect(measurementsStep.safeParse({ carat_weight: bad, length_mm: "", width_mm: "", depth_mm: "", color_description: "", clarity_grade: "", cut_grade: "" }).success, bad).toBe(false);
    }
  });
});

describe("disclosures step", () => {
  it("requires details when the stone is treated", () => {
    const base = { treatment_description: "", origin_claim: "", disclosure_notes: "" };
    expect(disclosuresStep.safeParse({ ...base, treatment_status: "treated" }).success).toBe(false);
    expect(disclosuresStep.safeParse({ ...base, treatment_status: "treated", treatment_description: "Heated" }).success).toBe(true);
    expect(disclosuresStep.safeParse({ ...base, treatment_status: "untreated" }).success).toBe(true);
  });
});

describe("report step", () => {
  const base = { report_number: "", report_date: "", report_url: "" };
  it("clears report fields when there is no lab", () => {
    expect(reportStep.parse({ grading_lab: "none", report_number: "2141438171", report_date: "2024-01-02", report_url: "https://example.org" })).toEqual({
      grading_lab: "none",
      report_number: null,
      report_date: null,
      report_url: null,
    });
  });
  it("needs a well-formed number for a lab, an https link, and a past date", () => {
    expect(reportStep.safeParse({ ...base, grading_lab: "GIA" }).success).toBe(false);
    expect(reportStep.safeParse({ ...base, grading_lab: "GIA", report_number: "21 41" }).success).toBe(false);
    expect(reportStep.safeParse({ ...base, grading_lab: "GIA", report_number: "2141438171", report_url: "http://x.test" }).success).toBe(false);
    expect(reportStep.safeParse({ ...base, grading_lab: "GIA", report_number: "2141438171", report_url: "javascript:alert(1)" }).success).toBe(false);
    expect(reportStep.safeParse({ ...base, grading_lab: "GIA", report_number: "2141438171", report_date: "2999-01-01" }).success).toBe(false);
    expect(reportStep.safeParse({ ...base, grading_lab: "GIA", report_number: "2141438171", report_date: "2023-05-04" }).success).toBe(true);
  });
});

describe("price step", () => {
  const form = () => {
    const f = new FormData();
    f.set("asking_price", "4,500.50");
    f.set("currency", "USD");
    f.append("shipping_regions", "US");
    f.append("shipping_regions", "CA");
    f.set("handling_days", "3");
    f.set("return_policy", "");
    f.set("ships_insured", "on");
    f.set("$ACTION_ID_abc", "");
    return f;
  };
  it("converts the price to minor units and reads checkbox groups", () => {
    expect(priceStep.parse(formToInput("price", form()))).toEqual({
      asking_price_minor_units: 450050,
      currency: "USD",
      shipping_regions: ["US", "CA"],
      handling_days: 3,
      return_policy: null,
      ships_insured: true,
      ships_tracked: false,
    });
  });
  it("rejects zero, garbage, too many decimals, and unknown regions", () => {
    for (const p of ["0", "abc", "10.505", ""]) {
      const f = form();
      f.set("asking_price", p);
      expect(priceStep.safeParse(formToInput("price", f)).success, p).toBe(false);
    }
    const f = form();
    f.append("shipping_regions", "MARS");
    expect(priceStep.safeParse(formToInput("price", f)).success).toBe(false);
  });
});

describe("submissionProblems", () => {
  const ready: DraftForReview = {
    title: "Sapphire",
    carat_weight: "1.52",
    treatment_status: "untreated",
    treatment_description: null,
    grading_lab: "GIA",
    report_number: "2141438171",
    asking_price_minor_units: 450000,
    shipping_regions: ["US"],
    handling_days: 2,
  };
  it("is empty for a complete draft with a photo", () => {
    expect(submissionProblems(ready, 1)).toEqual([]);
  });
  it("points each gap at the step that fixes it", () => {
    const steps = submissionProblems({ ...ready, carat_weight: null, report_number: null, asking_price_minor_units: null, shipping_regions: [] }, 0).map((p) => p.step);
    expect(steps).toEqual(["measurements", "report", "photos", "price", "price"]);
  });
});

describe("listingSlug", () => {
  it("matches the database slug pattern even for odd titles", () => {
    for (const t of ["Padparadscha Sapphire — 2.01 ct!", "", "   ", "Émeraude colombienne", "x".repeat(300)]) {
      expect(listingSlug(t, "a1B2c3D4")).toMatch(/^[a-z0-9][a-z0-9-]{2,120}$/);
    }
  });
});

describe("livePriceStep", () => {
  it("accepts only the price and currency, dropping everything else", () => {
    expect(livePriceStep.parse({ asking_price: "5200", currency: "USD", shipping_regions: ["US"], handling_days: "9" })).toEqual({
      currency: "USD",
      asking_price_minor_units: 520000,
    });
  });
});

describe("formValues", () => {
  it("keeps every value of a checkbox group and leaves out unchecked boxes and passwords", () => {
    const f = new FormData();
    f.append("shipping_regions", "US");
    f.append("shipping_regions", "CA");
    f.set("password", "secret123456");
    expect(formValues(f)).toEqual({ shipping_regions: "US,CA" });
    expect(isChecked(formValues(f).ships_insured)).toBe(false);
  });
});
