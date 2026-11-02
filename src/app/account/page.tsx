import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, Notice, Skeleton } from "@/components/ui/primitives";
import { canAct, requireAccount } from "@/lib/auth/session";
import { getCapabilities } from "@/lib/services/account";
import { getMySeller } from "@/lib/services/seller";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <Container className="max-w-4xl py-12">
      <Suspense fallback={<div role="status" aria-label="Loading account" className="grid gap-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-40" /></div>}>
        <Body searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}

async function Body({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const sp = await searchParams;
  const account = await requireAccount("/account");
  const [caps, seller] = await Promise.all([getCapabilities(account.id), getMySeller(account.id)]);

  const links = [
    { href: "/account/favorites", title: "Saved stones", body: "Stones you've saved while browsing." },
    { href: "/gemstones", title: "Browse gemstones", body: "Search every listed stone by type, shape, size and price." },
    seller
      ? { href: "/seller", title: "Seller dashboard", body: seller.approval_status === "pending" ? "Your seller profile is under review. Drafts and submissions are open." : "Your listings, drafts and submissions." }
      : { href: "/onboarding/seller", title: "Start selling", body: "Set up a seller profile to list loose stones." },
  ];

  return (
    <>
      <h1 className="text-4xl sm:text-5xl">{account.displayName ?? "Your account"}</h1>
      <p className="mt-2 text-ink-soft">{account.email}</p>
      <div className="mt-6 grid gap-3">
        {sp.updated === "password" && <Notice tone="success">Your password has been changed.</Notice>}
        {!canAct(account) && (
          <Notice tone="warning" title={`Your account is ${account.status}`}>
            You can still browse, but buying, selling and messaging are paused. Contact support for help.
          </Notice>
        )}
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex h-full flex-col gap-1.5 rounded-lg border border-line bg-paper p-6 hover:border-ink-muted">
              <span className="font-serif text-2xl text-ink">{l.title}</span>
              <span className="text-ink-soft">{l.body}</span>
            </Link>
          </li>
        ))}
      </ul>
      {caps.admin && (
        <p className="mt-8 text-sm text-ink-muted">You have administrator access. The review queue is built in a later phase.</p>
      )}
      <form action="/auth/sign-out" method="post" className="mt-12 border-t border-line pt-6">
        <button type="submit" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">Sign out</button>
      </form>
    </>
  );
}
