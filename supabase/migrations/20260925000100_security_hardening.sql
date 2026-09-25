-- ============================================================================
-- 9rawZid9ra — Phase 0: security hardening
-- ----------------------------------------------------------------------------
-- Fixes found in the 2026-09-24 audit:
--   1. Any signed-in user could UPDATE every column of their own profile
--      (is_admin, is_moderator, is_premium, points, is_banned…).
--   2. Uploaders could set is_verified / downloads / helpful / rating on their docs;
--      anyone could INSERT rows into points_log.
--   3. Ratings, reports and download counters were written by the browser on the
--      documents row, which RLS only allows for the uploader → silently lost.
--   4. Any user could rename universities / faculties / filières, change vote
--      counts on document_requests, and send notifications with no actor.
--   5. Staff actions (verify, delete, approve post, ban) relied on policies that
--      don't exist for moderators, so several of them silently failed.
-- Everything privileged now goes through SECURITY DEFINER functions that check
-- the caller. The browser keeps doing ordinary writes (own profile fields,
-- reactions, uploads, bookmarks, messages).
-- Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from user_profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin or coalesce(is_moderator, false) from user_profiles where id = auth.uid()), false)
$$;

revoke all on function public.is_admin(), public.is_staff() from public;
grant execute on function public.is_admin(), public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. user_profiles — users may only edit their own public fields
-- ---------------------------------------------------------------------------
-- Onboarding / personalisation fields (used by the new onboarding flow)
alter table public.user_profiles
  add column if not exists faculty_id       integer references public.faculties(id) on delete set null,
  add column if not exists filiere_id       integer references public.filieres(id)  on delete set null,
  add column if not exists current_semester text,
  add column if not exists onboarded_at     timestamptz;

revoke insert, update, delete on public.user_profiles from anon, authenticated;
grant insert (id, name, email, university_id, bio) on public.user_profiles to authenticated;
grant update (name, bio, university_id, faculty_id, filiere_id, current_semester, onboarded_at, wants_ai_notification)
  on public.user_profiles to authenticated;

drop policy if exists "Users own profile"             on public.user_profiles;  -- was FOR ALL (incl. DELETE)
drop policy if exists "Admin can update any profile"  on public.user_profiles;  -- replaced by RPCs below
drop policy if exists "Users can update own profile"  on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
-- "Users can insert own profile" and "profiles readable by authenticated" are kept.

