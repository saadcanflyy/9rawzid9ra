-- AUDIT M8 — server-side rate limits.
-- Client-side limits (SenpaiZone's rateLimitMsg) are advisory only: the REST
-- endpoint is public, so anything not enforced in the database isn't enforced.
-- Staff are exempt throughout. Daily windows are calendar days (date_trunc).
--
-- uploads   20/day   reports 10/day   follows 50/day   messages 60/day
-- search_log 300/day per user + 5000/hour overall — and it DROPS the row
-- instead of raising, because logging must never break a student's search.
begin;

create or replace function public.fn_ratelimit_documents() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int; begin
  if auth.uid() is null or is_staff() then return new; end if;
  select count(*) into n from documents
   where uploader_id = auth.uid() and created_at >= date_trunc('day', now());
  if n >= 20 then raise exception 'upload_daily_limit' using errcode='P0001'; end if;
  return new;
end $$;
drop trigger if exists trg_ratelimit_documents on public.documents;
create trigger trg_ratelimit_documents before insert on public.documents
  for each row execute function public.fn_ratelimit_documents();

create or replace function public.fn_ratelimit_reactions() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int; begin
  if new.reaction_type <> 'report' or auth.uid() is null or is_staff() then return new; end if;
  select count(*) into n from document_reactions
   where user_id = auth.uid() and reaction_type = 'report' and created_at >= date_trunc('day', now());
  if n >= 10 then raise exception 'report_daily_limit' using errcode='P0001'; end if;
  return new;
end $$;
drop trigger if exists trg_ratelimit_reactions on public.document_reactions;
create trigger trg_ratelimit_reactions before insert on public.document_reactions
  for each row execute function public.fn_ratelimit_reactions();

create or replace function public.fn_ratelimit_follows() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int; begin
  if auth.uid() is null then return new; end if;
  select count(*) into n from user_follows
   where follower_id = auth.uid() and created_at >= date_trunc('day', now());
  if n >= 50 then raise exception 'follow_daily_limit' using errcode='P0001'; end if;
  return new;
end $$;
drop trigger if exists trg_ratelimit_follows on public.user_follows;
create trigger trg_ratelimit_follows before insert on public.user_follows
  for each row execute function public.fn_ratelimit_follows();

create or replace function public.fn_ratelimit_messages() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int; begin
  if auth.uid() is null or is_staff() then return new; end if;
  select count(*) into n from messages
   where sender_id = auth.uid() and created_at >= date_trunc('day', now());
  if n >= 60 then raise exception 'message_daily_limit' using errcode='P0001'; end if;
  return new;
end $$;
drop trigger if exists trg_ratelimit_messages on public.messages;
create trigger trg_ratelimit_messages before insert on public.messages
  for each row execute function public.fn_ratelimit_messages();

create or replace function public.fn_ratelimit_search_log() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int; begin
  if new.user_id is not null then
    select count(*) into n from search_log
     where user_id = new.user_id and created_at >= date_trunc('day', now());
    if n >= 300 then return null; end if;
  end if;
  select count(*) into n from search_log where created_at > now() - interval '1 hour';
  if n >= 5000 then return null; end if;
  return new;
end $$;
drop trigger if exists trg_ratelimit_search_log on public.search_log;
create trigger trg_ratelimit_search_log before insert on public.search_log
  for each row execute function public.fn_ratelimit_search_log();

commit;
