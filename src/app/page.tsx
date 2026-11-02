import Link from "next/link";
import { Suspense } from "react";
import { FacetDiagram, gemTint } from "@/components/brand/facet-diagram";
import { GemCard, GemCardSkeleton } from "@/components/gemstone/gem-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, Notice } from "@/components/ui/primitives";
import { GEMSTONE_TYPES } from "@/lib/domain/gemstone";
import { listingSearchSchema } from "@/lib/domain/search-params";
import { searchListings } from "@/lib/services/gemstone-search";

const featuredTypes = ["diamond", "sapphire", "ruby", "emerald", "spinel", "tourmaline", "aquamarine", "opal"] as const;

const faqs = [
  {
    q: "Do you sell finished jewelry?",
    a: "Listings are individual loose gemstones. If you want a piece made, design it in the studio and request quotes from jewelry makers; the stone and the making are priced separately.",
  },
  {
    q: "What does “report verified” mean?",
    a: "It means the report number was checked against the laboratory's record and the listing's details were compared with it. It is not the same as a gemologist examining the physical stone. Each listing shows exactly which checks were done.",
  },
  {
    q: "Who writes the listing details?",
    a: "Sellers do. Anything that hasn't been checked against a grading report is shown as the seller's statement, including treatments and origin.",
  },
  {
    q: "Are the studio's design images exact?",
    a: "No. Concept images are AI-generated illustrations to help you decide on a direction. They are not photographs of your stone and not manufacturing drawings; a jewelry maker reviews every design before quoting.",
  },
  {
    q: "How are payments handled?",
    a: "Checkout runs through a payment provider; card details never touch our servers. Seller payouts are released according to the marketplace's published policies.",
  },
];

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <section className="py-20" aria-labelledby="curated-heading">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 id="curated-heading" className="text-3xl sm:text-4xl">Recently listed stones</h2>
              <p className="mt-3 text-lg text-ink-soft">Each listing is one physical stone, shown with its report status.</p>
            </div>
            <Link href="/gemstones" className="text-sm font-medium text-brass-ink underline-offset-4 hover:underline">
              Browse all gemstones
            </Link>
          </div>
          <Suspense fallback={<CuratedSkeleton />}>
            <CuratedStones />
          </Suspense>
        </Container>
      </section>
      <Steps />
      <Verification />
      <StudioPreview />
      <Sellers />
      <Faq />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div className="max-w-xl">
          <h1 className="text-5xl leading-[1.04] text-ink sm:text-6xl">Begin with one stone. Make something no one else has.</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Every listing here is a single loose gemstone from an independent seller, with its grading report status shown
            plainly. Choose the stone first, then design a ring, pendant or earrings around it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/gemstones" size="lg">Explore gemstones</ButtonLink>
            <ButtonLink href="/sell" variant="secondary" size="lg">Become a seller</ButtonLink>
            <ButtonLink href="/design-studio" variant="quiet" className="ml-1">Enter the Design Studio</ButtonLink>
          </div>
        </div>
        <figure className="relative mx-auto w-full max-w-[34rem]">
          <div className="aspect-square rounded-full bg-[radial-gradient(circle_at_42%_38%,var(--color-paper),var(--color-vellum)_70%)] p-[9%]">
            <FacetDiagram animated strokeWidth={0.55} className="h-full w-full" title="Crown view of a round brilliant cut" />
          </div>
          <figcaption className="mt-4 text-center text-sm text-ink-muted">
            Round brilliant, crown view: the facet diagram printed on grading reports.
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}

