-- ============================================================================
-- 9rawZid9ra — Security audit fix #4: storage policies (AUDIT M5, M6)
-- ----------------------------------------------------------------------------
-- storage.objects had only INSERT and UPDATE policies for the `documents`
-- bucket. No DELETE policy means Profile.js/Admin.js's
-- supabase.storage.from('documents').remove([path]) silently failed: the DB row
-- went away, the file did not. The bucket is public, so a "deleted" document
-- stayed downloadable by direct URL forever — a privacy problem and unbounded
-- storage growth (26 orphaned files / 41 MB found at the time of this audit).
--
-- INSERT was also unconstrained by path (`auth.uid() IS NOT NULL` only), so any
-- signed-in user could write objects under another user's folder prefix.
-- Layout is documents/<uploader_id>/<timestamp>_<n>.<ext>, so foldername[2] is
-- the owner — same expression the existing UPDATE policy already uses.
-- Safe to re-run.
-- ============================================================================

begin;

drop policy if exists "Auth upload documents storage" on storage.objects;
create policy "Auth upload documents storage" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[2] = auth.uid()::text);

drop policy if exists "Owner or staff delete documents storage" on storage.objects;
create policy "Owner or staff delete documents storage" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[2] = auth.uid()::text or is_staff()));

commit;
