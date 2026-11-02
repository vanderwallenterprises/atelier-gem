-- ATELIER GEM: hardening after security review (2026-10-27).
-- Each section names the finding it closes.

-- ============================================================ shared rules
-- NOTE on is_backend(): it trusts current_user, which is correct inside SECURITY INVOKER
-- triggers (it sees the API role). Inside a SECURITY DEFINER function current_user is the
-- owner, so guards are bypassed there BY DESIGN for internal bookkeeping (e.g. version
-- numbering). Rule: never expose a SECURITY DEFINER function that writes user-controlled
-- data to anon/authenticated. Section 12 revokes EXECUTE on everything not needed by RLS.
create or replace function public.is_backend() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

alter function public.set_updated_at() set search_path = '';
alter function public.guard_profile_update() set search_path = '';
alter function public.guard_capability() set search_path = '';
alter function public.guard_seller_profile() set search_path = '';
alter function public.guard_maker_profile() set search_path = '';

-- created_at is never client-editable on any table.
create or replace function public.preserve_created_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  return new;
end $$;
do $$
declare t text;
begin
  for t in select c.table_name from information_schema.columns c
           join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
           where c.table_schema = 'public' and c.column_name = 'created_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('create trigger %I_keep_created_at before update on public.%I for each row execute function public.preserve_created_at()', t, t);
  end loop;
end $$;

-- ====================================== 8. seller must be active to be public
create or replace function public.seller_is_active(seller uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.seller_profiles s
    join public.profiles p on p.id = s.user_id
    join public.user_capabilities c on c.user_id = s.user_id and c.capability = 'seller'
    where s.id = seller and p.account_status = 'active' and c.approval_status = 'approved'
  );
$$;

create or replace function public.listing_is_public(l public.gemstone_listings) returns boolean
language sql stable set search_path = '' as $$
  select l.moderation_status = 'approved'
     and l.listing_status in ('published', 'reserved', 'sold')
     and public.seller_is_active(l.seller_id);
$$;

-- ============================ 1. listing guard: every public field is moderated
create or replace function public.guard_listing() returns trigger
language plpgsql set search_path = '' as $$
declare
  privileged boolean := public.is_backend() or public.is_admin();
  verification_changed boolean;
  content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.listing_status := 'draft';
      new.moderation_status := 'not_submitted';
      new.verification_status := 'not_submitted';
      new.is_sample := false;
      new.published_at := null;
      -- Sellers may only state an origin; documentation/review is set by the marketplace.
      new.origin_evidence_status := case when new.origin_claim is null then 'none' else 'seller_stated' end;
    end if;
    return new;
  end if;

  if new.seller_id is distinct from old.seller_id and not public.is_backend() then
    raise exception 'a listing cannot be moved to another seller' using errcode = '42501';
  end if;

  if not privileged then
    if new.moderation_status is distinct from old.moderation_status
       or new.verification_status is distinct from old.verification_status
       or new.is_sample is distinct from old.is_sample
       or new.published_at is distinct from old.published_at then
      raise exception 'moderation and verification are managed by the marketplace' using errcode = '42501';
    end if;
    if old.listing_status in ('reserved', 'sold') then
      raise exception 'reserved or sold listings cannot be edited' using errcode = '42501';
    end if;
    new.origin_evidence_status := case
      when new.origin_claim is null then 'none'
      when new.origin_claim is distinct from old.origin_claim then 'seller_stated'
      else old.origin_evidence_status end;
    if new.listing_status is distinct from old.listing_status then
      if not (
        (old.listing_status in ('draft', 'withdrawn') and new.listing_status = 'submitted')
        or (old.listing_status in ('submitted', 'published') and new.listing_status = 'withdrawn')
        or (old.listing_status in ('submitted', 'withdrawn') and new.listing_status = 'draft')
      ) then
        raise exception 'listing cannot move from % to %', old.listing_status, new.listing_status using errcode = '42501';
      end if;
      if new.listing_status = 'submitted' then
        new.moderation_status := 'pending';
        if new.grading_lab <> 'none' and new.report_number is not null
           and old.verification_status in ('not_submitted', 'rejected', 'unable_to_verify') then
          new.verification_status := 'submitted';
        end if;
      end if;
    end if;
  end if;

  -- Fields a report check depends on.
  verification_changed := new.report_number is distinct from old.report_number
    or new.grading_lab is distinct from old.grading_lab
    or new.report_date is distinct from old.report_date
    or new.report_url is distinct from old.report_url
    or new.carat_weight is distinct from old.carat_weight
    or new.length_mm is distinct from old.length_mm
    or new.width_mm is distinct from old.width_mm
    or new.depth_mm is distinct from old.depth_mm
    or new.shape is distinct from old.shape
    or new.color_description is distinct from old.color_description
    or new.clarity_grade is distinct from old.clarity_grade
    or new.cut_grade is distinct from old.cut_grade
    or new.gemstone_type is distinct from old.gemstone_type
    or new.variety is distinct from old.variety
    or new.natural_or_lab_grown is distinct from old.natural_or_lab_grown
    or new.treatment_status is distinct from old.treatment_status
    or new.treatment_description is distinct from old.treatment_description
    or new.origin_claim is distinct from old.origin_claim;
  -- Everything else buyers see. Price and currency may change without re-review.
  content_changed := verification_changed
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.disclosure_notes is distinct from old.disclosure_notes
    or new.slug is distinct from old.slug
    or new.shipping_regions is distinct from old.shipping_regions
    or new.handling_days is distinct from old.handling_days
    or new.return_policy is distinct from old.return_policy
    or new.ships_insured is distinct from old.ships_insured
    or new.ships_tracked is distinct from old.ships_tracked;

  if not privileged and verification_changed and old.verification_status in ('verified', 'submitted', 'pending_review') then
    new.verification_status := 'recheck_required';
  end if;
  if not privileged and content_changed and old.listing_status = 'published' then
    new.listing_status := 'submitted';
    new.moderation_status := 'pending';
  end if;

  if new.listing_status = 'published' and old.listing_status <> 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

