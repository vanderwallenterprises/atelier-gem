import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/account/actions";
import { availabilityLabel } from "@/components/gemstone/gem-card";
import { PhotoGallery } from "@/components/gemstone/photo-gallery";
import { ReportStatus } from "@/components/gemstone/report-status";
import { Badge, Container, Notice, Skeleton } from "@/components/ui/primitives";
import { GEMSTONE_TYPES, GRADING_LABS, ORIGIN_CLASSES, SHAPES, TREATMENT_STATUSES } from "@/lib/domain/gemstone";
import { SHIPPING_REGIONS } from "@/lib/domain/listing-wizard";
import { formatMoney } from "@/lib/domain/money";
import {
  getListingBySlug,
  getListingPhotos,
  getVerificationSummary,
  type CheckResult,
  type ListingDetail,
  type VerificationSummary,
} from "@/lib/services/gemstone-search";
import { getSupabase, getSessionUser } from "@/lib/supabase/server";

export async function generateMetadata(props: PageProps<"/gemstones/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const l = await getListingBySlug(slug);
  if (!l) return { title: "Gemstone not found" };
  const species = l.variety || GEMSTONE_TYPES[l.gemstone_type];
  return {
    title: l.title,
    description: `${species}, ${SHAPES[l.shape].toLowerCase()}${l.carat_weight ? `, ${Number(l.carat_weight).toFixed(2)} ct` : ""}. ${formatMoney(l.asking_price_minor_units, l.currency)}.`,
  };
}

export default function GemstonePage(props: PageProps<"/gemstones/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={props.params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/gemstones/[slug]">["params"] }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();
  const [photos, verification] = await Promise.all([getListingPhotos(listing.id), getVerificationSummary(listing.id)]);
  const species = listing.variety || GEMSTONE_TYPES[listing.gemstone_type];
  const availability = availabilityLabel(listing);

  return (
    <Container className="py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/gemstones" className="underline-offset-4 hover:text-ink hover:underline">Gemstones</Link>
        <span aria-hidden className="mx-2">/</span>
        <Link href={`/gemstones?type=${listing.gemstone_type}`} className="underline-offset-4 hover:text-ink hover:underline">
          {GEMSTONE_TYPES[listing.gemstone_type]}
        </Link>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <PhotoGallery photos={photos} alt={species} gemstoneType={listing.gemstone_type} />

        <div className="grid h-fit gap-8">
          <header className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {listing.is_sample && <Badge tone="warning">Sample listing, not for sale</Badge>}
              {availability !== "Available" && <Badge>{availability}</Badge>}
              <ReportStatus lab={listing.grading_lab} status={listing.verification_status} />
            </div>
            <h1 className="text-4xl leading-tight sm:text-5xl">{listing.title}</h1>
            <p className="text-lg text-ink-soft">
              {species}, {SHAPES[listing.shape].toLowerCase()}
              {listing.carat_weight && `, ${Number(listing.carat_weight).toFixed(2)} ct`}
            </p>
            <p className="font-serif text-4xl text-ink">{formatMoney(listing.asking_price_minor_units, listing.currency)}</p>
          </header>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
              <Suspense fallback={<Skeleton className="h-13 w-32" />}>
                <FavoriteButton listingId={listing.id} slug={listing.slug} />
              </Suspense>
            </div>
            {listing.is_sample ? (
              <p className="text-sm text-ink-muted">This is sample data for trying the marketplace. It can&rsquo;t be bought.</p>
            ) : availability === "Available" ? (
              <Notice>
                Checkout opens once marketplace payments are switched on, and designing jewelry around a stone opens with the
                Design Studio. Save the stone to find it again.
              </Notice>
            ) : null}
          </div>

          {listing.description && <p className="prose-measure whitespace-pre-line leading-relaxed text-ink-soft">{listing.description}</p>}

          <Specs listing={listing} />
          <Disclosures listing={listing} />
          <Verification listing={listing} summary={verification} />
          <Shipping listing={listing} />

          {listing.seller && (
            <section className="border-t border-line pt-6">
              <h2 className="text-sm font-medium text-ink-muted">Sold by</h2>
              <p className="mt-1 font-serif text-2xl">{listing.seller.business_name}</p>
              <Link href={`/gemstones?seller=${listing.seller.id}`} className="mt-1 inline-block text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
                More stones from this seller
              </Link>
            </section>
          )}
        </div>
      </div>
    </Container>
  );
}

