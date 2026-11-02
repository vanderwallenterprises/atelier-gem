import type { Metadata } from "next";
import Link from "next/link";
import { FacetDiagram } from "@/components/brand/facet-diagram";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Design a custom piece of jewelry around a specific gemstone with the AI Jeweler.",
};

export default function DesignStudioLanding() {
  return (
    <Container className="grid items-center gap-12 py-16 lg:grid-cols-[1.2fr_1fr]">
      <div className="max-w-xl">
        <h1 className="text-4xl sm:text-5xl">The Design Studio starts with a stone</h1>
        <p className="mt-5 text-lg text-ink-soft">
          Every design will be built around one real gemstone from the marketplace, using its shape and measurements.
          The studio isn&rsquo;t open yet. Until it is, you can browse stones and save the ones you&rsquo;d like to design around.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/gemstones" size="lg">Choose a stone</ButtonLink>
        </div>
        <p className="mt-8 text-sm text-ink-muted">
          Concept images are illustrations and estimates are estimates. A jewelry maker reviews every design before
          quoting. <Link href="/policies/ai-concepts" className="underline underline-offset-4">About AI concepts</Link>
        </p>
      </div>
      <div className="mx-auto w-full max-w-sm">
        <FacetDiagram strokeWidth={0.6} className="w-full" />
      </div>
    </Container>
  );
}
