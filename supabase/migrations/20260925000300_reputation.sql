-- ============================================================================
-- 9rawZid9ra — Reputation, levels, badges and leaderboards
-- ----------------------------------------------------------------------------
-- One ledger (reputation_events) written ONLY by database triggers / functions.
-- user_profiles.points stays the running total (so existing UI keeps working) and
-- points_log keeps receiving a human-readable line per event (Profile activity).
--
-- Point rules (quality-weighted):
--   upload_published      +10   document visible (published or verified)
--   doc_verified          +40   verified by staff or by the community
--   helpful_received       +5   someone marks your document "utile"      (cap 100/day)
--   rating_received        +3   someone rates your document 4★ or 5★      (cap 60/day)
--   feedback_given         +1   you fill the quality checklist on a doc  (cap 10/day)
--   answer_posted          +5   you reply in Senpai Zone                 (cap 25/day)
--   post_helpful_received  +2   someone upvotes your Senpai post         (cap 40/day)
--   best_answer           +15   the author marks your reply as the best answer
--   report_confirmed      +10   a document you reported gets rejected
--   doc_rejected          −50   your document is rejected / removed by staff
-- Deleting your own document, removing a vote, lowering a rating etc. cancels the
-- matching points (each event has a unique dedupe key, so nothing is counted twice).
--
-- Levels: Nouveau 0 · Contributeur 50 · Expert 300 · Mentor 1000 · Légende du campus 3000
-- Requires the security + quality migrations. Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Rules, ledger, badges
-- ---------------------------------------------------------------------------
create table if not exists public.reputation_rules (
  event_type text primary key,
  points     integer not null,
  daily_cap  integer,            -- max points per user per day for this event (null = no cap)
  label      text not null
);
insert into public.reputation_rules (event_type, points, daily_cap, label) values
  ('upload_published',      10, null, 'Document publié'),
  ('doc_verified',          40, null, 'Document vérifié'),
  ('helpful_received',       5, 100,  'Document marqué utile'),
  ('rating_received',        3, 60,   'Document bien noté'),
  ('feedback_given',         1, 10,   'Avis qualité donné'),
  ('answer_posted',          5, 25,   'Réponse dans Senpai Zone'),
  ('post_helpful_received',  2, 40,   'Post Senpai apprécié'),
  ('best_answer',           15, null, 'Meilleure réponse'),
  ('report_confirmed',      10, null, 'Signalement confirmé'),
  ('doc_rejected',         -50, null, 'Document refusé'),
  ('admin_adjustment',       0, null, 'Ajustement par l''équipe')
on conflict (event_type) do update
  set points = excluded.points, daily_cap = excluded.daily_cap, label = excluded.label;

create table if not exists public.reputation_events (
  id          bigserial primary key,
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  event_type  text not null references public.reputation_rules(event_type),
  points      integer not null,
  dedupe_key  text not null unique,
  document_id integer,        -- no FK: events outlive deleted documents (penalties)
  post_id     integer,
  reply_id    bigint,
  actor_id    uuid,
  created_at  timestamptz not null default now()
);
create index if not exists idx_rep_events_user_time on public.reputation_events (user_id, created_at desc);
create index if not exists idx_rep_events_time      on public.reputation_events (created_at);
create index if not exists idx_rep_events_document  on public.reputation_events (document_id);

create table if not exists public.badges (
  code        text primary key,
  name        text not null,
  description text not null,
  icon        text not null,       -- icon name from src/design-system/ui.js
  tier        text not null default 'bronze',   -- bronze | silver | gold | special
  sort_order  integer not null default 100
);
insert into public.badges (code, name, description, icon, tier, sort_order) values
  ('fondateur',        'Fondateur',            'Parmi les 100 premiers contributeurs de 9rawZid9ra.',         'star',     'special', 1),
  ('first_upload',     'Premier partage',      'A publié son premier document.',                              'upload',   'bronze',  10),
  ('contributor_10',   'Contributeur régulier','10 documents publiés.',                                       'file',     'silver',  20),
  ('library_50',       'Bibliothécaire',       '50 documents publiés.',                                       'file',     'gold',    30),
  ('verified_5',       'Source fiable',        '5 documents vérifiés.',                                       'check',    'silver',  40),
  ('corrige_master',   'Maître des corrigés',  '5 corrigés publiés.',                                         'check',    'gold',    50),
  ('helper_10',        'Senpai',               '10 réponses dans Senpai Zone.',                               'reply',    'silver',  60),
  ('best_answer',      'Meilleure réponse',    'Une réponse choisie comme la meilleure.',                     'sparkle',  'bronze',  70),
  ('quality_guardian', 'Gardien de la qualité','10 signalements confirmés par la modération.',                'flag',     'gold',    80),
  ('reviewer_25',      'Relecteur',            'A évalué la qualité de 25 documents.',                        'eye',      'silver',  90),
  ('campus_legend',    'Légende du campus',    'A atteint le niveau Légende du campus (3 000 points).',       'star',     'gold',    5)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      tier = excluded.tier, sort_order = excluded.sort_order;

