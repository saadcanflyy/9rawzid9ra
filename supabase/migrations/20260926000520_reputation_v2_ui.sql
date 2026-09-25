-- ============================================================================
-- 9rawZid9ra — Prompt 26 (reputation v2 UI) support fix
-- ----------------------------------------------------------------------------
-- award_top_university_contributors() sent its "top contributor" badge
-- notification to the bare '/classement' link. The frontend now supports a
-- ?scope= query param on that page (Global / Mon école / Ma faculté), so the
-- notification should land the recipient directly on their school's ranking
-- instead of the default global one.
--
-- Requires 20260926000400_reputation_v2.sql. Safe to re-run.
-- ============================================================================

begin;

create or replace function public.award_top_university_contributors(p_month date default null)
returns integer language plpgsql security definer set search_path = public as $function$
declare
  v_start timestamptz := date_trunc('month', coalesce(p_month, (now() - interval '1 month')::date));
  v_end   timestamptz := v_start + interval '1 month';
  v_period text := to_char(v_start, 'YYYY-MM');
  r record; n integer := 0;
begin
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
    values (r.user_id, 'badge', 'Top contributeur de ton école en ' || v_period, 'Top contributeur de ton école en ' || v_period, '/classement?scope=university', false);
    n := n + 1;
  end loop;
  return n;
end $function$;

commit;
