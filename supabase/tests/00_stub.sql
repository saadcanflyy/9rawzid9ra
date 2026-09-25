-- Local stand-in for Supabase: roles, auth schema, and the real column layout of the tables we touch.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
grant usage on schema auth, public to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;

create table universities (id serial primary key, name text not null, name_en text, slug text, city text default 'Rabat', type text default 'public', logo_url text, website text, created_at timestamp default now());
create table faculties (id serial primary key, university_id int, name text not null, name_en text, type text default 'licence', created_at timestamp default now());
create table filieres (id serial primary key, faculty_id int, name text not null, abbreviation text, total_semesters int default 6, created_at timestamp default now());
create table modules (id serial primary key, filiere_id int, semester text not null, name text not null, type text default 'cours', verified bool default true, suggested_by uuid, created_at timestamp default now(), slug text, unique(filiere_id, semester, name));
create table user_profiles (id uuid primary key, name text, email text, university_id int, points int default 0, uploads_count int default 0, downloads_count int default 0, is_premium bool default false, is_admin bool default false, created_at timestamp default now(), is_banned bool default false, ban_reason text, bio text, total_downloads int default 0, premium_until timestamp, ai_uses_today int default 0, ai_uses_reset_at timestamp default now(), ads_watched_today int default 0, post_count int default 0, followers_count int default 0, following_count int default 0, posts_count int default 0, is_fondateur bool default false, is_moderator bool default false, banned_until timestamptz, wants_ai_notification bool default false);
create table documents (id serial primary key, module_id int, uploader_id uuid, doc_type text not null, academic_year text, professor text, file_type text, files text[], pages_count int default 1, downloads int default 0, likes int default 0, verified bool default false, title text, created_at timestamp default now(), is_flagged bool default true, flag_reason text, is_verified bool default false, verified_by uuid, verified_at timestamp, reported_count int default 0, doc_number text, file_names text[], helpful_count int default 0, rating_sum int default 0, rating_count int default 0, report_count int default 0);
create table document_reactions (id serial primary key, user_id uuid, document_id int, reaction_type text, rating int, report_reason text, created_at timestamp default now(), unique(user_id, document_id, reaction_type));
create table points_log (id serial primary key, user_id uuid, points int not null, reason text, document_id int, created_at timestamp default now());
create table downloads_log (id serial primary key, user_id uuid, document_id int, date date default current_date, created_at timestamp default now());
create table notifications (id serial primary key, user_id uuid, type text not null, title text, message text, is_read bool default false, link text, created_at timestamp default now(), content text, actor_id uuid, post_id int, post_title text, read bool not null default false);
create table module_bookmarks (id serial primary key, user_id uuid, module_id int, created_at timestamp default now());
create table senpai_posts (id serial primary key, author_id uuid, post_type text not null, title text not null, content text not null, module_id int, filiere_id int, faculty_id int, university_id int, helpful_count int default 0, views int default 0, is_flagged bool default false, is_approved bool default true, created_at timestamp default now(), updated_at timestamp default now(), is_anonymous bool default false, tags text[] default '{}', reply_count int default 0, parent_id bigint, anonymous bool default false);
create table senpai_replies (id bigserial primary key, post_id bigint not null, author_id uuid not null, content text not null, is_anonymous bool default false, helpful_count int default 0, created_at timestamptz default now());
create table senpai_votes (id serial primary key, user_id uuid, post_id int, created_at timestamp default now());
create table document_requests (id serial primary key, user_id uuid, module_id int, doc_type text not null, academic_year text, votes int default 1, status text default 'open', created_at timestamp default now());
create table document_request_votes (id serial primary key, user_id uuid, request_id int, created_at timestamp default now());

-- Supabase default grants
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter table user_profiles enable row level security; alter table documents enable row level security;
alter table document_reactions enable row level security; alter table points_log enable row level security;
alter table downloads_log enable row level security; alter table notifications enable row level security;
alter table universities enable row level security; alter table faculties enable row level security;
alter table filieres enable row level security; alter table modules enable row level security;
alter table senpai_posts enable row level security; alter table senpai_replies enable row level security;
alter table senpai_votes enable row level security; alter table document_requests enable row level security;
alter table document_request_votes enable row level security; alter table module_bookmarks enable row level security;

