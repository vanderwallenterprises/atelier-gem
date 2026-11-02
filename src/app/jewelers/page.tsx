import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "For jewelry makers",
  description: "Receive quote requests for custom pieces designed around specific gemstones.",
};

const points = [
  { title: "Requests come with the stone attached", body: "Every request includes the design version, the stone's listed measurements and report details, and the buyer's budget for the setting and making." },
  { title: "You decide what's manufacturable", body: "Ask the buyer questions, request changes, or decline. A design isn't treated as manufacturable until you accept its production requirements in a quote." },
  { title: "Itemized quotes", body: "Quote materials, labor, additional stones, shipping and tax separately, with lead time, expiry, revision and cancellation terms, and say whether the stone's price is included." },
  { title: "Production tracking", body: "Once a buyer approves and pays, update production status from your dashboard so the buyer can follow along." },
];

export default function JewelersPage() {
  return (
    <Container className="py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">Make pieces around stones people have chosen</h1>
        <p className="mt-5 text-lg text-ink-soft">
          Buyers design in the studio, then ask makers like you to quote. You review every design before committing to
          anything.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/how-it-works" variant="secondary" size="lg">How the marketplace works</ButtonLink>
        </div>
        <p className="mt-4 text-sm text-ink-muted">Maker applications open together with the Design Studio.</p>
      </div>
      <dl className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        {points.map((p) => (
          <div key={p.title} className="bg-paper p-7">
            <dt className="font-serif text-xl">{p.title}</dt>
            <dd className="mt-2 leading-relaxed text-ink-soft">{p.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 max-w-2xl text-sm text-ink-muted">
        Maker applications are reviewed before you can receive requests. You&rsquo;ll describe your capabilities,
        materials, service regions and indicative pricing, and can add a portfolio.
      </p>
    </Container>
  );
}
