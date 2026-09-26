-- ============================================================================
-- 9rawZid9ra — Security audit fix #2: a senpai's email never reaches a student
-- ----------------------------------------------------------------------------
-- The senpai feature originally returned the senpai's real email address to the
-- student so the browser could build a mailto: link. That means every signed-in
-- student could harvest the address of every volunteer mentor, which is exactly
-- the thing that makes volunteers quit.
--
-- New rule: no RPC and no table readable by a student may expose a senpai's
-- email. Contact now goes through the existing in-app Messenger, which already
-- raises a `new_message` notification, which the existing notify-email edge
-- function already turns into "Nouveau message de X" in the senpai's inbox.
-- So the senpai is still reached by email, without either party learning the
-- other's address.
--
-- Return types change, so these are DROP + CREATE rather than CREATE OR REPLACE.
-- Staff keep full access to emails through the staff-only RPCs, unchanged.
-- Safe to re-run.
-- ============================================================================

begin;

drop function if exists public.get_filiere_senpais(integer);
create function public.get_filiere_senpais(p_filiere_id integer)
returns table(id integer, user_id uuid, name text, points integer, is_fondateur boolean,
              help_with text[], response_estimate text, semester_label text, is_graduate boolean)
language sql stable security definer set search_path = public, extensions as $$
  select sp.id, sp.user_id, up.name, up.points, coalesce(up.is_fondateur, false),
         sp.help_with, sp.response_estimate, sp.semester_label, sp.is_graduate
    from senpai_profiles sp join user_profiles up on up.id = sp.user_id
   where sp.filiere_id = p_filiere_id and sp.status = 'active' and auth.uid() is not null
   order by sp.approved_at asc nulls last
   limit 3
$$;

drop function if exists public.get_user_senpai_profile(uuid);
create function public.get_user_senpai_profile(p_user_id uuid)
returns table(id integer, filiere_id integer, filiere_name text,
              help_with text[], response_estimate text, semester_label text, is_graduate boolean)
language sql stable security definer set search_path = public, extensions as $$
  select sp.id, sp.filiere_id, f.name, sp.help_with, sp.response_estimate, sp.semester_label, sp.is_graduate
    from senpai_profiles sp
    join filieres f on f.id = sp.filiere_id
   where sp.user_id = p_user_id and sp.status = 'active' and auth.uid() is not null
$$;

grant execute on function public.get_filiere_senpais(integer),
                          public.get_user_senpai_profile(uuid) to authenticated;

commit;
