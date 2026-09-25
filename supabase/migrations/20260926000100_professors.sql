-- ============================================================================
-- 9rawZid9ra — Professor directory and name standardisation
-- ----------------------------------------------------------------------------
-- "Ahmed Benali", "Pr Ahmed Benali", "Ahmed Bn Ali", "Prof. A. Benali" → one profile
-- displayed as "Pr. Ahmed BENALI".
--
-- • professors: one row per real person (status pending → verified; merged rows point
--   to the surviving profile). professor_aliases: every raw spelling ever seen.
-- • professor_name_parts(): strips titles (Pr, Prof., Dr, Mme…), detects the family name
--   (ALL-CAPS words, else the last word; particles ben/bn/el/ait… are glued to it) and
--   builds a matching key ("benali").
-- • resolve_professor(): ranks existing profiles for a raw name + context (école/faculté).
-- • documents.professor_id: every document links to a profile. A trigger links new
--   uploads automatically: confident match → existing profile, otherwise a PENDING
--   profile is created for moderators to verify or merge.
-- • get_professor(): profile page data (affiliations, modules taught, years, documents).
-- • professor_feedback: structured, resource-focused feedback only (exam style, whether
--   the course materials help, difficulty). No free text, shown only from 3 answers —
--   this is about preparing exams, not rating people.
-- • Staff tools: get_professor_queue, verify_professor, merge_professors, update_professor.
-- Requires the 2026-09-25 migrations. Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Name normalisation
-- ---------------------------------------------------------------------------
create or replace function public.professor_name_parts(p_raw text,
  out title text, out first_name text, out last_name text, out name_key text, out first_key text, out display_name text)
language plpgsql immutable parallel safe set search_path = public, extensions as $$
declare
  raw_tokens text[];
  tok text; n text;
  caps text[] := '{}';
  rest text[] := '{}';
  firsts text[] := '{}';
  lasts text[] := '{}';
  particles constant text[] := array['ben','bn','bin','ibn','el','al','ait','ou','oul','ould','bel','bou','abou','abu','de','da'];
  titles constant text[] := array['pr','prof','professeur','professor','dr','docteur','doctor','mme','mr','m','mlle','madame','monsieur','mm','ms','mrs','prs'];
  i int;
