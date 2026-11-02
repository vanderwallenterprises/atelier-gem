-- Drafts are saved step by step, and the price is asked for near the end of the wizard.
-- A listing may be unpriced only while it is a draft; every other status needs a price.
alter table public.gemstone_listings alter column asking_price_minor_units drop not null;
alter table public.gemstone_listings add constraint priced_unless_draft
  check (listing_status = 'draft' or asking_price_minor_units is not null);

-- Buyers see the seller's extra disclosures (chips, repolishing...) on the stone page.
-- New columns can only be appended to a view with create or replace.
create or replace view public.listing_cards with (security_invoker = true) as
  select l.id, l.slug, l.title, l.gemstone_type, l.variety, l.natural_or_lab_grown, l.shape, l.carat_weight,
         l.length_mm, l.width_mm, l.depth_mm, l.color_description, l.clarity_grade, l.cut_grade,
         l.treatment_status, l.treatment_description, l.origin_claim, l.origin_evidence_status,
         l.grading_lab, l.report_number, l.report_date, l.report_url, l.asking_price_minor_units, l.currency,
         l.inventory_quantity, l.listing_status, l.verification_status, l.description, l.is_sample,
         l.shipping_regions, l.handling_days, l.return_policy, l.ships_insured, l.ships_tracked,
         l.created_at, l.published_at, l.search_vector, l.seller_id,
         jsonb_build_object('id', s.id, 'business_name', s.business_name, 'slug', s.slug) as seller,
         (select i.storage_path from public.gemstone_images i
           where i.listing_id = l.id and i.media_type = 'image'
           order by i.is_primary desc, i.display_order, i.created_at limit 1) as primary_image,
         l.disclosure_notes
  from public.gemstone_listings l
  join public.public_seller_profiles s on s.id = l.seller_id
  where public.listing_is_public(l);
