import "server-only";
import { redirect } from "next/navigation";
import { getSupabase, getSessionUser, type SessionUser } from "@/lib/supabase/server";
import { signInHref } from "./redirect";

export type Account = SessionUser & { displayName: string | null; status: "active" | "restricted" | "suspended" | "closed" };

/**
 * The signed-in user, or a redirect to sign-in that returns to `next`.
 * Pages call this on the server; it is a convenience, RLS still enforces access.
 */
export async function requireAccount(next: string): Promise<Account> {
  const user = await getSessionUser();
  if (!user) redirect(signInHref(next));
  const supabase = await getSupabase();
  const { data, error } = await supabase!.from("profiles").select("display_name, account_status").eq("id", user.id).maybeSingle();
  // Fail closed: without a readable profile, the account can browse but not act.
  return { ...user, displayName: data?.display_name ?? null, status: error || !data ? "restricted" : data.account_status };
}

const RECOVERY_WINDOW_SECONDS = 60 * 60;

/**
 * True only when the current session was created by a password-reset (or email-code) link
 * within the last hour, so an unlocked, long-lived session can't be used to change the password.
 */
export async function hasRecentRecovery(): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return false;
  const now = Math.floor(Date.now() / 1000);
  return (data.claims.amr ?? []).some(
    (e) => typeof e === "object" && (e.method === "recovery" || e.method === "otp") && now - e.timestamp <= RECOVERY_WINDOW_SECONDS,
  );
}

export function canAct(account: Account): boolean {
  return account.status === "active";
}
