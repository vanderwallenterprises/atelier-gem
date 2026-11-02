import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Cross-site request refused", { status: 403 });
  }
  const supabase = await getSupabase();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
