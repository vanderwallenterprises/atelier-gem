import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Landing point for links in auth emails (sign-up confirmation, password reset).
 * Exchanges the one-time code for a session, then continues to a same-site page.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const supabase = await getSupabase();

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?link=expired", url.origin));
}
