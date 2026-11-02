-- Listing photos and documents follow the same rules in storage as in their tables:
-- only an active seller, only while the listing is not live.

-- Storage paths are "<listing id>/<file>". True when the caller may change files of that listing now.
create or replace function public.storage_listing_editable(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.gemstone_listings l
    where l.id::text = split_part(object_name, '/', 1)
      and l.seller_id = public.my_seller_id()
      and l.listing_status in ('draft', 'submitted', 'withdrawn')
  );
$$;
revoke execute on function public.storage_listing_editable(text) from public, anon;
grant execute on function public.storage_listing_editable(text) to authenticated, service_role;

drop policy "listing photos: seller upload" on storage.objects;
drop policy "listing photos: seller delete" on storage.objects;
drop policy "listing photos: seller update" on storage.objects;
create policy "listing photos: seller upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and public.storage_listing_editable(name));
create policy "listing photos: seller delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and public.storage_listing_editable(name));
-- No update policy: files are never overwritten in place, so a reviewed photo can't be swapped.

drop policy "listing documents: seller upload" on storage.objects;
drop policy "listing documents: seller delete" on storage.objects;
create policy "listing documents: seller upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-documents' and public.storage_listing_editable(name));
create policy "listing documents: seller delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-documents' and public.storage_listing_editable(name));

-- Photos only until video listings exist; the app re-encodes images under 8 MB.
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'], file_size_limit = 8388608
  where id = 'listing-photos';
update storage.buckets set file_size_limit = 8388608 where id = 'listing-documents';

-- Table rows: same status window, and restricted accounts can't change them.
drop policy images_owner_write on public.gemstone_images;
create policy images_owner_write on public.gemstone_images for all to authenticated
  using (public.is_active_user() and exists (select 1 from public.gemstone_listings l where l.id = listing_id
         and l.seller_id = public.my_seller_id() and l.listing_status in ('draft', 'submitted', 'withdrawn')))
  with check (public.is_active_user() and exists (select 1 from public.gemstone_listings l where l.id = listing_id
         and l.seller_id = public.my_seller_id() and l.listing_status in ('draft', 'submitted', 'withdrawn')));

drop policy documents_owner_insert on public.listing_documents;
drop policy documents_owner_delete on public.listing_documents;
create policy documents_owner_insert on public.listing_documents for insert to authenticated
  with check (public.is_active_user() and exists (select 1 from public.gemstone_listings l where l.id = listing_id
              and l.seller_id = public.my_seller_id() and l.listing_status in ('draft', 'submitted', 'withdrawn')));
create policy documents_owner_delete on public.listing_documents for delete to authenticated
  using (public.is_active_user() and exists (select 1 from public.gemstone_listings l where l.id = listing_id
         and l.seller_id = public.my_seller_id() and l.listing_status in ('draft', 'submitted', 'withdrawn')));

drop policy listings_owner_delete on public.gemstone_listings;
create policy listings_owner_delete on public.gemstone_listings for delete to authenticated
  using (seller_id = public.my_seller_id() and listing_status = 'draft' and public.is_active_user());