begin
  title := 'Pr.';
  if p_raw is null or btrim(p_raw) = '' then return; end if;

  -- split on spaces and dots/commas but keep original casing
  raw_tokens := regexp_split_to_array(btrim(regexp_replace(p_raw, '[.,;:/()_\-]+', ' ', 'g')), '\s+');

  foreach tok in array raw_tokens loop
    n := search_norm(tok);
    continue when n = '';
    if n = any(titles) then continue; end if;
    if tok ~ '^[[:upper:]ÉÈÀÂÎÔÛÇ]{2,}$' and tok !~ '[[:lower:]]' then
      caps := caps || tok;
    else
      rest := rest || tok;
    end if;
  end loop;

  if cardinality(caps) > 0 and cardinality(rest) > 0 then
    lasts := caps; firsts := rest;                     -- "Nada SBIHI", "SBIHI Nada"
  elsif cardinality(caps) > 0 then
    -- all caps: "IBRAHIM RAHHAL" → last word is the family name (unless only one word)
    if cardinality(caps) = 1 then lasts := caps;
    else lasts := caps[cardinality(caps):cardinality(caps)]; firsts := caps[1:cardinality(caps) - 1]; end if;
  elsif cardinality(rest) > 0 then
    if cardinality(rest) = 1 then lasts := rest;
    else lasts := rest[cardinality(rest):cardinality(rest)]; firsts := rest[1:cardinality(rest) - 1]; end if;
  else
    return;                                            -- only titles, e.g. "PR"
  end if;

  -- particles written before the family name belong to it: "Ahmed Bn Ali", "Mohamed El Amrani"
  while cardinality(firsts) > 1 and search_norm(firsts[cardinality(firsts)]) = any(particles) loop
    lasts := firsts[cardinality(firsts)] || lasts;
    firsts := firsts[1:cardinality(firsts) - 1];
  end loop;
  if cardinality(firsts) = 1 and search_norm(firsts[1]) = any(particles) and cardinality(lasts) >= 1 then
    lasts := firsts || lasts; firsts := '{}';
  end if;

  last_name  := upper(array_to_string(lasts, ' '));
  first_name := nullif(initcap(lower(array_to_string(firsts, ' '))), '');
  if first_name ~ '^[[:alpha:]]$' then first_name := upper(first_name) || '.'; end if;   -- initials: "A" → "A."

  -- key: family name without spaces, "bn" → "ben"
  name_key := regexp_replace(search_norm(regexp_replace(lower(array_to_string(lasts, ' ')), '(^|\s)bn(\s|$)', '\1ben\2', 'g')), '\s', '', 'g');
  first_key := nullif(search_norm(coalesce(first_name, '')), '');
  if name_key = '' then name_key := null; return; end if;

  display_name := 'Pr. ' || concat_ws(' ', first_name, last_name);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.professors (
  id            serial primary key,
  title         text not null default 'Pr.',
  first_name    text,
  last_name     text not null,
  display_name  text not null,
  name_key      text not null,              -- family-name key, e.g. "benali"
  first_key     text,                       -- normalised first name or initial, e.g. "ahmed" / "a"
  university_id integer references public.universities(id) on delete set null,
  faculty_id    integer references public.faculties(id)    on delete set null,
  status        text not null default 'pending' check (status in ('pending', 'verified', 'merged', 'rejected')),
  merged_into   integer references public.professors(id) on delete set null,
  created_by    uuid,
  verified_by   uuid,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_professors_key     on public.professors (name_key);
create index if not exists idx_professors_status  on public.professors (status);
create index if not exists idx_professors_uni     on public.professors (university_id);
create index if not exists idx_professors_name_trgm on public.professors using gin (public.search_norm(display_name) gin_trgm_ops);

create table if not exists public.professor_aliases (
  alias_norm   text primary key,            -- search_norm(raw spelling)
  professor_id integer not null references public.professors(id) on delete cascade,
  raw          text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_professor_aliases_prof on public.professor_aliases (professor_id);

alter table public.documents add column if not exists professor_id integer references public.professors(id) on delete set null;
create index if not exists idx_documents_professor on public.documents (professor_id);

-- Structured feedback about how a professor's exams relate to the course materials.
create table if not exists public.professor_feedback (
  id             bigserial primary key,
  professor_id   integer not null references public.professors(id) on delete cascade,
  user_id        uuid    not null references public.user_profiles(id) on delete cascade,
  module_id      integer references public.modules(id) on delete set null,
  academic_year  text,
  exam_style     text check (exam_style in ('close_to_td', 'close_to_course', 'problem_solving', 'theory', 'mixed')),
  materials_help boolean,          -- "les documents de 9rawZid9ra aident à préparer ses examens"
  difficulty     smallint check (difficulty between 1 and 5),
  created_at     timestamptz not null default now(),
  unique (professor_id, user_id, module_id)
);
create index if not exists idx_professor_feedback_prof on public.professor_feedback (professor_id);

alter table public.professors         enable row level security;
alter table public.professor_aliases  enable row level security;
alter table public.professor_feedback enable row level security;
drop policy if exists "Professors readable"        on public.professors;
drop policy if exists "Professor aliases readable" on public.professor_aliases;
drop policy if exists "Feedback insert own"        on public.professor_feedback;
drop policy if exists "Feedback update own"        on public.professor_feedback;
drop policy if exists "Feedback delete own"        on public.professor_feedback;
drop policy if exists "Feedback read own"          on public.professor_feedback;
create policy "Professors readable"        on public.professors         for select using (status in ('pending', 'verified') or is_staff());
create policy "Professor aliases readable" on public.professor_aliases  for select using (true);
create policy "Feedback read own"          on public.professor_feedback for select to authenticated using (auth.uid() = user_id or is_staff());
create policy "Feedback insert own"        on public.professor_feedback for insert to authenticated with check (auth.uid() = user_id);
create policy "Feedback update own"        on public.professor_feedback for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Feedback delete own"        on public.professor_feedback for delete to authenticated using (auth.uid() = user_id);
revoke all on public.professors, public.professor_aliases, public.professor_feedback from anon, authenticated;
grant select on public.professors, public.professor_aliases to anon, authenticated;
grant select, insert, update, delete on public.professor_feedback to authenticated;
grant usage, select on sequence public.professor_feedback_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Matching
-- ---------------------------------------------------------------------------
-- Candidates for a raw name, best first. score ≥ 0.9 = safe to link automatically.
create or replace function public.resolve_professor(p_raw text, p_university_id integer default null, p_faculty_id integer default null, p_limit integer default 5)
returns table (professor_id integer, display_name text, status text, university_id integer, score numeric, reason text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare parts record; v_alias integer;
begin
  select * into parts from professor_name_parts(p_raw);
  if parts.name_key is null then return; end if;

  select pa.professor_id into v_alias from professor_aliases pa where pa.alias_norm = search_norm(p_raw);

  return query
  with c as (
    select p.id, p.display_name, p.status, p.university_id,
           (case when p.id = v_alias then 1.0
                 when p.name_key = parts.name_key and (parts.first_key is null or p.first_key is null) then 0.75
                 when p.name_key = parts.name_key and p.first_key = parts.first_key then 0.95
                 when p.name_key = parts.name_key and (left(p.first_key, 1) = left(parts.first_key, 1)
                                                       and (length(p.first_key) = 1 or length(parts.first_key) = 1)) then 0.9
                 when p.name_key = parts.name_key then 0.3            -- same family name, different first name
                 else similarity(p.name_key, parts.name_key) * 0.7 end)
           + case when p_university_id is not null and p.university_id = p_university_id then 0.05 else 0 end
           + case when p_faculty_id    is not null and p.faculty_id    = p_faculty_id    then 0.03 else 0 end
           + case when p.status = 'verified' then 0.02 else 0 end as s,
           case when p.id = v_alias then 'alias'
                when p.name_key = parts.name_key then 'same family name'
                else 'similar' end as why
      from professors p
     where p.status in ('pending', 'verified')
       and (p.id = v_alias or p.name_key = parts.name_key or similarity(p.name_key, parts.name_key) > 0.55)
  )
  select c.id, c.display_name, c.status, c.university_id, round(least(c.s, 1.0)::numeric, 2), c.why
    from c where c.s >= 0.35
   order by c.s desc, c.status = 'verified' desc
   limit greatest(coalesce(p_limit, 5), 1);
end $$;

-- Link a raw name to a profile, creating a pending one when nothing is confident.
create or replace function public.link_professor(p_raw text, p_university_id integer default null, p_faculty_id integer default null, p_created_by uuid default null)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare parts record; best record; v_id integer;
begin
  select * into parts from professor_name_parts(p_raw);
  if parts.name_key is null then return null; end if;

  select * into best from resolve_professor(p_raw, p_university_id, p_faculty_id, 1);
  if best.professor_id is not null and best.score >= 0.9 then
    v_id := best.professor_id;
    -- upgrade an initial to the full first name when we learn it
    update professors set first_name = parts.first_name, first_key = parts.first_key,
                          display_name = parts.display_name, updated_at = now()
     where id = v_id and length(coalesce(first_key, '')) <= 1 and length(coalesce(parts.first_key, '')) > 1;
  else
    insert into professors (title, first_name, last_name, display_name, name_key, first_key, university_id, faculty_id, status, created_by)
    values (parts.title, parts.first_name, parts.last_name, parts.display_name, parts.name_key, parts.first_key,
            p_university_id, p_faculty_id, 'pending', p_created_by)
    returning id into v_id;
  end if;

  insert into professor_aliases (alias_norm, professor_id, raw)
  values (search_norm(p_raw), v_id, left(p_raw, 120))
  on conflict (alias_norm) do nothing;
  return v_id;
end $$;
revoke all on function public.link_professor(text, integer, integer, uuid) from public, anon, authenticated;

-- documents: keep professor_id in sync with the typed name (old and new upload code both work)
create or replace function public.fn_documents_link_professor()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_fac integer; v_uni integer;
begin
  if new.professor_id is not null and (tg_op = 'INSERT' or new.professor_id is distinct from old.professor_id) then
    -- chosen from the picker: store the standard name as the text too
    select display_name into new.professor from professors where id = new.professor_id and status in ('pending', 'verified');
    return new;
  end if;
  if new.professor is null or btrim(new.professor) = '' then new.professor_id := null; return new; end if;
  if tg_op = 'UPDATE' and new.professor is not distinct from old.professor and new.professor_id is not null then return new; end if;

  select f.faculty_id, fa.university_id into v_fac, v_uni
    from modules m join filieres f on f.id = m.filiere_id join faculties fa on fa.id = f.faculty_id
   where m.id = new.module_id;
  new.professor_id := link_professor(new.professor, v_uni, v_fac, coalesce(auth.uid(), new.uploader_id));
  -- the raw spelling is kept in professor_aliases; the document shows the standard name
  if new.professor_id is not null then
    select display_name into new.professor from professors where id = new.professor_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_documents_link_professor on public.documents;
create trigger trg_documents_link_professor before insert or update of professor, professor_id, module_id on public.documents
  for each row execute function public.fn_documents_link_professor();

-- uploaders may pick a profile directly
grant update (professor_id) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reading: search + profile page
-- ---------------------------------------------------------------------------
create or replace function public.search_professors(p_query text, p_university_id integer default null, p_limit integer default 8)
returns table (id integer, display_name text, status text, university_id integer, university_name text,
               faculty_name text, documents_count bigint, modules_count bigint, score real)
language sql stable security definer set search_path = public, extensions as $$
  with q as (select search_norm(p_query) as t, (professor_name_parts(p_query)).name_key as k)
  select p.id, p.display_name, p.status, p.university_id, u.name, nullif(fa.name, '__root__'),
         (select count(*) from documents d where d.professor_id = p.id and d.status in ('published', 'verified')),
         (select count(distinct d.module_id) from documents d where d.professor_id = p.id and d.status in ('published', 'verified')),
         (greatest(similarity(search_norm(p.display_name), q.t), word_similarity(q.t, search_norm(p.display_name)))
          + case when p.name_key = q.k then 0.5 else 0 end
          + case when p.name_key like q.t || '%' or search_norm(coalesce(p.first_name, '')) like q.t || '%' then 0.3 else 0 end
          + case when p_university_id is not null and p.university_id = p_university_id then 0.2 else 0 end
          + case when p.status = 'verified' then 0.05 else 0 end)::real as score
    from q, professors p
    left join universities u on u.id = p.university_id
    left join faculties fa on fa.id = p.faculty_id
   where p.status in ('pending', 'verified') and length(q.t) >= 2
     and (p.name_key = q.k or p.name_key like replace(q.t, ' ', '') || '%' or q.t <% search_norm(p.display_name)
          or exists (select 1 from professor_aliases a where a.professor_id = p.id and a.alias_norm like '%' || q.t || '%'))
   order by score desc, p.display_name
   limit least(greatest(coalesce(p_limit, 8), 1), 30)
$$;
revoke all on function public.search_professors(text, integer, integer) from public;
grant execute on function public.search_professors(text, integer, integer) to anon, authenticated;

create or replace function public.get_professor(p_id integer)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_id integer := p_id; p professors%rowtype; result jsonb;
begin
  -- follow merges
  for i in 1..5 loop
    select * into p from professors where id = v_id;
    exit when not found or p.status <> 'merged' or p.merged_into is null;
    v_id := p.merged_into;
  end loop;
  if not found or p.status = 'rejected' then return null; end if;

  select jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'first_name', p.first_name, 'last_name', p.last_name,
    'status', p.status, 'redirected_from', case when v_id <> p_id then p_id end,
    'university', (select jsonb_build_object('id', u.id, 'name', u.name, 'city', u.city) from universities u where u.id = p.university_id),
    'faculty',    (select jsonb_build_object('id', fa.id, 'name', fa.name) from faculties fa where fa.id = p.faculty_id and fa.name <> '__root__'),
    -- where they teach, derived from linked documents
    'affiliations', coalesce((
      select jsonb_agg(distinct jsonb_build_object('university_id', u.id, 'university', u.name,
                                                   'faculty_id', fa.id, 'faculty', nullif(fa.name, '__root__'),
                                                   'filiere_id', f.id, 'filiere', f.name))
        from documents d join modules m on m.id = d.module_id join filieres f on f.id = m.filiere_id
        join faculties fa on fa.id = f.faculty_id join universities u on u.id = fa.university_id
       where d.professor_id = p.id and d.status in ('published', 'verified')), '[]'::jsonb),
    'modules', coalesce((
      select jsonb_agg(x order by x->>'last_year' desc nulls last, x->>'name') from (
        select jsonb_build_object('id', m.id, 'name', m.name, 'slug', m.slug, 'semester', m.semester,
                                  'filiere', f.name, 'documents', count(*),
                                  'years', array_agg(distinct d.academic_year) filter (where d.academic_year is not null),
                                  'last_year', max(d.academic_year)) as x
          from documents d join modules m on m.id = d.module_id join filieres f on f.id = m.filiere_id
         where d.professor_id = p.id and d.status in ('published', 'verified')
         group by m.id, m.name, m.slug, m.semester, f.name) t), '[]'::jsonb),
    'teaching_history', coalesce((
      select jsonb_agg(jsonb_build_object('academic_year', y, 'modules', mods) order by y desc) from (
        select d.academic_year as y, jsonb_agg(distinct m.name) as mods
          from documents d join modules m on m.id = d.module_id
         where d.professor_id = p.id and d.status in ('published', 'verified') and d.academic_year is not null
         group by d.academic_year) h), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.quality_score desc, x.academic_year desc nulls last) from (
        select d.id, coalesce(d.title, d.doc_number) as title, d.doc_type, d.academic_year, d.status, d.quality_score,
               d.downloads, m.id as module_id, m.name as module_name, m.slug as module_slug
          from documents d join modules m on m.id = d.module_id
         where d.professor_id = p.id and d.status in ('published', 'verified')
         limit 100) x), '[]'::jsonb),
    'feedback', (
      select case when count(*) < 3 then jsonb_build_object('count', count(*), 'hidden', true)
             else jsonb_build_object(
               'count', count(*), 'hidden', false,
               'exam_style', (select jsonb_object_agg(s, n) from (select exam_style s, count(*) n from professor_feedback
                                                                  where professor_id = p.id and exam_style is not null group by 1) es),
               'materials_help_pct', round(100.0 * count(*) filter (where materials_help) / nullif(count(materials_help), 0)),
               'difficulty_avg', round(avg(difficulty)::numeric, 1)) end
        from professor_feedback where professor_id = p.id),
    'aliases', (select coalesce(jsonb_agg(raw), '[]'::jsonb) from professor_aliases where professor_id = p.id)
  ) into result;
  return result;
