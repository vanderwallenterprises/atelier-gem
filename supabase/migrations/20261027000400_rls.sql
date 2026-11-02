-- ATELIER GEM: row level security.
-- Default is deny: every table has RLS on, and a missing policy means no access for
-- browser sessions (anon/authenticated). The backend uses the service role, which bypasses
-- RLS, only inside server-side services that perform their own authorization checks.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_capabilities', 'seller_profiles', 'jewelry_maker_profiles', 'gemstone_listings',
    'gemstone_images', 'listing_documents', 'report_verifications', 'designs', 'design_versions',
    'design_messages', 'quote_requests', 'quotes', 'orders', 'order_items', 'payments', 'payouts',
    'processed_webhook_events', 'disputes', 'favorites', 'favorite_sellers', 'saved_searches',
    'listing_reports', 'conversations', 'conversation_participants', 'messages', 'notifications',
    'notification_preferences', 'audit_events', 'rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ------------------------------------------------------------- accounts
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy capabilities_select on public.user_capabilities for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy capabilities_insert on public.user_capabilities for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());
create policy capabilities_admin_update on public.user_capabilities for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sellers_select on public.seller_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy sellers_insert on public.seller_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());
create policy sellers_update on public.seller_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy makers_select on public.jewelry_maker_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy makers_insert on public.jewelry_maker_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());
create policy makers_update on public.jewelry_maker_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------- listings
create policy listings_public_select on public.gemstone_listings for select to anon, authenticated
  using (public.listing_is_public(gemstone_listings));
create policy listings_owner_select on public.gemstone_listings for select to authenticated
  using (seller_id = public.my_seller_id() or public.is_admin());
create policy listings_owner_insert on public.gemstone_listings for insert to authenticated
  with check (
    seller_id = public.my_seller_id() and public.is_active_user()
    and public.has_capability('seller', approved_only => false)
  );
create policy listings_owner_update on public.gemstone_listings for update to authenticated
  using ((seller_id = public.my_seller_id() and public.is_active_user()) or public.is_admin())
  with check ((seller_id = public.my_seller_id() and public.is_active_user()) or public.is_admin());
create policy listings_owner_delete on public.gemstone_listings for delete to authenticated
  using (seller_id = public.my_seller_id() and listing_status = 'draft');

-- Images follow their listing's visibility (subquery runs under the caller's RLS).
create policy images_select on public.gemstone_images for select to anon, authenticated
  using (exists (select 1 from public.gemstone_listings l where l.id = listing_id));
create policy images_owner_write on public.gemstone_images for all to authenticated
  using (exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()
                 and l.listing_status in ('draft', 'submitted', 'published', 'withdrawn')))
  with check (exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()
                 and l.listing_status in ('draft', 'submitted', 'published', 'withdrawn')));

create policy documents_owner_select on public.listing_documents for select to authenticated
  using (public.is_admin() or exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()));
create policy documents_owner_insert on public.listing_documents for insert to authenticated
  with check (exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()));
create policy documents_owner_delete on public.listing_documents for delete to authenticated
  using (exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()
                 and l.listing_status in ('draft', 'withdrawn')));

-- Verification records hold private reviewer notes: administrators only.
-- Sellers and buyers read the public summary view instead.
create policy verifications_admin on public.report_verifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and reviewer_id = auth.uid());

-- -------------------------------------------------------------- designs
create policy designs_owner on public.designs for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and public.is_active_user()
    -- The anchor stone must be one the user can see.
    and exists (select 1 from public.gemstone_listings l where l.id = gemstone_listing_id)
  );
create policy designs_maker_select on public.designs for select to authenticated
  using (exists (select 1 from public.quote_requests qr where qr.design_id = designs.id and qr.jewelry_maker_id = public.my_maker_id()));
create policy designs_admin_select on public.designs for select to authenticated using (public.is_admin());

create policy design_versions_owner on public.design_versions for select to authenticated
  using (exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid()));
create policy design_versions_owner_insert on public.design_versions for insert to authenticated
  with check (exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid()));
create policy design_versions_maker_select on public.design_versions for select to authenticated
  using (exists (select 1 from public.quote_requests qr where qr.design_version_id = design_versions.id and qr.jewelry_maker_id = public.my_maker_id()));

create policy design_messages_owner on public.design_messages for all to authenticated
  using (exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid()));

-- --------------------------------------------------------------- quotes
create policy quote_requests_select on public.quote_requests for select to authenticated
  using (buyer_id = auth.uid() or jewelry_maker_id = public.my_maker_id() or public.is_admin());
create policy quote_requests_buyer_insert on public.quote_requests for insert to authenticated
  with check (
    buyer_id = auth.uid() and public.is_active_user()
    and request_status = 'open'
    and exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid())
    and exists (select 1 from public.design_versions v where v.id = design_version_id and v.design_id = quote_requests.design_id)
    and public.maker_is_verified(jewelry_maker_id)
  );

