import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { ListingResults, ResultsSkeleton } from "@/components/gemstone/listing-results";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { parseListingSearch } from "@/lib/domain/search-params";

export const metadata: Metadata = { title: "Search", description: "Search loose gemstones." };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <Container className="py-12">
      <h1 className="text-4xl sm:text-5xl">Search gemstones</h1>
      <Suspense fallback={<SearchForm q="" />}>
        <SearchBody searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form method="get" action="/search" role="search" className="mt-8 flex max-w-2xl gap-2">
      <label htmlFor="q" className="sr-only">Search</label>
      <div className="relative flex-1">
        <Search aria-hidden className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={120}
          placeholder="Try “oval sapphire”, “padparadscha” or “untreated ruby”"
          className="h-12 w-full rounded-md border border-line-strong bg-paper pl-10 pr-3 text-base focus:border-olive focus:outline-none"
        />
      </div>
      <Button type="submit" size="lg" className="h-12">Search</Button>
    </form>
  );
}

async function SearchBody({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const s = parseListingSearch(await searchParams);
  return (
    <>
      <SearchForm q={s.q ?? ""} />
      <div className="mt-10">
        {s.q ? (
          <Suspense fallback={<ResultsSkeleton />}>
            <ListingResults s={s} basePath="/search" />
          </Suspense>
        ) : (
          <p className="text-ink-soft">Search by species, variety, color, shape or words from a listing&rsquo;s title.</p>
        )}
      </div>
    </>
  );
}
