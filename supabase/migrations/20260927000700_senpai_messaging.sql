-- ============================================================================
-- 9rawZid9ra — Senpai contact via Messenger: stats, limits, inactivity
-- ----------------------------------------------------------------------------
-- Contact moved from mailto: to the in-app Messenger (20260927000400). This
-- reconnects the senpai system to it:
--
--  1. senpai_contacts.answered_at — set automatically when the senpai replies
--     by DM. Response time and the 30-day inactivity rule become measurable
--     again (they were dropped as unmeasurable under mailto:, where we never
--     saw the reply).
--  2. Limits are enforced on `messages`, not on the senpai card. A student can
--     DM anyone from their profile page, so a card-level check would be
--     trivially bypassed. The trigger below applies the same caps to the first
--     message of a new request whatever the entry point.
--  3. One OPEN request per (senpai, student). Follow-up messages on an open
--     request are free; once answered, a new request may be opened, subject to
--     the caps again.
--
-- Naming note: what the brief calls a "senpai_request" is the existing
-- senpai_contacts row, and "thank_senpai +10" is the existing senpai_helpful
-- reputation rule, bumped 5 -> 10 here (event_type kept: dedupe keys in
-- reputation_events already reference 'senpai_helpful:<id>').
--
-- Safe to re-run.
-- ============================================================================

begin;

alter table public.senpai_contacts add column if not exists answered_at timestamptz;

-- One open request per pair. Follow-ups reuse it; answered ones don't block.
create unique index if not exists senpai_contacts_one_open
  on public.senpai_contacts (senpai_id, student_id) where answered_at is null;

update public.reputation_rules set points = 10 where event_type = 'senpai_helpful';

-- ---------------------------------------------------------------------------
-- Enforce the contact caps and track answers, whatever the entry point.
-- ---------------------------------------------------------------------------
create or replace function public.fn_messages_senpai_link() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_sp record; v_daily int; v_weekly int;
begin
  -- (a) student -> senpai
  select sp.* into v_sp from senpai_profiles sp
   where sp.user_id = new.receiver_id and sp.status in ('active', 'paused');

  if found and v_sp.user_id <> new.sender_id then
    if not exists (select 1 from senpai_contacts c
                    where c.senpai_id = v_sp.id and c.student_id = new.sender_id
                      and c.answered_at is null) then
      -- opening a NEW request: same caps as log_senpai_contact()
      if v_sp.status = 'paused' then
        raise exception 'senpai_paused' using errcode = 'P0001';
      end if;

      select count(*) into v_daily from senpai_contacts
       where student_id = new.sender_id and created_at >= date_trunc('day', now());
      if v_daily >= 3 then raise exception 'daily_limit' using errcode = 'P0001'; end if;

      select count(*) into v_weekly from senpai_contacts
       where senpai_id = v_sp.id and created_at >= now() - interval '7 days';
      if v_weekly >= v_sp.weekly_limit then raise exception 'senpai_full' using errcode = 'P0001'; end if;

      insert into senpai_contacts (senpai_id, student_id) values (v_sp.id, new.sender_id)
      on conflict do nothing;
    end if;
  end if;

  -- (b) senpai -> student: their reply closes the open request
  select sp.* into v_sp from senpai_profiles sp
   where sp.user_id = new.sender_id and sp.status in ('active', 'paused');
  if found then
    update senpai_contacts
       set answered_at = now()
     where senpai_id = v_sp.id and student_id = new.receiver_id and answered_at is null;
  end if;

  return new;
end $$;

drop trigger if exists trg_messages_senpai_link on public.messages;
create trigger trg_messages_senpai_link before insert on public.messages
  for each row execute function public.fn_messages_senpai_link();

