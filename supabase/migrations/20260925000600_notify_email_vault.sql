-- ============================================================================
-- 9rawZid9ra — Move the email webhook secrets out of the trigger definition
-- ----------------------------------------------------------------------------
-- Today the "notify-email" trigger on notifications has the SERVICE ROLE key and the
-- webhook secret written in plain text in its definition. The edge function reads its
-- own service key from its environment, so the gateway only needs a valid JWT: the
-- public anon key is enough. The webhook secret moves to Supabase Vault.
--
-- BEFORE running this file (the migration refuses to run otherwise):
--   1. Pick a NEW webhook secret (e.g. `openssl rand -hex 32`).
--   2. supabase secrets set WEBHOOK_SECRET=<new secret>      (edge function env)
--   3. In SQL:
--        select vault.create_secret('<new secret>', 'notify_email_webhook_secret');
--        select vault.create_secret('<project anon key>', 'supabase_anon_key');
-- AFTER: in Supabase dashboard → Settings → API, roll the service_role key (JWT secret)
-- if you consider the old one exposed, then update SUPABASE_SERVICE_ROLE_KEY wherever
-- it is used (edge functions get it automatically).
-- ============================================================================

begin;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'notify_email_webhook_secret')
     or not exists (select 1 from vault.decrypted_secrets where name = 'supabase_anon_key') then
    raise exception 'Create the vault secrets notify_email_webhook_secret and supabase_anon_key first (see header).';
  end if;
end $$;

create or replace function public.fn_notify_email_webhook()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_anon text; v_secret text;
begin
  select decrypted_secret into v_anon   from vault.decrypted_secrets where name = 'supabase_anon_key';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_email_webhook_secret';
  perform net.http_post(
    url     := 'https://egqjyzuinoljadzxiwpb.supabase.co/functions/v1/notify-email',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || v_anon,
                                  'x-webhook-secret', v_secret),
    body    := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'schema', 'public',
                                  'record', to_jsonb(new), 'old_record', null),
    timeout_milliseconds := 5000);
  return new;
end $$;
revoke all on function public.fn_notify_email_webhook() from public, anon, authenticated;

drop trigger if exists "notify-email" on public.notifications;
create trigger "notify-email" after insert on public.notifications
  for each row execute function public.fn_notify_email_webhook();

commit;