function Categories() {
  return (
    <section aria-labelledby="types-heading" className="border-b border-line bg-paper">
      <Container className="py-12">
        <h2 id="types-heading" className="sr-only">Browse by gemstone</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">
          {featuredTypes.map((t) => (
            <li key={t}>
              <Link href={`/gemstones?type=${t}`} className="group flex items-center gap-3 rounded-md py-1 lg:flex-col lg:items-start">
                <FacetDiagram className="size-9 shrink-0" stroke="var(--color-line-strong)" fill={gemTint[t]} strokeWidth={1.4} />
                <span className="font-serif text-lg text-ink transition-colors group-hover:text-brass-ink">{GEMSTONE_TYPES[t]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function CuratedStones() {
  const result = await searchListings(listingSearchSchema.parse({ sort: "newest" }), 4);
  if (result.status === "unconfigured" || (result.status === "ok" && result.listings.length === 0)) {
    return (
      <div className="mt-10">
        <EmptyState
          title="No stones are listed yet"
          action={<ButtonLink href="/sell">List the first gemstone</ButtonLink>}
          art={<FacetDiagram className="size-12" stroke="var(--color-line-strong)" />}
        >
          <p>
            The marketplace opens with its first sellers. If you have loose stones with grading reports, you can be
            among them.
          </p>
        </EmptyState>
      </div>
    );
  }
  if (result.status === "error") {
    return <Notice tone="warning" className="mt-10">{result.message}</Notice>;
  }
  return (
    <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {result.listings.map((l) => <GemCard key={l.id} listing={l} />)}
    </div>
  );
}

function CuratedSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => <GemCardSkeleton key={i} />)}
    </div>
  );
}

const steps = [
  {
    title: "Discover a stone",
    body: "Filter by species, shape, size, treatment and report status. Every listing is one physical stone with its own report details.",
  },
  {
    title: "Design your piece",
    body: "Open the Design Studio from the stone's page. The AI Jeweler works around that stone's real dimensions and suggests settings that suit it.",
  },
  {
    title: "Bring it to life",
    body: "Send your design to jewelry makers for itemized quotes. A maker reviews the design before anything is promised or produced.",
  },
];

function Steps() {
  return (
    <section className="bg-olive py-20 text-on-olive" aria-labelledby="steps-heading">
      <Container>
        <h2 id="steps-heading" className="max-w-xl text-3xl sm:text-4xl">From loose stone to finished piece</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t border-on-olive/20 pt-6">
              <span className="font-serif text-4xl text-brass">{i + 1}</span>
              <h3 className="mt-3 text-2xl text-on-olive">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-on-olive-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

const checks = [
  {
    title: "The report record",
    body: "Does the laboratory have a report with this number? Checked through an authorized laboratory service where available, or by our reviewers using the laboratory's public report check.",
  },
  {
    title: "The listing against the report",
    body: "Do the listing's weight, measurements, color and clarity agree with that report? Any difference is shown on the listing.",
  },
  {
    title: "The physical stone",
    body: "Is the stone in the box the one in the report? This needs a gemologist and the stone itself. Listings say plainly when this has not been done.",
  },
];

function Verification() {
  return (
    <section className="py-20" aria-labelledby="verify-heading">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 id="verify-heading" className="text-3xl sm:text-4xl">What a grading report does and doesn&rsquo;t prove</h2>
          <p className="mt-4 text-lg text-ink-soft">
            A report number on a listing is a seller&rsquo;s claim until it&rsquo;s checked. We separate three different
            questions and show which ones have been answered.
          </p>
          <Link href="/policies/authenticity" className="mt-6 inline-block text-sm font-medium text-brass-ink underline-offset-4 hover:underline">
            Read the verification policy
          </Link>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
          {checks.map((c) => (
            <div key={c.title} className="bg-paper p-6">
              <dt className="font-serif text-xl text-ink">{c.title}</dt>
              <dd className="mt-2 leading-relaxed text-ink-soft">{c.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function StudioPreview() {
  return (
    <section className="border-y border-line bg-paper py-20" aria-labelledby="studio-heading">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="rounded-lg border border-line bg-ivory p-5 shadow-[var(--shadow-soft)]">
            <p className="text-xs text-ink-muted">Example conversation, for illustration</p>
            <div className="mt-4 grid gap-3 text-sm leading-relaxed">
              <p className="max-w-[85%] justify-self-end rounded-lg bg-olive px-4 py-3 text-on-olive">
                An everyday ring for this sapphire. I work with my hands a lot.
              </p>
              <p className="max-w-[90%] rounded-lg border border-line bg-paper px-4 py-3 text-ink-soft">
                At 7.9 by 6.1 mm and 4.2 mm deep, a low bezel in 18K yellow gold would protect the girdle and keep the
                stone from catching. A six-prong setting shows more of the stone but sits higher. Want to compare both?
              </p>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <h2 id="studio-heading" className="text-3xl sm:text-4xl">An AI Jeweler that starts from your stone</h2>
          <p className="mt-4 text-lg text-ink-soft">
            The studio keeps the stone you chose at the center: its shape, measurements and durability shape every
            suggestion. Save versions, see a concept image, and get an estimate before asking makers to quote.
          </p>
          <ul className="mt-6 grid gap-2 text-ink-soft">
            <li>Choose a piece, metal and setting in a few steps, then refine in conversation.</li>
            <li>Estimates are labelled as estimates; makers give the real quote.</li>
            <li>Concept images are illustrations, not photographs or production drawings.</li>
          </ul>
          <ButtonLink href="/design-studio" variant="secondary" className="mt-8">Enter the Design Studio</ButtonLink>
        </div>
      </Container>
    </section>
  );
}

function Sellers() {
  return (
    <section className="py-20" aria-labelledby="sellers-heading">
      <Container className="grid gap-10 rounded-lg bg-vellum px-6 py-14 sm:px-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <h2 id="sellers-heading" className="text-3xl sm:text-4xl">Sell loose stones to people who care about them</h2>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            List individual stones with their reports, photographs and disclosures. Buyers can design around your stone
            before they buy it, and you&rsquo;re paid through the marketplace&rsquo;s payment provider.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <ButtonLink href="/sell" size="lg">Become a seller</ButtonLink>
          <ButtonLink href="/policies/fees" variant="secondary" size="lg">See fees</ButtonLink>
        </div>
      </Container>
    </section>
  );
}

function Faq() {
  return (
    <section className="pb-4" aria-labelledby="faq-heading">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 id="faq-heading" className="text-3xl sm:text-4xl">Questions</h2>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-xl text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="mt-1 text-brass transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="prose-measure mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
