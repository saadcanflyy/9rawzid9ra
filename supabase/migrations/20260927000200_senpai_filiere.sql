-- ============================================================================
-- 9rawZid9ra — Senpai de filière (volunteer student mentors, per filière)
-- ----------------------------------------------------------------------------
-- A student with a filière set can become a benevole "senpai" for that
-- filière. Up to 3 active senpais are shown per filière. Contact happens
-- through a client-side mailto: link (the senpai's real email, from
-- user_profiles.email) — deliberately NOT a relayed/logged email service, so
-- this needs no edge function, no email-sending API key, and no message
-- content ever touches our servers. Because of that we cannot detect whether
-- a senpai actually replied, so there is no "responds within Xd" computed
-- from real data (self-reported at application time instead) and no
-- auto-hide-after-30-days-silent rule (contact/helpful counts are surfaced to
-- staff instead, who can pause a senpai manually).
-- ============================================================================

begin;

create table if not exists public.senpai_profiles (
  id             serial primary key,
  user_id        uuid not null unique references public.user_profiles(id) on delete cascade,
  filiere_id     integer not null references public.filieres(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'active', 'paused', 'rejected')),
  help_with      text[] not null default '{}',   -- subset of: exams, modules, internships, orientation
  response_estimate text,                        -- self-reported: 'hours' | 'days' | 'week'
  weekly_limit   integer not null default 5 check (weekly_limit between 1 and 50),
  is_graduate    boolean not null default false,
  semester_label text,                           -- snapshot at application time (e.g. 'S6'), null when is_graduate
  applied_at     timestamptz not null default now(),
  approved_at    timestamptz
);
create index if not exists idx_senpai_profiles_filiere_active on public.senpai_profiles (filiere_id) where status = 'active';

create table if not exists public.senpai_contacts (
  id             bigserial primary key,
  senpai_id      integer not null references public.senpai_profiles(id) on delete cascade,
  student_id     uuid not null references public.user_profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  marked_helpful boolean
);
create index if not exists idx_senpai_contacts_senpai on public.senpai_contacts (senpai_id, created_at desc);
create index if not exists idx_senpai_contacts_student on public.senpai_contacts (student_id, created_at desc);

create table if not exists public.senpai_reports (
  id           serial primary key,
  senpai_id    integer not null references public.senpai_profiles(id) on delete cascade,
  reporter_id  uuid not null references public.user_profiles(id) on delete cascade,
  reason       text not null,
  details      text,
  created_at   timestamptz not null default now(),
  resolved     boolean not null default false
);

alter table public.senpai_profiles enable row level security;
alter table public.senpai_contacts enable row level security;
alter table public.senpai_reports  enable row level security;

drop policy if exists "Senpai profile readable by owner or staff" on public.senpai_profiles;
create policy "Senpai profile readable by owner or staff" on public.senpai_profiles
  for select to authenticated using (auth.uid() = user_id or is_staff());
drop policy if exists "Senpai profile insert own" on public.senpai_profiles;
create policy "Senpai profile insert own" on public.senpai_profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Senpai profile update own or staff" on public.senpai_profiles;
create policy "Senpai profile update own or staff" on public.senpai_profiles
  for update to authenticated using (auth.uid() = user_id or is_staff()) with check (auth.uid() = user_id or is_staff());

-- No direct insert policy on purpose — contacts only go through log_senpai_contact()
-- (SECURITY DEFINER), which enforces the daily/weekly caps. RLS alone can't enforce those.
drop policy if exists "Senpai contacts readable by parties or staff" on public.senpai_contacts;
create policy "Senpai contacts readable by parties or staff" on public.senpai_contacts
  for select to authenticated using (
    auth.uid() = student_id or is_staff()
    or auth.uid() = (select sp.user_id from senpai_profiles sp where sp.id = senpai_id)
  );
drop policy if exists "Senpai contacts marked helpful by student" on public.senpai_contacts;
create policy "Senpai contacts marked helpful by student" on public.senpai_contacts
  for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "Senpai reports insert own" on public.senpai_reports;