create table if not exists public.user_badges (
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  badge_code text not null references public.badges(code),
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_code)
);

alter table public.reputation_rules  enable row level security;
alter table public.reputation_events enable row level security;
alter table public.badges            enable row level security;
alter table public.user_badges       enable row level security;
drop policy if exists "Rules readable"       on public.reputation_rules;
drop policy if exists "Own events readable"  on public.reputation_events;
drop policy if exists "Badges readable"      on public.badges;
drop policy if exists "User badges readable" on public.user_badges;
create policy "Rules readable"       on public.reputation_rules  for select using (true);
create policy "Own events readable"  on public.reputation_events for select to authenticated using (auth.uid() = user_id or is_staff());
create policy "Badges readable"      on public.badges            for select using (true);
create policy "User badges readable" on public.user_badges       for select using (true);
revoke all on public.reputation_rules, public.reputation_events, public.badges, public.user_badges from anon, authenticated;
grant select on public.reputation_rules, public.badges, public.user_badges to anon, authenticated;
grant select on public.reputation_events to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Levels
-- ---------------------------------------------------------------------------
create or replace function public.reputation_level(p_points integer)
returns table (level integer, name text, min_points integer, next_min_points integer)
language sql immutable as $$
  select l.level, l.name, l.min_points, lead(l.min_points) over (order by l.level)
    from (values (1, 'Nouveau', 0), (2, 'Contributeur', 50), (3, 'Expert', 300),
                 (4, 'Mentor', 1000), (5, 'Légende du campus', 3000)) as l(level, name, min_points)
   order by (coalesce(p_points, 0) >= l.min_points) desc, l.level desc
   limit 1
$$;
-- note: lead() is computed before LIMIT, so next_min_points is the next level's threshold (null at max).

-- ---------------------------------------------------------------------------
-- 3. Award / revoke (internal — not callable from the browser)
-- ---------------------------------------------------------------------------
create or replace function public.check_badges(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_docs int; v_verified int; v_corriges int; v_replies int; v_best int; v_reports int; v_reviews int;
  v_points int; v_fond boolean; v_new text;
begin
  select count(*) filter (where status in ('published', 'verified')),
         count(*) filter (where status = 'verified'),
         count(*) filter (where status in ('published', 'verified') and doc_type like 'corrige%')
    into v_docs, v_verified, v_corriges
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
      ('fondateur',        v_fond),
      ('first_upload',     v_docs >= 1),
      ('contributor_10',   v_docs >= 10),
      ('library_50',       v_docs >= 50),
      ('verified_5',       v_verified >= 5),
      ('corrige_master',   v_corriges >= 5),
      ('helper_10',        v_replies >= 10),
      ('best_answer',      v_best >= 1),
      ('quality_guardian', v_reports >= 10),
      ('reviewer_25',      v_reviews >= 25),
      ('campus_legend',    v_points >= 3000)
    ) as b(code, earned)
    where earned
    on conflict do nothing
    returning badge_code
  loop
    insert into notifications (user_id, type, content, message, link, read)
    select p_user, 'badge', 'Nouveau badge : ' || name, 'Nouveau badge : ' || name, '/profile', false
      from badges where code = v_new;
  end loop;
end $$;

