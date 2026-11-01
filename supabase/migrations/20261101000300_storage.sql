-- Storage-Buckets (alle privat, Zugriff nur über signierte URLs) und Policies.
-- Pfadschema: <user_id>/<dog_id>/<datei>  bzw. forum-images: <user_id>/<datei>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', false, 52428800,
   array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('dog-photos', 'dog-photos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/heic', 'image/webp']),
  ('forum-images', 'forum-images', false, 10485760,
   array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id in ('media', 'dog-photos', 'forum-images')
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'dog-photos', 'forum-images')
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id in ('media', 'dog-photos', 'forum-images')
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'dog-photos', 'forum-images')
         and (storage.foldername(name))[1] = auth.uid()::text);

-- Forum-Bilder sind für alle Angemeldeten lesbar (signierte URLs), sofern der Beitrag sichtbar ist.
create policy "forum images read" on storage.objects for select to authenticated
  using (bucket_id = 'forum-images' and exists (
    select 1 from public.forum_posts p where p.image_url = name
  ));
