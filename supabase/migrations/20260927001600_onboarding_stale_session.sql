-- ============================================================================
-- 9rawZid9ra — complete_onboarding(): clear error on a stale session,
--                                     self-heal a missing profile
-- ----------------------------------------------------------------------------
-- Reported: onboarding failed with
--   "insert or update on table module_bookmarks violates foreign key
--    constraint module_bookmarks_user_id_fkey"
--
-- The suspected cause was a missing user_profiles row. It is NOT:
--
--   * module_bookmarks.user_id references auth.users(id), not user_profiles,
--     so a missing profile cannot violate THAT constraint.
--   * The trigger on_auth_user_created -> handle_new_user() already exists and
--     already covers every path (dashboard, Google OAuth, sign-up form). The
--     test account's profile was written 2ms BEFORE its auth.users row was
--     committed, which is the trigger firing.
--   * A census found 18 auth.users, 18 user_profiles, 0 missing, 0 orphaned.
--
-- The real cause is a JWT whose `sub` is no longer in auth.users — a session
-- that outlived its account, which is exactly what happens when a test user is
-- deleted and recreated in the dashboard while a browser still holds the old
-- token. Reproduced verbatim:
--
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid not in auth.users>", …}';
--   select complete_onboarding(3, null, 49, 'S4', true);
--   -- 23503: … violates foreign key constraint "module_bookmarks_user_id_fkey"
--
-- So the fix is not to create profiles, it is to fail honestly. Two changes,
-- and the rest of the body is byte-identical to the previous definition:
--
--   1. Reject a caller that no longer exists, with a message the UI can show,
--      instead of letting it fall through to an opaque FK violation 20 lines
--      later.
--   2. Defensively ensure the profile row exists before updating it. The
--      trigger should always have done this; if some future path bypasses it,
--      onboarding now repairs it rather than silently updating 0 rows and
--      leaving the user with an empty profile.
--
-- Safe to re-run.
-- ============================================================================

begin;

create or replace function public.complete_onboarding(
  p_university_id integer,
  p_faculty_id integer default null,
  p_filiere_id integer default null,
  p_semester text default null,
  p_follow_modules boolean default true)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_followed integer := 0;
  v_fac integer := p_faculty_id;
  v_uni integer := p_university_id;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'login required' using errcode = '42501'; end if;

  -- (1) A token can outlive its account. Everything below is FK'd to
  -- auth.users, so without this the caller gets a raw 23503 on
  -- module_bookmarks and no idea that re-authenticating is the fix.
  if not exists (select 1 from auth.users where id = v_uid) then
    raise exception 'stale_session' using errcode = '42501';
  end if;

  -- (2) on_auth_user_created should always have made this row. Belt and
  -- braces for any path that bypasses the trigger.
  insert into public.user_profiles (id, email, name)
  select u.id, u.email,
         coalesce(u.raw_user_meta_data->>'full_name',
                  u.raw_user_meta_data->>'name',
                  split_part(u.email, '@', 1))
    from auth.users u
   where u.id = v_uid
  on conflict (id) do nothing;

  -- trust the hierarchy from the database, not the browser
  if p_filiere_id is not null then
    select f.faculty_id, fa.university_id into v_fac, v_uni
      from filieres f join faculties fa on fa.id = f.faculty_id where f.id = p_filiere_id;
  elsif p_faculty_id is not null then
    select university_id into v_uni from faculties where id = p_faculty_id;
  end if;

  update user_profiles
     set university_id = v_uni, faculty_id = v_fac, filiere_id = p_filiere_id,
         current_semester = nullif(p_semester, ''), onboarded_at = coalesce(onboarded_at, now())
   where id = v_uid;

  if p_follow_modules and p_filiere_id is not null and coalesce(p_semester, '') <> '' then
    insert into module_bookmarks (user_id, module_id)
    select v_uid, m.id from modules m
     where m.filiere_id = p_filiere_id and semester_matches(m.semester, p_semester)
       and not exists (select 1 from module_bookmarks b where b.user_id = v_uid and b.module_id = m.id)
     limit 30;
    get diagnostics v_followed = row_count;
  end if;
  return v_followed;
end $function$;

-- Grants are not reset by CREATE OR REPLACE, but restate them so a fresh
-- database ends up in the same place as this one.
revoke all on function public.complete_onboarding(integer, integer, integer, text, boolean) from public, anon;
grant execute on function public.complete_onboarding(integer, integer, integer, text, boolean) to authenticated;

commit;
