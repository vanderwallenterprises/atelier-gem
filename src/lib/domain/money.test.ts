import { describe, expect, it } from "vitest";
import { applyBps, formatMoney, minorToMajorInput, parseMajorToMinor, sumMinor } from "./money";

describe("minorToMajorInput", () => {
  it("round-trips with parseMajorToMinor", () => {
    for (const [minor, currency, text] of [[450050, "USD", "4500.50"], [450000, "USD", "4500"], [5, "USD", "0.05"], [1200, "JPY", "1200"]] as const) {
      expect(minorToMajorInput(minor, currency)).toBe(text);
      expect(parseMajorToMinor(text, currency)).toBe(minor);
    }
  });
});

describe("money", () => {
  it("parses major units to minor units without floating point drift", () => {
    expect(parseMajorToMinor("4,500.50", "USD")).toBe(450050);
    expect(parseMajorToMinor("0.1", "USD")).toBe(10);
    expect(parseMajorToMinor("19.99", "USD")).toBe(1999);
    expect(parseMajorToMinor("1500", "JPY")).toBe(1500);
  });

  it("rejects malformed or over-precise amounts", () => {
    for (const bad of ["", "-5", "1.234", "abc", "1e5", "NaN", "12.3.4"]) {
      expect(parseMajorToMinor(bad, "USD")).toBeNull();
    }
    expect(parseMajorToMinor("1.5", "JPY")).toBeNull();
  });

  it("applies basis points with half-up rounding", () => {
    expect(applyBps(10_000, 1_250)).toBe(1_250); // 12.5% of $100
    expect(applyBps(999, 1_000)).toBe(100); // 99.9 -> 100
    expect(applyBps(994, 1_000)).toBe(99); // 99.4 -> 99
    expect(() => applyBps(100, 10_001)).toThrow();
    expect(() => applyBps(10.5, 100)).toThrow();
  });

  it("sums integers and refuses fractional input", () => {
    expect(sumMinor(100, 250, 5)).toBe(355);
    expect(() => sumMinor(1, 0.5)).toThrow();
  });

  it("formats for display", () => {
    expect(formatMoney(450000, "USD")).toBe("$4,500");
    expect(formatMoney(9999, "USD")).toBe("$99.99");
    expect(formatMoney(450050, "USD", { cents: true })).toBe("$4,500.50");
  });
});
