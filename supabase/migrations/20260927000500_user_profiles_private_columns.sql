-- ============================================================================
-- 9rawZid9ra — Security audit fix #3: stop leaking every user's email (H1)
-- ----------------------------------------------------------------------------
-- `user_profiles` had policy "profiles readable by authenticated" USING (true)
-- plus a table-wide GRANT SELECT. Verified: one throwaway account could read
-- all 17 users' email addresses, plus ban_reason / banned_until / is_premium.
--
-- Row access stays open — the app genuinely needs names, points and badges for
-- any profile. What changes is WHICH COLUMNS are readable. Column grants are
-- table-wide (they can't say "own row: everything"), so the private columns
-- move behind SECURITY DEFINER RPCs:
--   * your own ban state      -> get_my_ban_status()
--   * staff user lists/emails -> admin_list_users(), admin_top_users()
--   * your own email          -> not in the DB at all from the client's side;
--                                it comes from the auth session (getUser()).
--
-- Kept readable (public profile surface): id, name, bio, university_id,
-- faculty_id, filiere_id, current_semester, points, uploads_count,
-- total_downloads, followers/following/posts counts, is_fondateur, is_admin,
-- is_moderator, is_banned, created_at, onboarded_at, wants_ai_notification.
-- is_admin/is_moderator stay readable because Profile.js renders the
-- "Admin"/"Modérateur" badges from them on any profile.
--
-- Revoked: email, ban_reason, banned_until, is_premium, premium_until,
-- downloads_count, ai_uses_today, ai_uses_reset_at, ads_watched_today.
-- Safe to re-run.
-- ============================================================================

begin;

revoke select on public.user_profiles from anon, authenticated;

grant select (
  id, name, bio, university_id, faculty_id, filiere_id, current_semester,
  points, uploads_count, total_downloads, followers_count, following_count,
  posts_count, post_count, is_fondateur, is_admin, is_moderator, is_banned,
  created_at, onboarded_at, wants_ai_notification
) on public.user_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Own ban state — replaces the client reading ban_reason/banned_until directly
-- (src/App.js and src/pages/Login.js do this on every session start).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_ban_status()
returns table(is_banned boolean, banned_until timestamptz, ban_reason text)
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(up.is_banned, false), up.banned_until, up.ban_reason
    from user_profiles up
   where up.id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Staff user list — the only path to emails and moderation notes.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(p_limit integer default 100, p_search text default null)
returns table(id uuid, name text, email text, points integer, uploads_count integer,
              is_admin boolean, is_moderator boolean, is_banned boolean,
              banned_until timestamptz, ban_reason text, created_at timestamp,
              university_name text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select up.id, up.name, up.email, up.points, up.uploads_count,
           coalesce(up.is_admin,false), coalesce(up.is_moderator,false), coalesce(up.is_banned,false),
           up.banned_until, up.ban_reason, up.created_at, u.name
      from user_profiles up
      left join universities u on u.id = up.university_id
     where p_search is null or p_search = ''
        or up.name ilike '%'||p_search||'%' or up.email ilike '%'||p_search||'%'
     order by up.created_at desc
     limit least(coalesce(p_limit, 100), 500);
end $$;

create or replace function public.admin_top_users(p_limit integer default 10)
returns table(id uuid, name text, email text, points integer, uploads_count integer)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select up.id, up.name, up.email, up.points, up.uploads_count
      from user_profiles up
     order by up.points desc nulls last
     limit least(coalesce(p_limit, 10), 100);
end $$;

grant execute on function public.get_my_ban_status(),
                          public.admin_list_users(integer, text),
                          public.admin_top_users(integer) to authenticated;

commit;
