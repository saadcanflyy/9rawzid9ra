-- ============================================================================
-- 9rawZid9ra — let signed-out visitors read the Senpai Zone again
-- ----------------------------------------------------------------------------
-- Regression from 20260927000500_user_profiles_private_columns.sql (audit H1),
-- which did:
--
--     revoke select on public.user_profiles from anon, authenticated;
--     grant  select (…public columns…) ... to authenticated;   -- anon left out
--
-- anon therefore lost ALL access to user_profiles, and /senpai went blank for
-- signed-out visitors. Observed in the browser:
--
--   401  senpai_posts?select=*,user_profiles(name,is_fondateur,…)
--        {"code":"42501","message":"permission denied for table user_profiles"}
--   401  senpai_posts?select=created_at&parent_id=is.null&is_approved=eq.true
--        {"code":"42501","message":"permission denied for table user_profiles"}
--
-- Note the SECOND one: it embeds nothing, so a ROW-LEVEL POLICY on senpai_posts
-- is itself reading user_profiles. Policies run as the calling role, so the
-- grant below has to cover the column that policy touches or /senpai stays
-- broken even with the embed fixed.
--
-- This grants anon a strict subset of what `authenticated` already has: only
-- columns the public pages actually render. Everything H1 was written to
-- protect stays revoked from anon AND authenticated:
--   email, ban_reason, banned_until, is_premium, premium_until,
--   downloads_count, ai_uses_today, ai_uses_reset_at, ads_watched_today.
--
-- Also NOT granted to anon (authenticated-only, deliberately):
--   faculty_id, filiere_id, current_semester, onboarded_at,
--   wants_ai_notification, is_admin, is_moderator, total_downloads.
--
-- Safe to re-run.
-- ============================================================================

begin;

grant select (
  id,               -- join/react key
  name,             -- author name on every post and senpai card
  is_fondateur,     -- "Fondateur" badge
  university_id,    -- the universities!user_profiles_university_id_fkey embed
  is_banned         -- read by the senpai_posts row policy (see header)
) on public.user_profiles to anon;

commit;

-- ---------------------------------------------------------------------------
-- Verify. 1) anon can read exactly these five columns and no more:
--
--   select grantee, privilege_type, column_name
--     from information_schema.column_privileges
--    where table_name = 'user_profiles' and grantee = 'anon'
--    order by column_name;
--
-- 2) the two calls that were 401 now return rows:
--
--   set local role anon;
--   select count(*) from senpai_posts where parent_id is null and is_approved;
--
-- 3) and the private columns are still closed:
--
--   set local role anon;
--   select email from user_profiles limit 1;   -- must raise 42501
-- ---------------------------------------------------------------------------
