-- ============================================================================
-- 9rawZid9ra — Quality v2: four public statuses + "correct university" criterion
-- ----------------------------------------------------------------------------
-- Public status shown to students (documents.display_status, computed):
--   pending            — not validated yet (held for review, or published and waiting for reviews)
--   community_approved — ≥ 5 positive student reviews, no report
--   verified           — checked by a moderator
--   rejected           — refused
-- The internal workflow status (documents.status) is unchanged, so nothing else breaks.
--
-- Quality score v2 (0–100):
--   validation 25 (staff 25 · community 22 · published 10) · rating 20 · bon module 15 ·
--   bonne école 5 · lisible 15 · complet 15 · utile 5 · −8 per report (max −40)
-- Requires 20260925000200_document_quality.sql. Safe to re-run.
-- ============================================================================

begin;

alter table public.document_feedback add column if not exists correct_university boolean;

alter table public.documents drop column if exists display_status;
alter table public.documents add column display_status text generated always as (
  case when status = 'rejected' then 'rejected'
       when status = 'verified' and verification_source = 'community' then 'community_approved'
       when status = 'verified' then 'verified'
       else 'pending' end) stored;
create index if not exists idx_documents_display_status on public.documents (display_status);

drop function if exists public.compute_document_quality(text, int, int, int, int, timestamp, int, int, int, int, int, int, int);

create or replace function public.compute_document_quality_v2(
  p_status text, p_source text, p_rating_sum int, p_rating_count int, p_helpful int, p_reports int,
  p_verified_at timestamp, fb jsonb, out score smallint, out signals jsonb)
language plpgsql immutable as $$
declare
  s numeric := 0;
  avg_rating numeric;
  crit text;
  crit_state jsonb := '{}'::jsonb;
  yes int; n int;
  weights constant jsonb := '{"correct_module":15,"correct_university":5,"readable":15,"complete":15}';
begin
  if p_status = 'rejected' then
    score := 0;
    signals := jsonb_build_object('status', p_status, 'display_status', 'rejected');
    return;
  end if;

  s := case when p_status = 'verified' and p_source = 'community' then 22
            when p_status = 'verified' then 25
            when p_status = 'published' then 10 else 0 end;
  avg_rating := (coalesce(p_rating_sum, 0) + 9.0) / (coalesce(p_rating_count, 0) + 3.0);
  s := s + ((avg_rating - 1) / 4.0) * 20;

  for crit in select jsonb_object_keys(weights) loop
    yes := coalesce((fb ->> (crit || '_yes'))::int, 0);
    n   := coalesce((fb ->> (crit || '_n'))::int, 0);
    s := s + ((yes + 1.4) / (n + 2.0)) * (weights ->> crit)::int;
    crit_state := crit_state || jsonb_build_object(crit,
      case when n < 2 then 'unknown'
           when yes::numeric / n >= 0.7 then 'yes'
           when yes::numeric / n <= 0.4 then 'no'
           else 'unknown' end);
  end loop;

  s := s + least(5, coalesce(p_helpful, 0));
  s := s - least(40, 8 * coalesce(p_reports, 0));
  score := greatest(0, least(100, round(s)))::smallint;

  signals := crit_state || jsonb_build_object(
    'status',            p_status,
    'display_status',    case when p_status = 'verified' and p_source = 'community' then 'community_approved'
                              when p_status = 'verified' then 'verified' else 'pending' end,
    'recently_verified', p_status = 'verified' and p_verified_at is not null and p_verified_at > now() - interval '180 days',
    'verified_at',       p_verified_at,
    'rating_avg',        case when coalesce(p_rating_count, 0) > 0 then round(p_rating_sum::numeric / p_rating_count, 1) end,
    'rating_count',      coalesce(p_rating_count, 0),
    'feedback_count',    coalesce((fb ->> 'n')::int, 0),
    'reports',           coalesce(p_reports, 0));
end $$;

create or replace function public.fn_documents_quality()
returns trigger language plpgsql security definer set search_path = public as $$
declare fb jsonb; q record;
begin
  -- Auto review: too many reports hides a document until staff look at it.
  if new.status = 'published' and coalesce(new.report_count, 0) >= 3 then
    new.status := 'needs_review';
    new.flag_reason := coalesce(new.flag_reason, 'Signalé par la communauté');
  elsif new.status = 'verified' and coalesce(new.report_count, 0) >= 5 then
    new.status := 'needs_review';
    new.flag_reason := coalesce(new.flag_reason, 'Signalé par la communauté');
  end if;

  select jsonb_build_object(
           'n', count(*),
           'correct_module_yes',     count(*) filter (where correct_module),     'correct_module_n',     count(correct_module),
           'correct_university_yes', count(*) filter (where correct_university), 'correct_university_n', count(correct_university),
           'readable_yes',           count(*) filter (where readable),           'readable_n',           count(readable),
           'complete_yes',           count(*) filter (where complete),           'complete_n',           count(complete))
    into fb
    from document_feedback where document_id = new.id;

  -- Community approval: ≥ 5 answers and ≥ 80 % yes on module, readability and completeness
  -- (and on the school when ≥ 3 people answered it), avg ≥ 4★ if rated, no report.
  if new.status = 'published'
     and (fb->>'correct_module_n')::int >= 5 and (fb->>'readable_n')::int >= 5 and (fb->>'complete_n')::int >= 5
     and (fb->>'correct_module_yes')::numeric / (fb->>'correct_module_n')::int >= 0.8
     and (fb->>'readable_yes')::numeric       / (fb->>'readable_n')::int       >= 0.8
     and (fb->>'complete_yes')::numeric       / (fb->>'complete_n')::int       >= 0.8
     and ((fb->>'correct_university_n')::int < 3
          or (fb->>'correct_university_yes')::numeric / (fb->>'correct_university_n')::int >= 0.8)
     and (coalesce(new.rating_count, 0) = 0 or new.rating_sum::numeric / new.rating_count >= 4)
     and coalesce(new.report_count, 0) = 0 then
    new.status := 'verified';
    new.verified_at := now();
    new.verification_source := 'community';
  end if;

  new.is_verified := new.status in ('published', 'verified');
  new.verified    := new.status = 'verified';
  new.is_flagged  := new.status in ('pending_review', 'needs_review');

  select * into q from compute_document_quality_v2(
    new.status, new.verification_source, new.rating_sum, new.rating_count, new.helpful_count, new.report_count,
    new.verified_at, fb);
  new.quality_score      := q.score;
  new.quality_signals    := q.signals;
  new.quality_updated_at := now();
  return new;
end $$;

-- A moderator confirming a community-approved document switches it to "verified" (staff).
create or replace function public.fn_documents_staff_confirms()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification_source = 'staff' and old.verification_source = 'community' and new.status = 'verified' then
    new.verified_at := now();
  end if;
  return new;
end $$;
drop trigger if exists trg_documents_staff_confirms on public.documents;
create trigger trg_documents_staff_confirms before update of verification_source on public.documents
  for each row execute function public.fn_documents_staff_confirms();

-- Recompute everything with the new formula.
update public.documents set quality_updated_at = now();

commit;
