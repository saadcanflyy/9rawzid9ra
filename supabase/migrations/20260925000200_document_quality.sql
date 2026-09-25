-- ============================================================================
-- 9rawZid9ra — Document quality system
-- ----------------------------------------------------------------------------
-- • documents.status: pending_review → published → verified  (or needs_review / rejected)
--   is_verified keeps its current meaning in the UI ("visible") and is derived from status.
-- • documents.quality_score (0–100) + quality_signals (checklist for the UI),
--   recomputed by the database whenever a rating, report, feedback or status changes.
-- • document_feedback: after a download, students tick "bon module / lisible / complet".
-- • Structured report reasons; 3 reports (5 for verified docs) send a doc to review.
-- • Community verification: enough positive feedback verifies a doc without a moderator.
-- • Duplicate detection by SHA-256 file fingerprint.
-- • moderation_log for every staff action; get_moderation_queue() for the panel.
-- Requires 20260925000100_security_hardening.sql. Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists status              text,
  add column if not exists quality_score       smallint not null default 0,
  add column if not exists quality_signals     jsonb    not null default '{}'::jsonb,
  add column if not exists quality_updated_at  timestamptz,
  add column if not exists verification_source text,          -- 'staff' | 'community'
  add column if not exists file_hashes         text[]   not null default '{}';

update public.documents set status = case
    when verified or verified_by is not null      then 'verified'
    when coalesce(is_flagged, false)               then 'pending_review'
    when coalesce(is_verified, false)              then 'published'
    else 'pending_review' end
 where status is null;
update public.documents set verification_source = 'staff' where status = 'verified' and verification_source is null;

alter table public.documents alter column status set default 'pending_review';
alter table public.documents alter column status set not null;
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check
  check (status in ('pending_review', 'published', 'verified', 'needs_review', 'rejected'));

create index if not exists idx_documents_status       on public.documents (status);
create index if not exists idx_documents_quality      on public.documents (module_id, quality_score desc);
create index if not exists idx_documents_file_hashes  on public.documents using gin (file_hashes);

-- Uploaders may send their file fingerprints; everything else stays server-side.
-- (column-level INSERT is not restricted — the sanitize trigger resets trust fields)

alter table public.document_reactions add column if not exists report_details text;
alter table public.document_reactions drop constraint if exists document_reactions_report_reason_check;
alter table public.document_reactions add constraint document_reactions_report_reason_check
  check (report_reason is null or report_reason in
         ('wrong_module', 'bad_scan', 'incomplete', 'duplicate', 'wrong_info', 'inappropriate', 'other')) not valid;

-- ---------------------------------------------------------------------------
-- 2. Community feedback ("Ce document t'a aidé ?")
-- ---------------------------------------------------------------------------
create table if not exists public.document_feedback (
  id             bigserial primary key,
  document_id    integer not null references public.documents(id) on delete cascade,
  user_id        uuid    not null references public.user_profiles(id) on delete cascade,
  correct_module boolean,
  readable       boolean,
  complete       boolean,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (document_id, user_id)
);
create index if not exists idx_document_feedback_doc on public.document_feedback (document_id);
alter table public.document_feedback enable row level security;

drop policy if exists "Feedback readable"   on public.document_feedback;
drop policy if exists "Feedback insert own" on public.document_feedback;
drop policy if exists "Feedback update own" on public.document_feedback;
drop policy if exists "Feedback delete own" on public.document_feedback;
create policy "Feedback readable"   on public.document_feedback for select using (true);
create policy "Feedback insert own" on public.document_feedback for insert to authenticated with check (auth.uid() = user_id);
create policy "Feedback update own" on public.document_feedback for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Feedback delete own" on public.document_feedback for delete to authenticated using (auth.uid() = user_id);
grant select on public.document_feedback to anon, authenticated;
grant insert, update, delete on public.document_feedback to authenticated;
grant usage, select on sequence public.document_feedback_id_seq to authenticated;

-- No rating / helpful / feedback on your own document.
create or replace function public.fn_block_self_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uploader uuid;
begin
  select uploader_id into v_uploader from documents where id = new.document_id;
  if v_uploader is distinct from new.user_id then
    if tg_table_name = 'document_feedback' then new.updated_at := now(); end if;
    return new;
  end if;
  if tg_table_name = 'document_feedback' then
    raise exception 'Tu ne peux pas évaluer ton propre document.' using errcode = 'P0001';
  end if;
  if new.reaction_type in ('helpful', 'rating') then
    raise exception 'Tu ne peux pas évaluer ton propre document.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists trg_block_self_review on public.document_reactions;
create trigger trg_block_self_review before insert or update on public.document_reactions
  for each row execute function public.fn_block_self_review();
