-- ============================================================================
-- 9rawZid9ra — function EXECUTE grants: regression fix + a permanent guard
-- ----------------------------------------------------------------------------
-- 20260927000300 revoked PUBLIC execute on every function in `public` and
-- granted back an allow-list. Every migration that ran AFTER it (000400–001200)
-- created new functions that picked up Postgres' built-in
-- `EXECUTE ON FUNCTION TO PUBLIC` again. The ALTER DEFAULT PRIVILEGES in 000300
-- did not hold for them.
--
-- Verified exploitable as `anon` before this migration:
--
--   set local role anon;
--   select public.pause_inactive_senpais();   -- succeeds
--
-- pause_inactive_senpais() guards with `auth.uid() is not null and not
-- is_staff()`, which is FALSE for an anonymous caller — anon has no auth.uid()
-- — so the guard waves it through. Over PostgREST that is an unauthenticated
-- POST to /rest/v1/rpc/pause_inactive_senpais that pauses every senpai with a
-- 30-day-unanswered request: a denial of service on the whole senpai feature,
-- repeatable by anyone who can reach the API.
--
-- Also left world-executable by the same regression: admin_list_users,
-- admin_top_users, get_my_ban_status, get_my_senpai_requests, and all eleven
-- fn_* trigger/rate-limit functions (proacl null = owner + PUBLIC).
--
-- Three things here, in order of durability:
--   1. Re-run the blanket revoke + the 000300 allow-list, extended with the
--      functions legitimately added since.
--   2. Harden the two guards that mistake "no JWT" for "trusted scheduler", so
--      a future grants regression is not immediately exploitable again.
--   3. An event trigger that revokes PUBLIC execute the moment any new function
--      is created in `public` — so this cannot come back a third time.
--
-- Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Blanket revoke, then re-grant the allow-list.
--    Extension-owned functions (pg_trgm) are skipped: revoking those breaks the
--    `%` operator and all fuzzy search.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- 1a. anon + authenticated: the signed-out browse surface. Unchanged from 000300.
do $$
declare r record;
  allow text[] := array[
    'search_catalog','search_suggest','resolve_academic_context','get_professor',
    'search_professors','get_leaderboard','get_faculty_leaderboard','get_university_leaderboard',
    'get_platform_stats','get_module_overview','get_related_modules','get_missing_resources',
    'increment_post_views','log_search','is_admin','is_staff',
    'search_norm','search_expand','f_unaccent','semester_matches','period_start',
    'reputation_level','entity_aliases','filiere_aliases','professor_name_parts',
    'compute_document_quality_v2','module_search_doc','check_duplicate_module'
  ];
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(allow)
  loop
    execute format('grant execute on function %s to anon, authenticated', r.sig);
  end loop;
end $$;

-- 1b. authenticated only. The 000300 list, plus the four added by 000500/000700.
do $$
declare r record;
  allow text[] := array[
    'get_home_feed','get_my_reputation','complete_onboarding','record_download',
    'report_document','propose_professor','find_duplicate_documents','mark_best_reply',
    'recommend_for_me',
    'apply_to_be_senpai','update_senpai_profile','pause_senpai','get_my_senpai_profile',
    'get_filiere_senpais','get_user_senpai_profile','log_senpai_contact',
    'mark_senpai_contact_helpful','report_senpai',
    'moderate_document','get_moderation_queue','staff_notify','staff_moderate_post',
    'admin_broadcast','admin_set_moderator','admin_set_premium','admin_adjust_reputation',
    'admin_get_inbox','admin_get_thread','mod_ban_user','mod_send_message',
    'get_professor_queue','verify_professor','merge_professors','reject_professor',
    'get_search_insights','get_senpai_applications','approve_senpai','reject_senpai',
    'get_senpai_reports','resolve_senpai_report','award_top_university_contributors',
    'get_analytics_extra','get_docs_per_day','get_users_per_day','get_top_uploaders',
    'get_top_modules_by_downloads','get_top_uploaders_in_filiere',
    -- added after 000300
    'get_my_ban_status','admin_list_users','admin_top_users','get_my_senpai_requests',
    'pause_inactive_senpais'
  ];
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(allow)
  loop
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Stop treating "no JWT" as "trusted scheduler".
--
--    Both functions must stay callable by pg_cron, which has no auth.uid(), and
--    by staff from the admin panel. The discriminator is PostgREST: every call
--    arriving over the API carries the `request.method` GUC, and the scheduler's
--    does not. So an anonymous HTTP call is now rejected on its own merits,
--    whatever the grants happen to say.
--
--    Bodies are otherwise untouched.
-- ---------------------------------------------------------------------------
create or replace function public.pause_inactive_senpais()
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  if not is_staff() and current_setting('request.method', true) is not null then
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

do $$
declare v_def text;
begin
  -- Same guard swap on award_top_university_contributors, without restating a
  -- body I would risk transcribing wrong: rewrite only the guard line.
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'award_top_university_contributors';

  v_def := replace(
    v_def,
    'if auth.uid() is not null and not is_staff() then raise exception ''forbidden'' using errcode = ''42501''; end if;',
    'if not is_staff() and current_setting(''request.method'', true) is not null then raise exception ''forbidden'' using errcode = ''42501''; end if;'
  );

  if v_def not like '%request.method%' then
    raise exception 'guard line not found in award_top_university_contributors — aborting';
  end if;
  execute v_def;
end $$;

-- ---------------------------------------------------------------------------
-- 3. The permanent guard. Fires on every CREATE FUNCTION in `public` and drops
--    the built-in PUBLIC grant immediately, so a future migration cannot
--    silently reopen what steps 1 and 2 just closed.
--
--    It revokes from PUBLIC only, never from anon/authenticated, so the
--    explicit grants above survive a CREATE OR REPLACE.
-- ---------------------------------------------------------------------------
create or replace function public.fn_revoke_public_execute() returns event_trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select object_identity from pg_event_trigger_ddl_commands()
     where command_tag = 'CREATE FUNCTION' and schema_name = 'public'
  loop
    execute format('revoke execute on function %s from public', r.object_identity);
  end loop;
end $$;

revoke execute on function public.fn_revoke_public_execute() from public, anon, authenticated;

drop event trigger if exists trg_revoke_public_execute;
create event trigger trg_revoke_public_execute on ddl_command_end
  when tag in ('CREATE FUNCTION')
  execute function public.fn_revoke_public_execute();

-- ---------------------------------------------------------------------------
-- 4. Re-pin search_path on anything created since 000300 that lacks one (M4).
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proconfig is null
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %s set search_path = public, extensions', r.sig);
  end loop;
end $$;

commit;
