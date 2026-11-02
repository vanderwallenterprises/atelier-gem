/**
 * Public configuration flags. Only NEXT_PUBLIC_* values may be read here — this module
 * is safe to import from client components. Secrets live in `env.server.ts`.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** "test" until live payments have been validated (spec §15). */
  paymentsMode: (process.env.NEXT_PUBLIC_PAYMENTS_MODE === "live" ? "live" : "test") as
    | "test"
    | "live",
  /** Development sample data is shown with a visible label. */
  showSampleLabels: process.env.NODE_ENV !== "production",
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