drop trigger if exists trg_block_self_review on public.document_feedback;
create trigger trg_block_self_review before insert or update on public.document_feedback
  for each row execute function public.fn_block_self_review();

-- ---------------------------------------------------------------------------
-- 3. Quality score
-- ---------------------------------------------------------------------------
-- Score (0–100):
--   verification 25  (verified 25, published 10, otherwise 0)
--   rating       25  (Bayesian average, 3 phantom votes at 3★ → no ratings = 12.5)
--   bon module   15  ┐
--   lisible      15  ├ share of "oui" in feedback, prior 70 % over 2 votes
--   complet      15  ┘
--   utile         5  (1 point per helpful vote, max 5)
--   − 8 per report (max −40); rejected = 0
-- Checklist states per criterion: 'yes' | 'no' | 'unknown' (needs ≥ 2 answers).
create or replace function public.compute_document_quality(
  p_status text, p_rating_sum int, p_rating_count int, p_helpful int, p_reports int,
  p_verified_at timestamp, p_fb_n int, p_fb_module int, p_fb_readable int, p_fb_complete int,
  p_fb_module_n int, p_fb_readable_n int, p_fb_complete_n int,
  out score smallint, out signals jsonb)
language plpgsql immutable as $$
declare
  s numeric := 0;
  avg_rating numeric;
begin
  if p_status = 'rejected' then
    score := 0;
    signals := jsonb_build_object('status', p_status);
    return;
  end if;

  s := s + case p_status when 'verified' then 25 when 'published' then 10 else 0 end;
  avg_rating := (coalesce(p_rating_sum, 0) + 9.0) / (coalesce(p_rating_count, 0) + 3.0);
  s := s + ((avg_rating - 1) / 4.0) * 25;
  s := s + ((coalesce(p_fb_module, 0)   + 1.4) / (coalesce(p_fb_module_n, 0)   + 2.0)) * 15;
  s := s + ((coalesce(p_fb_readable, 0) + 1.4) / (coalesce(p_fb_readable_n, 0) + 2.0)) * 15;
  s := s + ((coalesce(p_fb_complete, 0) + 1.4) / (coalesce(p_fb_complete_n, 0) + 2.0)) * 15;
  s := s + least(5, coalesce(p_helpful, 0));
  s := s - least(40, 8 * coalesce(p_reports, 0));

  score := greatest(0, least(100, round(s)))::smallint;
  signals := jsonb_build_object(
    'status',            p_status,
    'correct_module',    case when coalesce(p_fb_module_n,0)   < 2 then 'unknown' when p_fb_module::numeric   / p_fb_module_n   >= 0.7 then 'yes' when p_fb_module::numeric   / p_fb_module_n   <= 0.4 then 'no' else 'unknown' end,
    'readable',          case when coalesce(p_fb_readable_n,0) < 2 then 'unknown' when p_fb_readable::numeric / p_fb_readable_n >= 0.7 then 'yes' when p_fb_readable::numeric / p_fb_readable_n <= 0.4 then 'no' else 'unknown' end,
    'complete',          case when coalesce(p_fb_complete_n,0) < 2 then 'unknown' when p_fb_complete::numeric / p_fb_complete_n >= 0.7 then 'yes' when p_fb_complete::numeric / p_fb_complete_n <= 0.4 then 'no' else 'unknown' end,
    'recently_verified', p_status = 'verified' and p_verified_at is not null and p_verified_at > now() - interval '180 days',
    'verified_at',       p_verified_at,
    'rating_avg',        case when coalesce(p_rating_count,0) > 0 then round(p_rating_sum::numeric / p_rating_count, 1) end,
    'rating_count',      coalesce(p_rating_count, 0),
    'feedback_count',    coalesce(p_fb_n, 0),
    'reports',           coalesce(p_reports, 0)
  );
end $$;

-- BEFORE INSERT/UPDATE on documents: keep is_verified in sync with status, apply the
-- auto-review / community-verification rules and recompute the score. Other triggers
-- only touch the row (counters, quality_updated_at) and this does the rest.
create or replace function public.fn_documents_quality()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fb record;
  q  record;
