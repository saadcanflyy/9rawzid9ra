-- ============================================================================
-- 9rawZid9ra — let signed-out visitors read the Senpai Zone again
-- ----------------------------------------------------------------------------
-- Regression from 20260927000500_user_profiles_private_columns.sql (audit H1),
-- which did:
--
--     revoke select on public.user_profiles from anon, authenticated;
--     grant  select (…public columns…) ... to authenticated;   -- anon left out
--
-- anon therefore lost ALL access to user_profiles and /senpai went blank for
-- signed-out visitors. Observed in the browser:
--
--   401  senpai_posts?select=*,user_profiles(name,is_fondateur,…)
--   401  senpai_posts?select=created_at&parent_id=is.null&is_approved=eq.true
--        both: {"code":"42501","message":"permission denied for table user_profiles"}
--
-- The second one embeds nothing, because the SELECT policy on senpai_posts
-- reads user_profiles itself:
--
--   "senpai posts readable"  FOR SELECT TO public USING (
--     is_approved = true
--     OR auth.uid() = author_id
--     OR EXISTS (SELECT 1 FROM user_profiles
--                 WHERE id = auth.uid() AND is_admin = true))
--
-- Column privileges are checked when the statement is planned, not lazily per
-- OR branch, so anon needs SELECT on user_profiles.id AND .is_admin for that
-- policy to run at all — even though for anon auth.uid() is null and the branch
-- can never be true.
--
-- Granting is_admin to anon would let anyone enumerate the platform's admins.
-- So instead of widening the grant to fit the policy, narrow the policy:
-- is_admin() is already SECURITY DEFINER, STABLE, search_path-pinned and
-- executable by anon (allow-list in 20260927001400). It reads user_profiles as
-- the function owner, so the caller needs no privilege on the table.
--
-- Net effect: anon gets four harmless display columns and NOT is_admin.
-- Everything H1 protects stays revoked from anon and authenticated alike:
--   email, ban_reason, banned_until, is_premium, premium_until,
--   downloads_count, ai_uses_today, ai_uses_reset_at, ads_watched_today.
-- Also still authenticated-only: faculty_id, filiere_id, current_semester,
--   onboarded_at, wants_ai_notification, is_admin, is_moderator,
--   total_downloads, bio, points, followers/following/posts counts.
--
-- Safe to re-run.
-- ============================================================================

begin;

-- 1. Same rule, expressed so it needs no table privilege from the caller.
drop policy if exists "senpai posts readable" on public.senpai_posts;
create policy "senpai posts readable" on public.senpai_posts
  for select to public
  using (is_approved = true or auth.uid() = author_id or public.is_admin());

-- 2. The columns the public senpai views actually render.
--    /senpai and /module/:slug embed user_profiles(name, is_fondateur,
--    universities!user_profiles_university_id_fkey(name)).
grant select (
  id,               -- embed/join key
  name,             -- author name on posts and senpai cards
  is_fondateur,     -- "Fondateur" badge
  university_id     -- the universities embed
) on public.user_profiles to anon;

commit;
