-- ATELIER GEM: core tables.
-- Money: bigint minor units + ISO currency. Carats/mm: numeric. JSONB only for flexible
-- structured data (design specs, checked attributes, notification payloads).

-- ---------------------------------------------------------------- accounts
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  avatar_path text,
  biography text check (char_length(biography) <= 2000),
  account_status public.account_status not null default 'active',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_capabilities (
  user_id uuid not null references public.profiles (id) on delete cascade,
  capability public.capability not null,
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, capability)
);

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete restrict,
  business_name text not null check (char_length(business_name) between 2 and 120),
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  seller_type public.seller_type not null default 'individual',
  contact_email text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text check (char_length(contact_phone) <= 40),
  -- Business location at city/region precision only.
  location_city text check (char_length(location_city) <= 80),
  location_region text check (char_length(location_region) <= 80),
  location_country char(2) check (location_country ~ '^[A-Z]{2}$'),
  shipping_policy text check (char_length(shipping_policy) <= 4000),
  return_policy text check (char_length(return_policy) <= 4000),
  verification_status public.party_verification_status not null default 'not_started',
  payout_account_reference text, -- payment provider account id; private
  payouts_enabled boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jewelry_maker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete restrict,
  business_name text not null check (char_length(business_name) between 2 and 120),
  biography text check (char_length(biography) <= 4000),
  capabilities text[] not null default '{}',
  materials text[] not null default '{}',
  services text[] not null default '{}',
  indicative_pricing text check (char_length(indicative_pricing) <= 2000),
  portfolio jsonb not null default '[]'::jsonb check (jsonb_typeof(portfolio) = 'array'),
  service_regions text[] not null default '{}',
  verification_status public.party_verification_status not null default 'pending',
  payout_account_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- listings
create table public.gemstone_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,120}$'),
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 6000),
  gemstone_type public.gemstone_type not null,
  variety text check (char_length(variety) <= 80),
  origin_claim text check (char_length(origin_claim) <= 120),
  origin_evidence_status public.evidence_status not null default 'none',
  natural_or_lab_grown public.origin_class not null default 'unknown',
  shape public.gem_shape not null,
  carat_weight numeric(8, 3) check (carat_weight > 0 and carat_weight <= 5000),
  length_mm numeric(6, 2) check (length_mm > 0 and length_mm <= 300),
  width_mm numeric(6, 2) check (width_mm > 0 and width_mm <= 300),
  depth_mm numeric(6, 2) check (depth_mm > 0 and depth_mm <= 300),
  color_description text check (char_length(color_description) <= 80),
  clarity_grade text check (char_length(clarity_grade) <= 40),
  cut_grade text check (char_length(cut_grade) <= 40),
  treatment_status public.treatment_status not null default 'unknown',
  treatment_description text check (char_length(treatment_description) <= 2000),
  disclosure_notes text check (char_length(disclosure_notes) <= 2000),
  grading_lab public.grading_lab not null default 'none',
  report_number text check (report_number ~ '^[A-Za-z0-9-]{4,30}$'),
  report_date date,
  report_url text check (report_url ~ '^https://'),
  asking_price_minor_units bigint not null check (asking_price_minor_units > 0 and asking_price_minor_units < 100000000000),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  inventory_quantity integer not null default 1 check (inventory_quantity between 0 and 1000),
  shipping_regions text[] not null default '{}',
  handling_days smallint check (handling_days between 0 and 60),
  return_policy text check (char_length(return_policy) <= 2000),
  ships_insured boolean not null default false,
  ships_tracked boolean not null default false,
  listing_status public.listing_status not null default 'draft',
  verification_status public.verification_status not null default 'not_submitted',
  moderation_status public.moderation_status not null default 'not_submitted',
  is_sample boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(variety, '') || ' ' || coalesce(color_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  -- A grading lab other than "none" needs a report number before submission (checked in app);
  -- a report number without a lab is never valid.
  constraint report_needs_lab check (report_number is null or grading_lab <> 'none'),
  constraint published_has_timestamp check (listing_status <> 'published' or published_at is not null)
);