async function FavoriteButton({ listingId, slug }: { listingId: string; slug: string }) {
  const user = await getSessionUser();
  let saved = false;
  if (user) {
    const supabase = await getSupabase();
    const { data } = await supabase!.from("favorites").select("gemstone_listing_id").eq("user_id", user.id).eq("gemstone_listing_id", listingId).maybeSingle();
    saved = Boolean(data);
  }
  return (
    <form action={toggleFavorite.bind(null, listingId, slug)}>
      <button
        type="submit"
        aria-pressed={saved}
        className="inline-flex h-13 items-center gap-2 rounded-md border border-line-strong bg-paper px-5 text-base text-ink hover:bg-vellum"
      >
        <Heart className={saved ? "size-4 fill-brass text-brass" : "size-4"} aria-hidden />
        {saved ? "Saved" : "Save"}
      </button>
    </form>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function Specs({ listing: l }: { listing: ListingDetail }) {
  const dims = [l.length_mm, l.width_mm, l.depth_mm];
  return (
    <section>
      <h2 className="text-2xl">The stone</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        <SpecRow label="Gemstone">{[l.variety, GEMSTONE_TYPES[l.gemstone_type]].filter(Boolean).join(", ")}</SpecRow>
        <SpecRow label="Natural or lab-grown">{ORIGIN_CLASSES[l.natural_or_lab_grown]}</SpecRow>
        <SpecRow label="Shape">{SHAPES[l.shape]}</SpecRow>
        {l.carat_weight && <SpecRow label="Weight">{l.carat_weight} ct</SpecRow>}
        {dims.every(Boolean) && <SpecRow label="Measurements">{dims.join(" × ")} mm</SpecRow>}
        {l.color_description && <SpecRow label="Color">{l.color_description}</SpecRow>}
        {l.clarity_grade && <SpecRow label="Clarity">{l.clarity_grade}</SpecRow>}
        {l.cut_grade && <SpecRow label="Cut">{l.cut_grade}</SpecRow>}
      </dl>
      <p className="mt-2 text-xs text-ink-muted">Details as stated by the seller. See the report section for what has been checked.</p>
    </section>
  );
}

function Disclosures({ listing: l }: { listing: ListingDetail }) {
  return (
    <section>
      <h2 className="text-2xl">Treatment and origin</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        <SpecRow label="Treatment">
          {TREATMENT_STATUSES[l.treatment_status]}
          {l.treatment_description && <span className="block text-ink-soft">{l.treatment_description}</span>}
        </SpecRow>
        <SpecRow label="Origin">
          {l.origin_claim ? (
            <>
              {l.origin_claim}
              <span className="block text-sm text-ink-muted">
                {l.origin_evidence_status === "reviewed" ? "Supporting documents reviewed by the marketplace" : l.origin_evidence_status === "documented" ? "Seller has provided documents; not yet reviewed" : "Seller's statement, not independently checked"}
              </span>
            </>
          ) : "Not stated"}
        </SpecRow>
        {l.disclosure_notes && <SpecRow label="Seller notes"><span className="whitespace-pre-line">{l.disclosure_notes}</span></SpecRow>}
      </dl>
    </section>
  );
}

const CHECKS: { key: keyof Pick<VerificationSummary, "record_check" | "consistency_check" | "physical_match_check">; label: string; about: string }[] = [
  { key: "record_check", label: "Report record", about: "The laboratory has a report with this number." },
  { key: "consistency_check", label: "Listing consistency", about: "This listing's weight, measurements and grades agree with that report." },
  { key: "physical_match_check", label: "Physical match", about: "The stone itself was examined and matched to the report." },
];

const RESULT: Record<CheckResult, { text: string; tone: "success" | "danger" | "warning" | "outline" }> = {
  passed: { text: "Passed", tone: "success" },
  failed: { text: "Did not pass", tone: "danger" },
  inconclusive: { text: "Inconclusive", tone: "warning" },
  not_checked: { text: "Not checked", tone: "outline" },
};

function Verification({ listing: l, summary }: { listing: ListingDetail; summary: VerificationSummary | null }) {
  if (l.grading_lab === "none") {
    return (
      <section>
        <h2 className="text-2xl">Grading report</h2>
        <p className="mt-3 text-ink-soft">This stone has no grading report. Its details are the seller&rsquo;s description.</p>
      </section>
    );
  }
  const current = summary?.is_current ? summary : null;
  return (
    <section>
      <h2 className="text-2xl">Grading report</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        <SpecRow label="Laboratory">{GRADING_LABS[l.grading_lab]}</SpecRow>
        {l.report_number && <SpecRow label="Report number"><span className="tabular-nums">{l.report_number}</span></SpecRow>}
        {l.report_date && <SpecRow label="Report date">{new Date(`${l.report_date}T00:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</SpecRow>}
      </dl>
      <h3 className="mt-6 font-serif text-xl">What has been checked</h3>
      <ul className="mt-3 grid gap-3">
        {CHECKS.map((c) => {
          const r = RESULT[current?.[c.key] ?? "not_checked"];
          return (
            <li key={c.key} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border border-line bg-paper px-4 py-3">
              <div>
                <p className="font-medium text-ink">{c.label}</p>
                <p className="text-sm text-ink-soft">{c.about}</p>
              </div>
              <Badge tone={r.tone}>{r.text}</Badge>
            </li>
          );
        })}
      </ul>
      {summary && !summary.is_current && (
        <p className="mt-3 text-sm text-ink-muted">The listing changed after its last check, so earlier results no longer apply.</p>
      )}
      <p className="mt-3 text-sm text-ink-muted">
        A report verification describes the report, not a guarantee of value. Laboratory names identify who issued the report and
        don&rsquo;t imply that laboratory endorses this marketplace.{" "}
        <Link href="/policies/authenticity" className="underline underline-offset-4">How verification works</Link>
      </p>
    </section>
  );
}

function Shipping({ listing: l }: { listing: ListingDetail }) {
  const regions = l.shipping_regions.map((r) => SHIPPING_REGIONS[r as keyof typeof SHIPPING_REGIONS] ?? r);
  return (
    <section>
      <h2 className="text-2xl">Shipping and returns</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        {regions.length > 0 && <SpecRow label="Ships to">{regions.join(", ")}</SpecRow>}
        {l.handling_days !== null && <SpecRow label="Handling time">{l.handling_days === 0 ? "Same day" : `${l.handling_days} business day${l.handling_days === 1 ? "" : "s"}`}</SpecRow>}
        <SpecRow label="Shipment">
          {[l.ships_insured && "Fully insured", l.ships_tracked && "Tracked, signature on delivery"].filter(Boolean).join("; ") || "Ask the seller"}
        </SpecRow>
        <SpecRow label="Returns">
          {l.return_policy ? <span className="whitespace-pre-line">{l.return_policy}</span> : "Seller's standard return policy"}
          <Link href="/policies/returns" className="mt-1 block text-sm text-ink-soft underline underline-offset-4">Marketplace returns policy</Link>
        </SpecRow>
      </dl>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <Container className="py-10">
      <div role="status" aria-label="Loading gemstone" className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="grid h-fit gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </Container>
  );
}
