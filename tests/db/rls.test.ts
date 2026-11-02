// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { anon, approve, as, createTestDb, createUser, makeAdmin, service, user, type Db } from "./harness";

let db: Db;
let alice: string; // buyer
let sam: string; // seller
let sara: string; // second seller
let mia: string; // maker
let ada: string; // admin
let samSeller: string;
let saraSeller: string;
let miaMaker: string;

async function newListing(sellerUser: string, sellerId: string, slug: string, extra: Record<string, unknown> = {}) {
  const cols = { seller_id: sellerId, slug, title: `Stone ${slug}`, gemstone_type: "sapphire", shape: "oval", carat_weight: 1.52, length_mm: 7.9, width_mm: 6.1, depth_mm: 4.2, asking_price_minor_units: 450000, grading_lab: "GIA", report_number: "2141438171", ...extra };
  const keys = Object.keys(cols);
  return as(db, user(sellerUser), async (tx) => {
    const r = await tx.query<{ id: string }>(
      `insert into public.gemstone_listings (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
      Object.values(cols),
    );
    return r.rows[0].id;
  });
}

async function publish(listingId: string) {
  await as(db, user(ada), (tx) =>
    tx.query("update public.gemstone_listings set listing_status = 'published', moderation_status = 'approved' where id = $1", [listingId]),
  );
}

const rejects = (p: Promise<unknown>) => expect(p).rejects.toThrow();

beforeAll(async () => {
  db = await createTestDb();
  [alice, sam, sara, mia, ada] = await Promise.all(
    ["alice@test.dev", "sam@test.dev", "sara@test.dev", "mia@test.dev", "ada@test.dev"].map((e) => createUser(db, e)),
  );
  await makeAdmin(db, ada);
  for (const [u, name] of [[sam, "Sam Stones"], [sara, "Sara Gems"]] as const) {
    await as(db, user(u), async (tx) => {
      await tx.query("insert into public.user_capabilities (user_id, capability) values ($1, 'seller')", [u]);
      await tx.query("insert into public.seller_profiles (user_id, business_name) values ($1, $2)", [u, name]);
    });
  }
  await as(db, user(mia), async (tx) => {
    await tx.query("insert into public.user_capabilities (user_id, capability) values ($1, 'maker')", [mia]);
    await tx.query("insert into public.jewelry_maker_profiles (user_id, business_name) values ($1, 'Mia Makes')", [mia]);
  });
  const ids = await db.query<{ user_id: string; id: string }>("select user_id, id from public.seller_profiles");
  await approve(db, sam, "seller");
  await approve(db, sara, "seller");
  samSeller = ids.rows.find((r) => r.user_id === sam)!.id;
  saraSeller = ids.rows.find((r) => r.user_id === sara)!.id;
  miaMaker = (await db.query<{ id: string }>("select id from public.jewelry_maker_profiles")).rows[0].id;
  await db.query("update public.jewelry_maker_profiles set verification_status = 'verified' where id = $1", [miaMaker]);
});

describe("accounts and capabilities", () => {
  it("creates a profile with buyer and designer capabilities on sign-up", async () => {
    const caps = await as(db, user(alice), (tx) => tx.query<{ capability: string }>("select capability from public.user_capabilities order by 1"));
    expect(caps.rows.map((r) => r.capability)).toEqual(["buyer", "designer"]);
  });

  it("puts seller requests into pending and refuses self-assigned admin", async () => {
    const r = await db.query<{ approval_status: string }>("select approval_status from public.user_capabilities where user_id = $1 and capability = 'maker'", [mia]);
    expect(r.rows[0].approval_status).toBe("pending");
    await rejects(as(db, user(alice), (tx) => tx.query("insert into public.user_capabilities (user_id, capability, approval_status) values ($1, 'admin', 'approved')", [alice])));
  });

  it("stops users approving their own capabilities or changing account status", async () => {
    // RLS hides the row from the update entirely, so nothing changes.
    const r = await as(db, user(mia), (tx) => tx.query("update public.user_capabilities set approval_status = 'approved' where user_id = $1 returning 1", [mia]));
    expect(r.rows).toHaveLength(0);
    const still = await db.query<{ approval_status: string }>("select approval_status from public.user_capabilities where user_id = $1 and capability = 'maker'", [mia]);
    expect(still.rows[0].approval_status).toBe("pending");
    // Own profile row is visible, so the guard trigger is what refuses this.
    await rejects(as(db, user(sam), (tx) => tx.query("update public.profiles set account_status = 'restricted' where id = $1", [sam])));
  });

  it("keeps payout and verification fields out of sellers' hands", async () => {
    await rejects(as(db, user(sam), (tx) => tx.query("update public.seller_profiles set payouts_enabled = true where user_id = $1", [sam])));
    await rejects(as(db, user(sam), (tx) => tx.query("update public.seller_profiles set verification_status = 'verified' where user_id = $1", [sam])));
  });

  it("hides other people's profiles and private seller fields", async () => {
    const r = await as(db, user(alice), (tx) => tx.query("select * from public.seller_profiles"));
    expect(r.rows).toHaveLength(0);
    const pub = await as(db, anon, (tx) => tx.query<Record<string, unknown>>("select * from public.public_seller_profiles"));
    expect(pub.rows.length).toBe(2);
    expect(Object.keys(pub.rows[0])).not.toContain("payout_account_reference");
    expect(Object.keys(pub.rows[0])).not.toContain("contact_email");
  });
});

describe("listings", () => {
  let draft: string;
  let live: string;

  beforeAll(async () => {
    draft = await newListing(sam, samSeller, "draft-sapphire");
    live = await newListing(sam, samSeller, "live-sapphire");
    await publish(live);
  });

  it("forces new listings to draft, unverified, not sample", async () => {
    const id = await newListing(sam, samSeller, "sneaky", { listing_status: "published", moderation_status: "approved", verification_status: "verified", is_sample: true });
    const r = await db.query("select listing_status, moderation_status, verification_status, is_sample from public.gemstone_listings where id = $1", [id]);
    expect(r.rows[0]).toEqual({ listing_status: "draft", moderation_status: "not_submitted", verification_status: "not_submitted", is_sample: false });
  });

  it("shows anonymous visitors only published, approved listings", async () => {
    const r = await as(db, anon, (tx) => tx.query<{ slug: string }>("select slug from public.listing_cards"));
    expect(r.rows.map((x) => x.slug)).toEqual(["live-sapphire"]);
    const direct = await as(db, anon, (tx) => tx.query("select id from public.gemstone_listings where id = $1", [draft]));
    expect(direct.rows).toHaveLength(0);
  });

  it("refuses to list on another seller's behalf or edit their listing", async () => {
    await rejects(newListing(sara, samSeller, "impostor"));
    const r = await as(db, user(sara), (tx) => tx.query("update public.gemstone_listings set asking_price_minor_units = 1 where id = $1 returning id", [live]));
    expect(r.rows).toHaveLength(0);
  });

  it("lets a draft be saved without a price but not submitted without one", async () => {
    const id = await newListing(sam, samSeller, "unpriced-draft", { asking_price_minor_units: null });
    await rejects(as(db, user(sam), (tx) => tx.query("update public.gemstone_listings set listing_status = 'submitted' where id = $1", [id])));
    await as(db, user(sam), (tx) =>
      tx.query("update public.gemstone_listings set asking_price_minor_units = 120000, listing_status = 'submitted' where id = $1", [id]),
    );
    const r = await db.query("select listing_status from public.gemstone_listings where id = $1", [id]);
    expect(r.rows[0]).toEqual({ listing_status: "submitted" });
  });

  it("shows the seller's extra disclosures on public listings", async () => {
    await db.query("update public.gemstone_listings set disclosure_notes = 'Small chip under the girdle' where id = $1", [live]);
    const r = await as(db, anon, (tx) => tx.query("select disclosure_notes from public.listing_cards where slug = 'live-sapphire'"));
    expect(r.rows[0]).toEqual({ disclosure_notes: "Small chip under the girdle" });
  });

  it("lets sellers submit but not publish or verify", async () => {
    await rejects(as(db, user(sam), (tx) => tx.query("update public.gemstone_listings set listing_status = 'published' where id = $1", [draft])));
    await rejects(as(db, user(sam), (tx) => tx.query("update public.gemstone_listings set verification_status = 'verified' where id = $1", [draft])));
    await as(db, user(sam), (tx) => tx.query("update public.gemstone_listings set listing_status = 'submitted' where id = $1", [draft]));
    const r = await db.query("select listing_status, moderation_status, verification_status from public.gemstone_listings where id = $1", [draft]);
    expect(r.rows[0]).toEqual({ listing_status: "submitted", moderation_status: "pending", verification_status: "submitted" });
  });

  it("sends an edited verified listing back for recheck and moderation", async () => {
    await db.query("update public.gemstone_listings set verification_status = 'verified' where id = $1", [live]);
    await as(db, user(sam), (tx) => tx.query("update public.gemstone_listings set carat_weight = 1.60 where id = $1", [live]));
    const r = await db.query("select listing_status, moderation_status, verification_status from public.gemstone_listings where id = $1", [live]);
    expect(r.rows[0]).toEqual({ listing_status: "submitted", moderation_status: "pending", verification_status: "recheck_required" });
    await publish(live);
  });

  it("records status changes in the audit log, readable only by admins", async () => {
    const admin = await as(db, user(ada), (tx) => tx.query("select * from public.audit_events where entity_type = 'gemstone_listing'"));
    expect(admin.rows.length).toBeGreaterThan(0);
    const other = await as(db, user(sam), (tx) => tx.query("select * from public.audit_events"));
    expect(other.rows).toHaveLength(0);
    await rejects(as(db, user(sam), (tx) => tx.query("insert into public.audit_events (entity_type, entity_id, action) values ('x','y','z')")));
    await rejects(as(db, user(sam), (tx) => tx.query("select public.write_audit('x','y','forged','{}')")));
  });

  it("keeps reviewer notes private while exposing what was checked", async () => {
    await as(db, user(ada), (tx) => tx.query(
      `insert into public.report_verifications (listing_id, verification_method, verification_status, record_check, consistency_check, reviewer_id, private_notes)
       values ($1, 'manual_lab_portal', 'verified', 'passed', 'passed', $2, 'seller seemed evasive')`, [live, ada]));
    await as(db, user(ada), (tx) => tx.query("update public.gemstone_listings set verification_status = 'verified' where id = $1", [live]));
    const sellerView = await as(db, user(sam), (tx) => tx.query("select * from public.report_verifications"));
    expect(sellerView.rows).toHaveLength(0);
    const summary = await as(db, anon, (tx) => tx.query<Record<string, unknown>>("select * from public.listing_verification_summary where listing_id = $1", [live]));
    expect(summary.rows[0]).toMatchObject({ record_check: "passed", consistency_check: "passed", physical_match_check: "not_checked" });
    expect(Object.keys(summary.rows[0])).not.toContain("private_notes");
    expect(Object.keys(summary.rows[0])).not.toContain("reviewer_id");
  });

  it("blocks suspended accounts from creating listings", async () => {
    await db.query("update public.profiles set account_status = 'suspended' where id = $1", [sara]);
    await rejects(newListing(sara, saraSeller, "while-suspended"));
    await db.query("update public.profiles set account_status = 'active' where id = $1", [sara]);
  });

  it("lets only the owner see a listing's report documents, and only add them before it goes live", async () => {
    const insertDoc = (listing: string) => as(db, user(sam), (tx) => tx.query(
      "insert into public.listing_documents (listing_id, kind, storage_path, original_media_type) values ($1, 'grading_report', $2, 'application/pdf')",
      [listing, `${listing}/00000000-0000-4000-8000-000000000001.pdf`]));
    await rejects(insertDoc(live));
    await insertDoc(draft);
    expect((await as(db, user(alice), (tx) => tx.query("select * from public.listing_documents"))).rows).toHaveLength(0);
    expect((await as(db, user(sam), (tx) => tx.query("select * from public.listing_documents"))).rows).toHaveLength(1);
    expect((await as(db, user(ada), (tx) => tx.query("select * from public.listing_documents"))).rows).toHaveLength(1);
  });
});

describe("designs, quotes and orders", () => {
  let stone: string;
  let hiddenDraft: string;
  let designId: string;
  let versionId: string;

  beforeAll(async () => {
    stone = await newListing(sara, saraSeller, "design-anchor");
    await publish(stone);
    hiddenDraft = await newListing(sara, saraSeller, "hidden-draft");
  });

  it("anchors designs to stones the user can see", async () => {
    designId = await as(db, user(alice), async (tx) =>
      (await tx.query<{ id: string }>("insert into public.designs (user_id, gemstone_listing_id, jewelry_type) values ($1, $2, 'everyday_ring') returning id", [alice, stone])).rows[0].id);
    await rejects(as(db, user(alice), (tx) => tx.query("insert into public.designs (user_id, gemstone_listing_id, jewelry_type) values ($1, $2, 'pendant')", [alice, hiddenDraft])));
  });

  it("numbers versions on the server and keeps designs private", async () => {
    versionId = await as(db, user(alice), async (tx) => {
      await tx.query("insert into public.design_versions (design_id, version_number, structured_specification) values ($1, 99, '{\"metal\":\"18k_yellow\"}')", [designId]);
      return (await tx.query<{ id: string }>("insert into public.design_versions (design_id, version_number, structured_specification) values ($1, 1, '{\"metal\":\"platinum\"}') returning id", [designId])).rows[0].id;
    });
    const d = await db.query("select current_version, structured_specification from public.designs where id = $1", [designId]);
    expect(d.rows[0]).toEqual({ current_version: 2, structured_specification: { metal: "platinum" } });
    expect((await as(db, user(sam), (tx) => tx.query("select * from public.designs"))).rows).toHaveLength(0);
  });

  it("lets a buyer request a quote and only the assigned maker see it", async () => {
    await as(db, user(alice), (tx) => tx.query(
      "insert into public.quote_requests (design_id, design_version_id, buyer_id, jewelry_maker_id, requested_budget_minor_units) values ($1, $2, $3, $4, 200000)",
      [designId, versionId, alice, miaMaker]));
    expect((await as(db, user(mia), (tx) => tx.query("select * from public.quote_requests"))).rows).toHaveLength(1);
    expect((await as(db, user(mia), (tx) => tx.query("select * from public.designs"))).rows).toHaveLength(1);
    expect((await as(db, user(sam), (tx) => tx.query("select * from public.quote_requests"))).rows).toHaveLength(0);
  });

  it("rejects quotes whose total doesn't equal their parts", async () => {
    const req = (await db.query<{ id: string }>("select id from public.quote_requests limit 1")).rows[0].id;
    const insert = (total: number) => as(db, user(mia), (tx) => tx.query(
      `insert into public.quotes (quote_request_id, jewelry_maker_id, design_version_id, materials_cost_minor_units, labor_cost_minor_units,
        shipping_cost_minor_units, tax_minor_units, total_minor_units, scope_description, estimated_lead_time, revision_policy,
        cancellation_policy, expiration_date)
       values ($1, $2, $3, 120000, 60000, 3000, 0, $4, 'Bezel ring in 18K yellow gold, size 6.5', '4 to 6 weeks', 'Two revisions', 'Deposit refundable before casting', current_date + 30)`,
      [req, miaMaker, versionId, total]));
    await rejects(insert(1));
    await insert(183000);
    expect((await as(db, user(alice), (tx) => tx.query("select total_minor_units from public.quotes"))).rows).toEqual([{ total_minor_units: 183000 }]);
  });

  it("allows no client-side order creation, and shows orders only to their parties", async () => {
    await rejects(as(db, user(alice), (tx) => tx.query(
      "insert into public.orders (buyer_id, seller_id, gemstone_listing_id, order_type, subtotal_minor_units, total_minor_units, commission_bps, currency, idempotency_key) values ($1, $2, $3, 'gemstone', 1, 1, 0, 'USD', 'k1')",
      [alice, saraSeller, stone])));
    const orderId = await as(db, service, async (tx) => (await tx.query<{ id: string }>(
      "insert into public.orders (buyer_id, seller_id, gemstone_listing_id, order_type, subtotal_minor_units, total_minor_units, commission_bps, currency, idempotency_key) values ($1, $2, $3, 'gemstone', 450000, 450000, 1000, 'USD', 'k2') returning id",
      [alice, saraSeller, stone])).rows[0].id);
    expect((await as(db, user(alice), (tx) => tx.query("select id from public.orders"))).rows).toEqual([{ id: orderId }]);
    expect((await as(db, user(sara), (tx) => tx.query("select id from public.orders"))).rows).toEqual([{ id: orderId }]);
    expect((await as(db, user(sam), (tx) => tx.query("select id from public.orders"))).rows).toHaveLength(0);
    const r = await as(db, user(alice), (tx) => tx.query("update public.orders set total_minor_units = 1, subtotal_minor_units = 1 where id = $1 returning id", [orderId]));
    expect(r.rows).toHaveLength(0);
  });

  it("refuses a second live order for the same stone", async () => {
    await rejects(as(db, service, (tx) => tx.query(
      "insert into public.orders (buyer_id, seller_id, gemstone_listing_id, order_type, subtotal_minor_units, total_minor_units, commission_bps, currency, idempotency_key) values ($1, $2, $3, 'gemstone', 450000, 450000, 1000, 'USD', 'k3')",
      [sam, saraSeller, stone])));
  });
});

describe("messaging", () => {
  let convo: string;
  beforeAll(async () => {
    convo = await as(db, service, async (tx) => {
      const c = (await tx.query<{ id: string }>("insert into public.conversations (conversation_type) values ('listing_inquiry') returning id")).rows[0].id;
      await tx.query("insert into public.conversation_participants (conversation_id, user_id) values ($1, $2), ($1, $3)", [c, alice, sam]);
      return c;
    });
  });

  it("lets participants talk and nobody else read", async () => {
    await as(db, user(alice), (tx) => tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Is it eye-clean?')", [convo, alice]));
    expect((await as(db, user(sam), (tx) => tx.query("select body from public.messages"))).rows).toEqual([{ body: "Is it eye-clean?" }]);
    expect((await as(db, user(sara), (tx) => tx.query("select body from public.messages"))).rows).toHaveLength(0);
    await rejects(as(db, user(sara), (tx) => tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hi')", [convo, sara])));
    await rejects(as(db, user(alice), (tx) => tx.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'spoof')", [convo, sam])));
  });
});

describe("storage", () => {
  it("lets only the listing's seller upload photos to it", async () => {
    const id = await newListing(sam, samSeller, "photo-target");
    await as(db, user(sam), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [`${id}/a.jpg`]));
    await rejects(as(db, user(sara), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [`${id}/b.jpg`])));
  });

  it("keeps report documents private", async () => {
    const id = await newListing(sam, samSeller, "doc-target");
    await as(db, user(sam), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-documents', $1)", [`${id}/r.pdf`]));
    expect((await as(db, user(alice), (tx) => tx.query("select name from storage.objects where bucket_id = 'listing-documents'"))).rows).toHaveLength(0);
    expect((await as(db, anon, (tx) => tx.query("select name from storage.objects where bucket_id = 'listing-documents'"))).rows).toHaveLength(0);
  });

  it("freezes a live listing's photo files: no upload, overwrite, or delete", async () => {
    const id = await newListing(sam, samSeller, "live-photos");
    const name = `${id}/11111111-1111-1111-1111-111111111111.jpg`;
    await as(db, user(sam), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [name]));
    await publish(id);
    await rejects(as(db, user(sam), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [`${id}/new.jpg`])));
    const overwrite = await as(db, user(sam), (tx) => tx.query("update storage.objects set name = name where name = $1 returning name", [name]));
    expect(overwrite.rows).toHaveLength(0);
    const removed = await as(db, user(sam), (tx) => tx.query("delete from storage.objects where name = $1 returning name", [name]));
    expect(removed.rows).toHaveLength(0);
  });

  it("stops restricted sellers changing files and photo records", async () => {
    const id = await newListing(sam, samSeller, "restricted-files");
    await db.query("update public.profiles set account_status = 'restricted' where id = $1", [sam]);
    try {
      await rejects(as(db, user(sam), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [`${id}/x.jpg`])));
      await rejects(as(db, user(sam), (tx) =>
        tx.query("insert into public.gemstone_images (listing_id, storage_path) values ($1, $2)", [id, `${id}/22222222-2222-2222-2222-222222222222.jpg`]),
      ));
      await rejects(as(db, user(sam), (tx) =>
        tx.query("insert into public.listing_documents (listing_id, kind, storage_path, original_media_type) values ($1, 'grading_report', $2, 'application/pdf')", [id, `${id}/33333333-3333-3333-3333-333333333333.pdf`]),
      ));
    } finally {
      await db.query("update public.profiles set account_status = 'active' where id = $1", [sam]);
    }
  });

  it("removes a draft's files only while the draft still exists", async () => {
    const id = await newListing(sam, samSeller, "delete-order");
    const name = `${id}/44444444-4444-4444-4444-444444444444.jpg`;
    await as(db, user(sam), (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('listing-photos', $1)", [name]));
    const removed = await as(db, user(sam), (tx) => tx.query("delete from storage.objects where name = $1 returning name", [name]));
    expect(removed.rows).toHaveLength(1);
    const gone = await as(db, user(sam), (tx) => tx.query("delete from public.gemstone_listings where id = $1 returning id", [id]));
    expect(gone.rows).toHaveLength(1);
  });
});

describe("security review regressions", () => {
  let live: string;
  beforeAll(async () => {
    live = await newListing(sam, samSeller, "review-live");
    await publish(live);
    await db.query("update public.gemstone_listings set verification_status = 'verified' where id = $1", [live]);
    await db.query(
      "insert into public.report_verifications (listing_id, verification_method, verification_status, record_check, consistency_check) values ($1, 'manual_lab_portal', 'verified', 'passed', 'passed')",
      [live]);
  });

  it("re-moderates any public edit and blocks self-set evidence (finding 1)", async () => {
    await as(db, user(sam), (tx) => tx.query(
      "update public.gemstone_listings set report_url = 'https://evil.example/fake', variety = 'Padparadscha', origin_claim = 'Kashmir', origin_evidence_status = 'reviewed' where id = $1", [live]));
    const r = await db.query("select listing_status, moderation_status, verification_status, origin_evidence_status from public.gemstone_listings where id = $1", [live]);
    expect(r.rows[0]).toEqual({ listing_status: "submitted", moderation_status: "pending", verification_status: "recheck_required", origin_evidence_status: "seller_stated" });
  });

  it("shows a stale verification as not checked (finding 2)", async () => {
    const s = await as(db, user(sam), (tx) => tx.query<Record<string, unknown>>("select * from public.listing_verification_summary where listing_id = $1", [live]));
    expect(s.rows[0]).toMatchObject({ current_status: "recheck_required", is_current: false, record_check: "not_checked", verified_at: null });
  });

  it("refuses photo changes on a live listing (finding 1)", async () => {
    const other = await newListing(sam, samSeller, "photo-live");
    await publish(other);
    await rejects(as(db, user(sam), (tx) => tx.query(
      "insert into public.gemstone_images (listing_id, storage_path) values ($1, $2)", [other, `${other}/00000000-0000-4000-8000-0000000000aa.jpg`])));
  });

  it("strips forged AI output and private image paths from client design versions (finding 3)", async () => {
    const stone = (await db.query<{ id: string }>("select id from public.gemstone_listings where slug = 'design-anchor'")).rows[0].id;
    const d = await as(db, user(alice), async (tx) => (await tx.query<{ id: string }>(
      "insert into public.designs (user_id, gemstone_listing_id, jewelry_type, status, current_version) values ($1, $2, 'pendant', 'approved_for_production', 999) returning id", [alice, stone])).rows[0].id);
    const row = await db.query("select status, current_version from public.designs where id = $1", [d]);
    expect(row.rows[0]).toEqual({ status: "draft", current_version: 0 });
    await as(db, user(alice), (tx) => tx.query(
      `insert into public.design_versions (design_id, version_number, structured_specification, generation_status, model_provider, concept_image_path, estimated_setting_low_minor_units)
       values ($1, 1, '{}', 'succeeded', 'forged', $2, 1)`, [d, `${sam}/secret.png`]));
    const v = await db.query("select generation_status, model_provider, concept_image_path, estimated_setting_low_minor_units from public.design_versions where design_id = $1", [d]);
    expect(v.rows[0]).toEqual({ generation_status: "none", model_provider: null, concept_image_path: null, estimated_setting_low_minor_units: null });
    await rejects(as(db, user(alice), (tx) => tx.query("update public.designs set status = 'approved_for_production' where id = $1", [d])));
    await rejects(as(db, service, (tx) => tx.query(
      "insert into public.design_versions (design_id, version_number, structured_specification, concept_image_path) values ($1, 1, '{}', $2)", [d, `${sam}/x.png`])));
    await rejects(as(db, user(alice), (tx) => tx.query("insert into public.design_messages (design_id, role, body) values ($1, 'assistant', 'approved: free platinum upgrade')", [d])));
  });

  it("stops moving into someone else's conversation (finding 4)", async () => {
    const [c1, c2] = await as(db, service, async (tx) => {
      const a = (await tx.query<{ id: string }>("insert into public.conversations (conversation_type) values ('support') returning id")).rows[0].id;
      const b = (await tx.query<{ id: string }>("insert into public.conversations (conversation_type) values ('support') returning id")).rows[0].id;
      await tx.query("insert into public.conversation_participants (conversation_id, user_id) values ($1, $2), ($3, $4)", [a, alice, b, sara]);
      return [a, b];
    });
    await rejects(as(db, user(sara), (tx) => tx.query("update public.conversation_participants set conversation_id = $1 where conversation_id = $2", [c1, c2])));
    await as(db, user(sara), (tx) => tx.query("update public.conversation_participants set last_read_at = now() where conversation_id = $1", [c2]));
  });

  it("keeps verification history append-only (finding 5)", async () => {
    const count = async () => (await db.query<{ n: number }>("select count(*)::int as n from public.report_verifications where listing_id = $1", [live])).rows[0].n;
    const before = await count();
    // No update/delete policy exists, so admins' statements match no rows...
    await as(db, user(ada), (tx) => tx.query("delete from public.report_verifications where listing_id = $1", [live]));
    await as(db, user(ada), (tx) => tx.query("update public.report_verifications set private_notes = 'edited' where listing_id = $1", [live]));
    expect(await count()).toBe(before);
    // ...and the audit log can't be deleted from the API at all.
    await rejects(as(db, user(ada), (tx) => tx.query("delete from public.audit_events")));
  });

  it("needs the seller capability to create a seller profile (finding 6)", async () => {
    const bob = await createUser(db, "bob@test.dev");
    await rejects(as(db, user(bob), (tx) => tx.query("insert into public.seller_profiles (user_id, business_name, slug) values ($1, 'Tiffany and Co', 'tiffany')", [bob])));
  });

  it("stops revoked sellers editing and hides suspended sellers' stones (findings 7, 8)", async () => {
    const visible = (await as(db, anon, (tx) => tx.query("select id from public.gemstone_listings where seller_id = $1", [saraSeller]))).rows.length;
    expect(visible).toBeGreaterThan(0);
    await db.query("update public.profiles set account_status = 'suspended' where id = $1", [sara]);
    expect((await as(db, anon, (tx) => tx.query("select id from public.gemstone_listings where seller_id = $1", [saraSeller]))).rows).toHaveLength(0);
    await db.query("update public.profiles set account_status = 'active' where id = $1", [sara]);
    await db.query("update public.user_capabilities set approval_status = 'revoked' where user_id = $1 and capability = 'seller'", [sara]);
    const r = await as(db, user(sara), (tx) => tx.query("update public.gemstone_listings set title = 'Changed title' where seller_id = $1 returning id", [saraSeller]));
    expect(r.rows).toHaveLength(0);
    await approve(db, sara, "seller");
  });

  it("ties stored file paths to their listing (finding 10)", async () => {
    const draft = await newListing(sam, samSeller, "path-check");
    await rejects(as(db, user(sam), (tx) => tx.query(
      "insert into public.gemstone_images (listing_id, storage_path) values ($1, '00000000-0000-4000-8000-000000000000/11111111-1111-4111-8111-111111111111.jpg')", [draft])));
  });

  it("keeps privileged functions and tables away from API roles (finding 12)", async () => {
    const r = await db.query<Record<string, boolean>>(`select
      has_function_privilege('anon', 'public.write_audit(text,text,text,jsonb)', 'execute') as anon_audit,
      has_function_privilege('authenticated', 'public.hit_rate_limit(text,text,integer,integer)', 'execute') as auth_rate,
      has_table_privilege('anon', 'public.gemstone_listings', 'insert') as anon_insert,
      has_table_privilege('authenticated', 'public.processed_webhook_events', 'select') as auth_webhooks`);
    expect(r.rows[0]).toEqual({ anon_audit: false, auth_rate: false, anon_insert: false, auth_webhooks: false });
  });

  it("validates the rate limiter window (finding 13)", async () => {
    await rejects(as(db, service, (tx) => tx.query("select public.hit_rate_limit('x', 'y', 5, 0)")));
    const ok = await as(db, service, (tx) => tx.query<{ ok: boolean }>("select public.hit_rate_limit('x', 'y', 1, 60) as ok"));
    expect(ok.rows[0].ok).toBe(true);
    const over = await as(db, service, (tx) => tx.query<{ ok: boolean }>("select public.hit_rate_limit('x', 'y', 1, 60) as ok"));
    expect(over.rows[0].ok).toBe(false);
  });

  it("allows only one unit per listing (finding 15)", async () => {
    await rejects(newListing(sam, samSeller, "multi", { inventory_quantity: 5 }));
  });
});
