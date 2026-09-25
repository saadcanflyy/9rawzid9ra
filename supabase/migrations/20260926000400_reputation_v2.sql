-- ============================================================================
-- 9rawZid9ra — Reputation v2: 5 named levels, requested badges, faculty rankings
-- ----------------------------------------------------------------------------
-- Levels: Nouveau 0 · Contributeur 50 · Contributeur de confiance 250 · Expert 750 ·
--         Légende du campus 2500
-- Badges: Premier partage · 100 téléchargements · Contributeur qualité ·
--         Pilier de l'entraide · Top contributeur de l'école (monthly) · Fondateur ·
--         Légende du campus (+ the phase-2 badges that still make sense)
-- Rankings: global, per school, per faculty, per filière (students) + schools + faculties.
-- Monthly job award_top_university_contributors() (scheduled with pg_cron when available).
-- Requires 20260925000300_reputation.sql. Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Levels
-- ---------------------------------------------------------------------------
create or replace function public.reputation_level(p_points integer)
returns table (level integer, name text, min_points integer, next_min_points integer)
language sql immutable as $$
  select l.level, l.name, l.min_points, lead(l.min_points) over (order by l.level)
    from (values (1, 'Nouveau', 0), (2, 'Contributeur', 50), (3, 'Contributeur de confiance', 250),
                 (4, 'Expert', 750), (5, 'Légende du campus', 2500)) as l(level, name, min_points)
   order by (coalesce(p_points, 0) >= l.min_points) desc, l.level desc
   limit 1
$$;

-- ---------------------------------------------------------------------------
-- 2. Badges
-- ---------------------------------------------------------------------------
alter table public.user_badges add column if not exists times_awarded integer not null default 1;
alter table public.user_badges add column if not exists last_period   text;

insert into public.reputation_rules (event_type, points, daily_cap, label) values
  ('top_university_month', 25, null, 'Top contributeur de l''école du mois')
on conflict (event_type) do update set points = excluded.points, label = excluded.label;

insert into public.badges (code, name, description, icon, tier, sort_order) values
  ('first_upload',               'Premier partage',              'A publié son premier document.',                                    'upload',   'bronze',  10),
  ('downloads_100',              '100 téléchargements',          'Ses documents ont été téléchargés 100 fois.',                       'download', 'silver',  15),
  ('quality_contributor',        'Contributeur qualité',         '5 documents vérifiés ou approuvés, qualité moyenne ≥ 75/100.',      'check',    'gold',    20),
  ('community_helper',           'Pilier de l''entraide',        '10 réponses dans Senpai Zone ou 3 meilleures réponses.',           'reply',    'silver',  30),
  ('top_university_contributor', 'Top contributeur de l''école', 'N°1 des contributeurs de son école sur un mois.',                   'star',     'gold',    35),
  ('campus_legend',              'Légende du campus',            'A atteint le niveau Légende du campus (2 500 points).',            'star',     'gold',    5)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      tier = excluded.tier, sort_order = excluded.sort_order;

-- Phase-2 badges folded into the requested ones
insert into public.user_badges (user_id, badge_code, awarded_at)
select user_id, 'community_helper', awarded_at from public.user_badges where badge_code = 'helper_10'
on conflict do nothing;
insert into public.user_badges (user_id, badge_code, awarded_at)
select user_id, 'quality_contributor', awarded_at from public.user_badges where badge_code = 'verified_5'
on conflict do nothing;
delete from public.user_badges where badge_code in ('helper_10', 'verified_5');
delete from public.badges where code in ('helper_10', 'verified_5');

