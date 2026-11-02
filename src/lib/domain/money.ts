/**
 * Money is integer minor units + ISO 4217 code. No floating-point arithmetic on amounts.
 */
export type Money = { amount: number; currency: string };

/** Minor-unit digits per ISO 4217, from the platform's currency data. */
export function minorDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    throw new RangeError(`Unknown currency ${currency}`);
  }
}

export function assertMinorUnits(amount: number): void {
  if (!Number.isSafeInteger(amount)) throw new RangeError(`Amount must be an integer in minor units, got ${amount}`);
}

export function formatMoney(amount: number, currency: string, opts: { cents?: boolean } = {}): string {
  assertMinorUnits(amount);
  const digits = minorDigits(currency);
  const major = amount / 10 ** digits;
  // Whole amounts display without cents; any fractional amount always shows them.
  const showMinor = opts.cents || amount % 10 ** digits !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: showMinor ? digits : 0,
    maximumFractionDigits: showMinor ? digits : 0,
  }).format(major);
}

/**
 * Parse a user-entered major-unit amount ("4,500.50") into minor units without floats.
 * Returns null for anything that isn't a plain non-negative decimal.
 */
export function parseMajorToMinor(input: string, currency: string): number | null {
  const s = input.trim().replace(/[,\s]/g, "").replace(/^\$/, "");
  const digits = minorDigits(currency);
  const m = /^(\d{1,12})(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > digits) return null;
  const value = Number(m[1]) * 10 ** digits + Number(frac.padEnd(digits, "0") || "0");
  return Number.isSafeInteger(value) ? value : null;
}

/** Minor units back to a plain major-unit string for form fields ("4500.5" → "4500.50"). */
export function minorToMajorInput(amount: number, currency: string): string {
  assertMinorUnits(amount);
  const digits = minorDigits(currency);
  if (digits === 0) return String(amount);
  const sign = amount < 0 ? "-" : "";
  const abs = String(Math.abs(amount)).padStart(digits + 1, "0");
  const whole = abs.slice(0, -digits);
  const frac = abs.slice(-digits);
  return /^0+$/.test(frac) ? `${sign}${whole}` : `${sign}${whole}.${frac}`;
}

/** Basis-point percentage of an amount, rounded half-up to the minor unit. */
export function applyBps(amount: number, bps: number): number {
  assertMinorUnits(amount);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new RangeError(`Invalid basis points ${bps}`);
  if (amount < 0) throw new RangeError("Commission applies to non-negative amounts");
  const product = amount * bps;
  if (!Number.isSafeInteger(product)) throw new RangeError("Amount too large for exact commission");
  return Math.floor((product + 5_000) / 10_000);
}

export function sumMinor(...amounts: number[]): number {
  return amounts.reduce((total, a) => {
    assertMinorUnits(a);
    const next = total + a;
    assertMinorUnits(next);
    return next;
  }, 0);
}
