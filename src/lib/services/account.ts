import "server-only";
import { getSupabase } from "@/lib/supabase/server";

export type Capability = "buyer" | "seller" | "designer" | "maker" | "admin";
export type CapabilityFlags = Record<Exclude<Capability, "buyer" | "designer">, boolean>;

/**
 * Navigation hints only. Every protected page and mutation re-checks permissions on the
 * server, and RLS enforces them in the database — hiding a link is not access control.
 */
export async function getCapabilities(userId: string): Promise<CapabilityFlags> {
  const flags: CapabilityFlags = { seller: false, maker: false, admin: false };
  const supabase = await getSupabase();
  if (!supabase) return flags;
  const { data } = await supabase
    .from("user_capabilities")
    .select("capability, approval_status")
    .eq("user_id", userId);
  for (const row of data ?? []) {
    const usable = row.approval_status === "approved" || row.approval_status === "pending";
    if (row.capability === "seller" && usable) flags.seller = true;
    if (row.capability === "maker" && usable) flags.maker = true;
    if (row.capability === "admin" && row.approval_status === "approved") flags.admin = true;
  }
  return flags;
}