-- Current production policies on the tables we change (copied from pg_policies)
create policy "Users own profile" on user_profiles for all using (auth.uid() = id);
create policy "Users can update own profile" on user_profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert own profile" on user_profiles for insert with check (auth.uid() = id);
create policy "profiles readable by authenticated" on user_profiles for select to authenticated using (true);
create policy "Admin can update any profile" on user_profiles for update using (exists (select 1 from user_profiles p where p.id = auth.uid() and p.is_admin)) with check (exists (select 1 from user_profiles p where p.id = auth.uid() and p.is_admin));
create policy "Auth upload documents" on documents for insert with check (auth.uid() is not null and auth.uid() = uploader_id);
create policy "Auth users can insert documents" on documents for insert with check (auth.uid() = uploader_id);
create policy "Auth users can update own documents" on documents for update using (auth.uid() = uploader_id);
create policy "Public read documents" on documents for select using (true);
create policy "Public read reactions" on document_reactions for select using (true);
create policy "Auth insert reactions" on document_reactions for insert with check (auth.uid() = user_id);
create policy "Auth delete reactions" on document_reactions for delete using (auth.uid() = user_id);
create policy "Auth update reactions" on document_reactions for update using (auth.uid() = user_id);
create policy dr_sel on document_reactions for select using (true);
create policy dr_ins on document_reactions for insert with check (auth.uid() = user_id);
create policy dr_upd on document_reactions for update using (auth.uid() = user_id);
create policy dr_del on document_reactions for delete using (auth.uid() = user_id);
create policy "Auth insert points log" on points_log for insert with check (auth.uid() = user_id);
create policy "Users own downloads" on downloads_log for select using (auth.uid() = user_id);
create policy "Users insert downloads" on downloads_log for insert with check (auth.uid() = user_id);
create policy "Auth insert downloads log" on downloads_log for insert with check (auth.uid() = user_id);
create policy "Owner notifications" on notifications for all using (auth.uid() = user_id);
create policy users_see_own_notifs on notifications for select using (auth.uid() = user_id);
create policy users_update_own_notifs on notifications for update using (auth.uid() = user_id);
create policy auth_insert_notifs on notifications for insert with check (auth.role() = 'authenticated' and (actor_id is null or actor_id = auth.uid()));
create policy "Public read universities" on universities for select using (true);
create policy "Public read faculties" on faculties for select using (true);
create policy "Public read filieres" on filieres for select using (true);
create policy "Public read modules" on modules for select using (true);
create policy authenticated_update_faculties on faculties for update to authenticated using (true) with check (true);
create policy authenticated_update_filieres on filieres for update to authenticated using (true) with check (true);
create policy authenticated_update_universities on universities for update to authenticated using (true) with check (true);
create policy authenticated_can_insert_modules on modules for insert to authenticated with check (true);
create policy authenticated_can_insert_universities on universities for insert to authenticated with check (true);
create policy authenticated_insert_universities on universities for insert to authenticated with check (true);
create policy authenticated_can_insert_faculties on faculties for insert to authenticated with check (true);
create policy authenticated_insert_faculties on faculties for insert to authenticated with check (true);
create policy authenticated_can_insert_filieres on filieres for insert to authenticated with check (true);
create policy authenticated_insert_filieres on filieres for insert to authenticated with check (true);
create policy "admins can update modules" on modules for update to authenticated using (exists (select 1 from user_profiles where id = auth.uid() and is_admin)) with check (exists (select 1 from user_profiles where id = auth.uid() and is_admin));
create policy "admins can delete modules" on modules for delete to authenticated using (exists (select 1 from user_profiles where id = auth.uid() and is_admin));
create policy "senpai posts readable" on senpai_posts for select using (is_approved or auth.uid() = author_id);
create policy "Auth insert senpai posts" on senpai_posts for insert with check (auth.uid() = author_id);
create policy "replies readable by all" on senpai_replies for select using (true);
create policy "auth users insert replies" on senpai_replies for insert to authenticated with check (auth.uid() = author_id);
create policy "Public read votes" on senpai_votes for select using (true);
create policy "Auth insert votes" on senpai_votes for insert with check (auth.uid() = user_id);
create policy "Auth delete votes" on senpai_votes for delete using (auth.uid() = user_id);
create policy "Public read requests" on document_requests for select using (true);
create policy "Auth insert requests" on document_requests for insert with check (auth.uid() = user_id);
create policy dreq_upd on document_requests for update using (auth.role() = 'authenticated');
create policy "Public read request votes" on document_request_votes for select using (true);
create policy "Auth insert request votes" on document_request_votes for insert with check (auth.uid() = user_id);
create policy "Auth delete request votes" on document_request_votes for delete using (auth.uid() = user_id);
create policy mb_sel on module_bookmarks for select using (auth.uid() = user_id);

