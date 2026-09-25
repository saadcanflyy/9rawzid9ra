-- ============================================================================
-- 9rawZid9ra — AI academic assistant (database side)
-- ----------------------------------------------------------------------------
-- • assistant_conversations / assistant_messages: conversation history (owner only).
--   Messages keep the structured "cards" (documents, modules, requests) the assistant
--   showed, and the context it understood (école, filière, semestre, module, type…).
-- • assistant_quota() / assistant_consume(): daily limits (free 15 · premium 200 messages),
--   counted in the existing ai_usage table.
-- • Recommendation RPCs, used by the assistant AND by the pages:
--     get_module_overview(module_id)   — what exists for a module, by type and year, + what's missing
--     get_related_modules(module_id)   — same module elsewhere, neighbouring semesters, "also downloaded"
--     recommend_for_me(limit)          — documents for the student's filière/semester they haven't downloaded
--     get_missing_resources(filiere_id, semester) — empty types per module + open requests
-- The model call itself happens in the edge function supabase/functions/assistant.
-- Requires the 2026-09-25 migrations and 20260926000100–400. Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Conversations
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  title       text not null default 'Nouvelle conversation',
  context     jsonb not null default '{}'::jsonb,       -- last understood context
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_assistant_conv_user on public.assistant_conversations (user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id              bigserial primary key,
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id         uuid not null references public.user_profiles(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  cards           jsonb not null default '[]'::jsonb,   -- [{type:'document'|'module'|'request'|'professor', …}]
  context         jsonb,                                 -- understood filters for this turn
  tool_trace      jsonb,                                 -- tools called (names + arguments), for debugging
  tokens_in       integer,
  tokens_out      integer,
  feedback        smallint check (feedback in (-1, 1)),  -- 👍/👎 on an answer
  created_at      timestamptz not null default now()
);
create index if not exists idx_assistant_msg_conv on public.assistant_messages (conversation_id, created_at);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages      enable row level security;
drop policy if exists "Own conversations" on public.assistant_conversations;
drop policy if exists "Own messages read" on public.assistant_messages;
drop policy if exists "Own messages insert" on public.assistant_messages;
drop policy if exists "Own messages feedback" on public.assistant_messages;
create policy "Own conversations" on public.assistant_conversations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own messages read" on public.assistant_messages for select to authenticated using (auth.uid() = user_id);
create policy "Own messages insert" on public.assistant_messages for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from assistant_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "Own messages feedback" on public.assistant_messages for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.assistant_conversations, public.assistant_messages from anon, authenticated;
grant select, insert, update, delete on public.assistant_conversations to authenticated;
grant select, insert on public.assistant_messages to authenticated;
grant update (feedback) on public.assistant_messages to authenticated;
grant usage, select on sequence public.assistant_messages_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Quota (free 15 / premium 200 per day)
-- ---------------------------------------------------------------------------
create or replace function public.assistant_quota()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'used',  (select count(*) from ai_usage where user_id = auth.uid() and feature = 'assistant' and created_at >= date_trunc('day', now())),
    'limit', case when coalesce(up.is_premium, false) and (up.premium_until is null or up.premium_until > now()) then 200 else 15 end,
    'premium', coalesce(up.is_premium, false))
  from user_profiles up where up.id = auth.uid()
$$;

create or replace function public.assistant_consume(p_tokens integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q jsonb;
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;
  if exists (select 1 from user_profiles where id = auth.uid() and coalesce(is_banned, false)) then
    raise exception 'account banned' using errcode = '42501';
  end if;
  q := assistant_quota();
  if (q->>'used')::int >= (q->>'limit')::int then
    raise exception 'quota_exceeded' using errcode = 'P0001', detail = q::text;
  end if;
  insert into ai_usage (user_id, feature, tokens_used) values (auth.uid(), 'assistant', coalesce(p_tokens, 0));
  return q || jsonb_build_object('used', (q->>'used')::int + 1);
end $$;
revoke all on function public.assistant_quota(), public.assistant_consume(integer) from public, anon;
grant execute on function public.assistant_quota(), public.assistant_consume(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Recommendations
-- ---------------------------------------------------------------------------
create or replace function public.get_module_overview(p_module_id integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'module', jsonb_build_object('id', m.id, 'name', m.name, 'slug', m.slug, 'semester', m.semester,
                                 'filiere_id', f.id, 'filiere', f.name, 'faculty', nullif(fa.name, '__root__'),
                                 'university_id', u.id, 'university', u.name, 'docs_count', m.docs_count),
    'by_type', coalesce((
      select jsonb_object_agg(t.doc_type, t.docs) from (
        select d.doc_type, jsonb_agg(jsonb_build_object(
                 'id', d.id, 'title', coalesce(d.title, d.doc_number), 'academic_year', d.academic_year,
                 'professor', coalesce(p.display_name, d.professor), 'display_status', d.display_status,
                 'quality_score', d.quality_score, 'helpful_count', d.helpful_count, 'downloads', d.downloads)
                 order by (d.display_status in ('verified', 'community_approved')) desc, d.quality_score desc, d.academic_year desc nulls last) as docs
          from documents d left join professors p on p.id = d.professor_id
         where d.module_id = m.id and d.status in ('published', 'verified')
         group by d.doc_type) t), '{}'::jsonb),
    'missing_types', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from unnest(array['examen', 'corrige_examen', 'cc', 'td', 'corrige_td', 'tp', 'cours']) x
       where not x = any(m.doc_types)),
    'professors', (
      select coalesce(jsonb_agg(distinct jsonb_build_object('id', p.id, 'name', p.display_name)), '[]'::jsonb)
        from documents d join professors p on p.id = d.professor_id
       where d.module_id = m.id and d.status in ('published', 'verified')),
    'open_requests', (
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'doc_type', r.doc_type, 'academic_year', r.academic_year, 'votes', r.votes)
                                order by r.votes desc), '[]'::jsonb)
        from document_requests r where r.module_id = m.id and r.status = 'open'))
  from modules m
  join filieres f on f.id = m.filiere_id join faculties fa on fa.id = f.faculty_id join universities u on u.id = fa.university_id
  where m.id = p_module_id