-- Photos can only change while a listing is not live (withdraw, edit, resubmit).
drop policy images_owner_write on public.gemstone_images;
create policy images_owner_write on public.gemstone_images for all to authenticated
  using (exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()
                 and l.listing_status in ('draft', 'submitted', 'withdrawn')))
  with check (exists (select 1 from public.gemstone_listings l where l.id = listing_id and l.seller_id = public.my_seller_id()
                 and l.listing_status in ('draft', 'submitted', 'withdrawn')));

-- ================================ 6, 7. seller capability required for selling
drop policy sellers_insert on public.seller_profiles;
create policy sellers_insert on public.seller_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user() and public.has_capability('seller', approved_only => false));

drop policy listings_owner_update on public.gemstone_listings;
create policy listings_owner_update on public.gemstone_listings for update to authenticated
  using ((seller_id = public.my_seller_id() and public.is_active_user() and public.has_capability('seller', approved_only => false)) or public.is_admin())
  with check ((seller_id = public.my_seller_id() and public.is_active_user() and public.has_capability('seller', approved_only => false)) or public.is_admin());

create or replace view public.public_seller_profiles as
  select s.id, s.business_name, s.slug, s.seller_type, s.location_city, s.location_region, s.location_country,
         s.shipping_policy, s.return_policy, s.verification_status, s.created_at
  from public.seller_profiles s
  where public.seller_is_active(s.id);

-- Terms acceptance is stamped by the database, not supplied by the client.
create or replace function public.guard_seller_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_backend() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'not_started';
    new.payout_account_reference := null;
    new.payouts_enabled := false;
    new.terms_accepted_at := case when new.terms_version is not null then now() end;
  else
    if new.verification_status is distinct from old.verification_status
       or new.payout_account_reference is distinct from old.payout_account_reference
       or new.payouts_enabled is distinct from old.payouts_enabled
       or new.user_id is distinct from old.user_id then
      raise exception 'verification and payout fields are managed by the marketplace' using errcode = '42501';
    end if;
    if new.terms_version is distinct from old.terms_version then
      new.terms_accepted_at := case when new.terms_version is not null then now() end;
    else
      new.terms_accepted_at := old.terms_accepted_at;
    end if;
  end if;
  return new;
end $$;

-- =================================== 2. verification summary follows the listing
drop view public.listing_verification_summary;
create view public.listing_verification_summary as
  select distinct on (v.listing_id)
         v.listing_id,
         l.verification_status as current_status,
         -- A stale record (listing edited since) shows nothing as checked.
         (l.verification_status = v.verification_status) as is_current,
         case when l.verification_status = v.verification_status then v.verification_status end as verification_status,
         case when l.verification_status = v.verification_status then v.verification_method end as verification_method,
         case when l.verification_status = v.verification_status then v.record_check else 'not_checked' end as record_check,
         case when l.verification_status = v.verification_status then v.consistency_check else 'not_checked' end as consistency_check,
         case when l.verification_status = v.verification_status then v.physical_match_check else 'not_checked' end as physical_match_check,
         case when l.verification_status = v.verification_status then v.checked_attributes else '{}'::jsonb end as checked_attributes,
         case when l.verification_status = v.verification_status then v.discrepancies else '[]'::jsonb end as discrepancies,
         case when l.verification_status = v.verification_status then v.verified_at end as verified_at,
         v.expires_at, v.created_at
  from public.report_verifications v
  join public.gemstone_listings l on l.id = v.listing_id
  where public.listing_is_public(l) or l.seller_id = public.my_seller_id() or public.is_admin()
  order by v.listing_id, v.created_at desc;

