import Link from "next/link";
import { UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/server";
import { getCapabilities } from "@/lib/services/account";

/** Account entry in the header. Reads the session, so it renders inside <Suspense>. */
export async function AccountControl() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="ml-1 inline-flex h-9 items-center whitespace-nowrap rounded-md border border-on-olive/30 px-3.5 text-sm text-on-olive transition-colors hover:border-on-olive/70"
      >
        Sign in
      </Link>
    );
  }
  const caps = await getCapabilities(user.id);
  return (
    <details className="group relative">
      <summary
        className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-md text-on-olive/85 hover:bg-olive-soft hover:text-on-olive [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        <UserRound className="size-[1.15rem]" strokeWidth={1.6} />
      </summary>
      <div className="absolute right-0 mt-2 w-60 rounded-lg border border-line bg-paper p-2 text-ink shadow-[var(--shadow-lift)]">
        <p className="truncate px-3 py-2 text-sm text-ink-muted">{user.email}</p>
        <MenuLink href="/account">Your account</MenuLink>
        <MenuLink href="/account/favorites">Saved stones</MenuLink>
        {caps.seller && <MenuLink href="/seller">Seller dashboard</MenuLink>}
        <form action="/auth/sign-out" method="post" className="mt-1 border-t border-line pt-1">
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-vellum">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-md px-3 py-2 text-sm hover:bg-vellum">
      {children}
    </Link>
  );
}