$$;

create or replace function public.get_related_modules(p_module_id integer, p_limit integer default 8)
returns table (module_id integer, name text, slug text, semester text, filiere text, university text,
               docs_count integer, relation text, score numeric)
language sql stable security definer set search_path = public, extensions as $$
  with base as (select m.*, fa.university_id from modules m join filieres f on f.id = m.filiere_id
                  join faculties fa on fa.id = f.faculty_id where m.id = p_module_id),
  cands as (
    -- same filière, same or neighbouring semester
    select m.id, 'Même filière'::text as relation,
           0.5 + case when m.semester = b.semester then 0.2 else 0 end + similarity(search_norm(m.name), search_norm(b.name)) * 0.5 as s
      from base b join modules m on m.filiere_id = b.filiere_id and m.id <> b.id
     where abs(coalesce(nullif(regexp_replace(m.semester, '\D', '', 'g'), '')::int, 0)
             - coalesce(nullif(regexp_replace(b.semester, '\D', '', 'g'), '')::int, 0)) <= 1
    union all
    -- the same subject in other schools (useful when yours has no documents yet)
    select m.id, 'Même matière, autre école', similarity(search_norm(m.name), search_norm(b.name)) + least(0.3, m.docs_count * 0.03)
      from base b join modules m on m.id <> b.id and m.filiere_id <> b.filiere_id
     where search_norm(m.name) % search_norm(b.name) and m.docs_count > 0
    union all
    -- students who downloaded documents of this module also downloaded…
    select d2.module_id, 'Aussi téléchargé', 0.6 + least(0.4, count(*) * 0.05)
      from base b
      join documents d1 on d1.module_id = b.id
      join downloads_log l1 on l1.document_id = d1.id
      join downloads_log l2 on l2.user_id = l1.user_id and l2.document_id <> l1.document_id
      join documents d2 on d2.id = l2.document_id and d2.module_id <> b.id
     group by d2.module_id
  )
  select m.id, m.name, m.slug, m.semester, f.name, u.name, m.docs_count,
         (array_agg(c.relation order by c.s desc))[1], round(max(c.s)::numeric, 2)
    from cands c
    join modules m on m.id = c.id join filieres f on f.id = m.filiere_id
    join faculties fa on fa.id = f.faculty_id join universities u on u.id = fa.university_id
   group by m.id, m.name, m.slug, m.semester, f.name, u.name, m.docs_count
   order by max(c.s) desc, m.docs_count desc
   limit least(coalesce(p_limit, 8), 20)
$$;

create or replace function public.recommend_for_me(p_limit integer default 10)
returns table (document_id integer, title text, doc_type text, academic_year text, display_status text, quality_score smallint,
               module_id integer, module_name text, module_slug text, semester text, reason text)
language sql stable security definer set search_path = public as $$
  with me as (select * from user_profiles where id = auth.uid())
  select d.id, coalesce(d.title, d.doc_number), d.doc_type, d.academic_year, d.display_status, d.quality_score,
         m.id, m.name, m.slug, m.semester,
         case when exists (select 1 from module_bookmarks b where b.user_id = me.id and b.module_id = m.id) then 'Module suivi'
              when semester_matches(m.semester, me.current_semester) then 'Ton semestre'
              else 'Ta filière' end
    from me
    join modules m on (m.filiere_id = me.filiere_id or m.id in (select module_id from module_bookmarks where user_id = me.id))
    join documents d on d.module_id = m.id and d.status in ('published', 'verified')
   where not exists (select 1 from downloads_log l where l.user_id = me.id and l.document_id = d.id)
     and d.uploader_id is distinct from me.id
   order by (exists (select 1 from module_bookmarks b where b.user_id = me.id and b.module_id = m.id)) desc,
            semester_matches(m.semester, me.current_semester) desc,
            (d.display_status in ('verified', 'community_approved')) desc, d.quality_score desc, d.created_at desc
   limit least(coalesce(p_limit, 10), 30)
$$;

create or replace function public.get_missing_resources(p_filiere_id integer, p_semester text default null, p_limit integer default 20)
returns table (module_id integer, name text, slug text, semester text, docs_count integer,
               missing_types text[], open_requests bigint, request_votes bigint)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.slug, m.semester, m.docs_count,
         array(select x from unnest(array['examen', 'corrige_examen', 'cc', 'td', 'tp', 'cours']) x where not x = any(m.doc_types)),
         (select count(*) from document_requests r where r.module_id = m.id and r.status = 'open'),
         (select coalesce(sum(r.votes), 0) from document_requests r where r.module_id = m.id and r.status = 'open')
    from modules m
   where m.filiere_id = p_filiere_id and semester_matches(m.semester, p_semester)
   order by 8 desc, m.docs_count, m.name
   limit least(coalesce(p_limit, 20), 50)
$$;

revoke all on function public.get_module_overview(integer), public.get_related_modules(integer, integer),
                       public.get_missing_resources(integer, text, integer) from public;
grant execute on function public.get_module_overview(integer), public.get_related_modules(integer, integer),
                          public.get_missing_resources(integer, text, integer) to anon, authenticated;
revoke all on function public.recommend_for_me(integer) from public, anon;
grant execute on function public.recommend_for_me(integer) to authenticated;

commit;