-- ===================================== 5. verification history is append-only
drop policy verifications_admin on public.report_verifications;
create policy verifications_admin_select on public.report_verifications for select to authenticated
  using (public.is_admin());
create policy verifications_admin_insert on public.report_verifications for insert to authenticated
  with check (public.is_admin() and reviewer_id = auth.uid());

create or replace function public.forbid_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_backend() then
    raise exception '% records are append-only; record a new entry instead', tg_table_name using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger report_verifications_append_only before update or delete on public.report_verifications
  for each row execute function public.forbid_change();
create trigger audit_events_append_only before update or delete on public.audit_events
  for each row execute function public.forbid_change();

-- =========================== 3. design outputs are written by the backend only
create or replace function public.guard_design() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_backend() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.current_version := 0;
    return new;
  end if;
  if new.current_version is distinct from old.current_version then
    raise exception 'design versions are numbered by the server' using errcode = '42501';
  end if;
  if new.gemstone_listing_id is distinct from old.gemstone_listing_id then
    raise exception 'a design stays anchored to its stone; start a new design for another stone' using errcode = '42501';
  end if;
  -- Owners can move between working states and archive; quote/production states are server-driven.
  if new.status is distinct from old.status
     and not (new.status in ('draft', 'awaiting_review', 'archived') and old.status in ('draft', 'concept_ready', 'awaiting_review', 'archived')) then
    raise exception 'design cannot move from % to %', old.status, new.status using errcode = '42501';
  end if;
  return new;
end $$;
create trigger designs_guard before insert or update on public.designs
  for each row execute function public.guard_design();

create or replace function public.guard_design_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_backend() then
    new.concept_image_path := null;
    new.generation_status := 'none';
    new.model_provider := null;
    new.model_identifier := null;
    new.prompt_version := null;
    new.usage_metadata := '{}'::jsonb;
    new.estimated_setting_low_minor_units := null;
    new.estimated_setting_high_minor_units := null;
  end if;
  return new;
end $$;
-- Runs before the numbering trigger (alphabetical: design_versions_a_guard < design_versions_number).
create trigger design_versions_a_guard before insert on public.design_versions
  for each row execute function public.guard_design_version();

-- Concept images must live under the design owner's folder.
create or replace function public.check_concept_path() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.concept_image_path is not null and split_part(new.concept_image_path, '/', 1) <>
     (select d.user_id::text from public.designs d where d.id = new.design_id) then
    raise exception 'concept image path must belong to the design owner' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger design_versions_b_path before insert or update on public.design_versions
  for each row execute function public.check_concept_path();

-- 14. lock the design row while numbering to avoid duplicate version numbers.
create or replace function public.next_design_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.designs where id = new.design_id for update;
  select coalesce(max(v.version_number), 0) + 1 into new.version_number
  from public.design_versions v where v.design_id = new.design_id;
  update public.designs set current_version = new.version_number, structured_specification = new.structured_specification
  where id = new.design_id;
  return new;
end $$;

-- 18. clients may only add their own side of the studio conversation.
drop policy design_messages_owner on public.design_messages;
create policy design_messages_owner_select on public.design_messages for select to authenticated
  using (exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid()));
create policy design_messages_owner_insert on public.design_messages for insert to authenticated
  with check (role = 'user' and exists (select 1 from public.designs d where d.id = design_id and d.user_id = auth.uid()));

-- ============================== 4. column-level update privileges where needed
revoke update on public.conversation_participants from authenticated;
grant update (last_read_at) on public.conversation_participants to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, biography, onboarding_completed_at, account_status) on public.profiles to authenticated;

-- ============================================ 10. storage paths tied to listings
alter table public.gemstone_images drop constraint gemstone_images_storage_path_check;
alter table public.gemstone_images drop constraint gemstone_images_media_type_check;
alter table public.gemstone_images add constraint gemstone_images_path_format
  check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$');
alter table public.gemstone_images add constraint gemstone_images_path_owner
  check (split_part(storage_path, '/', 1) = listing_id::text);
alter table public.gemstone_images add constraint gemstone_images_media_type
  check ((media_type = 'image' and storage_path ~ '\.(jpg|png|webp)$') or (media_type = 'video' and storage_path ~ '\.(mp4|webm)$'));
alter table public.listing_documents add constraint listing_documents_path_format
  check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$' and split_part(storage_path, '/', 1) = listing_id::text);
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
  file_size_limit = 52428800 where id = 'listing-photos';