create policy "Senpai reports insert own" on public.senpai_reports
  for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "Senpai reports staff only read" on public.senpai_reports;
create policy "Senpai reports staff only read" on public.senpai_reports
  for select to authenticated using (is_staff());
drop policy if exists "Senpai reports staff only resolve" on public.senpai_reports;
create policy "Senpai reports staff only resolve" on public.senpai_reports
  for update to authenticated using (is_staff()) with check (is_staff());

revoke all on public.senpai_profiles, public.senpai_contacts, public.senpai_reports from anon, authenticated;
grant select, insert, update on public.senpai_profiles to authenticated;
grant select on public.senpai_contacts to authenticated;
grant update (marked_helpful) on public.senpai_contacts to authenticated;
grant select, insert, update on public.senpai_reports to authenticated;
grant usage, select on sequence public.senpai_profiles_id_seq, public.senpai_contacts_id_seq, public.senpai_reports_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- Reputation: +5 pts to the senpai when a student marks a contact "ça m'a aidé".
-- Not awarded per message received (only per confirmed-helpful mark), so it
-- can't be farmed by contacting yourself or spamming messages.
-- ---------------------------------------------------------------------------
insert into public.reputation_rules (event_type, points, daily_cap, label)
values ('senpai_helpful', 5, 50, 'Un étudiant a trouvé ton aide utile')
on conflict (event_type) do nothing;

insert into public.badges (code, name, description, icon, tier, sort_order)
values ('senpai_filiere', 'Senpai de filière', 'Devient senpai bénévole de sa filière.', 'heart', 'gold',
        coalesce((select max(sort_order) from public.badges), 0) + 1)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Shared: activate a senpai profile (used by auto-approval and staff approval).
-- ---------------------------------------------------------------------------
create or replace function public.activate_senpai_profile(p_id integer) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  update senpai_profiles set status = 'active', approved_at = now() where id = p_id returning user_id into v_user;
  if v_user is not null then
    insert into user_badges (user_id, badge_code) values (v_user, 'senpai_filiere') on conflict do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- apply_to_be_senpai — auto-activates at level >= 3 (Contributeur de confiance),