end $$;
revoke all on function public.get_professor(integer) from public;
grant execute on function public.get_professor(integer) to anon, authenticated;

-- Upload picker: "not in the list" → create a pending profile explicitly.
create or replace function public.propose_professor(p_name text, p_university_id integer default null, p_faculty_id integer default null)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;
  if (professor_name_parts(p_name)).name_key is null then raise exception 'Nom de professeur invalide'; end if;
  return link_professor(p_name, p_university_id, p_faculty_id, auth.uid());
end $$;
revoke all on function public.propose_professor(text, integer, integer) from public, anon;
grant execute on function public.propose_professor(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Staff tools
-- ---------------------------------------------------------------------------
create or replace function public.get_professor_queue(p_limit integer default 50)
returns table (id integer, display_name text, university_name text, documents_count bigint, aliases jsonb,
               created_at timestamptz, possible_duplicates jsonb)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select p.id, p.display_name, u.name,
         (select count(*) from documents d where d.professor_id = p.id),
         (select coalesce(jsonb_agg(a.raw), '[]'::jsonb) from professor_aliases a where a.professor_id = p.id),
         p.created_at,
         (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'display_name', o.display_name, 'status', o.status)), '[]'::jsonb)
            from professors o
           where o.id <> p.id and o.status in ('pending', 'verified')
             and (o.name_key = p.name_key or similarity(o.name_key, p.name_key) > 0.6))
    from professors p left join universities u on u.id = p.university_id
   where p.status = 'pending'
   order by (select count(*) from documents d where d.professor_id = p.id) desc, p.created_at
   limit p_limit;