begin
  -- Auto review: too many reports hides a document until staff look at it.
  if new.status = 'published' and coalesce(new.report_count, 0) >= 3 then
    new.status := 'needs_review';
    new.flag_reason := coalesce(new.flag_reason, 'Signalé par la communauté');
  elsif new.status = 'verified' and coalesce(new.report_count, 0) >= 5 then
    new.status := 'needs_review';
    new.flag_reason := coalesce(new.flag_reason, 'Signalé par la communauté');
  end if;

  select count(*)                                             as n,
         count(*) filter (where correct_module)               as m_yes, count(correct_module) as m_n,
         count(*) filter (where readable)                     as r_yes, count(readable)       as r_n,
         count(*) filter (where complete)                     as c_yes, count(complete)       as c_n
    into fb
    from document_feedback where document_id = new.id;

  -- Community verification: ≥ 5 answers, ≥ 80 % yes on every criterion, avg ≥ 4★ (if rated), no report.
  if new.status = 'published'
     and fb.m_n >= 5 and fb.r_n >= 5 and fb.c_n >= 5
     and fb.m_yes::numeric / fb.m_n >= 0.8 and fb.r_yes::numeric / fb.r_n >= 0.8 and fb.c_yes::numeric / fb.c_n >= 0.8
     and (coalesce(new.rating_count, 0) = 0 or new.rating_sum::numeric / new.rating_count >= 4)
     and coalesce(new.report_count, 0) = 0 then
    new.status := 'verified';
    new.verified_at := now();
    new.verification_source := 'community';
  end if;

  new.is_verified := new.status in ('published', 'verified');
  new.verified    := new.status = 'verified';
  new.is_flagged  := new.status in ('pending_review', 'needs_review');

  select * into q from compute_document_quality(
    new.status, new.rating_sum, new.rating_count, new.helpful_count, new.report_count, new.verified_at,
    fb.n::int, fb.m_yes::int, fb.r_yes::int, fb.c_yes::int, fb.m_n::int, fb.r_n::int, fb.c_n::int);
  new.quality_score      := q.score;
  new.quality_signals    := q.signals;
  new.quality_updated_at := now();
  return new;
end $$;
-- Named "z_" so it runs after trg_documents_sanitize_insert (same-event triggers fire alphabetically).
drop trigger if exists trg_documents_quality on public.documents;
drop trigger if exists trg_documents_z_quality on public.documents;
create trigger trg_documents_z_quality before insert or update on public.documents
  for each row execute function public.fn_documents_quality();

-- Feedback changes → touch the document so the BEFORE UPDATE trigger recomputes.
create or replace function public.fn_feedback_touch_document()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update documents set quality_updated_at = now() where id = coalesce(new.document_id, old.document_id);
  return null;
end $$;
drop trigger if exists trg_feedback_touch_document on public.document_feedback;
create trigger trg_feedback_touch_document after insert or update or delete on public.document_feedback
  for each row execute function public.fn_feedback_touch_document();

-- ---------------------------------------------------------------------------
-- 4. Upload sanitize (replaces the Phase 0 version): status from the content scan + duplicates
-- ---------------------------------------------------------------------------
create or replace function public.fn_documents_sanitize_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dup integer;
begin
  if auth.uid() is not null and not is_staff() then
    new.uploader_id    := auth.uid();
    new.is_flagged     := coalesce(new.is_flagged, false);
    new.status         := case when new.is_flagged then 'pending_review' else 'published' end;
    new.verified       := false;
    new.verified_by    := null;
    new.verified_at    := null;
    new.verification_source := null;
    new.downloads      := 0;
    new.likes          := 0;
    new.helpful_count  := 0;
    new.rating_sum     := 0;
    new.rating_count   := 0;
    new.report_count   := 0;
    new.reported_count := 0;
  elsif new.status is null or (new.status = 'pending_review' and coalesce(new.is_verified, false) and not coalesce(new.is_flagged, false)) then
    -- staff uploads / SQL inserts: keep the old meaning of is_verified ("visible")
    new.status := case when coalesce(new.is_flagged, false) or not coalesce(new.is_verified, false) then 'pending_review' else 'published' end;
  end if;

  new.file_hashes := coalesce(new.file_hashes, '{}');
  if cardinality(new.file_hashes) > 0 then
    select id into v_dup from documents
     where file_hashes && new.file_hashes and status <> 'rejected' limit 1;
    if v_dup is not null then
      new.status := 'pending_review';
      new.flag_reason := 'Doublon possible du document #' || v_dup;
    end if;
  end if;
  return new;
end $$;
-- trigger trg_documents_sanitize_insert already exists (Phase 0) and fires before trg_documents_z_quality.

-- Used by the upload page before sending files: "Ce fichier existe déjà".
create or replace function public.find_duplicate_documents(p_hashes text[])
returns table (document_id integer, title text, doc_type text, academic_year text, module_id integer, module_name text, module_slug text)
language sql stable security definer set search_path = public as $$
  select d.id, coalesce(d.title, d.doc_number), d.doc_type, d.academic_year, m.id, m.name, m.slug
    from documents d join modules m on m.id = d.module_id
   where d.file_hashes && p_hashes and d.status in ('published', 'verified', 'pending_review')
   limit 5
