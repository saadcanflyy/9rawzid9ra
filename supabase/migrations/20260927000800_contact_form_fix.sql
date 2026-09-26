-- AUDIT M9 — the public contact form was broken, not just unthrottled.
-- Policy "Anyone can submit contact message" (INSERT, WITH CHECK true) existed,
-- but anon/authenticated were never granted INSERT, so every submission failed
-- with "permission denied for table contact_messages". Verified before the fix.
-- Granting it also opens an anonymous write endpoint, so the throttle lands in
-- the same migration rather than as a follow-up.
begin;
grant insert (name, email, message) on public.contact_messages to anon, authenticated;
grant usage, select on sequence public.contact_messages_id_seq to anon, authenticated;

create or replace function public.fn_contact_messages_ratelimit() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  new.name    := left(btrim(new.name), 120);
  new.email   := left(btrim(new.email), 200);
  new.message := left(btrim(new.message), 2000);
  if new.message = '' or new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_contact_message' using errcode = 'P0001';
  end if;
  select count(*) into n from contact_messages
   where email = new.email and created_at > now() - interval '1 hour';
  if n >= 5 then raise exception 'contact_rate_limit' using errcode = 'P0001'; end if;
  select count(*) into n from contact_messages where created_at > now() - interval '1 hour';
  if n >= 100 then raise exception 'contact_rate_limit' using errcode = 'P0001'; end if;
  return new;
end $$;

drop trigger if exists trg_contact_messages_ratelimit on public.contact_messages;
create trigger trg_contact_messages_ratelimit before insert on public.contact_messages
  for each row execute function public.fn_contact_messages_ratelimit();
commit;