-- otherwise goes to the staff queue. Re-applying after a rejection is allowed
-- (upsert on the unique user_id).
-- ---------------------------------------------------------------------------
create or replace function public.apply_to_be_senpai(
  p_help_with text[], p_response_estimate text, p_weekly_limit integer default 5, p_is_graduate boolean default false
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me record; v_id integer; v_level integer; v_status text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into me from user_profiles where id = auth.uid();
  if me.filiere_id is null then raise exception 'filiere required'; end if;

  select level into v_level from reputation_level(me.points);
  v_status := case when coalesce(v_level, 1) >= 3 then 'active' else 'pending' end;

  insert into senpai_profiles (user_id, filiere_id, help_with, response_estimate, weekly_limit, is_graduate, semester_label, status, approved_at)
  values (auth.uid(), me.filiere_id, coalesce(p_help_with, '{}'), p_response_estimate, coalesce(p_weekly_limit, 5), coalesce(p_is_graduate, false),
          case when p_is_graduate then null else me.current_semester end, v_status, case when v_status = 'active' then now() end)
  on conflict (user_id) do update set
    filiere_id = excluded.filiere_id, help_with = excluded.help_with, response_estimate = excluded.response_estimate,
    weekly_limit = excluded.weekly_limit, is_graduate = excluded.is_graduate, semester_label = excluded.semester_label,
    status = excluded.status, applied_at = now(), approved_at = excluded.approved_at
  returning id into v_id;

  if v_status = 'active' then
    insert into user_badges (user_id, badge_code) values (auth.uid(), 'senpai_filiere') on conflict do nothing;
  end if;
  return v_id;
end $$;

create or replace function public.update_senpai_profile(p_help_with text[], p_response_estimate text, p_weekly_limit integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update senpai_profiles set help_with = coalesce(p_help_with, help_with), response_estimate = coalesce(p_response_estimate, response_estimate),
         weekly_limit = coalesce(p_weekly_limit, weekly_limit)
   where user_id = auth.uid();
end $$;

create or replace function public.pause_senpai(p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update senpai_profiles set status = case when p_paused then 'paused' else 'active' end
   where user_id = auth.uid() and status in ('active', 'paused');
end $$;

-- ---------------------------------------------------------------------------
-- get_filiere_senpais — public-facing directory for one filière (max 3).
-- Returns the senpai's own email (from user_profiles.email) for the
-- client-side mailto: link; authenticated only, matching every other
-- authenticated-only RPC in this schema (get_professor_queue, assistant_*…).
-- ---------------------------------------------------------------------------
create or replace function public.get_filiere_senpais(p_filiere_id integer)
returns table(id integer, user_id uuid, name text, email text, points integer, is_fondateur boolean,
              help_with text[], response_estimate text, semester_label text, is_graduate boolean)
language sql stable security definer set search_path = public as $$
  select sp.id, sp.user_id, up.name, up.email, up.points, coalesce(up.is_fondateur, false),
         sp.help_with, sp.response_estimate, sp.semester_label, sp.is_graduate
    from senpai_profiles sp join user_profiles up on up.id = sp.user_id
   where sp.filiere_id = p_filiere_id and sp.status = 'active' and auth.uid() is not null
   order by sp.approved_at asc nulls last
   limit 3
$$;

create or replace function public.get_my_senpai_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me record; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into me from senpai_profiles where user_id = auth.uid();
  if not found then return null; end if;
  select jsonb_build_object(
    'id', me.id, 'status', me.status, 'filiere_id', me.filiere_id, 'help_with', me.help_with,
    'response_estimate', me.response_estimate, 'weekly_limit', me.weekly_limit, 'is_graduate', me.is_graduate,
    'semester_label', me.semester_label, 'applied_at', me.applied_at, 'approved_at', me.approved_at,
    'contacts_total', (select count(*) from senpai_contacts where senpai_id = me.id),
    'contacts_week', (select count(*) from senpai_contacts where senpai_id = me.id and created_at >= now() - interval '7 days'),
    'helpful_count', (select count(*) from senpai_contacts where senpai_id = me.id and marked_helpful)
  ) into result;
  return result;
end $$;

-- ---------------------------------------------------------------------------
-- log_senpai_contact — called right when the student clicks "Lui écrire",
-- before the mailto: link opens. Enforces the caps (RLS can't: they're
-- cross-row counts, not a simple ownership check).
-- ---------------------------------------------------------------------------
create or replace function public.log_senpai_contact(p_senpai_id integer)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_sp record; v_daily int; v_weekly int; v_id bigint;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_sp from senpai_profiles where id = p_senpai_id and status = 'active';
  if not found then raise exception 'senpai not available' using errcode = 'P0002'; end if;
  if v_sp.user_id = auth.uid() then raise exception 'cannot contact yourself'; end if;

  select count(*) into v_daily from senpai_contacts where student_id = auth.uid() and created_at >= date_trunc('day', now());
  if v_daily >= 3 then raise exception 'daily_limit' using errcode = 'P0001'; end if;

  select count(*) into v_weekly from senpai_contacts where senpai_id = p_senpai_id and created_at >= now() - interval '7 days';
  if v_weekly >= v_sp.weekly_limit then raise exception 'senpai_full' using errcode = 'P0001'; end if;

  insert into senpai_contacts (senpai_id, student_id) values (p_senpai_id, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.mark_senpai_contact_helpful(p_contact_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_senpai_id integer; v_senpai_user uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update senpai_contacts set marked_helpful = true
   where id = p_contact_id and student_id = auth.uid()
  returning senpai_id into v_senpai_id;
  if v_senpai_id is null then return; end if;
  select user_id into v_senpai_user from senpai_profiles where id = v_senpai_id;
  if v_senpai_user is not null then
    perform award_reputation(v_senpai_user, 'senpai_helpful', 'senpai_helpful:' || p_contact_id);
  end if;
end $$;

-- get_user_senpai_profile — public profile page badge + "Lui écrire" for a
-- specific user, when they're an active senpai (own or someone else's profile).
create or replace function public.get_user_senpai_profile(p_user_id uuid)
returns table(id integer, filiere_id integer, filiere_name text, email text,
              help_with text[], response_estimate text, semester_label text, is_graduate boolean)
language sql stable security definer set search_path = public as $$
  select sp.id, sp.filiere_id, f.name, up.email, sp.help_with, sp.response_estimate, sp.semester_label, sp.is_graduate
    from senpai_profiles sp
    join filieres f on f.id = sp.filiere_id
    join user_profiles up on up.id = sp.user_id
   where sp.user_id = p_user_id and sp.status = 'active' and auth.uid() is not null
$$;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create or replace function public.get_senpai_applications(p_status text default 'pending')
returns table(id integer, user_id uuid, name text, points integer, filiere_id integer, filiere_name text,
              university_name text, help_with text[], response_estimate text, semester_label text, is_graduate boolean,
              applied_at timestamptz, contacts_total bigint, helpful_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select sp.id, sp.user_id, up.name, up.points, sp.filiere_id, f.name, u.name,
           sp.help_with, sp.response_estimate, sp.semester_label, sp.is_graduate, sp.applied_at,
           (select count(*) from senpai_contacts c where c.senpai_id = sp.id),
           (select count(*) from senpai_contacts c where c.senpai_id = sp.id and c.marked_helpful)
      from senpai_profiles sp
      join user_profiles up on up.id = sp.user_id
      join filieres f on f.id = sp.filiere_id
      left join faculties fa on fa.id = f.faculty_id
      left join universities u on u.id = fa.university_id
     where sp.status = coalesce(p_status, sp.status)
     order by sp.applied_at desc;
end $$;

create or replace function public.approve_senpai(p_id integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform activate_senpai_profile(p_id);
end $$;

create or replace function public.reject_senpai(p_id integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update senpai_profiles set status = 'rejected' where id = p_id;
end $$;

create or replace function public.report_senpai(p_senpai_id integer, p_reason text, p_details text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  insert into senpai_reports (senpai_id, reporter_id, reason, details) values (p_senpai_id, auth.uid(), p_reason, p_details);
end $$;

create or replace function public.get_senpai_reports(p_resolved boolean default false)
returns table(id integer, senpai_id integer, senpai_name text, reporter_name text, reason text, details text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select r.id, r.senpai_id, sup.name, rup.name, r.reason, r.details, r.created_at
      from senpai_reports r
      join senpai_profiles sp on sp.id = r.senpai_id
      join user_profiles sup on sup.id = sp.user_id
      join user_profiles rup on rup.id = r.reporter_id
     where r.resolved = coalesce(p_resolved, r.resolved)
     order by r.created_at desc;
end $$;

create or replace function public.resolve_senpai_report(p_id integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update senpai_reports set resolved = true where id = p_id;
end $$;

grant execute on function
  public.apply_to_be_senpai(text[], text, integer, boolean),
  public.update_senpai_profile(text[], text, integer),
  public.pause_senpai(boolean),
  public.get_filiere_senpais(integer),
  public.get_user_senpai_profile(uuid),
  public.get_my_senpai_profile(),
  public.log_senpai_contact(integer),
  public.mark_senpai_contact_helpful(bigint),
  public.report_senpai(integer, text, text)
to authenticated;

grant execute on function
  public.get_senpai_applications(text),
  public.approve_senpai(integer),
  public.reject_senpai(integer),
  public.get_senpai_reports(boolean),
  public.resolve_senpai_report(integer)
to authenticated;

commit;
