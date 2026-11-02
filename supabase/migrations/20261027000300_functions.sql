-- ATELIER GEM: helper functions, guards and audit triggers.
-- Helpers are SECURITY DEFINER with a fixed search_path so RLS policies can call them
-- without recursion and without being hijacked by objects in other schemas.

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_capabilities', 'seller_profiles', 'jewelry_maker_profiles', 'gemstone_listings',
    'designs', 'quote_requests', 'quotes', 'orders', 'payments', 'payouts', 'disputes', 'conversations'
  ] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- True for the backend (service role) and database owners; never for browser sessions.
create or replace function public.is_backend() returns boolean
language sql stable as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.account_status = 'active'
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.user_capabilities c
    join public.profiles p on p.id = c.user_id
    where c.user_id = auth.uid()
      and c.capability = 'admin'
      and c.approval_status = 'approved'
      and p.account_status = 'active'
  );
$$;

create or replace function public.my_seller_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.seller_profiles s where s.user_id = auth.uid();
$$;

create or replace function public.my_maker_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.jewelry_maker_profiles m where m.user_id = auth.uid();
$$;

create or replace function public.has_capability(cap public.capability, approved_only boolean default true) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_capabilities c
    where c.user_id = auth.uid() and c.capability = cap
      and (c.approval_status = 'approved' or (not approved_only and c.approval_status = 'pending'))
  );
$$;

create or replace function public.is_conversation_participant(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_participants cp where cp.conversation_id = cid and cp.user_id = auth.uid()
  );
$$;

-- Lets buyers check a maker is verified without being able to read maker profiles.
create or replace function public.maker_is_verified(maker uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jewelry_maker_profiles m join public.profiles p on p.id = m.user_id
    where m.id = maker and m.verification_status = 'verified' and p.account_status = 'active'
  );
$$;

/** Public visibility rule for listings, shared by policies and views. */
create or replace function public.listing_is_public(l public.gemstone_listings) returns boolean
language sql immutable as $$
  select l.moderation_status = 'approved' and l.listing_status in ('published', 'reserved', 'sold');
$$;

-- ------------------------------------------------------------- audit log
-- Only the backend (service role) and the SECURITY DEFINER audit triggers below can write
-- audit events; browser sessions can neither call this nor insert into audit_events.
create or replace function public.write_audit(entity text, entity_id text, action text, meta jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_events (actor_id, entity_type, entity_id, action, sanitized_metadata)
  values (auth.uid(), entity, entity_id, action, coalesce(meta, '{}'::jsonb));
$$;
revoke all on function public.write_audit(text, text, text, jsonb) from public;

-- ------------------------------------------------------- new user profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), ''));
  -- Every account can buy and design; selling and making need onboarding + approval.
  insert into public.user_capabilities (user_id, capability, approval_status)
  values (new.id, 'buyer', 'approved'), (new.id, 'designer', 'approved');
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- guards
create or replace function public.guard_profile_update() returns trigger
language plpgsql as $$
begin
  if not (public.is_backend() or public.is_admin()) and new.account_status is distinct from old.account_status then
    raise exception 'account status can only be changed by an administrator' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_capability() returns trigger
language plpgsql as $$
begin
  if public.is_backend() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'capabilities can only be changed by an administrator' using errcode = '42501';
  end if;
  if new.capability = 'admin' then
    raise exception 'admin capability cannot be self-assigned' using errcode = '42501';
  end if;
  -- Self-service requests: buyer/designer are immediate, seller/maker await approval.
  new.approval_status := case when new.capability in ('buyer', 'designer') then 'approved' else 'pending' end;
  return new;
end $$;
create trigger user_capabilities_guard before insert or update on public.user_capabilities
  for each row execute function public.guard_capability();

create or replace function public.guard_seller_profile() returns trigger
language plpgsql as $$
begin
  if public.is_backend() or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'not_started';
    new.payout_account_reference := null;
    new.payouts_enabled := false;
  elsif new.verification_status is distinct from old.verification_status
     or new.payout_account_reference is distinct from old.payout_account_reference
     or new.payouts_enabled is distinct from old.payouts_enabled
     or new.user_id is distinct from old.user_id then
    raise exception 'verification and payout fields are managed by the marketplace' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger seller_profiles_guard before insert or update on public.seller_profiles
  for each row execute function public.guard_seller_profile();

create or replace function public.guard_maker_profile() returns trigger
language plpgsql as $$
begin
  if public.is_backend() or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.payout_account_reference := null;
  elsif new.verification_status is distinct from old.verification_status
     or new.payout_account_reference is distinct from old.payout_account_reference
     or new.user_id is distinct from old.user_id then
    raise exception 'verification and payout fields are managed by the marketplace' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger maker_profiles_guard before insert or update on public.jewelry_maker_profiles
  for each row execute function public.guard_maker_profile();

/**
 * Sellers control their listing's content and can submit or withdraw it. Publication,
 * moderation, verification outcomes and sample flags belong to the marketplace.
 */
