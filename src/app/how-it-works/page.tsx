import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "How it works",
  description: "Buying a loose gemstone, designing a piece around it, and having it made.",
};

const buyerSteps = [
  {
    title: "Find a stone",
    body: "Search by species, shape, size, treatment, laboratory and report status. Each listing is one physical stone. Seller statements are labelled as such.",
  },
  {
    title: "Check what's known about it",
    body: "The listing shows the grading laboratory, report number, and exactly which verification checks have been done: the report record, the listing against the report, and the physical stone.",
  },
  {
    title: "Design around it, if you like",
    body: "Open the Design Studio from the stone's page. Choose a piece, metal and setting, then refine it with the AI Jeweler. Save versions as you go.",
  },
  {
    title: "Ask makers for quotes",
    body: "Send a saved design to one or more jewelry makers. Each quote itemizes materials, labor, any extra stones, shipping and tax, and says whether the stone is included.",
  },
  {
    title: "Buy and track",
    body: "Buy the stone on its own, or approve a maker's quote. Payment runs through the payment provider, and you can follow the order and production status from your account.",
  },
];

export default function HowItWorks() {
  return (
    <Container className="py-14">
      <div className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">How it works</h1>
        <p className="mt-4 text-lg text-ink-soft">
          The stone comes first. Everything else, from the design to the maker and the price of making it, is built
          around the one you choose.
        </p>
      </div>
      <ol className="mt-14 grid max-w-3xl gap-0">
        {buyerSteps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-line py-8">
            <span className="font-serif text-4xl leading-none text-brass">{i + 1}</span>
            <div>
              <h2 className="text-2xl">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/gemstones">Explore gemstones</ButtonLink>
        <ButtonLink href="/policies/authenticity" variant="secondary">How report verification works</ButtonLink>
      </div>
      <p className="mt-10 max-w-2xl text-sm text-ink-muted">
        Selling stones or making jewelry? See <Link href="/sell" className="underline underline-offset-4">selling on the marketplace</Link> and{" "}
        <Link href="/jewelers" className="underline underline-offset-4">working as a jewelry maker</Link>.
      </p>
    </Container>
  );
}