create policy quotes_select on public.quotes for select to authenticated
  using (
    jewelry_maker_id = public.my_maker_id() or public.is_admin()
    or exists (select 1 from public.quote_requests qr where qr.id = quote_request_id and qr.buyer_id = auth.uid() and quotes.status <> 'draft')
  );
create policy quotes_maker_insert on public.quotes for insert to authenticated
  with check (
    jewelry_maker_id = public.my_maker_id() and public.is_active_user()
    and status in ('draft', 'sent')
    and exists (
      select 1 from public.quote_requests qr
      where qr.id = quote_request_id and qr.jewelry_maker_id = public.my_maker_id()
        and qr.design_version_id = quotes.design_version_id and qr.request_status in ('open', 'questions')
    )
  );

-- ------------------------------------------------- orders and payments
-- No client writes: orders, payments and payouts are created by CheckoutService and the
-- verified payment webhook only, so prices and payout amounts can't be tampered with.
create policy orders_select on public.orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = public.my_seller_id() or jewelry_maker_id = public.my_maker_id() or public.is_admin());
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy payments_select on public.payments for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy payouts_select on public.payouts for select to authenticated
  using (seller_id = public.my_seller_id() or jewelry_maker_id = public.my_maker_id() or public.is_admin());

create policy disputes_select on public.disputes for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id
         and (o.buyer_id = auth.uid() or o.seller_id = public.my_seller_id() or o.jewelry_maker_id = public.my_maker_id())));
create policy disputes_insert on public.disputes for insert to authenticated
  with check (
    opened_by = auth.uid() and status = 'open'
    and exists (select 1 from public.orders o where o.id = order_id
                and (o.buyer_id = auth.uid() or o.seller_id = public.my_seller_id() or o.jewelry_maker_id = public.my_maker_id()))
  );
create policy disputes_admin_update on public.disputes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------- personal lists
create policy favorites_owner on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorite_sellers_owner on public.favorite_sellers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_searches_owner on public.saved_searches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy listing_reports_insert on public.listing_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());
create policy listing_reports_select on public.listing_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy listing_reports_admin_update on public.listing_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ messaging
-- Conversations and participants are created by MessagingService (it has to add the
-- other party). Clients can read and post only where they participate.
create policy conversations_select on public.conversations for select to authenticated
  using (public.is_conversation_participant(id) or public.is_admin());
create policy participants_select on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id) or public.is_admin());
create policy participants_mark_read on public.conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_select on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id) or public.is_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_active_user() and public.is_conversation_participant(conversation_id));

create policy notifications_owner_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_prefs_owner on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_admin_select on public.audit_events for select to authenticated using (public.is_admin());

-- processed_webhook_events and rate_limits: no policies (backend only).

-- ---------------------------------------------------------------- views
-- Public seller identity: safe columns only, active accounts only.
create view public.public_seller_profiles as
  select s.id, s.business_name, s.slug, s.seller_type, s.location_city, s.location_region, s.location_country,
         s.shipping_policy, s.return_policy, s.verification_status, s.created_at
  from public.seller_profiles s
  join public.profiles p on p.id = s.user_id
  where p.account_status = 'active';

create view public.public_maker_profiles as
  select m.id, m.business_name, m.biography, m.capabilities, m.materials, m.services, m.indicative_pricing,
         m.portfolio, m.service_regions, m.created_at
  from public.jewelry_maker_profiles m
  join public.profiles p on p.id = m.user_id
  where p.account_status = 'active' and m.verification_status = 'verified';

-- Listing cards for discovery. security_invoker: the caller's RLS on gemstone_listings applies.
create view public.listing_cards with (security_invoker = true) as
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
           order by i.is_primary desc, i.display_order, i.created_at limit 1) as primary_image
  from public.gemstone_listings l
  join public.public_seller_profiles s on s.id = l.seller_id
  where public.listing_is_public(l);

-- What has been checked, without reviewer identity, notes or evidence paths.
create view public.listing_verification_summary as
  select distinct on (v.listing_id)
         v.listing_id, v.verification_status, v.verification_method, v.record_check, v.consistency_check,
         v.physical_match_check, v.checked_attributes, v.discrepancies, v.verified_at, v.expires_at, v.created_at
  from public.report_verifications v
  join public.gemstone_listings l on l.id = v.listing_id
  where public.listing_is_public(l) or l.seller_id = public.my_seller_id() or public.is_admin()
  order by v.listing_id, v.created_at desc;

grant select on public.public_seller_profiles, public.public_maker_profiles, public.listing_cards,
  public.listing_verification_summary to anon, authenticated;

-- Explicit privileges (don't rely on platform defaults). RLS decides which rows.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on public.gemstone_listings, public.gemstone_images to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Browser roles never call these directly.
revoke all on function public.hit_rate_limit(text, text, integer, integer) from anon, authenticated;
revoke all on function public.write_audit(text, text, text, jsonb) from anon, authenticated;
grant execute on function public.write_audit(text, text, text, jsonb) to service_role;
grant execute on function public.hit_rate_limit(text, text, integer, integer) to service_role;
