import { FacetDiagram } from "@/components/brand/facet-diagram";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-5 py-24">
      <FacetDiagram className="size-16" stroke="var(--color-line-strong)" />
      <h1 className="text-4xl">This page doesn&rsquo;t exist</h1>
      <p className="max-w-lg text-lg text-ink-soft">
        The link may be out of date, or the listing may have been withdrawn by its seller.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/gemstones">Browse gemstones</ButtonLink>
        <ButtonLink href="/" variant="secondary">Go to the homepage</ButtonLink>
      </div>
    </Container>
  );
}
