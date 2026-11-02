// @vitest-environment node
import { expect, it } from "vitest";
import { createTestDb } from "./harness";

it("applies every migration", async () => {
  const db = await createTestDb();
  const r = await db.query<{ n: number }>("select count(*)::int as n from information_schema.tables where table_schema = 'public'");
  expect(r.rows[0].n).toBeGreaterThan(25);
});
