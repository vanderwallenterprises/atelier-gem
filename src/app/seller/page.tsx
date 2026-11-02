import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { deleteDraft, withdrawListing } from "./actions";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Container, EmptyState, Notice, Skeleton } from "@/components/ui/primitives";
import { canAct, requireAccount } from "@/lib/auth/session";
import { GEMSTONE_TYPES, LISTING_STATUSES, type ListingStatus } from "@/lib/domain/gemstone";
import { formatMoney } from "@/lib/domain/money";
import { getMySeller, listMyListings, type SellerListingRow } from "@/lib/services/seller";

export const metadata: Metadata = { title: "Seller dashboard", robots: { index: false } };

const FLASH: Record<string, { tone: "success" | "warning"; text: string }> = {
  welcome: { tone: "success", text: "Your seller profile is saved. Start your first listing below." },
  saved: { tone: "success", text: "Draft saved." },
  submitted: { tone: "success", text: "Listing submitted. Marketplace review isn't running yet, so it stays in review until it is; you can withdraw it any time." },
  deleted: { tone: "success", text: "Draft deleted." },
  "error:withdraw": { tone: "warning", text: "That listing couldn't be withdrawn. Reserved and sold listings stay as they are." },
  "error:delete-files": { tone: "warning", text: "The draft's files couldn't all be removed, so the draft was kept. Try again." },
  "error:delete": { tone: "warning", text: "Only drafts that were never submitted can be deleted. Withdraw the listing instead." },
  "error:restricted": { tone: "warning", text: "Your account is restricted, so listings can't be changed." },
};

export default function SellerDashboardPage(props: PageProps<"/seller">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/seller">["searchParams"] }) {
  const sp = await searchParams;
  const account = await requireAccount("/seller");
  const seller = await getMySeller(account.id);
  if (!seller) redirect("/onboarding/seller");
  const listings = await listMyListings(seller.id);
  const flashKey = Object.keys(FLASH).find((k) => (k.startsWith("error:") ? sp.error === k.slice(6) : sp[k] !== undefined));
  const flash = flashKey ? FLASH[flashKey] : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-ink-muted">{seller.business_name}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">Your listings</h1>
        </div>
        {canAct(account) && <ButtonLink href="/seller/listings/new" size="lg">List a gemstone</ButtonLink>}
      </div>

      <div className="mt-8 grid gap-3">
        {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}
        {seller.approval_status === "pending" && (
          <Notice title="Your seller profile is under review">
            You can draft and submit listings now. Seller and listing review aren&rsquo;t running yet, so nothing is published until they are.
          </Notice>
        )}
        {(seller.approval_status === "rejected" || seller.approval_status === "revoked") && (
          <Notice tone="warning" title="Selling is turned off for this profile">
            Your listings aren&rsquo;t shown to buyers. Contact support to find out why and what can be done.
          </Notice>
        )}
        {!seller.payouts_enabled && (
          <Notice title="Payouts aren&rsquo;t set up yet">
            Payouts go through the payment provider&rsquo;s seller onboarding, which opens once marketplace payments are switched on.
          </Notice>
        )}
      </div>

      <section className="mt-10" aria-labelledby="listings-heading">
        <h2 id="listings-heading" className="sr-only">Listings</h2>
        {listings.length === 0 ? (
          <EmptyState title="No listings yet" action={canAct(account) ? <ButtonLink href="/seller/listings/new">List your first stone</ButtonLink> : undefined}>
            <p>Each listing is one physical stone. Start with the basics; you can save and come back at any step.</p>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper">
            {listings.map((l) => <ListingRow key={l.id} listing={l} editable={canAct(account)} />)}
          </ul>
        )}
      </section>
    </>
  );
}

const statusTone: Record<ListingStatus, "neutral" | "brass" | "success" | "warning" | "outline"> = {
  draft: "outline",
  submitted: "brass",
  published: "success",
  reserved: "warning",
  sold: "neutral",
  withdrawn: "neutral",
};

function ListingRow({ listing: l, editable }: { listing: SellerListingRow; editable: boolean }) {
  const changesRequested = l.moderation_status === "changes_requested";
  const rejected = l.moderation_status === "rejected";
  return (
    <li className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[l.listing_status]}>{LISTING_STATUSES[l.listing_status]}</Badge>
          {changesRequested && <Badge tone="warning">Changes requested</Badge>}
          {rejected && <Badge tone="danger">Not approved</Badge>}
        </div>
        <p className="mt-2 truncate font-serif text-xl text-ink">{l.title}</p>
        <p className="text-sm text-ink-muted">
          {GEMSTONE_TYPES[l.gemstone_type]}
          {l.carat_weight && `, ${Number(l.carat_weight).toFixed(2)} ct`}
          {", "}
          {l.asking_price_minor_units !== null ? formatMoney(l.asking_price_minor_units, l.currency) : "no price yet"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {l.listing_status === "published" && <ButtonLink href={`/gemstones/${l.slug}`} variant="secondary" size="sm">View</ButtonLink>}
        {editable && ["draft", "submitted", "withdrawn"].includes(l.listing_status) && (
          <ButtonLink href={`/seller/listings/${l.id}`} variant="secondary" size="sm">{l.listing_status === "draft" ? "Continue" : "Edit"}</ButtonLink>
        )}
        {editable && l.listing_status === "published" && (
          <ButtonLink href={`/seller/listings/${l.id}?step=price`} variant="secondary" size="sm">Change price</ButtonLink>
        )}
        {editable && (l.listing_status === "submitted" || l.listing_status === "published") && (
          <form action={withdrawListing.bind(null, l.id)}>
            <button type="submit" className="h-9 rounded-md px-3 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              Withdraw
            </button>
          </form>
        )}
        {editable && l.listing_status === "draft" && (
          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-md px-3 text-sm text-danger underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
              Delete draft
            </summary>
            <form action={deleteDraft.bind(null, l.id)} className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-line bg-paper p-4 text-sm shadow-[var(--shadow-lift)]">
              <p className="text-ink-soft">This removes the draft and its photos for good.</p>
              <button type="submit" className="mt-3 h-9 w-full rounded-md border border-danger/40 bg-danger-wash px-3 font-medium text-danger hover:border-danger">
                Delete permanently
              </button>
            </form>
          </details>
        )}
      </div>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your listings" className="grid gap-6">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