-- Admin / moderator actions on users ------------------------------------------------
create or replace function public.admin_set_moderator(p_user uuid, p_value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update user_profiles set is_moderator = p_value where id = p_user;
end $$;

create or replace function public.admin_set_premium(p_user uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update user_profiles
     set is_premium = p_until is not null and p_until > now(),
         premium_until = p_until
   where id = p_user;
end $$;

-- mod_ban_user(p_target_id, p_is_banned, p_banned_until, p_ban_reason) already exists and
-- checks the caller; admins and moderators keep using it for bans and unbans.

revoke all on function public.admin_set_moderator(uuid, boolean), public.admin_set_premium(uuid, timestamptz) from public, anon;
grant execute on function public.admin_set_moderator(uuid, boolean), public.admin_set_premium(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. documents — uploaders edit metadata only; trust fields are server-side
-- ---------------------------------------------------------------------------
revoke update, delete on public.documents from anon, authenticated;
grant update (title, doc_number, academic_year, professor, doc_type, pages_count) on public.documents to authenticated;
grant delete on public.documents to authenticated;

drop policy if exists "Auth upload documents" on public.documents;               -- duplicate of the one below
drop policy if exists "Auth users can update own documents" on public.documents;
create policy "Auth users can update own documents" on public.documents
  for update to authenticated using (auth.uid() = uploader_id) with check (auth.uid() = uploader_id);
drop policy if exists "Uploader can delete own documents" on public.documents;
create policy "Uploader can delete own documents" on public.documents
  for delete to authenticated using (auth.uid() = uploader_id);

-- Whatever the browser sends, a new document starts with clean trust fields.
-- is_flagged still comes from the client-side content scan (as today): a flagged
-- upload is held for review, an unflagged one is published immediately.
create or replace function public.fn_documents_sanitize_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.uploader_id    := auth.uid();
    new.is_flagged     := coalesce(new.is_flagged, false);
    new.is_verified    := not new.is_flagged;   -- "published" in today's UI
    new.verified       := false;
    new.verified_by    := null;
    new.verified_at    := null;
    new.downloads      := 0;
    new.likes          := 0;
    new.helpful_count  := 0;
    new.rating_sum     := 0;
    new.rating_count   := 0;
    new.report_count   := 0;
    new.reported_count := 0;
  end if;
  return new;
end $$;
drop trigger if exists trg_documents_sanitize_insert on public.documents;
create trigger trg_documents_sanitize_insert before insert on public.documents
  for each row execute function public.fn_documents_sanitize_insert();

-- Clean up rows that point at a deleted document (the browser can't delete other
-- users' download logs or reactions).
create or replace function public.fn_documents_cleanup_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from downloads_log      where document_id = old.id;
  delete from document_reactions where document_id = old.id;
  update user_profiles set uploads_count = greatest(0, coalesce(uploads_count, 0) - 1) where id = old.uploader_id;
  return old;
end $$;
drop trigger if exists trg_documents_cleanup_delete on public.documents;
create trigger trg_documents_cleanup_delete after delete on public.documents
  for each row execute function public.fn_documents_cleanup_delete();

-- Staff moderation of documents (replaced by a richer version in the quality migration).
create or replace function public.moderate_document(p_document_id integer, p_action text, p_module_id integer default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'verify' then
    update documents set is_verified = true, verified = true, is_flagged = false, flag_reason = null,
                         verified_by = auth.uid(), verified_at = now()
     where id = p_document_id;
  elsif p_action = 'hide' then
    update documents set is_verified = false, is_flagged = true, flag_reason = coalesce(p_note, flag_reason)
     where id = p_document_id;
  elsif p_action = 'reset_reports' then
    delete from document_reactions where document_id = p_document_id and reaction_type = 'report';
    update documents set report_count = 0, reported_count = 0, is_flagged = false where id = p_document_id;
  elsif p_action = 'move' then
    if p_module_id is null then raise exception 'module required'; end if;
    update documents set module_id = p_module_id where id = p_document_id;
  elsif p_action = 'delete' then
    delete from documents where id = p_document_id;
  else
    raise exception 'unknown action %', p_action;
  end if;
end $$;
revoke all on function public.moderate_document(integer, text, integer, text) from public, anon;
grant execute on function public.moderate_document(integer, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Counters maintained by the database, not the browser
-- ---------------------------------------------------------------------------
-- 3a. helpful / rating / report counters from document_reactions
alter table public.document_reactions drop constraint if exists document_reactions_rating_range;
alter table public.document_reactions add constraint document_reactions_rating_range
  check (rating is null or rating between 1 and 5) not valid;

create or replace function public.fn_sync_doc_reaction_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare did integer;
begin
  did := coalesce(new.document_id, old.document_id);
  update documents d set
    helpful_count = s.helpful,
    rating_sum    = s.rsum,
    rating_count  = s.rcount,
    report_count  = s.reports,
    reported_count= s.reports
  from (
    select count(*) filter (where reaction_type = 'helpful')                       as helpful,
           coalesce(sum(rating) filter (where reaction_type = 'rating'), 0)::int  as rsum,
           count(*) filter (where reaction_type = 'rating' and rating is not null) as rcount,
           count(*) filter (where reaction_type = 'report')                       as reports
      from document_reactions where document_id = did
  ) s
  where d.id = did;
  return null;
end $$;

drop trigger if exists trg_doc_helpful_count on public.document_reactions;
drop trigger if exists trg_doc_reaction_counts on public.document_reactions;
create trigger trg_doc_reaction_counts after insert or update or delete on public.document_reactions
  for each row execute function public.fn_sync_doc_reaction_counts();
drop function if exists public.fn_sync_doc_helpful_count();

-- Duplicate policies on document_reactions (the "Auth …"/"Public …" set is kept)
drop policy if exists dr_sel on public.document_reactions;
drop policy if exists dr_ins on public.document_reactions;
drop policy if exists dr_upd on public.document_reactions;
drop policy if exists dr_del on public.document_reactions;

-- 3b. Downloads: one count per user, document and day
create or replace function public.record_download(p_document_id integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_uploader uuid;
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from downloads_log where user_id = auth.uid() and document_id = p_document_id and date = current_date) then
    return;
  end if;
  insert into downloads_log (user_id, document_id) values (auth.uid(), p_document_id);
  update documents set downloads = coalesce(downloads, 0) + 1 where id = p_document_id returning uploader_id into v_uploader;
  update user_profiles set downloads_count = coalesce(downloads_count, 0) + 1 where id = auth.uid();
  if v_uploader is not null and v_uploader <> auth.uid() then
    update user_profiles set total_downloads = coalesce(total_downloads, 0) + 1 where id = v_uploader;
  end if;
end $$;
revoke all on function public.record_download(integer) from public, anon;
grant execute on function public.record_download(integer) to authenticated;

drop policy if exists "Auth insert downloads log" on public.downloads_log;  -- duplicate of "Users insert downloads"

-- 3c. document_requests.votes counted from document_request_votes
delete from public.document_request_votes a using public.document_request_votes b
 where a.id > b.id and a.user_id = b.user_id and a.request_id = b.request_id;
create unique index if not exists document_request_votes_user_request_uniq
  on public.document_request_votes (user_id, request_id);

create or replace function public.fn_sync_request_votes()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid integer;
begin
  rid := coalesce(new.request_id, old.request_id);
  update document_requests set votes = (select count(*) from document_request_votes where request_id = rid) where id = rid;
  return null;
end $$;
drop trigger if exists trg_request_votes on public.document_request_votes;
create trigger trg_request_votes after insert or delete on public.document_request_votes
  for each row execute function public.fn_sync_request_votes();

drop policy if exists dreq_upd on public.document_requests;       -- any user could rewrite any request
drop policy if exists "Staff update requests" on public.document_requests;
create policy "Staff update requests" on public.document_requests
  for update to authenticated using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- 4. points_log — read own, never written by the browser
-- ---------------------------------------------------------------------------
drop policy if exists "Auth insert points log" on public.points_log;
revoke insert, update, delete on public.points_log from anon, authenticated;
drop policy if exists "Users read own points" on public.points_log;
create policy "Users read own points" on public.points_log
  for select to authenticated using (auth.uid() = user_id or is_staff());

-- ---------------------------------------------------------------------------
-- 5. Notifications — no anonymous "system" notifications from the browser
-- ---------------------------------------------------------------------------
drop policy if exists auth_insert_notifs on public.notifications;
create policy auth_insert_notifs on public.notifications
  for insert to authenticated with check (actor_id = auth.uid() and user_id <> auth.uid());

create or replace function public.staff_notify(p_user uuid, p_type text, p_content text, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into notifications (user_id, actor_id, type, content, message, link, read)
  values (p_user, auth.uid(), p_type, p_content, p_content, p_link, false);
end $$;

create or replace function public.admin_broadcast(p_content text, p_link text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into notifications (user_id, actor_id, type, content, message, link, read)
  select id, auth.uid(), 'announcement', p_content, p_content, p_link, false
    from user_profiles where not coalesce(is_banned, false);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.staff_notify(uuid, text, text, text), public.admin_broadcast(text, text) from public, anon;
grant execute on function public.staff_notify(uuid, text, text, text), public.admin_broadcast(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Catalogue — students may add schools/filières/modules, only staff edit or delete
-- ---------------------------------------------------------------------------
drop policy if exists authenticated_update_universities on public.universities;
drop policy if exists authenticated_update_faculties   on public.faculties;
drop policy if exists authenticated_update_filieres    on public.filieres;
drop policy if exists authenticated_can_insert_universities on public.universities;  -- duplicates
drop policy if exists authenticated_can_insert_faculties    on public.faculties;
drop policy if exists authenticated_can_insert_filieres     on public.filieres;
drop policy if exists "admins can update modules" on public.modules;
drop policy if exists "admins can delete modules" on public.modules;

drop policy if exists "Staff update universities" on public.universities;
drop policy if exists "Staff update faculties"   on public.faculties;
drop policy if exists "Staff update filieres"    on public.filieres;
drop policy if exists "Staff update modules"     on public.modules;
drop policy if exists "Admin delete universities" on public.universities;
drop policy if exists "Admin delete faculties"   on public.faculties;
drop policy if exists "Admin delete filieres"    on public.filieres;
drop policy if exists "Admin delete modules"     on public.modules;
create policy "Staff update universities" on public.universities for update to authenticated using (is_staff()) with check (is_staff());
create policy "Staff update faculties"    on public.faculties    for update to authenticated using (is_staff()) with check (is_staff());
create policy "Staff update filieres"     on public.filieres     for update to authenticated using (is_staff()) with check (is_staff());
create policy "Staff update modules"      on public.modules      for update to authenticated using (is_staff()) with check (is_staff());
create policy "Admin delete universities" on public.universities for delete to authenticated using (is_admin());
create policy "Admin delete faculties"    on public.faculties    for delete to authenticated using (is_admin());
create policy "Admin delete filieres"     on public.filieres     for delete to authenticated using (is_admin());
create policy "Admin delete modules"      on public.modules      for delete to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- 7. Senpai Zone — authors edit text only; counters & approval server-side
-- ---------------------------------------------------------------------------
revoke update on public.senpai_posts from anon, authenticated;
grant update (title, content, post_type, tags, module_id, updated_at) on public.senpai_posts to authenticated;
drop policy if exists "admins can update senpai posts" on public.senpai_posts;  -- staff use staff_moderate_post()
drop policy if exists authors_update_own_posts on public.senpai_posts;           -- duplicate of "Author update senpai posts"

create or replace function public.increment_post_views(p_post_id integer)
returns void language sql security definer set search_path = public as $$
  update senpai_posts set views = coalesce(views, 0) + 1 where id = p_post_id;
$$;

create or replace function public.staff_moderate_post(p_post_id integer, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'approve' then update senpai_posts set is_approved = true, is_flagged = false where id = p_post_id;
  elsif p_action = 'hide' then update senpai_posts set is_approved = false where id = p_post_id;
  elsif p_action = 'delete' then delete from senpai_posts where id = p_post_id;
  else raise exception 'unknown action %', p_action; end if;
end $$;
revoke all on function public.increment_post_views(integer), public.staff_moderate_post(integer, text) from public;
grant execute on function public.increment_post_views(integer) to anon, authenticated;
grant execute on function public.staff_moderate_post(integer, text) to authenticated;

revoke update on public.senpai_replies from anon, authenticated;
grant update (content) on public.senpai_replies to authenticated;
drop policy if exists "Author update replies" on public.senpai_replies;
create policy "Author update replies" on public.senpai_replies
  for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

commit;
