import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Sell loose gemstones",
  description: "List individual loose gemstones with their grading reports and disclosures.",
};

const needs = [
  { title: "Your seller profile", body: "Business or display name, contact details, business location (city or region), and your shipping and return policies." },
  { title: "Payout setup", body: "Payouts go through the payment provider's seller onboarding, which handles any identity or business verification it requires. We don't ask for identity documents ourselves." },
  { title: "For each stone", body: "Photographs, measurements, color and clarity details, treatment and origin disclosures, and its grading report number and document if it has one." },
];

const process = [
  "Create your listing as a draft. Save at any step and come back later.",
  "Submit it for review. Report details go into verification, and the listing is checked against marketplace rules.",
  "Once approved, it's published and can be bought. Buyers can also design around it in the studio before buying.",
  "When it sells, ship it within your stated handling time. Your payout is released under the published payout policy.",
];

export default function SellPage() {
  return (
    <>
      <section className="border-b border-line">
        <Container className="grid gap-10 py-16 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl">Sell loose gemstones, one stone at a time</h1>
            <p className="mt-5 text-lg text-ink-soft">
              List individual stones with their reports and full disclosures. Buyers see exactly what has been checked,
              and they can design a piece around your stone before they buy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <ButtonLink href="/onboarding/seller" size="lg">Start selling</ButtonLink>
            <ButtonLink href="/policies/fees" variant="secondary" size="lg">Marketplace fees</ButtonLink>
          </div>
        </Container>
      </section>
      <Container className="grid gap-16 py-16 lg:grid-cols-2">
        <section>
          <h2 className="text-3xl">What you&rsquo;ll need</h2>
          <dl className="mt-8 grid gap-6">
            {needs.map((n) => (
              <div key={n.title} className="border-l-2 border-brass pl-5">
                <dt className="font-serif text-xl">{n.title}</dt>
                <dd className="mt-1.5 leading-relaxed text-ink-soft">{n.body}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2 className="text-3xl">From draft to sale</h2>
          <ol className="mt-8 grid gap-5">
            {process.map((p, i) => (
              <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <span className="font-serif text-2xl text-brass">{i + 1}</span>
                <p className="leading-relaxed text-ink-soft">{p}</p>
              </li>
            ))}
          </ol>
        </section>
      </Container>
      <Container>
        <p className="max-w-2xl text-sm text-ink-muted">
          Listings must follow the seller terms: one physical stone per listing, every known treatment disclosed, and
          only reports you hold for that stone. Laboratory names may identify a report but not suggest endorsement.
        </p>
      </Container>
    </>
  );
}
