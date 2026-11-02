import { describe, expect, it } from "vitest";
import { activeFilterCount, parseListingSearch, toQueryString } from "./search-params";

describe("listing search params", () => {
  it("keeps valid filters", () => {
    const s = parseListingSearch({ type: "sapphire", shape: "oval", min_carat: "1.5", max_price: "8000", sort: "price_asc" });
    expect(s).toMatchObject({ type: "sapphire", shape: "oval", min_carat: 1.5, max_price: 8000, sort: "price_asc" });
    expect(activeFilterCount(s)).toBe(4);
  });

  it("drops invalid values instead of failing the page", () => {
    const s = parseListingSearch({ type: "kryptonite", min_carat: "-2", max_price: "lots", sort: "random", seller: "not-a-uuid" });
    expect(s.type).toBeUndefined();
    expect(s.min_carat).toBeUndefined();
    expect(s.max_price).toBeUndefined();
    expect(s.seller).toBeUndefined();
    expect(s.sort).toBe("newest");
  });

  it("takes the first value of repeated params", () => {
    expect(parseListingSearch({ type: ["ruby", "emerald"] }).type).toBe("ruby");
  });

  it("round-trips to a query string without the cursor or default sort", () => {
    const s = parseListingSearch({ type: "ruby", cursor: "abc", sort: "newest" });
    expect(toQueryString(s)).toBe("?type=ruby");
    expect(toQueryString(s, { sort: "price_desc" })).toBe("?type=ruby&sort=price_desc");
  });
});
