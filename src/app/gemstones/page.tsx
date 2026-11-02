import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterPanel } from "@/components/gemstone/filter-panel";
import { ListingResults, ResultsSkeleton } from "@/components/gemstone/listing-results";
import { Container } from "@/components/ui/primitives";
import { activeFilterCount, parseListingSearch } from "@/lib/domain/search-params";

export const metadata: Metadata = {
  title: "Gemstones",
  description: "Browse individual loose gemstones by species, shape, size, treatment and grading report status.",
};

export default function GemstonesPage(props: PageProps<"/gemstones">) {
  return (
    <Container className="py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl sm:text-5xl">Gemstones</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Individual loose stones from independent sellers. Details are the seller&rsquo;s unless a report check says
          otherwise.
        </p>
      </div>
      <Suspense fallback={<Layout filters={null} results={<ResultsSkeleton />} />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/gemstones">["searchParams"] }) {
  const s = parseListingSearch(await searchParams);
  const count = activeFilterCount(s);
  return (
    <Layout
      filters={(prefix) => <FilterPanel s={s} idPrefix={prefix} />}
      filterCount={count}
      results={<ListingResults s={s} basePath="/gemstones" />}
    />
  );
}

function Layout({ filters, results, filterCount = 0 }: { filters: ((idPrefix: string) => React.ReactNode) | null; results: React.ReactNode; filterCount?: number }) {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[17rem_1fr]">
      <aside>
        <details className="group rounded-lg border border-line bg-paper p-5 lg:hidden">
          <summary className="cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden">
            Filters{filterCount ? ` (${filterCount} applied)` : ""}
          </summary>
          <div className="mt-5">{filters?.("m-")}</div>
        </details>
        <div className="sticky top-24 hidden lg:block">{filters?.("d-")}</div>
      </aside>
      <section aria-label="Results">{results}</section>
    </div>
  );
}