end $$;

create or replace function public.verify_professor(p_id integer, p_first_name text default null, p_last_name text default null,
                                                   p_university_id integer default null, p_faculty_id integer default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_first text; v_last text;
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(nullif(initcap(lower(btrim(p_first_name))), ''), first_name),
         coalesce(nullif(upper(btrim(p_last_name)), ''), last_name)
    into v_first, v_last from professors where id = p_id;
  update professors set
    first_name = v_first, last_name = v_last,
    display_name = 'Pr. ' || concat_ws(' ', v_first, v_last),
    name_key = (professor_name_parts(concat_ws(' ', v_first, v_last))).name_key,
    first_key = nullif(search_norm(coalesce(v_first, '')), ''),
    university_id = coalesce(p_university_id, university_id),
    faculty_id = coalesce(p_faculty_id, faculty_id),
    status = 'verified', verified_by = auth.uid(), verified_at = now(), updated_at = now()
  where id = p_id;
  update documents set professor = (select display_name from professors where id = p_id) where professor_id = p_id;
end $$;

create or replace function public.merge_professors(p_from integer, p_into integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_from = p_into then raise exception 'same professor'; end if;
  update documents set professor_id = p_into where professor_id = p_from;
  update professor_aliases set professor_id = p_into where professor_id = p_from;
  update professor_feedback f set professor_id = p_into
   where professor_id = p_from
     and not exists (select 1 from professor_feedback g where g.professor_id = p_into and g.user_id = f.user_id and g.module_id is not distinct from f.module_id);
  delete from professor_feedback where professor_id = p_from;
  update professors set status = 'merged', merged_into = p_into, updated_at = now() where id = p_from;
  update documents set professor = (select display_name from professors where id = p_into) where professor_id = p_into;
end $$;

create or replace function public.reject_professor(p_id integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update documents set professor_id = null where professor_id = p_id;
  update professors set status = 'rejected', updated_at = now() where id = p_id;
end $$;

revoke all on function public.get_professor_queue(integer), public.verify_professor(integer, text, text, integer, integer),
                       public.merge_professors(integer, integer), public.reject_professor(integer) from public, anon;
grant execute on function public.get_professor_queue(integer), public.verify_professor(integer, text, text, integer, integer),
                          public.merge_professors(integer, integer), public.reject_professor(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Backfill: link every existing document ("PR" and other title-only values stay unlinked)
-- ---------------------------------------------------------------------------
do $$
declare d record; v_fac integer; v_uni integer;
begin
  for d in select id, professor, module_id, uploader_id from documents
            where professor is not null and btrim(professor) <> '' and professor_id is null
            order by created_at loop
    select f.faculty_id, fa.university_id into v_fac, v_uni
      from modules m join filieres f on f.id = m.filiere_id join faculties fa on fa.id = f.faculty_id where m.id = d.module_id;
    update documents set professor_id = link_professor(d.professor, v_uni, v_fac, d.uploader_id) where id = d.id;
  end loop;
end $$;

commit;