-- Current production triggers on documents / reactions (bodies copied from pg_proc)
create or replace function award_upload_points() returns trigger language plpgsql security definer as $$
begin
  update user_profiles set points = points + 50, uploads_count = uploads_count + 1 where id = new.uploader_id;
  insert into points_log (user_id, points, reason, document_id) values (new.uploader_id, 50, 'upload', new.id);
  return new;
end $$;
create trigger on_document_upload after insert on documents for each row execute function award_upload_points();
create or replace function check_fondateur_badge() returns trigger language plpgsql security definer as $$
declare c int; begin select count(distinct uploader_id) into c from documents; if c <= 100 then update user_profiles set is_fondateur = true where id = new.uploader_id; end if; return new; end $$;
create trigger trg_fondateur_badge after insert on documents for each row execute function check_fondateur_badge();
create or replace function fn_sync_doc_helpful_count() returns trigger language plpgsql security definer as $$
declare did int; rtype text; begin
  did := coalesce(new.document_id, old.document_id); rtype := coalesce(new.reaction_type, old.reaction_type);
  if rtype = 'helpful' then update documents set helpful_count = (select count(*) from document_reactions where document_id = did and reaction_type = 'helpful') where id = did; end if;
  return null; end $$;
create trigger trg_doc_helpful_count after insert or delete on document_reactions for each row execute function fn_sync_doc_helpful_count();
create or replace function fn_sync_senpai_helpful_count() returns trigger language plpgsql security definer as $$
declare pid bigint; begin pid := coalesce(new.post_id, old.post_id); update senpai_posts set helpful_count = (select count(*) from senpai_votes where post_id = pid) where id = pid; return null; end $$;
create trigger trg_senpai_helpful_count after insert or delete on senpai_votes for each row execute function fn_sync_senpai_helpful_count();
create or replace function update_reply_count() returns trigger language plpgsql security definer as $$
begin if tg_op = 'INSERT' then update senpai_posts set reply_count = reply_count + 1 where id = new.post_id; elsif tg_op = 'DELETE' then update senpai_posts set reply_count = greatest(0, reply_count - 1) where id = old.post_id; end if; return null; end $$;
create trigger trg_reply_count after insert or delete on senpai_replies for each row execute function update_reply_count();

-- Vault + pg_net stand-ins (to test the webhook migration)
create schema if not exists vault;
create table vault.secrets (name text primary key, secret text);
create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
insert into vault.secrets values ('notify_email_webhook_secret','test-secret'),('supabase_anon_key','anon-jwt');
create schema if not exists net;
create table net.calls (url text, headers jsonb, body jsonb);
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint language sql as $$ insert into net.calls values (url, headers, body); select 1::bigint $$;

-- ai_usage (exists in production, used by the assistant quota)
create table ai_usage (id serial primary key, user_id uuid, feature text not null, module_id int, tokens_used int default 0, created_at timestamp default now());
alter table ai_usage enable row level security;
create policy "User read own ai usage" on ai_usage for select using (auth.uid() = user_id);
create policy "User insert ai usage" on ai_usage for insert with check (auth.uid() = user_id);
grant select, insert on ai_usage to authenticated; grant usage, select on sequence ai_usage_id_seq to authenticated;
