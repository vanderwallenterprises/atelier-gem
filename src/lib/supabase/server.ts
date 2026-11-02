import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Supabase client bound to the signed-in user's session (RLS applies).
 * Returns null when the database isn't configured, so pages can show an honest state.
 */
export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type SessionUser = { id: string; email: string | null };

/** The verified user (getUser re-validates the JWT with Supabase; never trust getSession alone). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
