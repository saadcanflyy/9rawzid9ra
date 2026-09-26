-- AUDIT M7 — cap catalogue spam.
-- universities/faculties/filieres/modules are INSERT-open to any authenticated
-- user by design (students add missing schools). There was no limit, so one
-- account could insert thousands of junk rows, which then pollute search, the
-- onboarding pickers, and every search_doc rebuild trigger.
--
-- Only `modules` recorded its creator (suggested_by), so the other three get a
-- created_by column first — without it there is nothing to count per user.
begin;

alter table public.universities add column if not exists created_by uuid default auth.uid() references public.user_profiles(id) on delete set null;
alter table public.faculties    add column if not exists created_by uuid default auth.uid() references public.user_profiles(id) on delete set null;
alter table public.filieres     add column if not exists created_by uuid default auth.uid() references public.user_profiles(id) on delete set null;

grant insert (created_by) on public.universities to authenticated;
grant insert (created_by) on public.faculties    to authenticated;
grant insert (created_by) on public.filieres     to authenticated;

create or replace function public.fn_ratelimit_catalog() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int; uid uuid := auth.uid();
begin
  if uid is null or is_staff() then return new; end if;
  if tg_table_name = 'modules' then new.suggested_by := coalesce(new.suggested_by, uid);
  else new.created_by := coalesce(new.created_by, uid);
  end if;
  select (select count(*) from universities where created_by = uid and created_at >= now() - interval '1 day')
       + (select count(*) from faculties    where created_by = uid and created_at >= now() - interval '1 day')
       + (select count(*) from filieres     where created_by = uid and created_at >= now() - interval '1 day')
       + (select count(*) from modules      where suggested_by = uid and created_at >= now() - interval '1 day')
    into n;
  if n >= 10 then raise exception 'catalog_daily_limit' using errcode = 'P0001'; end if;
  return new;
end $$;

drop trigger if exists trg_ratelimit_catalog on public.universities;
create trigger trg_ratelimit_catalog before insert on public.universities
  for each row execute function public.fn_ratelimit_catalog();
drop trigger if exists trg_ratelimit_catalog on public.faculties;
create trigger trg_ratelimit_catalog before insert on public.faculties
  for each row execute function public.fn_ratelimit_catalog();
drop trigger if exists trg_ratelimit_catalog on public.filieres;
create trigger trg_ratelimit_catalog before insert on public.filieres
  for each row execute function public.fn_ratelimit_catalog();
drop trigger if exists trg_ratelimit_catalog on public.modules;
create trigger trg_ratelimit_catalog before insert on public.modules
  for each row execute function public.fn_ratelimit_catalog();

commit;
