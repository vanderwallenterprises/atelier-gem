-- ATELIER GEM: enumerated types.
-- Keys match src/lib/domain/*.ts. Adding a value: ALTER TYPE ... ADD VALUE in a new migration.

create type public.account_status as enum ('active', 'restricted', 'suspended', 'closed');
create type public.capability as enum ('buyer', 'seller', 'designer', 'maker', 'admin');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'revoked');

create type public.seller_type as enum ('individual', 'dealer', 'cutter', 'wholesaler', 'retailer', 'other');
create type public.party_verification_status as enum ('not_started', 'pending', 'verified', 'rejected');

create type public.gemstone_type as enum
  ('diamond', 'sapphire', 'ruby', 'emerald', 'spinel', 'tourmaline', 'aquamarine', 'garnet', 'opal', 'other');
create type public.gem_shape as enum
  ('round', 'oval', 'cushion', 'emerald_cut', 'pear', 'princess', 'marquise', 'radiant', 'asscher', 'heart', 'other');
create type public.origin_class as enum ('natural', 'lab_grown', 'unknown');
create type public.treatment_status as enum ('untreated', 'treated', 'unknown', 'not_applicable');
create type public.grading_lab as enum ('GIA', 'IGI', 'AGS', 'GRS', 'SSEF', 'Gubelin', 'AGL', 'other', 'none');
create type public.evidence_status as enum ('none', 'seller_stated', 'documented', 'reviewed');

create type public.listing_status as enum ('draft', 'submitted', 'published', 'reserved', 'sold', 'withdrawn');
create type public.moderation_status as enum ('not_submitted', 'pending', 'approved', 'changes_requested', 'rejected');
create type public.verification_status as enum
  ('not_submitted', 'submitted', 'pending_review', 'verified', 'unable_to_verify', 'rejected', 'recheck_required');
create type public.verification_method as enum ('lab_service', 'manual_lab_portal', 'document_review', 'physical_inspection');
create type public.check_result as enum ('not_checked', 'passed', 'failed', 'inconclusive');

create type public.design_status as enum
  ('draft', 'generating', 'concept_ready', 'awaiting_review', 'quote_requested', 'quote_received', 'approved_for_production', 'archived');
create type public.generation_status as enum ('none', 'queued', 'running', 'succeeded', 'failed', 'unavailable');

create type public.quote_request_status as enum ('open', 'questions', 'quoted', 'declined', 'cancelled', 'accepted', 'expired');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn');

create type public.order_type as enum ('gemstone', 'custom_piece');
create type public.payment_status as enum ('pending', 'requires_action', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed', 'cancelled');
create type public.fulfillment_status as enum
  ('awaiting_payment', 'processing', 'in_production', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.payout_status as enum ('not_eligible', 'pending', 'scheduled', 'paid', 'failed', 'reversed');

create type public.conversation_type as enum ('listing_inquiry', 'quote', 'order', 'support');
create type public.dispute_status as enum ('open', 'awaiting_seller', 'awaiting_buyer', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed');
create type public.listing_report_reason as enum ('misrepresented', 'counterfeit_report', 'prohibited', 'spam', 'other');
