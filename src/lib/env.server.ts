import "server-only";

/**
 * Server-only secrets. Importing this from a client component fails the build
 * (`server-only`), so keys cannot leak into browser bundles.
 */
function parseBps(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,5}$/.test(raw.trim())) return null;
  const n = Number(raw);
  return n <= 10_000 ? n : null;
}

export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "",
  giaApiKey: process.env.GIA_REPORT_RESULTS_API_KEY ?? "",
  giaApiEndpoint: process.env.GIA_REPORT_RESULTS_API_ENDPOINT ?? "",
  marketplaceCommissionBps: parseBps(process.env.MARKETPLACE_COMMISSION_BPS),
};

/** Which integrations can actually run. Used to show honest "not configured" states. */
export function integrationStatus() {
  return {
    database: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(serverEnv.supabaseServiceRoleKey),
    payments: Boolean(serverEnv.stripeSecretKey && serverEnv.stripeWebhookSecret),
    languageModel: Boolean(serverEnv.openaiApiKey && serverEnv.openaiModel),
    conceptImages: Boolean(serverEnv.openaiApiKey && serverEnv.openaiImageModel),
    reportVerification: Boolean(serverEnv.giaApiKey && serverEnv.giaApiEndpoint),
    commissionConfigured: serverEnv.marketplaceCommissionBps !== null,
  };
}