-- ============================== 9. storage select/update for owners (remove/upsert)
create policy "listing photos: seller read own" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and public.storage_owner_listing(name));
create policy "listing photos: seller update" on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and public.storage_owner_listing(name))
  with check (bucket_id = 'listing-photos' and public.storage_owner_listing(name));
create policy "design assets: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'design-assets' and split_part(name, '/', 1) = auth.uid()::text);
create policy "avatars: owner read own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy "avatars: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

-- =============================================== 15. one unique stone per listing
alter table public.gemstone_listings drop constraint gemstone_listings_inventory_quantity_check;
alter table public.gemstone_listings add constraint gemstone_listings_inventory_quantity_check
  check (inventory_quantity between 0 and 1);

-- ==================================================== 16. quote flow tightened
drop policy quotes_maker_insert on public.quotes;
create policy quotes_maker_insert on public.quotes for insert to authenticated
  with check (
    jewelry_maker_id = public.my_maker_id() and public.is_active_user()
    and public.maker_is_verified(jewelry_maker_id)
    and status in ('draft', 'sent')
    and expiration_date >= current_date
    and exists (
      select 1 from public.quote_requests qr
      where qr.id = quote_request_id and qr.jewelry_maker_id = public.my_maker_id()
        and qr.design_version_id = quotes.design_version_id and qr.request_status in ('open', 'questions')
        and qr.currency = quotes.currency
    )
  );
-- A draft can be edited and sent; once sent it is immutable (changes = a new quote).
create policy quotes_maker_update_draft on public.quotes for update to authenticated
  using (jewelry_maker_id = public.my_maker_id() and status = 'draft' and public.maker_is_verified(jewelry_maker_id))
  with check (jewelry_maker_id = public.my_maker_id() and status in ('draft', 'sent') and expiration_date >= current_date);

-- =================================================== 18. currency format checks
alter table public.designs add constraint designs_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.quote_requests add constraint quote_requests_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.quotes add constraint quotes_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.orders add constraint orders_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.payments add constraint payments_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.payouts add constraint payouts_currency_format check (currency ~ '^[A-Z]{3}$');
comment on column public.payouts.net_minor_units is
  'May be negative when refunds or chargebacks exceed the gross (a clawback owed by the seller).';

-- ========================================================= 13. rate limiter
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
create or replace function public.hit_rate_limit(p_bucket text, p_subject text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz;
  n integer;
begin
  if p_window_seconds is null or p_window_seconds <= 0 or p_limit is null or p_limit < 0 then
    raise exception 'invalid rate limit window or limit' using errcode = '22023';
  end if;
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (bucket, subject, window_start, hits) values (p_bucket, p_subject, w, 1)
  on conflict (bucket, subject, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  -- Only this subject's expired windows; a scheduled job purges the rest.
  delete from public.rate_limits where bucket = p_bucket and subject = p_subject and window_start < w;
  return n <= p_limit;
end $$;

-- ============================================ 17. foreign-key indexes
create index if not exists payouts_maker_idx on public.payouts (jewelry_maker_id);
create index if not exists payouts_order_idx on public.payouts (order_id);
create index if not exists orders_listing_idx on public.orders (gemstone_listing_id);
create index if not exists orders_quote_idx on public.orders (quote_id);
create index if not exists quotes_maker_idx on public.quotes (jewelry_maker_id);
create index if not exists order_items_listing_idx on public.order_items (gemstone_listing_id);
create index if not exists order_items_quote_idx on public.order_items (quote_id);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists disputes_opener_idx on public.disputes (opened_by);
create index if not exists listing_reports_reporter_idx on public.listing_reports (reporter_id);
create index if not exists favorite_sellers_seller_idx on public.favorite_sellers (seller_id);
create index if not exists report_verifications_reviewer_idx on public.report_verifications (reviewer_id);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id);
create index if not exists conversations_order_idx on public.conversations (order_id);

-- ============================== 12. least privilege for API roles (hosted defaults)
-- Supabase grants anon ALL on new tables and EXECUTE on new functions by default.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
-- Helpers that RLS policies and views evaluate as the caller (read-only, caller-scoped).
grant execute on function
  public.is_backend(), public.is_active_user(), public.is_admin(), public.my_seller_id(), public.my_maker_id(),
  public.has_capability(public.capability, boolean), public.is_conversation_participant(uuid),
  public.listing_is_public(public.gemstone_listings), public.seller_is_active(uuid), public.maker_is_verified(uuid),
  public.storage_owner_listing(text)
  to anon, authenticated;
grant execute on all functions in schema public to service_role;

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke all on public.processed_webhook_events, public.rate_limits from anon, authenticated;
revoke insert, update, delete, truncate on public.audit_events from anon, authenticated;
grant select on public.public_seller_profiles, public.public_maker_profiles, public.listing_cards,
  public.listing_verification_summary to anon, authenticated;