-- ---------------------------------------------------------------------------
-- log_senpai_contact: now idempotent. Returns the existing open request
-- instead of failing, so clicking "Lui écrire" twice doesn't burn a slot.
-- ---------------------------------------------------------------------------
create or replace function public.log_senpai_contact(p_senpai_id integer)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_sp record; v_daily int; v_weekly int; v_id bigint;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_sp from senpai_profiles where id = p_senpai_id and status in ('active','paused');
  if not found then raise exception 'senpai not available' using errcode = 'P0002'; end if;
  if v_sp.user_id = auth.uid() then raise exception 'cannot contact yourself'; end if;

  select id into v_id from senpai_contacts
   where senpai_id = p_senpai_id and student_id = auth.uid() and answered_at is null;
  if v_id is not null then return v_id; end if;   -- already have an open request

  if v_sp.status = 'paused' then raise exception 'senpai_paused' using errcode = 'P0001'; end if;

  select count(*) into v_daily from senpai_contacts
   where student_id = auth.uid() and created_at >= date_trunc('day', now());
  if v_daily >= 3 then raise exception 'daily_limit' using errcode = 'P0001'; end if;

  select count(*) into v_weekly from senpai_contacts
   where senpai_id = p_senpai_id and created_at >= now() - interval '7 days';
  if v_weekly >= v_sp.weekly_limit then raise exception 'senpai_full' using errcode = 'P0001'; end if;

  insert into senpai_contacts (senpai_id, student_id) values (p_senpai_id, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- "Ça m'a aidé" only makes sense once the senpai actually replied.
create or replace function public.mark_senpai_contact_helpful(p_contact_id bigint) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_senpai_id integer; v_senpai_user uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  update senpai_contacts set marked_helpful = true
   where id = p_contact_id and student_id = auth.uid() and answered_at is not null
  returning senpai_id into v_senpai_id;
  if v_senpai_id is null then return; end if;
  select user_id into v_senpai_user from senpai_profiles where id = v_senpai_id;
  if v_senpai_user is not null then
    perform award_reputation(v_senpai_user, 'senpai_helpful', 'senpai_helpful:' || p_contact_id);
  end if;
end $$;

-- What the student sees: their own requests, and which can be thanked.
create or replace function public.get_my_senpai_requests()
returns table(id bigint, senpai_id integer, senpai_user_id uuid, senpai_name text,
              created_at timestamptz, answered_at timestamptz, marked_helpful boolean)
language sql stable security definer set search_path = public, extensions as $$
  select c.id, c.senpai_id, sp.user_id, up.name, c.created_at, c.answered_at, c.marked_helpful
    from senpai_contacts c
    join senpai_profiles sp on sp.id = c.senpai_id
    join user_profiles up on up.id = sp.user_id
   where c.student_id = auth.uid()
   order by c.created_at desc
   limit 50
$$;

-- Own senpai dashboard: adds answered/pending counts and median response time.
create or replace function public.get_my_senpai_profile()
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
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
    'contacts_week',  (select count(*) from senpai_contacts where senpai_id = me.id and created_at >= now() - interval '7 days'),
    'pending_count',  (select count(*) from senpai_contacts where senpai_id = me.id and answered_at is null),
    'answered_count', (select count(*) from senpai_contacts where senpai_id = me.id and answered_at is not null),
    'helpful_count',  (select count(*) from senpai_contacts where senpai_id = me.id and marked_helpful),
    'median_response_hours', (
      select round(percentile_cont(0.5) within group (
               order by extract(epoch from (answered_at - created_at)) / 3600.0)::numeric, 1)
        from senpai_contacts where senpai_id = me.id and answered_at is not null)
  ) into result;
  return result;
end $$;

-- 30-day inactivity rule, now that "answered" is a real signal.
-- Staff or scheduler only; pg_cron is not enabled, so call it manually or from
-- the admin panel until it is.
create or replace function public.pause_inactive_senpais()
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  if auth.uid() is not null and not is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  with stale as (
    select distinct sp.id
      from senpai_profiles sp
      join senpai_contacts c on c.senpai_id = sp.id
     where sp.status = 'active' and c.answered_at is null
       and c.created_at < now() - interval '30 days'
  )
  update senpai_profiles set status = 'paused' where id in (select id from stale);
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.get_my_senpai_requests() to authenticated;
grant execute on function public.pause_inactive_senpais() to authenticated;

commit;