create or replace function public.award_reputation(
  p_user uuid, p_event text, p_dedupe text,
  p_document integer default null, p_post integer default null, p_reply bigint default null,
  p_actor uuid default null, p_points_override integer default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  r reputation_rules%rowtype;
  v_points int;
  v_today int;
  v_id bigint;
  v_old_level int; v_new_level int; v_level_name text;
begin
  if p_user is null then return 0; end if;
  select * into r from reputation_rules where event_type = p_event;
  if not found then raise exception 'unknown reputation event %', p_event; end if;
  v_points := coalesce(p_points_override, r.points);

  if r.daily_cap is not null and v_points > 0 then
    select coalesce(sum(points), 0) into v_today from reputation_events
     where user_id = p_user and event_type = p_event and created_at >= date_trunc('day', now());
    if v_today >= r.daily_cap then return 0; end if;
    v_points := least(v_points, r.daily_cap - v_today);
  end if;

  insert into reputation_events (user_id, event_type, points, dedupe_key, document_id, post_id, reply_id, actor_id)
  values (p_user, p_event, v_points, p_dedupe, p_document, p_post, p_reply, p_actor)
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then return 0; end if;

  select level into v_old_level from user_profiles up, reputation_level(up.points) where up.id = p_user;
  update user_profiles set points = greatest(0, coalesce(points, 0) + v_points) where id = p_user;
  insert into points_log (user_id, points, reason, document_id) values (p_user, v_points, r.label, p_document);

  select l.level, l.name into v_new_level, v_level_name from user_profiles up, reputation_level(up.points) l where up.id = p_user;
  if v_new_level > coalesce(v_old_level, 1) then
    insert into notifications (user_id, type, content, message, link, read)
    values (p_user, 'level_up', 'Niveau ' || v_level_name || ' atteint', 'Niveau ' || v_level_name || ' atteint', '/profile', false);
  end if;

  perform check_badges(p_user);
  return v_points;
end $$;

create or replace function public.revoke_reputation(p_dedupe text)
returns void language plpgsql security definer set search_path = public as $$
declare e reputation_events%rowtype; v_label text;
begin
  delete from reputation_events where dedupe_key = p_dedupe returning * into e;
  if not found then return; end if;
  update user_profiles set points = greatest(0, coalesce(points, 0) - e.points) where id = e.user_id;
  select label into v_label from reputation_rules where event_type = e.event_type;
  insert into points_log (user_id, points, reason, document_id) values (e.user_id, -e.points, 'Annulé : ' || v_label, e.document_id);
end $$;

revoke all on function public.award_reputation(uuid, text, text, integer, integer, bigint, uuid, integer),
                       public.revoke_reputation(text), public.check_badges(uuid) from public, anon, authenticated;

-- Admins can correct a score by hand.
create or replace function public.admin_adjust_reputation(p_user uuid, p_points integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform award_reputation(p_user, 'admin_adjustment', 'admin:' || gen_random_uuid(), null, null, null, auth.uid(), p_points);
  update points_log set reason = 'Ajustement : ' || left(p_reason, 120)
   where id = (select max(id) from points_log where user_id = p_user);
end $$;
revoke all on function public.admin_adjust_reputation(uuid, integer, text) from public, anon;
grant execute on function public.admin_adjust_reputation(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Triggers that earn / cancel points
-- ---------------------------------------------------------------------------
-- 4a. Documents: published, verified, rejected, deleted
drop trigger if exists on_document_upload on public.documents;          -- old +50 trigger (was also doubled by the browser)
drop function if exists public.award_upload_points();

create or replace function public.fn_rep_documents()
returns trigger language plpgsql security definer set search_path = public as $$
declare rep record;
begin
  if tg_op = 'DELETE' then
    if auth.uid() is not null and auth.uid() is distinct from old.uploader_id and is_staff() then
      perform award_reputation(old.uploader_id, 'doc_rejected', 'rejected:' || old.id, old.id, null, null, auth.uid());
    end if;
    -- cancel everything the uploader earned from this document (reviewers and reporters keep theirs)
    for rep in select dedupe_key from reputation_events
                where document_id = old.id and user_id = old.uploader_id
                  and event_type in ('upload_published', 'doc_verified', 'helpful_received', 'rating_received') loop
      perform revoke_reputation(rep.dedupe_key);
    end loop;
    return old;
  end if;

  if new.status in ('published', 'verified') and (tg_op = 'INSERT' or old.status not in ('published', 'verified')) then
    perform award_reputation(new.uploader_id, 'upload_published', 'upload:' || new.id, new.id);
  end if;

  if new.status = 'verified' and (tg_op = 'INSERT' or old.status <> 'verified') then
    perform award_reputation(new.uploader_id, 'doc_verified', 'verified:' || new.id, new.id, null, null, new.verified_by);
  elsif tg_op = 'UPDATE' and old.status = 'verified' and new.status <> 'verified' then
    perform revoke_reputation('verified:' || new.id);
  end if;

  if tg_op = 'UPDATE' and new.status = 'rejected' and old.status <> 'rejected' then
    perform revoke_reputation('upload:' || new.id);
    perform revoke_reputation('verified:' || new.id);
    perform award_reputation(new.uploader_id, 'doc_rejected', 'rejected:' || new.id, new.id, null, null, auth.uid());
    for rep in select user_id from document_reactions where document_id = new.id and reaction_type = 'report' loop
      perform award_reputation(rep.user_id, 'report_confirmed', 'report:' || new.id || ':' || rep.user_id, new.id);
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'rejected' and new.status <> 'rejected' then
    perform revoke_reputation('rejected:' || new.id);
  end if;

  if tg_op = 'INSERT' then
    perform check_badges(new.uploader_id);
  end if;
  return null;
end $$;
drop trigger if exists trg_rep_documents on public.documents;
create trigger trg_rep_documents after insert or update of status or delete on public.documents
  for each row execute function public.fn_rep_documents();

-- The Fondateur flag keeps working; the badge is granted through check_badges.
create or replace function public.check_fondateur_badge()
returns trigger language plpgsql security definer set search_path = public as $$
declare c integer;
begin
  select count(distinct uploader_id) into c from documents;
  if c <= 100 then
    update user_profiles set is_fondateur = true where id = new.uploader_id and not coalesce(is_fondateur, false);
    perform check_badges(new.uploader_id);
  end if;
  return new;
end $$;

-- 4b. Reactions on documents: helpful + good ratings
create or replace function public.fn_rep_reactions()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uploader uuid; rec record; v_key text;
begin
  rec := coalesce(new, old);
  select uploader_id into v_uploader from documents where id = rec.document_id;
  if v_uploader is null or v_uploader = rec.user_id then return null; end if;

  if rec.reaction_type = 'helpful' then
    v_key := 'helpful:' || rec.document_id || ':' || rec.user_id;
    if tg_op = 'DELETE' then perform revoke_reputation(v_key);
    else perform award_reputation(v_uploader, 'helpful_received', v_key, rec.document_id, null, null, rec.user_id); end if;
  elsif rec.reaction_type = 'rating' then
    v_key := 'rating:' || rec.document_id || ':' || rec.user_id;
    if tg_op = 'DELETE' or coalesce(new.rating, 0) < 4 then perform revoke_reputation(v_key);
    else perform award_reputation(v_uploader, 'rating_received', v_key, rec.document_id, null, null, rec.user_id); end if;
  end if;
  return null;
end $$;
drop trigger if exists trg_rep_reactions on public.document_reactions;
create trigger trg_rep_reactions after insert or update or delete on public.document_reactions
  for each row execute function public.fn_rep_reactions();

-- 4c. Quality feedback given
create or replace function public.fn_rep_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform award_reputation(new.user_id, 'feedback_given', 'feedback:' || new.document_id || ':' || new.user_id, new.document_id);
  return null;
end $$;
drop trigger if exists trg_rep_feedback on public.document_feedback;
create trigger trg_rep_feedback after insert on public.document_feedback
  for each row execute function public.fn_rep_feedback();

-- 4d. Senpai Zone: replies, upvotes on posts, best answer
alter table public.senpai_replies add column if not exists is_best boolean not null default false;

create or replace function public.fn_rep_replies()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_post_author uuid;
begin
  if tg_op = 'DELETE' then
    perform revoke_reputation('answer:' || old.id);
    perform revoke_reputation('best:' || old.id);
    return null;
  end if;
  select author_id into v_post_author from senpai_posts where id = new.post_id;
  if v_post_author is distinct from new.author_id then
    perform award_reputation(new.author_id, 'answer_posted', 'answer:' || new.id, null, new.post_id::int, new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_rep_replies on public.senpai_replies;
create trigger trg_rep_replies after insert or delete on public.senpai_replies
  for each row execute function public.fn_rep_replies();

create or replace function public.fn_rep_senpai_votes()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid; rec record;
begin
  rec := coalesce(new, old);
  select author_id into v_author from senpai_posts where id = rec.post_id;
  if v_author is null or v_author = rec.user_id then return null; end if;
  if tg_op = 'DELETE' then perform revoke_reputation('postvote:' || rec.post_id || ':' || rec.user_id);
  else perform award_reputation(v_author, 'post_helpful_received', 'postvote:' || rec.post_id || ':' || rec.user_id, null, rec.post_id, null, rec.user_id); end if;
  return null;
end $$;
drop trigger if exists trg_rep_senpai_votes on public.senpai_votes;
create trigger trg_rep_senpai_votes after insert or delete on public.senpai_votes
  for each row execute function public.fn_rep_senpai_votes();

create or replace function public.mark_best_reply(p_reply_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_reply senpai_replies%rowtype; v_post_author uuid; v_prev bigint;
begin
  select * into v_reply from senpai_replies where id = p_reply_id;
  if not found then raise exception 'reply not found'; end if;
  select author_id into v_post_author from senpai_posts where id = v_reply.post_id;
  if v_post_author is distinct from auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_reply.author_id = auth.uid() then raise exception 'Tu ne peux pas choisir ta propre réponse.'; end if;

  select id into v_prev from senpai_replies where post_id = v_reply.post_id and is_best and id <> p_reply_id;
  if v_prev is not null then
    update senpai_replies set is_best = false where id = v_prev;
    perform revoke_reputation('best:' || v_prev);
  end if;
  update senpai_replies set is_best = true where id = p_reply_id;
  perform award_reputation(v_reply.author_id, 'best_answer', 'best:' || p_reply_id, null, v_reply.post_id::int, p_reply_id, auth.uid());
end $$;
revoke all on function public.mark_best_reply(bigint) from public, anon;
grant execute on function public.mark_best_reply(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Leaderboards
-- ---------------------------------------------------------------------------
create or replace function public.period_start(p_period text)
returns timestamptz language sql stable as $$
  select case p_period
           when 'week'  then date_trunc('week', now())
           when 'month' then date_trunc('month', now())
           else '-infinity'::timestamptz end
$$;

-- Students (period: 'week' | 'month' | 'all'; optional school / filière filter)
create or replace function public.get_leaderboard(
  p_period text default 'week', p_university_id integer default null, p_filiere_id integer default null, p_limit integer default 50)
returns table (rank bigint, user_id uuid, name text, university_id integer, university_name text,
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
         up.id, up.name, up.university_id, u.name,
         pts.p, coalesce(up.points, 0), l.level, l.name, coalesce(up.is_fondateur, false),
         (select count(*) from user_badges b where b.user_id = up.id),
         (select count(*) from documents d where d.uploader_id = up.id and d.status in ('published', 'verified'))
    from pts
    join user_profiles up on up.id = pts.user_id
    left join universities u on u.id = up.university_id
    cross join lateral reputation_level(up.points) l
   where not coalesce(up.is_banned, false)
     and (p_university_id is null or up.university_id = p_university_id)
     and (p_filiere_id    is null or up.filiere_id    = p_filiere_id)
   order by 1
   limit least(coalesce(p_limit, 50), 100)
$$;

-- Schools, ranked by points earned by their students in the period
create or replace function public.get_university_leaderboard(p_period text default 'month', p_limit integer default 20)
returns table (rank bigint, university_id integer, university_name text, city text,
               period_points bigint, contributors bigint, documents_count bigint)
language sql stable security definer set search_path = public as $$
  with pts as (
    select up.university_id, sum(e.points) as p, count(distinct e.user_id) as contributors
      from reputation_events e join user_profiles up on up.id = e.user_id
     where e.created_at >= period_start(p_period) and up.university_id is not null
     group by up.university_id
    having sum(e.points) > 0
  )
  select rank() over (order by pts.p desc), u.id, u.name, u.city, pts.p, pts.contributors,
         (select count(*) from documents d join modules m on m.id = d.module_id
            join filieres f on f.id = m.filiere_id join faculties fa on fa.id = f.faculty_id
           where fa.university_id = u.id and d.status in ('published', 'verified'))
    from pts join universities u on u.id = pts.university_id
   order by 1
   limit least(coalesce(p_limit, 20), 100)
$$;

-- The signed-in student's own position
create or replace function public.get_my_reputation(p_period text default 'week')
returns table (total_points integer, level integer, level_name text, level_min integer, next_level_min integer,
               period_points bigint, period_rank bigint, university_rank bigint)
language sql stable security definer set search_path = public as $$
  with me as (select * from user_profiles where id = auth.uid()),
  pts as (
    select e.user_id, sum(e.points) as p
      from reputation_events e where e.created_at >= period_start(p_period)
     group by e.user_id having sum(e.points) > 0
  ),
  ranked as (
    select pts.user_id, pts.p, up.university_id,
           rank() over (order by pts.p desc) as r_all,
           rank() over (partition by up.university_id order by pts.p desc) as r_uni
      from pts join user_profiles up on up.id = pts.user_id
     where not coalesce(up.is_banned, false)
  )
  select coalesce(me.points, 0), l.level, l.name, l.min_points, l.next_min_points,
         coalesce(ranked.p, 0), ranked.r_all, ranked.r_uni
    from me cross join lateral reputation_level(me.points) l
    left join ranked on ranked.user_id = me.id
$$;

revoke all on function public.get_leaderboard(text, integer, integer, integer),
                       public.get_university_leaderboard(text, integer),
                       public.get_my_reputation(text) from public;
grant execute on function public.get_leaderboard(text, integer, integer, integer),
                          public.get_university_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.get_my_reputation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Rebuild everyone's points from history with the new rules
--    (existing totals were doubled: +50 by the trigger AND +50 by the browser)
-- ---------------------------------------------------------------------------
do $$
declare d record; r record; v record; f record; rp record;
begin
  if exists (select 1 from reputation_events) then return; end if;   -- only once

  update user_profiles set points = 0;
  insert into points_log (user_id, points, reason)
  select id, 0, 'Nouveau système de réputation : points recalculés' from user_profiles;

  for d in select * from documents where status in ('published', 'verified') order by created_at loop
    perform award_reputation(d.uploader_id, 'upload_published', 'upload:' || d.id, d.id);
    if d.status = 'verified' then
      perform award_reputation(d.uploader_id, 'doc_verified', 'verified:' || d.id, d.id);
    end if;
  end loop;
  for r in select dr.*, doc.uploader_id from document_reactions dr join documents doc on doc.id = dr.document_id
            where dr.user_id is distinct from doc.uploader_id loop
    if r.reaction_type = 'helpful' then
      perform award_reputation(r.uploader_id, 'helpful_received', 'helpful:' || r.document_id || ':' || r.user_id, r.document_id);
    elsif r.reaction_type = 'rating' and r.rating >= 4 then
      perform award_reputation(r.uploader_id, 'rating_received', 'rating:' || r.document_id || ':' || r.user_id, r.document_id);
    end if;
  end loop;
  for v in select sr.* from senpai_replies sr join senpai_posts sp on sp.id = sr.post_id where sp.author_id is distinct from sr.author_id loop
    perform award_reputation(v.author_id, 'answer_posted', 'answer:' || v.id, null, v.post_id::int, v.id);
  end loop;
  for f in select sv.*, sp.author_id from senpai_votes sv join senpai_posts sp on sp.id = sv.post_id where sp.author_id is distinct from sv.user_id loop
    perform award_reputation(f.author_id, 'post_helpful_received', 'postvote:' || f.post_id || ':' || f.user_id, null, f.post_id);
  end loop;
  -- backfilled events are dated at the original activity time where we know it
  update reputation_events e set created_at = doc.created_at
    from documents doc where e.document_id = doc.id and e.event_type in ('upload_published', 'doc_verified');
  for rp in select id from user_profiles loop perform check_badges(rp.id); end loop;
  delete from notifications where type in ('badge', 'level_up') and created_at > now() - interval '1 minute';
end $$;

commit;
