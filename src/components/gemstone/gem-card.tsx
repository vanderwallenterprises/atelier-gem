import Image from "next/image";
import Link from "next/link";
import { FacetDiagram, gemTint } from "@/components/brand/facet-diagram";
import { Badge } from "@/components/ui/primitives";
import { GEMSTONE_TYPES, ORIGIN_CLASSES, SHAPES, type PublicListing } from "@/lib/domain/gemstone";
import { formatMoney } from "@/lib/domain/money";
import { ReportStatus } from "./report-status";

export function availabilityLabel(l: Pick<PublicListing, "listing_status" | "inventory_quantity">): string {
  if (l.listing_status === "sold" || l.inventory_quantity < 1) return "Sold";
  if (l.listing_status === "reserved") return "Reserved";
  return "Available";
}

export function GemCard({ listing }: { listing: PublicListing }) {
  const species = listing.variety || GEMSTONE_TYPES[listing.gemstone_type];
  const availability = availabilityLabel(listing);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-paper transition-shadow duration-300 hover:shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-vellum">
        {listing.primary_image ? (
          <Image
            src={listing.primary_image}
            alt={`${species}, ${SHAPES[listing.shape].toLowerCase()}`}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
            className="object-cover transition-transform duration-700 ease-[var(--ease-quiet)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <FacetDiagram className="w-1/2" stroke="var(--color-line-strong)" fill={gemTint[listing.gemstone_type]} strokeWidth={0.9} />
            <span className="text-xs text-ink-muted">No photo yet</span>
          </div>
        )}
        {listing.is_sample && (
          <span className="absolute left-3 top-3">
            <Badge tone="warning">Sample listing</Badge>
          </span>
        )}
        {availability !== "Available" && (
          <span className="absolute right-3 top-3">
            <Badge tone="neutral">{availability}</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-serif text-xl leading-snug text-ink">
          <Link href={`/gemstones/${listing.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {species}
          </Link>
        </h3>
        <p className="text-sm text-ink-soft">
          {SHAPES[listing.shape]}
          {listing.carat_weight && <>, {Number(listing.carat_weight).toFixed(2)} ct</>}
          {listing.natural_or_lab_grown !== "unknown" && <>, {ORIGIN_CLASSES[listing.natural_or_lab_grown].toLowerCase()}</>}
        </p>
        <p className="mt-auto pt-2 text-lg font-medium text-ink">{formatMoney(listing.asking_price_minor_units, listing.currency)}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReportStatus lab={listing.grading_lab} status={listing.verification_status} compact />
          {listing.seller && <span className="truncate text-xs text-ink-muted">{listing.seller.business_name}</span>}
        </div>
      </div>
    </article>
  );
}

export function GemCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-paper" aria-hidden>
      <div className="aspect-[4/5] animate-pulse bg-vellum" />
      <div className="grid gap-2 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-vellum" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-vellum" />
        <div className="mt-3 h-5 w-1/3 animate-pulse rounded bg-vellum" />
      </div>
    </div>
  );
}