create index gemstone_listings_discovery_idx on public.gemstone_listings (created_at desc, id desc)
  where listing_status in ('published', 'reserved', 'sold') and moderation_status = 'approved';
create index gemstone_listings_price_idx on public.gemstone_listings (asking_price_minor_units, id)
  where listing_status in ('published', 'reserved', 'sold') and moderation_status = 'approved';
create index gemstone_listings_carat_idx on public.gemstone_listings (carat_weight, id)
  where listing_status in ('published', 'reserved', 'sold') and moderation_status = 'approved';
create index gemstone_listings_type_shape_idx on public.gemstone_listings (gemstone_type, shape);
create index gemstone_listings_seller_idx on public.gemstone_listings (seller_id, listing_status);
create index gemstone_listings_report_idx on public.gemstone_listings (grading_lab, report_number) where report_number is not null;
create index gemstone_listings_verification_queue_idx on public.gemstone_listings (verification_status, updated_at)
  where verification_status in ('submitted', 'pending_review', 'recheck_required');
create index gemstone_listings_moderation_queue_idx on public.gemstone_listings (moderation_status, updated_at)
  where moderation_status = 'pending';
create index gemstone_listings_search_idx on public.gemstone_listings using gin (search_vector);

create table public.gemstone_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.gemstone_listings (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  caption text check (char_length(caption) <= 200),
  display_order smallint not null default 0 check (display_order between 0 and 50),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index gemstone_images_one_primary on public.gemstone_images (listing_id) where is_primary;
create index gemstone_images_listing_idx on public.gemstone_images (listing_id, display_order);

create table public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.gemstone_listings (id) on delete cascade,
  kind text not null check (kind in ('grading_report', 'origin_evidence', 'treatment_evidence', 'other')),
  storage_path text not null unique,
  original_media_type text not null check (original_media_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  created_at timestamptz not null default now()
);
create index listing_documents_listing_idx on public.listing_documents (listing_id);

-- ------------------------------------------------------------ verification
create table public.report_verifications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.gemstone_listings (id) on delete cascade,
  verification_method public.verification_method not null,
  verification_status public.verification_status not null,
  -- The three checks are recorded separately and never inferred from one another.
  record_check public.check_result not null default 'not_checked',
  consistency_check public.check_result not null default 'not_checked',
  physical_match_check public.check_result not null default 'not_checked',
  checked_attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(checked_attributes) = 'object'),
  discrepancies jsonb not null default '[]'::jsonb check (jsonb_typeof(discrepancies) = 'array'),
  reviewer_id uuid references public.profiles (id) on delete set null,
  private_notes text check (char_length(private_notes) <= 8000),
  evidence_path text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index report_verifications_listing_idx on public.report_verifications (listing_id, created_at desc);

-- ------------------------------------------------------------------ designs
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Restrict: a referenced stone can't be hard-deleted out from under a design.
  gemstone_listing_id uuid not null references public.gemstone_listings (id) on delete restrict,
  name text not null default 'Untitled design' check (char_length(name) between 1 and 120),
  jewelry_type text not null check (jewelry_type in ('engagement_ring', 'everyday_ring', 'pendant', 'necklace', 'earrings', 'bracelet', 'other')),
  structured_specification jsonb not null default '{}'::jsonb check (jsonb_typeof(structured_specification) = 'object'),
  budget_minor_units bigint check (budget_minor_units >= 0),
  currency char(3) not null default 'USD',
  current_version integer not null default 0 check (current_version >= 0),
  status public.design_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index designs_user_idx on public.designs (user_id, updated_at desc);
