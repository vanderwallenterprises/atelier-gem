import { FacetDiagram } from "@/components/brand/facet-diagram";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/primitives";
import { toQueryString, type ListingSearch } from "@/lib/domain/search-params";
import { searchListings } from "@/lib/services/gemstone-search";
import { GemCard, GemCardSkeleton } from "./gem-card";

export async function ListingResults({ s, basePath }: { s: ListingSearch; basePath: string }) {
  const result = await searchListings(s);

  if (result.status === "unconfigured") {
    return (
      <EmptyState title="The gemstone catalogue isn't connected yet" art={<FacetDiagram className="size-12" stroke="var(--color-line-strong)" />}>
        <p>Listings appear here once the marketplace database is set up.</p>
      </EmptyState>
    );
  }
  if (result.status === "error") return <Notice tone="warning">{result.message}</Notice>;

  if (result.listings.length === 0) {
    const filtered = Object.entries(s).some(([k, v]) => k !== "sort" && v !== undefined);
    return filtered ? (
      <EmptyState title="No stones match these filters" action={<ButtonLink href={basePath} variant="secondary">Clear all filters</ButtonLink>}>
        <p>Try a wider price or carat range, or remove a filter or two.</p>
      </EmptyState>
    ) : (
      <EmptyState title="No stones are listed yet" action={<ButtonLink href="/sell">List a gemstone</ButtonLink>}>
        <p>Sellers are adding their first stones. Check back soon, or list one of your own.</p>
      </EmptyState>
    );
  }

  return (
    <>
      <h2 className="sr-only">Matching gemstones</h2>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
        {result.listings.map((l) => (
          <li key={l.id}>
            <GemCard listing={l} />
          </li>
        ))}
      </ul>
      <nav aria-label="More results" className="mt-10 flex justify-center gap-3">
        {s.cursor && <ButtonLink href={`${basePath}${toQueryString(s)}`} variant="secondary">Back to first page</ButtonLink>}
        {result.nextCursor && (
          <ButtonLink href={`${basePath}${toQueryString(s)}${toQueryString(s) ? "&" : "?"}cursor=${result.nextCursor}`} variant="secondary">
            Show more stones
          </ButtonLink>
        )}
      </nav>
    </>
  );
}

export function ResultsSkeleton() {
  return (
    <div role="status" className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3" aria-busy="true" aria-label="Loading gemstones">
      {Array.from({ length: 6 }, (_, i) => <GemCardSkeleton key={i} />)}
    </div>
  );
}