create or replace function public.check_badges(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_docs int; v_validated int; v_quality numeric; v_corriges int; v_downloads bigint;
  v_replies int; v_best int; v_reports int; v_reviews int; v_points int; v_fond boolean; v_new text;
begin
  select count(*) filter (where status in ('published', 'verified')),
         count(*) filter (where status = 'verified'),
         avg(quality_score) filter (where status = 'verified'),
         count(*) filter (where status in ('published', 'verified') and doc_type like 'corrige%'),
         coalesce(sum(downloads) filter (where status in ('published', 'verified')), 0)
    into v_docs, v_validated, v_quality, v_corriges, v_downloads
    from documents where uploader_id = p_user;
  select count(*) into v_replies from senpai_replies where author_id = p_user;
  select count(*) filter (where event_type = 'best_answer'),
         count(*) filter (where event_type = 'report_confirmed')
    into v_best, v_reports from reputation_events where user_id = p_user;
  select count(*) into v_reviews from document_feedback where user_id = p_user;
  select coalesce(points, 0), coalesce(is_fondateur, false) into v_points, v_fond from user_profiles where id = p_user;

  for v_new in
    insert into user_badges (user_id, badge_code)
    select p_user, code from (values
      ('fondateur',           v_fond),
      ('first_upload',        v_docs >= 1),
      ('downloads_100',       v_downloads >= 100),
      ('contributor_10',      v_docs >= 10),
      ('library_50',          v_docs >= 50),
      ('quality_contributor', v_validated >= 5 and coalesce(v_quality, 0) >= 75),
      ('corrige_master',      v_corriges >= 5),
      ('community_helper',    v_replies >= 10 or v_best >= 3),
      ('best_answer',         v_best >= 1),
      ('quality_guardian',    v_reports >= 10),
      ('reviewer_25',         v_reviews >= 25),
      ('campus_legend',       v_points >= 2500)
    ) as b(code, earned)
    where earned and exists (select 1 from badges where badges.code = b.code)
    on conflict do nothing
    returning badge_code
  loop
    insert into notifications (user_id, type, content, message, link, read)
    select p_user, 'badge', 'Nouveau badge : ' || name, 'Nouveau badge : ' || name, '/profile', false
      from badges where code = v_new;
  end loop;
end $$;

-- downloads count toward "100 téléchargements"
create or replace function public.fn_badges_on_downloads()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.downloads is distinct from old.downloads and new.uploader_id is not null
     and new.downloads % 10 = 0 then          -- check every 10 downloads, not on each one
    perform check_badges(new.uploader_id);
  end if;
  return null;
end $$;
drop trigger if exists trg_badges_on_downloads on public.documents;
create trigger trg_badges_on_downloads after update of downloads on public.documents
  for each row execute function public.fn_badges_on_downloads();

-- ---------------------------------------------------------------------------
-- 3. Monthly "Top contributeur de l'école"
-- ---------------------------------------------------------------------------
create or replace function public.award_top_university_contributors(p_month date default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := date_trunc('month', coalesce(p_month, (now() - interval '1 month')::date));
  v_end   timestamptz := v_start + interval '1 month';
  v_period text := to_char(v_start, 'YYYY-MM');
  r record; n integer := 0;
begin
  -- callable by staff, or by the scheduler (no auth.uid())
  if auth.uid() is not null and not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  for r in
    select distinct on (up.university_id) up.university_id, e.user_id, sum(e.points) as p
      from reputation_events e join user_profiles up on up.id = e.user_id
     where e.created_at >= v_start and e.created_at < v_end and up.university_id is not null
       and not coalesce(up.is_banned, false) and e.event_type <> 'top_university_month'
     group by up.university_id, e.user_id
    having sum(e.points) > 0
     order by up.university_id, sum(e.points) desc, e.user_id
  loop
    insert into user_badges (user_id, badge_code, last_period)
    values (r.user_id, 'top_university_contributor', v_period)
    on conflict (user_id, badge_code) do update
      set times_awarded = user_badges.times_awarded + case when user_badges.last_period is distinct from v_period then 1 else 0 end,
          last_period = v_period, awarded_at = now();
    perform award_reputation(r.user_id, 'top_university_month', 'topuni:' || v_period || ':' || r.university_id);
    insert into notifications (user_id, type, content, message, link, read)
    values (r.user_id, 'badge', 'Top contributeur de ton école en ' || v_period, 'Top contributeur de ton école en ' || v_period, '/classement', false);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.award_top_university_contributors(date) from public, anon;
grant execute on function public.award_top_university_contributors(date) to authenticated;

-- Schedule on the 1st of each month at 02:00 UTC when pg_cron is enabled (Database → Extensions).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'top-university-contributors';
    perform cron.schedule('top-university-contributors', '0 2 1 * *', 'select public.award_top_university_contributors()');
  else
    raise notice 'pg_cron not enabled: run select award_top_university_contributors() on the 1st of each month (or enable pg_cron and re-run this file).';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Rankings
-- ---------------------------------------------------------------------------
drop function if exists public.get_leaderboard(text, integer, integer, integer);
create or replace function public.get_leaderboard(
  p_period text default 'week', p_university_id integer default null, p_filiere_id integer default null,
  p_limit integer default 50, p_faculty_id integer default null)
returns table (rank bigint, user_id uuid, name text, university_id integer, university_name text,
               faculty_id integer, faculty_name text,
               period_points bigint, total_points integer, level integer, level_name text,
               is_fondateur boolean, badges_count bigint, documents_count bigint)
language sql stable security definer set search_path = public as $$
  with pts as (
    select e.user_id, sum(e.points) as p
      from reputation_events e
     where e.created_at >= period_start(p_period)
     group by e.user_id
    having sum(e.points) > 0
  )
  select rank() over (order by pts.p desc, up.points desc) as rank,
         up.id, up.name, up.university_id, u.name, up.faculty_id, case when fa.name = '__root__' then u.name else fa.name end,
         pts.p, coalesce(up.points, 0), l.level, l.name, coalesce(up.is_fondateur, false),
         (select count(*) from user_badges b where b.user_id = up.id),
         (select count(*) from documents d where d.uploader_id = up.id and d.status in ('published', 'verified'))
    from pts
    join user_profiles up on up.id = pts.user_id
    left join universities u on u.id = up.university_id
    left join faculties fa on fa.id = up.faculty_id
    cross join lateral reputation_level(up.points) l
   where not coalesce(up.is_banned, false)
     and (p_university_id is null or up.university_id = p_university_id)
     and (p_faculty_id    is null or up.faculty_id    = p_faculty_id)
     and (p_filiere_id    is null or up.filiere_id    = p_filiere_id)
   order by 1
   limit least(coalesce(p_limit, 50), 100)
$$;

create or replace function public.get_faculty_leaderboard(p_period text default 'month', p_university_id integer default null, p_limit integer default 20)
returns table (rank bigint, faculty_id integer, faculty_name text, university_id integer, university_name text,
               period_points bigint, contributors bigint)
language sql stable security definer set search_path = public as $$
  with pts as (
    select up.faculty_id, sum(e.points) as p, count(distinct e.user_id) as contributors
      from reputation_events e join user_profiles up on up.id = e.user_id
     where e.created_at >= period_start(p_period) and up.faculty_id is not null
     group by up.faculty_id
    having sum(e.points) > 0
  )
  select rank() over (order by pts.p desc), fa.id,
         case when fa.name = '__root__' then u.name else fa.name end,   -- schools without faculties show the school name
         u.id, u.name, pts.p, pts.contributors
    from pts join faculties fa on fa.id = pts.faculty_id join universities u on u.id = fa.university_id
   where (p_university_id is null or u.id = p_university_id)
   order by 1
   limit least(coalesce(p_limit, 20), 100)
$$;

drop function if exists public.get_my_reputation(text);
create or replace function public.get_my_reputation(p_period text default 'week')
returns table (total_points integer, level integer, level_name text, level_min integer, next_level_min integer,
               period_points bigint, period_rank bigint, university_rank bigint, faculty_rank bigint)
language sql stable security definer set search_path = public as $$
  with me as (select * from user_profiles where id = auth.uid()),
  pts as (
    select e.user_id, sum(e.points) as p
      from reputation_events e where e.created_at >= period_start(p_period)
     group by e.user_id having sum(e.points) > 0
  ),
  ranked as (
    select pts.user_id, pts.p,
           rank() over (order by pts.p desc) as r_all,
           rank() over (partition by up.university_id order by pts.p desc) as r_uni,
           rank() over (partition by up.faculty_id order by pts.p desc) as r_fac
      from pts join user_profiles up on up.id = pts.user_id
     where not coalesce(up.is_banned, false)
  )
  select coalesce(me.points, 0), l.level, l.name, l.min_points, l.next_min_points,
         coalesce(ranked.p, 0), ranked.r_all, ranked.r_uni, case when me.faculty_id is not null then ranked.r_fac end
    from me cross join lateral reputation_level(me.points) l
    left join ranked on ranked.user_id = me.id
$$;

revoke all on function public.get_leaderboard(text, integer, integer, integer, integer),
                       public.get_faculty_leaderboard(text, integer, integer),
                       public.get_my_reputation(text) from public;
grant execute on function public.get_leaderboard(text, integer, integer, integer, integer),
                          public.get_faculty_leaderboard(text, integer, integer) to anon, authenticated;
grant execute on function public.get_my_reputation(text) to authenticated;

-- re-check everyone's badges with the new rules (no notifications for the catch-up)
do $$ declare r record; begin
  for r in select id from user_profiles loop perform check_badges(r.id); end loop;
  delete from notifications where type = 'badge' and created_at > now() - interval '1 minute';
end $$;

commit;