$$;
revoke all on function public.find_duplicate_documents(text[]) from public, anon;
grant execute on function public.find_duplicate_documents(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Reports
-- ---------------------------------------------------------------------------
create or replace function public.report_document(p_document_id integer, p_reason text, p_details text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;
  insert into document_reactions (user_id, document_id, reaction_type, report_reason, report_details)
  values (auth.uid(), p_document_id, 'report', p_reason, left(p_details, 500))
  on conflict (user_id, document_id, reaction_type)
  do update set report_reason = excluded.report_reason, report_details = excluded.report_details;
end $$;
revoke all on function public.report_document(integer, text, text) from public, anon;
grant execute on function public.report_document(integer, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Moderation
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_log (
  id          bigserial primary key,
  document_id integer,
  staff_id    uuid,
  action      text not null,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.moderation_log enable row level security;
drop policy if exists "Staff read moderation log" on public.moderation_log;
create policy "Staff read moderation log" on public.moderation_log for select to authenticated using (is_staff());
grant select on public.moderation_log to authenticated;

-- Replaces the Phase 0 version. Actions:
--   verify · publish · review|hide (needs_review) · reject · reset_reports · move · delete
create or replace function public.moderate_document(p_document_id integer, p_action text, p_module_id integer default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_doc documents%rowtype;
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_doc from documents where id = p_document_id;
  if not found then raise exception 'document not found'; end if;

  if p_action = 'verify' then
    update documents set status = 'verified', verified_by = auth.uid(), verified_at = now(),
                         verification_source = 'staff', flag_reason = null
     where id = p_document_id;
  elsif p_action = 'publish' then
    update documents set status = 'published', flag_reason = null where id = p_document_id;
  elsif p_action in ('review', 'hide') then   -- 'hide' kept for the Phase 0 callers
    update documents set status = 'needs_review', flag_reason = coalesce(p_note, flag_reason) where id = p_document_id;
  elsif p_action = 'reject' then
    update documents set status = 'rejected', flag_reason = coalesce(p_note, 'Refusé par la modération') where id = p_document_id;
  elsif p_action = 'reset_reports' then
    delete from document_reactions where document_id = p_document_id and reaction_type = 'report';
    update documents set status = case when status = 'needs_review' then 'published' else status end,
                         flag_reason = null
     where id = p_document_id;
  elsif p_action = 'move' then
    if p_module_id is null then raise exception 'module required'; end if;
    update documents set module_id = p_module_id where id = p_document_id;
  elsif p_action = 'delete' then
    delete from documents where id = p_document_id;
  else
    raise exception 'unknown action %', p_action;
  end if;

  insert into moderation_log (document_id, staff_id, action, note) values (p_document_id, auth.uid(), p_action, p_note);

  if p_action in ('verify', 'reject') and v_doc.uploader_id is not null and v_doc.uploader_id <> auth.uid() then
    insert into notifications (user_id, actor_id, type, content, message, link, read)
    values (v_doc.uploader_id, auth.uid(),
            case p_action when 'verify' then 'document_verified' else 'document_rejected' end,
            case p_action when 'verify' then 'Ton document a été vérifié.'
                          else 'Ton document a été refusé : ' || coalesce(p_note, 'non conforme') end,
            null, '/profile', false);
  end if;
end $$;
revoke all on function public.moderate_document(integer, text, integer, text) from public, anon;
grant execute on function public.moderate_document(integer, text, integer, text) to authenticated;

create or replace function public.get_moderation_queue(p_limit integer default 50)
returns table (document_id integer, title text, doc_type text, status text, flag_reason text, report_count integer,
               quality_score smallint, created_at timestamp, uploader_id uuid, uploader_name text,
               module_id integer, module_name text, reasons jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select d.id, coalesce(d.title, d.doc_number), d.doc_type, d.status, d.flag_reason, d.report_count,
         d.quality_score, d.created_at, d.uploader_id, u.name, m.id, m.name,
         (select coalesce(jsonb_object_agg(r.report_reason, r.n), '{}'::jsonb)
            from (select coalesce(dr.report_reason, 'other') as report_reason, count(*) as n
                    from document_reactions dr where dr.document_id = d.id and dr.reaction_type = 'report' group by 1) r)
    from documents d
    left join user_profiles u on u.id = d.uploader_id
    left join modules m on m.id = d.module_id
   where d.status in ('pending_review', 'needs_review') or d.report_count > 0
   order by (d.status = 'needs_review') desc, d.report_count desc, d.created_at
   limit p_limit;
end $$;
revoke all on function public.get_moderation_queue(integer) from public, anon;
grant execute on function public.get_moderation_queue(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Backfill scores for existing documents
-- ---------------------------------------------------------------------------
update public.documents set quality_updated_at = now();

commit;