create or replace function public.guard_listing() returns trigger
language plpgsql as $$
declare
  privileged boolean := public.is_backend() or public.is_admin();
  spec_changed boolean;
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.listing_status := 'draft';
      new.moderation_status := 'not_submitted';
      new.verification_status := 'not_submitted';
      new.is_sample := false;
      new.published_at := null;
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

  -- Material edits to report or physical details invalidate an earlier verification.
  spec_changed := new.report_number is distinct from old.report_number
    or new.grading_lab is distinct from old.grading_lab
    or new.carat_weight is distinct from old.carat_weight
    or new.length_mm is distinct from old.length_mm
    or new.width_mm is distinct from old.width_mm
    or new.depth_mm is distinct from old.depth_mm
    or new.color_description is distinct from old.color_description
    or new.clarity_grade is distinct from old.clarity_grade
    or new.gemstone_type is distinct from old.gemstone_type
    or new.natural_or_lab_grown is distinct from old.natural_or_lab_grown
    or new.treatment_status is distinct from old.treatment_status;
  if spec_changed and not privileged and old.verification_status = 'verified' then
    new.verification_status := 'recheck_required';
  end if;
  -- Editing a live listing's content sends it back through moderation.
  if spec_changed and not privileged and old.listing_status = 'published' then
    new.listing_status := 'submitted';
    new.moderation_status := 'pending';
  end if;

  if new.listing_status = 'published' and old.listing_status <> 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end $$;
create trigger gemstone_listings_guard before insert or update on public.gemstone_listings
  for each row execute function public.guard_listing();

-- Design versions: server assigns the number and keeps designs.current_version in step.
create or replace function public.next_design_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(max(v.version_number), 0) + 1 into new.version_number
  from public.design_versions v where v.design_id = new.design_id;
  update public.designs set current_version = new.version_number, structured_specification = new.structured_specification
  where id = new.design_id;
  return new;
end $$;
create trigger design_versions_number before insert on public.design_versions
  for each row execute function public.next_design_version();

create or replace function public.audit_order_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_status is distinct from old.payment_status
     or new.refunded_minor_units is distinct from old.refunded_minor_units
     or new.fulfillment_status is distinct from old.fulfillment_status then
    perform public.write_audit('order', new.id::text, 'status_changed', jsonb_build_object(
      'payment_status', jsonb_build_array(old.payment_status, new.payment_status),
      'fulfillment_status', jsonb_build_array(old.fulfillment_status, new.fulfillment_status),
      'refunded_minor_units', jsonb_build_array(old.refunded_minor_units, new.refunded_minor_units)));
  end if;
  return new;
end $$;
create trigger orders_audit after update on public.orders
  for each row execute function public.audit_order_change();

create or replace function public.audit_dispute_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform public.write_audit('dispute', new.id::text, 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger disputes_audit after update on public.disputes
  for each row execute function public.audit_dispute_change();

create or replace function public.audit_verification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.write_audit('report_verification', new.listing_id::text, 'verification_recorded', jsonb_build_object(
    'status', new.verification_status, 'method', new.verification_method,
    'record_check', new.record_check, 'consistency_check', new.consistency_check,
    'physical_match_check', new.physical_match_check));
  return new;
end $$;
create trigger report_verifications_audit after insert on public.report_verifications
  for each row execute function public.audit_verification();

create or replace function public.audit_listing_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.listing_status is distinct from old.listing_status
     or new.moderation_status is distinct from old.moderation_status
     or new.verification_status is distinct from old.verification_status then
    perform public.write_audit('gemstone_listing', new.id::text, 'status_changed', jsonb_build_object(
      'listing_status', jsonb_build_array(old.listing_status, new.listing_status),
      'moderation_status', jsonb_build_array(old.moderation_status, new.moderation_status),
      'verification_status', jsonb_build_array(old.verification_status, new.verification_status)));
  end if;
  return new;
end $$;
create trigger gemstone_listings_audit after update on public.gemstone_listings
  for each row execute function public.audit_listing_change();

create or replace function public.audit_profile_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.account_status is distinct from old.account_status then
    perform public.write_audit('profile', new.id::text, 'account_status_changed',
      jsonb_build_object('from', old.account_status, 'to', new.account_status));
  end if;
  return new;
end $$;
create trigger profiles_audit after update on public.profiles
  for each row execute function public.audit_profile_change();

create or replace function public.audit_capability_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.approval_status is distinct from old.approval_status then
    perform public.write_audit('capability', new.user_id::text || ':' || new.capability::text, 'approval_changed',
      jsonb_build_object('from', old.approval_status, 'to', new.approval_status));
  end if;
  return new;
end $$;
create trigger user_capabilities_audit after update on public.user_capabilities
  for each row execute function public.audit_capability_change();

create or replace function public.audit_seller_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_status is distinct from old.verification_status then
    perform public.write_audit('seller_profile', new.id::text, 'verification_changed',
      jsonb_build_object('from', old.verification_status, 'to', new.verification_status));
  end if;
  return new;
end $$;
create trigger seller_profiles_audit after update on public.seller_profiles
  for each row execute function public.audit_seller_change();

-- Rate limit: returns true if the call is allowed (fixed window).
create or replace function public.hit_rate_limit(p_bucket text, p_subject text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits (bucket, subject, window_start, hits) values (p_bucket, p_subject, w, 1)
  on conflict (bucket, subject, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return n <= p_limit;
end $$;
revoke all on function public.hit_rate_limit(text, text, integer, integer) from public;
