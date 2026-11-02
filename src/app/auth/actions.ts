"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { firstErrors } from "@/lib/forms";
import { safeNext } from "@/lib/auth/redirect";
import { hasRecentRecovery } from "@/lib/auth/session";
import { forgotSchema, resetSchema, signInSchema, signUpSchema, type FormState } from "@/lib/auth/schemas";
import { getSupabase } from "@/lib/supabase/server";

const NOT_CONNECTED: FormState = { error: "Accounts aren't connected yet. The marketplace database still needs to be set up." };

const NO_SITE_URL: FormState = { error: "Account emails aren't set up on this site yet. Contact support." };

/**
 * Base URL for links in auth emails. Never taken from request headers in production: a forged
 * Host or X-Forwarded-Host would otherwise point reset links at another site.
 */
async function siteOrigin(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return null;
  const host = (await headers()).get("host") ?? "";
  return /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host) ? `http://${host}` : null;
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONNECTED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email address first. Use the link in the email we sent when you signed up.", values };
    }
    if (error.status === 429) return { error: "Too many attempts. Wait a few minutes, then try again.", values };
    // Same message whether or not the account exists.
    return { error: "That email and password don't match an account.", values };
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? ""), display_name: String(form.get("display_name") ?? ""), terms: String(form.get("terms") ?? "") };
  const parsed = signUpSchema.safeParse({
    display_name: form.get("display_name"),
    email: form.get("email"),
    password: form.get("password"),
    terms: form.get("terms") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONNECTED;

  const next = safeNext(form.get("next"), "/onboarding");
  const origin = await siteOrigin();
  if (!origin) return { ...NO_SITE_URL, values };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.status === 429) return { error: "Too many sign-ups from here. Wait a few minutes, then try again.", values };
    if (error.code === "weak_password") return { fieldErrors: { password: "Choose a stronger password." }, values };
    return { error: "The account couldn't be created. Check the details and try again.", values };
  }
  // With email confirmation on, there's no session yet; the same message covers existing emails.
  if (!data.session) {
    return { message: `Check ${parsed.data.email} for a confirmation link. It signs you in and takes you to set up your account.` };
  }
  redirect(next);
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = forgotSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONNECTED;

  const origin = await siteOrigin();
  if (!origin) return { ...NO_SITE_URL, values };
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error?.status === 429) return { error: "Too many requests. Wait a few minutes, then try again.", values };
  // Never reveal whether an account exists for this address.
  return { message: `If an account uses ${parsed.data.email}, a reset link is on its way. It expires after one hour.` };
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error) };
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONNECTED;

  if (!(await hasRecentRecovery())) return { error: "This reset link has expired. Request a new one from the sign-in page." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you haven't used here before." } };
    return { error: "The password couldn't be changed. Request a new reset link and try again." };
  }
  // Anyone else signed in to this account (an old device, a stolen session) is signed out.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/account?updated=password");
}
