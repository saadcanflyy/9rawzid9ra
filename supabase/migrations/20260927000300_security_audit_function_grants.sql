-- ============================================================================
-- 9rawZid9ra — Security audit fix #1: function EXECUTE grants
-- ----------------------------------------------------------------------------
-- AUDIT.md C1, H2, M1, M2, M3, M4, L4.
--
-- Root cause: Postgres grants EXECUTE ON FUNCTION TO PUBLIC by default. Any
-- function created without an explicit REVOKE is callable by `anon` over
-- PostgREST at /rest/v1/rpc/<name>. Phase-2 migrations did revoke; the phase-3
-- kit and the senpai migration did not. Verified exploitable as anon:
--   activate_senpai_profile(id) -> activates ANY senpai application (C1)
--   reset_daily_ai_usage()      -> clears everyone's AI quota (H2)
--   refresh_module_stats(id)    -> unauthenticated CPU burn (M2)
--
-- Strategy: (1) stop the bleeding for the future with ALTER DEFAULT PRIVILEGES,
-- (2) revoke EXECUTE from public/anon/authenticated on every non-extension
-- function in `public`, (3) grant back an explicit allow-list, (4) pin
-- search_path everywhere, (5) add the missing is_staff() gate to the analytics
-- RPCs.
--
-- Extension-owned functions (pg_trgm: similarity, gtrgm_*, word_similarity_*)
-- are skipped by the pg_depend deptype='e' check — revoking those would break
-- the `%` operator and therefore all fuzzy search.
--
-- Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Systemic: future functions in `public` are not world-executable.
--    Applies to functions created by the role running migrations (postgres).
--    Does NOT retroactively change existing functions — step 2 does that.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- 2. Blanket revoke on every non-extension function in `public`.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3a. Grant back: public read surface (anon + authenticated).
--     Anything a signed-out visitor legitimately needs to browse the catalogue.
-- ---------------------------------------------------------------------------
do $$
declare r record;
  allow text[] := array[
    -- public read RPCs
    'search_catalog','search_suggest','resolve_academic_context','get_professor',
    'search_professors','get_leaderboard','get_faculty_leaderboard','get_university_leaderboard',
    'get_platform_stats','get_module_overview','get_related_modules','get_missing_resources',
    'increment_post_views','log_search','is_admin','is_staff',
    -- pure helpers referenced from SQL and (search_norm) from the browser
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

-- ---------------------------------------------------------------------------
-- 3b. Grant back: authenticated only (signed-in users + staff RPCs).
--     Every staff RPC below already checks is_staff()/is_admin() internally;
--     removing `anon` is defence in depth, not the only control.
-- ---------------------------------------------------------------------------
do $$
declare r record;
  allow text[] := array[
    -- signed-in user RPCs
    'get_home_feed','get_my_reputation','complete_onboarding','record_download',
    'report_document','propose_professor','find_duplicate_documents','mark_best_reply',
    'recommend_for_me',
    -- senpai de filière
    'apply_to_be_senpai','update_senpai_profile','pause_senpai','get_my_senpai_profile',
    'get_filiere_senpais','get_user_senpai_profile','log_senpai_contact',
    'mark_senpai_contact_helpful','report_senpai',
    -- staff / admin
    'moderate_document','get_moderation_queue','staff_notify','staff_moderate_post',
    'admin_broadcast','admin_set_moderator','admin_set_premium','admin_adjust_reputation',
    'admin_get_inbox','admin_get_thread','mod_ban_user','mod_send_message',
    'get_professor_queue','verify_professor','merge_professors','reject_professor',
    'get_search_insights','get_senpai_applications','approve_senpai','reject_senpai',
    'get_senpai_reports','resolve_senpai_report','award_top_university_contributors',
    -- analytics (staff gate added in step 5)
    'get_analytics_extra','get_docs_per_day','get_users_per_day','get_top_uploaders',
    'get_top_modules_by_downloads','get_top_uploaders_in_filiere'
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

-- Everything not listed above is now callable by nobody but postgres:
-- all 31 trigger functions, activate_senpai_profile, refresh_module_stats,
-- reset_daily_ai_usage, check_download_limit, rls_auto_enable, resolve_professor,
-- award_reputation, check_badges, revoke_reputation, link_professor.

-- ---------------------------------------------------------------------------
-- 4. Pin search_path on every non-extension function that lacks one (M4).
--    `public, extensions` matches the convention already used by the phase-3
--    functions that need unaccent/pg_net.
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

-- ---------------------------------------------------------------------------
-- 5. Add the missing staff gate to the admin analytics RPCs (M1).
--    Each body below is the VERBATIM original query, converted from
--    `language sql` to plpgsql only so the guard can raise. No change to the
--    numbers these return (limits, GROUP BY and windows are byte-identical to
--    the pre-migration definitions).
--
--    NOT gated: get_top_uploaders_in_filiere() — ModulePage calls it as a
--    normal student when a document request passes 5 votes. It stays
--    authenticated-only, no staff check.
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_extra()
returns table(new_users_7d bigint, new_docs_7d bigint, total_downloads bigint, active_uploaders bigint)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    SELECT
      (SELECT COUNT(*)::BIGINT FROM user_profiles WHERE created_at >= NOW() - INTERVAL '7 days'),
      (SELECT COUNT(*)::BIGINT FROM documents WHERE created_at >= NOW() - INTERVAL '7 days'),
      (SELECT COALESCE(SUM(downloads),0)::BIGINT FROM documents),
      (SELECT COUNT(DISTINCT uploader_id)::BIGINT FROM documents WHERE uploader_id IS NOT NULL);
end $$;

create or replace function public.get_users_per_day()
returns table(date text, count bigint)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    SELECT
      TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date,
      COUNT(*)::BIGINT AS count
    FROM user_profiles
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY created_at::date
    ORDER BY created_at::date;
end $$;

create or replace function public.get_docs_per_day()
returns table(date text, count bigint)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    SELECT
      TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date,
      COUNT(*)::BIGINT AS count
    FROM documents
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY created_at::date
    ORDER BY created_at::date;
end $$;

create or replace function public.get_top_uploaders()
returns table(name text, uploads bigint, points integer)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    SELECT up.name, COALESCE(up.uploads_count, 0)::BIGINT AS uploads, COALESCE(up.points, 0) AS points
    FROM user_profiles up
    ORDER BY up.uploads_count DESC NULLS LAST
    LIMIT 5;
end $$;

create or replace function public.get_top_modules_by_downloads()
returns table(name text, total bigint)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    SELECT m.name, SUM(COALESCE(d.downloads, 0))::BIGINT AS total
    FROM documents d
    JOIN modules m ON d.module_id = m.id
    GROUP BY m.id, m.name
    ORDER BY total DESC
    LIMIT 10;
end $$;

grant execute on function public.get_analytics_extra(), public.get_users_per_day(),
                          public.get_docs_per_day(), public.get_top_uploaders(),
                          public.get_top_modules_by_downloads() to authenticated;

commit;