create index designs_listing_idx on public.designs (gemstone_listing_id);

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  structured_specification jsonb not null check (jsonb_typeof(structured_specification) = 'object'),
  prompt_summary text check (char_length(prompt_summary) <= 4000),
  concept_image_path text,
  generation_status public.generation_status not null default 'none',
  model_provider text,
  model_identifier text,
  prompt_version text,
  usage_metadata jsonb not null default '{}'::jsonb,
  estimated_setting_low_minor_units bigint,
  estimated_setting_high_minor_units bigint,
  created_at timestamptz not null default now(),
  unique (design_id, version_number)
);

create table public.design_messages (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index design_messages_design_idx on public.design_messages (design_id, created_at);

-- ------------------------------------------------------------------- quotes
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs (id) on delete restrict,
  design_version_id uuid not null references public.design_versions (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  jewelry_maker_id uuid not null references public.jewelry_maker_profiles (id) on delete restrict,
  request_status public.quote_request_status not null default 'open',
  requested_budget_minor_units bigint check (requested_budget_minor_units >= 0),
  currency char(3) not null default 'USD',
  buyer_notes text check (char_length(buyer_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (design_version_id, jewelry_maker_id)
);
create index quote_requests_buyer_idx on public.quote_requests (buyer_id, created_at desc);
create index quote_requests_maker_idx on public.quote_requests (jewelry_maker_id, request_status);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete restrict,
  jewelry_maker_id uuid not null references public.jewelry_maker_profiles (id) on delete restrict,
  design_version_id uuid not null references public.design_versions (id) on delete restrict,
  includes_gemstone boolean not null default false,
  gemstone_cost_minor_units bigint not null default 0 check (gemstone_cost_minor_units >= 0),
  materials_cost_minor_units bigint not null check (materials_cost_minor_units >= 0),
  labor_cost_minor_units bigint not null check (labor_cost_minor_units >= 0),
  additional_stones_minor_units bigint not null default 0 check (additional_stones_minor_units >= 0),
  shipping_cost_minor_units bigint not null default 0 check (shipping_cost_minor_units >= 0),
  tax_minor_units bigint not null default 0 check (tax_minor_units >= 0),
  total_minor_units bigint not null check (total_minor_units > 0),
  currency char(3) not null default 'USD',
  scope_description text not null check (char_length(scope_description) between 10 and 6000),
  metal_and_materials text check (char_length(metal_and_materials) <= 2000),
  estimated_lead_time text not null check (char_length(estimated_lead_time) <= 120),
  revision_policy text not null check (char_length(revision_policy) <= 2000),
  cancellation_policy text not null check (char_length(cancellation_policy) <= 2000),
  expiration_date date not null,
  status public.quote_status not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The total must equal its parts: no client-side arithmetic is trusted.
  constraint quote_total_matches check (
    total_minor_units = gemstone_cost_minor_units + materials_cost_minor_units + labor_cost_minor_units
      + additional_stones_minor_units + shipping_cost_minor_units + tax_minor_units
  ),
  constraint gemstone_cost_only_if_included check (includes_gemstone or gemstone_cost_minor_units = 0)
);
create index quotes_request_idx on public.quotes (quote_request_id);

-- ------------------------------------------------------------------- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid references public.seller_profiles (id) on delete restrict,
  jewelry_maker_id uuid references public.jewelry_maker_profiles (id) on delete restrict,
  gemstone_listing_id uuid references public.gemstone_listings (id) on delete restrict,
  quote_id uuid references public.quotes (id) on delete restrict,
  order_type public.order_type not null,
  subtotal_minor_units bigint not null check (subtotal_minor_units >= 0),
  shipping_minor_units bigint not null default 0 check (shipping_minor_units >= 0),
  tax_minor_units bigint not null default 0 check (tax_minor_units >= 0),
  commission_minor_units bigint not null default 0 check (commission_minor_units >= 0),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  total_minor_units bigint not null check (total_minor_units > 0),
  refunded_minor_units bigint not null default 0 check (refunded_minor_units >= 0),
  currency char(3) not null,
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'awaiting_payment',
  idempotency_key text not null unique,
  checkout_session_reference text unique,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_total_matches check (total_minor_units = subtotal_minor_units + shipping_minor_units + tax_minor_units),
  constraint order_refund_bounded check (refunded_minor_units <= total_minor_units),
  constraint order_shape check (
    (order_type = 'gemstone' and gemstone_listing_id is not null and seller_id is not null and quote_id is null)
    or (order_type = 'custom_piece' and quote_id is not null and jewelry_maker_id is not null)
  )
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);
create index orders_maker_idx on public.orders (jewelry_maker_id, created_at desc);
-- One live (non-failed, non-cancelled) gemstone order per stone: prevents double-selling.
create unique index orders_one_active_per_listing on public.orders (gemstone_listing_id)
  where order_type = 'gemstone' and payment_status not in ('failed', 'cancelled', 'refunded');

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_type text not null check (item_type in ('gemstone', 'custom_piece', 'shipping', 'tax')),
  gemstone_listing_id uuid references public.gemstone_listings (id) on delete restrict,
  quote_id uuid references public.quotes (id) on delete restrict,
  description_snapshot text not null check (char_length(description_snapshot) <= 1000),
  quantity integer not null default 1 check (quantity >= 1),
  unit_price_minor_units bigint not null check (unit_price_minor_units >= 0),
  total_minor_units bigint not null check (total_minor_units >= 0),
  constraint item_total_matches check (total_minor_units = unit_price_minor_units * quantity)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null,
  provider_payment_reference text not null,
  amount_minor_units bigint not null check (amount_minor_units >= 0),
  currency char(3) not null,
  status public.payment_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_reference)
);
create index payments_order_idx on public.payments (order_id);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.seller_profiles (id) on delete restrict,
  jewelry_maker_id uuid references public.jewelry_maker_profiles (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  provider_payout_reference text unique,
  gross_minor_units bigint not null check (gross_minor_units >= 0),
  fee_minor_units bigint not null check (fee_minor_units >= 0),
  commission_minor_units bigint not null default 0 check (commission_minor_units >= 0),
  refunded_minor_units bigint not null default 0 check (refunded_minor_units >= 0),
  net_minor_units bigint not null,
  currency char(3) not null,
  status public.payout_status not null default 'not_eligible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_party check (num_nonnulls(seller_id, jewelry_maker_id) = 1),
  constraint payout_net_matches check (net_minor_units = gross_minor_units - fee_minor_units - commission_minor_units - refunded_minor_units)
);
create index payouts_seller_idx on public.payouts (seller_id, created_at desc);

