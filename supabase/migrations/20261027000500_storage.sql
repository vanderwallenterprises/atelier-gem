-- ATELIER GEM: storage buckets and object policies.
-- Object names are always server-generated: "<owner-scope-uuid>/<random-uuid>.<ext>".
-- User-supplied filenames are never used.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  -- Photos of listings. Public read so published listing pages can show them; names are unguessable.
  ('listing-photos', 'listing-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  -- Grading report scans and provenance documents: private (seller + administrators).
  ('listing-documents', 'listing-documents', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  -- Generated concept images and design attachments: private to the design owner.
  ('design-assets', 'design-assets', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.storage_owner_listing(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gemstone_listings l
    where l.id::text = split_part(object_name, '/', 1) and l.seller_id = public.my_seller_id()
  );
$$;

-- listing-photos: anyone can read; only the listing's seller can add or remove.
create policy "listing photos: seller upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and public.storage_owner_listing(name));
create policy "listing photos: seller delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and public.storage_owner_listing(name));

-- listing-documents: seller and administrators only.
create policy "listing documents: seller upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-documents' and public.storage_owner_listing(name));
create policy "listing documents: seller or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'listing-documents' and (public.storage_owner_listing(name) or public.is_admin()));
create policy "listing documents: seller delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-documents' and public.storage_owner_listing(name));

-- design-assets: "<user-id>/..." owned by that user.
create policy "design assets: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'design-assets' and split_part(name, '/', 1) = auth.uid()::text);
create policy "design assets: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'design-assets' and split_part(name, '/', 1) = auth.uid()::text);

-- avatars: "<user-id>/..." public read, owner write.
create policy "avatars: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy "avatars: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
