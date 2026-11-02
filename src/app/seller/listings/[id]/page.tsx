import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  makePrimaryPhoto,
  removeDocument,
  removePhoto,
  saveListingStep,
  submitListing,
  uploadPhoto,
  uploadReportDocument,
  withdrawListing,
} from "../../actions";
import { FormSkeleton } from "@/components/auth/auth-shell";
import { ReportStatus } from "@/components/gemstone/report-status";
import {
  DisclosuresStepForm,
  MeasurementsStepForm,
  PriceStepForm,
  ReportStepForm,
  StoneStepForm,
  SubmitListingForm,
  UploadForm,
} from "@/components/seller/listing-step-forms";
import { WizardFrame } from "@/components/seller/wizard-frame";
import { Badge, Container, Notice } from "@/components/ui/primitives";
import { canAct, requireAccount } from "@/lib/auth/session";
import {
  GEMSTONE_TYPES,
  GRADING_LABS,
  LISTING_STATUSES,
  ORIGIN_CLASSES,
  SHAPES,
  TREATMENT_STATUSES,
} from "@/lib/domain/gemstone";
import { stepIndex, submissionProblems, SHIPPING_REGIONS, WIZARD_STEPS, type WizardStep } from "@/lib/domain/listing-wizard";
import { formatMoney, minorToMajorInput } from "@/lib/domain/money";
import { MAX_DOCUMENTS, MAX_PHOTOS } from "@/lib/domain/uploads";
import { getMyListing, listListingDocuments, listListingPhotos, type EditableListing, type ListingPhoto } from "@/lib/services/seller";
import { getSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };

export default function EditListingPage(props: PageProps<"/seller/listings/[id]">) {
  return (
    <Suspense fallback={<Container className="max-w-3xl py-12"><FormSkeleton /></Container>}>
      <Wizard params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Wizard({ params, searchParams }: Pick<PageProps<"/seller/listings/[id]">, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const account = await requireAccount(`/seller/listings/${id}`);
  const listing = await getMyListing(id);
  if (!listing) notFound();

  const step = WIZARD_STEPS[stepIndex(typeof sp.step === "string" ? sp.step : undefined)].key;
  const failed = sp.error === "photo" ? "That photo couldn't be changed. Reload the page and try again."
    : sp.error === "document" ? "That document couldn't be removed. Reload the page and try again." : null;
  const status = (
    <Badge tone={listing.listing_status === "published" ? "success" : "outline"}>{LISTING_STATUSES[listing.listing_status]}</Badge>
  );
  return (
    <WizardFrame title={listing.title} current={step} listingId={listing.id} status={status}>
      {failed && <Notice tone="warning" className="mb-6">{failed}</Notice>}
      {canAct(account) ? <StepBody listing={listing} step={step} /> : (
        <Notice tone="warning">Your account is restricted, so this listing can&rsquo;t be changed.</Notice>
      )}
    </WizardFrame>
  );
}

async function StepBody({ listing, step }: { listing: EditableListing; step: WizardStep }) {
  const status = listing.listing_status;
  if (status === "reserved" || status === "sold") {
    return <Notice>This stone is {status}. Its listing can&rsquo;t be changed any more.</Notice>;
  }
  if (status === "published" && step !== "price" && step !== "review") {
    return <LiveListingNotice listing={listing} />;
  }
  if (status === "submitted" && step !== "review") {
    return (
      <div className="grid gap-6">
        <Notice title="This listing is in review">Saving changes keeps it in review with your latest details.</Notice>
        <StepForm listing={listing} step={step} />
      </div>
    );
  }
  return <StepForm listing={listing} step={step} />;
}

async function StepForm({ listing, step }: { listing: EditableListing; step: WizardStep }) {
  const save = (s: WizardStep) => saveListingStep.bind(null, listing.id, s);
  const d = listing as unknown as Record<string, string | number | boolean | string[] | null>;
  switch (step) {
    case "stone":
      return <StoneStepForm action={save("stone")} defaults={d} />;
    case "measurements":
      return <MeasurementsStepForm action={save("measurements")} defaults={d} />;
    case "disclosures":
      return <DisclosuresStepForm action={save("disclosures")} defaults={d} />;
    case "report":
      return <ReportStep listing={listing} />;
    case "photos":
      return <PhotosStep listing={listing} />;
    case "price":
      return (
        <PriceStepForm
          action={save("price")}
          livePriceOnly={listing.listing_status === "published"}
          defaults={{
            ...d,
            asking_price: listing.asking_price_minor_units === null ? "" : minorToMajorInput(listing.asking_price_minor_units, listing.currency),
            handling_days: listing.handling_days ?? "",
          }}
        />
      );
    case "review":
      return <ReviewStep listing={listing} />;
  }
}

function LiveListingNotice({ listing }: { listing: EditableListing }) {
  return (
    <div className="grid gap-4">
      <Notice title="This listing is live">
        To change its details, withdraw it from sale first. It goes back through review when you resubmit. You can change the price
        without withdrawing.
      </Notice>
      <div className="flex flex-wrap gap-3">
        <Link href={`/seller/listings/${listing.id}?step=price`} className="inline-flex h-11 items-center rounded-md border border-line-strong bg-paper px-5 text-[0.95rem] hover:bg-vellum">
          Change price
        </Link>
        <form action={withdrawListing.bind(null, listing.id)}>
          <button type="submit" className="h-11 rounded-md px-4 text-[0.95rem] text-ink-soft underline-offset-4 hover:text-ink hover:underline">
            Withdraw from sale
          </button>
        </form>
      </div>
    </div>
  );
}

async function ReportStep({ listing }: { listing: EditableListing }) {
  const docs = await listListingDocuments(listing.id);
  const supabase = await getSupabase();
  // Private bucket: short-lived links for the owner only.
  const signed = supabase && docs.length
    ? (await supabase.storage.from("listing-documents").createSignedUrls(docs.map((d) => d.storage_path), 300)).data ?? []
    : [];
  const links = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  const d = listing as unknown as Record<string, string | null>;
  return (
    <div className="grid gap-10">
      <ReportStepForm action={saveListingStep.bind(null, listing.id, "report")} defaults={d} />
      <section className="grid gap-4" aria-labelledby="docs-heading">
        <h3 id="docs-heading" className="font-serif text-2xl">Report document</h3>
        <p className="text-sm text-ink-soft">
          A scan or PDF of the report helps reviewers check it against the stone. Only you and marketplace reviewers can open it;
          buyers see the verification result, not the file.
        </p>
        {docs.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper">
            {docs.map((doc, i) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  Report {doc.original_media_type === "application/pdf" ? "PDF" : "image"}, added{" "}
                  {new Date(doc.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
                <span className="flex gap-3">
                  {links.get(doc.storage_path) && (
                    <a href={links.get(doc.storage_path)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      Open<span className="sr-only"> document {i + 1}</span>
                    </a>
                  )}
                  <form action={removeDocument.bind(null, listing.id, doc.id)}>
                    <button type="submit" className="text-danger underline-offset-4 hover:underline">
                      Remove<span className="sr-only"> document {i + 1}</span>
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
        {docs.length < MAX_DOCUMENTS && (
          <UploadForm
            action={uploadReportDocument.bind(null, listing.id)}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            label="Add a report document"
            hint="PDF, JPEG, PNG or WebP, up to 8 MB."
          />
        )}
      </section>
    </div>
  );
}

async function PhotosStep({ listing }: { listing: EditableListing }) {
  const photos = await listListingPhotos(listing.id);
  return (
    <div className="grid gap-6">
      <p className="text-ink-soft">
        Photograph the stone itself, in daylight and under a lamp, face-up and from the side. The first photo is the one buyers
        see in search.
      </p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((p, i) => <PhotoTile key={p.id} photo={p} listingId={listing.id} n={i + 1} title={listing.title} />)}
        </ul>
      )}
      {photos.length < MAX_PHOTOS ? (
        <UploadForm action={uploadPhoto.bind(null, listing.id)} accept="image/jpeg,image/png,image/webp" label="Add a photo" hint="JPEG, PNG or WebP, up to 8 MB each." />
      ) : (
        <Notice>This listing has the maximum of {MAX_PHOTOS} photos.</Notice>
      )}
      <div className="border-t border-line pt-6">
        <Link
          href={`/seller/listings/${listing.id}?step=price`}
          className="inline-flex h-11 items-center rounded-md bg-olive px-5 text-[0.95rem] font-medium text-on-olive hover:bg-olive-soft"
        >
          Continue to price
        </Link>
      </div>
    </div>
  );
}

function PhotoTile({ photo, listingId, n, title }: { photo: ListingPhoto; listingId: string; n: number; title: string }) {
  return (
    <li className="overflow-hidden rounded-lg border border-line bg-paper">
      <div className="relative aspect-square bg-vellum">
        {photo.url ? (
          <Image src={photo.url} alt={`${title}, photo ${n}`} fill sizes="(min-width: 640px) 16rem, 45vw" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-ink-muted">Preview unavailable</span>
        )}
        {photo.is_primary && <span className="absolute left-2 top-2"><Badge tone="brass">Main photo</Badge></span>}
      </div>
      <div className="flex justify-between gap-2 p-3 text-sm">
        {!photo.is_primary ? (
          <form action={makePrimaryPhoto.bind(null, listingId, photo.id)}>
            <button type="submit" className="underline-offset-4 hover:underline">Make main photo<span className="sr-only"> (photo {n})</span></button>
          </form>
        ) : <span />}
        <form action={removePhoto.bind(null, listingId, photo.id)}>
          <button type="submit" className="text-danger underline-offset-4 hover:underline">Remove<span className="sr-only"> photo {n}</span></button>
        </form>
      </div>
    </li>
  );
}

async function ReviewStep({ listing: l }: { listing: EditableListing }) {
  const photos = await listListingPhotos(l.id);
  const problems = submissionProblems(l, photos.length);
  const canSubmit = l.listing_status === "draft" || l.listing_status === "withdrawn";
  const rows: [string, string, WizardStep][] = [
    ["Gemstone", [l.variety, GEMSTONE_TYPES[l.gemstone_type]].filter(Boolean).join(", "), "stone"],
    ["Shape", SHAPES[l.shape], "stone"],
    ["Natural or laboratory-grown", ORIGIN_CLASSES[l.natural_or_lab_grown], "stone"],
    ["Weight", l.carat_weight ? `${l.carat_weight} ct` : "Not given", "measurements"],
    ["Measurements", [l.length_mm, l.width_mm, l.depth_mm].every(Boolean) ? `${l.length_mm} × ${l.width_mm} × ${l.depth_mm} mm` : "Not given", "measurements"],
    ["Color, clarity, cut", [l.color_description, l.clarity_grade, l.cut_grade].filter(Boolean).join(", ") || "Not given", "measurements"],
    ["Treatment", [TREATMENT_STATUSES[l.treatment_status], l.treatment_description].filter(Boolean).join(": "), "disclosures"],
    ["Origin", l.origin_claim ? `${l.origin_claim} (seller's statement)` : "Not stated", "disclosures"],
    ["Grading report", l.grading_lab === "none" ? "None" : `${GRADING_LABS[l.grading_lab]} ${l.report_number ?? "(number missing)"}`, "report"],
    ["Photos", String(photos.length), "photos"],
    ["Price", l.asking_price_minor_units !== null ? formatMoney(l.asking_price_minor_units, l.currency) : "Not set", "price"],
    ["Ships to", l.shipping_regions.map((r) => SHIPPING_REGIONS[r as keyof typeof SHIPPING_REGIONS] ?? r).join(", ") || "Not set", "price"],
  ];

  return (
    <div className="grid gap-8">
      {l.listing_status === "submitted" && (
        <div className="grid gap-3">
          <Notice title="In review">
            Marketplace review isn&rsquo;t running yet, so the listing stays here until it is. Reviewers will check it against
            marketplace rules and check its report. Withdraw it if you want to make changes.
          </Notice>
          <form action={withdrawListing.bind(null, l.id)}>
            <button type="submit" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">Withdraw from review</button>
          </form>
        </div>
      )}
      {l.listing_status === "published" && <LiveListingNotice listing={l} />}

      <dl className="divide-y divide-line rounded-lg border border-line bg-paper">
        {rows.map(([label, value, s]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr_auto] sm:items-baseline sm:gap-4">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
            {canSubmit && (
              <dd>
                <Link href={`/seller/listings/${l.id}?step=${s}`} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
                  Change<span className="sr-only"> {label.toLowerCase()}</span>
                </Link>
              </dd>
            )}
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-3 text-sm text-ink-soft">
        <span>Report status once submitted:</span>
        <ReportStatus lab={l.grading_lab} status={l.verification_status} />
      </div>

      {canSubmit && (
        <div className="grid gap-4">
          {problems.length > 0 && (
            <Notice tone="warning" title="Before you can submit">
              <ul className="mt-1 grid gap-1">
                {problems.map((p) => (
                  <li key={p.message}>
                    <Link href={`/seller/listings/${l.id}?step=${p.step}`} className="underline underline-offset-4">{p.message}</Link>
                  </li>
                ))}
              </ul>
            </Notice>
          )}
          <p className="text-sm text-ink-muted">
            By submitting, you confirm the details are accurate to the best of your knowledge and that every known treatment is
            disclosed.
          </p>
          <SubmitListingForm action={submitListing.bind(null, l.id)} disabled={problems.length > 0} />
        </div>
      )}
    </div>
  );
}