-- Webhook idempotency: each provider event is processed once.
create table public.processed_webhook_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  opened_by uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (char_length(reason) between 10 and 4000),
  status public.dispute_status not null default 'open',
  resolution_summary text check (char_length(resolution_summary) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index disputes_order_idx on public.disputes (order_id);
create index disputes_open_idx on public.disputes (status, created_at) where status not in ('closed', 'resolved_buyer', 'resolved_seller');

-- -------------------------------------------------- favorites & discovery
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  gemstone_listing_id uuid not null references public.gemstone_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, gemstone_listing_id)
);
create index favorites_listing_idx on public.favorites (gemstone_listing_id);

create table public.favorite_sellers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.seller_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, seller_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  query_string text not null check (char_length(query_string) <= 1000),
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.gemstone_listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.listing_report_reason not null,
  details text check (char_length(details) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

-- ---------------------------------------------------------------- messaging
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type public.conversation_type not null,
  gemstone_listing_id uuid references public.gemstone_listings (id) on delete set null,
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null check (char_length(notification_type) <= 60),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_orders boolean not null default true,
  email_quotes boolean not null default true,
  email_messages boolean not null default true,
  email_verification boolean not null default true,
  email_marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- audit
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  sanitized_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);
create index audit_events_created_idx on public.audit_events (created_at desc);

-- Simple fixed-window rate limiting shared by server actions (auth, messages, uploads, AI, checkout).
create table public.rate_limits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, subject, window_start)
);
