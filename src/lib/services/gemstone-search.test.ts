import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./gemstone-search";

describe("search cursors", () => {
  it("round-trips", () => {
    const c = { v: "2026-10-27T10:00:00+00:00", id: "6f1c1e8a-2b7d-4f6e-9a0b-1c2d3e4f5a6b" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("rejects tampered cursors", () => {
    expect(decodeCursor("not-base64")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ v: 1, id: "1),or(id.neq.0" })).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ v: { x: 1 }, id: "6f1c1e8a-2b7d-4f6e-9a0b-1c2d3e4f5a6b" })).toString("base64url"))).toBeNull();
  });
});
