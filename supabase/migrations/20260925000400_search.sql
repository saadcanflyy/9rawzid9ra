-- ============================================================================
-- 9rawZid9ra — Context-aware search
-- ----------------------------------------------------------------------------
-- • Accent-insensitive, typo-tolerant matching (unaccent + pg_trgm) on a search
--   document per module: module + filière (+ its abbreviations) + faculté + école + ville.
-- • Filière aliases derived automatically: "Génie Informatique (GI)" → gi,
--   "SMP - Sciences de la Matière Physique" → smp, initials "genie informatique" → gi.
-- • Synonyms table (reseau → reseaux, info → informatique, compta → comptabilite …).
-- • Cached stats on modules (docs_count, doc_types, verified_docs, last_doc_at) kept up
--   to date by triggers — Browse no longer needs extra queries to know what a module has.
-- • search_catalog(): one call returns ranked documents AND modules, with filters
--   (école, faculté, filière, semestre, type, année, vérifiés) and boosts for the
--   student's own school / filière / semestre.
-- • search_suggest(): autocomplete across modules, filières and schools.
-- • search_log + get_search_insights(): what students look for and don't find.
-- The browser parses "exam réseau GI 2024" into filters (src/lib/searchParser.js)
-- and sends the remaining words as p_query.
-- Requires the quality migration. Safe to re-run.
-- ============================================================================

begin;

create schema if not exists extensions;
create extension if not exists unaccent schema extensions;
grant usage on schema extensions to anon, authenticated;   -- already the Supabase default
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. Normalisation helpers
-- ---------------------------------------------------------------------------
create or replace function public.f_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = public, extensions as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- lower-case, no accents, punctuation → spaces, single spaces
create or replace function public.search_norm(p text) returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select btrim(regexp_replace(regexp_replace(lower(f_unaccent(coalesce(p, ''))), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

create table if not exists public.search_synonyms (
  term      text primary key,     -- normalised word a student types
  expansion text not null          -- normalised words added to the query
);
insert into public.search_synonyms (term, expansion) values
  ('reseau', 'reseaux'), ('reseaux', 'reseau'),
  ('info', 'informatique'), ('informatiq', 'informatique'),
  ('maths', 'mathematiques'), ('math', 'mathematiques'), ('mathematique', 'mathematiques'),
  ('proba', 'probabilites'), ('probas', 'probabilites'), ('stat', 'statistiques'), ('stats', 'statistiques'),
  ('compta', 'comptabilite'), ('eco', 'economie'), ('economique', 'economie'),
  ('bdd', 'bases donnees'), ('bd', 'bases donnees'), ('sql', 'bases donnees'),
  ('poo', 'programmation orientee objet'), ('algo', 'algorithmique'), ('prog', 'programmation'),
  ('elec', 'electronique electricite'), ('meca', 'mecanique'), ('thermo', 'thermodynamique'),
  ('physique', 'physique'), ('chimie', 'chimie'), ('bio', 'biologie'),
  ('gestion', 'gestion'), ('marketing', 'marketing'), ('droit', 'droit'),
  ('ang', 'anglais'), ('fr', 'francais'), ('com', 'communication'),
  ('ia', 'intelligence artificielle'), ('ml', 'machine learning apprentissage'),
  ('os', 'systemes exploitation'), ('se', 'systemes exploitation'),
  ('analyse', 'analyse'), ('algebre', 'algebre')
on conflict (term) do update set expansion = excluded.expansion;
alter table public.search_synonyms enable row level security;
drop policy if exists "Synonyms readable" on public.search_synonyms;
create policy "Synonyms readable" on public.search_synonyms for select using (true);
grant select on public.search_synonyms to anon, authenticated;

-- Aliases for a filière: explicit abbreviation, text in parentheses, prefix before " - ",
-- and the initials of its significant words.
create or replace function public.filiere_aliases(p_name text, p_abbr text) returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select search_norm(concat_ws(' ',
    p_abbr,
    (regexp_match(p_name, '\(([^)]+)\)'))[1],
    case when p_name ~ '^\S{2,8}\s+-\s' then split_part(p_name, ' ', 1) end,
    (select string_agg(left(w, 1), '')
       from regexp_split_to_table(search_norm(regexp_replace(p_name, '\([^)]*\)', '', 'g')), ' ') as w
      where length(w) > 3 or w in ('art', 'bio', 'geo'))
  ))
$$;

-- "S3" matches semester values S3, 3, S3-S4, S1-S3 … ; "Année 2" matches "Année 2".
create or replace function public.semester_matches(p_value text, p_filter text) returns boolean
language sql immutable parallel safe as $$
  select p_filter is null or p_filter = ''
      or upper(p_value) = upper(p_filter)
      or (p_filter ~* '^s\d+$' and (
            p_value = substr(p_filter, 2)
         or p_value ~* ('(^|-)' || p_filter || '(-|$)')
         or (p_value ~* '^s\d+-s\d+$'
             and substr(p_filter, 2)::int between substring(p_value from '^[sS](\d+)')::int
                                              and substring(p_value from '-[sS](\d+)$')::int)))
$$;

-- ---------------------------------------------------------------------------
-- 2. Search document + cached stats on modules
-- ---------------------------------------------------------------------------
alter table public.modules
  add column if not exists search_doc    text not null default '',
  add column if not exists docs_count    integer not null default 0,
  add column if not exists verified_docs integer not null default 0,
  add column if not exists doc_types     text[] not null default '{}',
  add column if not exists years         text[] not null default '{}',
  add column if not exists last_doc_at   timestamp;

create or replace function public.module_search_doc(p_module_id integer) returns text
language sql stable set search_path = public, extensions as $$
  select search_norm(concat_ws(' ', m.name, f.name, filiere_aliases(f.name, f.abbreviation),
                               nullif(fa.name, '__root__'), u.name, u.name_en, u.city, 's' || regexp_replace(m.semester, '\D', '', 'g')))
    from modules m
    left join filieres f   on f.id = m.filiere_id
    left join faculties fa on fa.id = f.faculty_id
    left join universities u on u.id = fa.university_id
   where m.id = p_module_id
$$;

create or replace function public.refresh_module_stats(p_module_id integer) returns void
language sql security definer set search_path = public as $$
  update modules m set
    docs_count    = s.n,
    verified_docs = s.v,
    doc_types     = s.types,
    years         = s.years,
    last_doc_at   = s.last
  from (
    select count(*) as n,
           count(*) filter (where status = 'verified') as v,
           coalesce(array_agg(distinct doc_type) filter (where doc_type is not null), '{}') as types,
           coalesce(array_agg(distinct academic_year) filter (where academic_year is not null), '{}') as years,
           max(created_at) as last
      from documents where module_id = p_module_id and status in ('published', 'verified')
  ) s
  where m.id = p_module_id
$$;

create or replace function public.fn_modules_search_doc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.search_doc := coalesce((select search_norm(concat_ws(' ', new.name, f.name, filiere_aliases(f.name, f.abbreviation),
                               nullif(fa.name, '__root__'), u.name, u.name_en, u.city, 's' || regexp_replace(new.semester, '\D', '', 'g')))
                         from filieres f
                         left join faculties fa on fa.id = f.faculty_id
                         left join universities u on u.id = fa.university_id
                        where f.id = new.filiere_id), search_norm(new.name));
  return new;
end $$;
drop trigger if exists trg_modules_search_doc on public.modules;
create trigger trg_modules_search_doc before insert or update of name, filiere_id, semester on public.modules
  for each row execute function public.fn_modules_search_doc();

-- Renaming a school / faculty / filière refreshes its modules.
create or replace function public.fn_catalog_refresh_search() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'filieres' then
    update modules set search_doc = module_search_doc(id) where filiere_id = new.id;
  elsif tg_table_name = 'faculties' then
    update modules set search_doc = module_search_doc(id)
     where filiere_id in (select id from filieres where faculty_id = new.id);
  else
    update modules set search_doc = module_search_doc(id)
     where filiere_id in (select f.id from filieres f join faculties fa on fa.id = f.faculty_id where fa.university_id = new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_filieres_refresh_search on public.filieres;
create trigger trg_filieres_refresh_search after update of name, abbreviation on public.filieres
  for each row execute function public.fn_catalog_refresh_search();
drop trigger if exists trg_faculties_refresh_search on public.faculties;
create trigger trg_faculties_refresh_search after update of name on public.faculties
  for each row execute function public.fn_catalog_refresh_search();
drop trigger if exists trg_universities_refresh_search on public.universities;
create trigger trg_universities_refresh_search after update of name, name_en, city on public.universities
  for each row execute function public.fn_catalog_refresh_search();

-- Document changes refresh the module's cached stats.
create or replace function public.fn_documents_module_stats() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.module_id is not null then perform refresh_module_stats(old.module_id); end if;
  if tg_op in ('INSERT', 'UPDATE') and new.module_id is not null
     and (tg_op = 'INSERT' or new.module_id is distinct from old.module_id or new.status is distinct from old.status
          or new.doc_type is distinct from old.doc_type or new.academic_year is distinct from old.academic_year) then
    perform refresh_module_stats(new.module_id);
  end if;
  return null;
end $$;
drop trigger if exists trg_documents_module_stats on public.documents;
create trigger trg_documents_module_stats after insert or update of module_id, status, doc_type, academic_year or delete on public.documents
  for each row execute function public.fn_documents_module_stats();

-- Backfill
update public.modules set search_doc = public.module_search_doc(id);
do $$ declare r record; begin
  for r in select distinct module_id from public.documents where module_id is not null loop
    perform public.refresh_module_stats(r.module_id);
  end loop;
end $$;

create index if not exists idx_modules_search_doc_trgm on public.modules using gin (search_doc gin_trgm_ops);
create index if not exists idx_modules_name_norm_trgm  on public.modules using gin (public.search_norm(name) gin_trgm_ops);
create index if not exists idx_filieres_name_norm_trgm on public.filieres using gin (public.search_norm(name) gin_trgm_ops);
create index if not exists idx_universities_name_norm_trgm on public.universities using gin (public.search_norm(name) gin_trgm_ops);
create index if not exists idx_modules_docs_count      on public.modules (docs_count desc);
create index if not exists idx_documents_year          on public.documents (academic_year);

-- ---------------------------------------------------------------------------
-- 3. Query expansion
-- ---------------------------------------------------------------------------
create or replace function public.search_expand(p_query text) returns text
language sql stable set search_path = public, extensions as $$
  select btrim(concat_ws(' ', search_norm(p_query),
         (select string_agg(s.expansion, ' ')
            from regexp_split_to_table(search_norm(p_query), ' ') w
            join search_synonyms s on s.term = w)))
$$;

-- ---------------------------------------------------------------------------
-- 4. search_catalog — ranked documents + modules in one call
-- ---------------------------------------------------------------------------
create or replace function public.search_catalog(
  p_query          text    default '',
  p_university_id  integer default null,
  p_faculty_id     integer default null,
  p_filiere_id     integer default null,
  p_semester       text    default null,
  p_doc_type       text    default null,   -- examen | cc | td | tp | cours | quiz | corrige (= any corrigé) | corrige_examen …
  p_year           text    default null,   -- '2024' matches 2023/2024 and 2024/2025
  p_verified_only  boolean default false,
  p_limit          integer default 20,
  p_offset         integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  q          text := search_norm(p_query);
  qx         text := search_expand(p_query);
  patterns   text[];
  mod_ids    integer[];
  doc_ids    integer[];
  fuzzy      boolean := false;
  me         record;
  v_limit    integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  has_filter boolean := p_university_id is not null or p_faculty_id is not null or p_filiere_id is not null
                        or p_semester is not null or p_doc_type is not null or p_year is not null
                        or coalesce(p_verified_only, false);
  mods       jsonb;
  docs       jsonb;
  v_total    integer;
begin
  if q = '' and not has_filter then
    return jsonb_build_object('query', q, 'expanded', qx, 'fuzzy', false, 'documents', '[]'::jsonb, 'modules', '[]'::jsonb, 'total_modules', 0);
  end if;
  select university_id, filiere_id, current_semester into me from user_profiles where id = auth.uid();

  -- Pass 1 (exact, fast): every word — or one of its synonyms — starts a word of the search document.
  if q <> '' then
    select array_agg('(^| )(' || array_to_string(array[w] || coalesce(string_to_array(s.expansion, ' '), '{}'), '|') || ')')
      into patterns
      from unnest(string_to_array(q, ' ')) w left join search_synonyms s on s.term = w;

    select array_agg(m.id) into mod_ids from (
      select id from modules m where (select bool_and(m.search_doc ~ p) from unnest(patterns) p) limit 3000) m;
    select array_agg(d.id) into doc_ids from (
      select id from documents d
       where d.status in ('published', 'verified')
         and (select bool_and(search_norm(concat_ws(' ', d.title, d.professor, d.doc_number)) ~ p) from unnest(patterns) p)
       limit 500) d;

    -- Pass 2 (typo-tolerant) only when nothing matched exactly.
    if mod_ids is null and doc_ids is null then
      fuzzy := true;
      select array_agg(m.id) into mod_ids from (
        select id from modules m where search_norm(m.name) % q or q <% search_norm(m.name) limit 500) m;
    end if;
  end if;

  with candidates as (
    select m.id, m.name, m.slug, m.semester, m.docs_count, m.verified_docs, m.doc_types, m.years, m.last_doc_at,
           f.id as filiere_id, f.name as filiere_name, f.abbreviation as filiere_abbreviation,
           fa.id as faculty_id, nullif(fa.name, '__root__') as faculty_name,
           u.id as university_id, u.name as university_name, u.city,
           case when q = '' then 0 else
             greatest(similarity(search_norm(m.name), q), word_similarity(q, m.search_doc), word_similarity(qx, m.search_doc) * 0.9)
             + case when search_norm(m.name) like q || '%' then 0.35 else 0 end
             + case when not fuzzy then 0.3 else 0 end
           end as text_score
      from modules m
      join filieres f   on f.id = m.filiere_id
      join faculties fa on fa.id = f.faculty_id
      join universities u on u.id = fa.university_id
     where (q = '' or m.id = any(mod_ids))
       and (p_university_id is null or u.id  = p_university_id)
       and (p_faculty_id    is null or fa.id = p_faculty_id)
       and (p_filiere_id    is null or f.id  = p_filiere_id)
       and semester_matches(m.semester, p_semester)
       and (p_doc_type is null or exists (select 1 from unnest(m.doc_types) t
                                           where t = p_doc_type or (p_doc_type = 'corrige' and t like 'corrige%')))
       and (p_year is null or exists (select 1 from unnest(m.years) y where y like '%' || p_year || '%'))
       and (not coalesce(p_verified_only, false) or m.verified_docs > 0)
  ),
  scored as (
    select c.*,
           c.text_score
           + case when me.university_id is not null and c.university_id = me.university_id then 0.25 else 0 end
           + case when me.filiere_id    is not null and c.filiere_id    = me.filiere_id    then 0.20 else 0 end
           + case when me.current_semester is not null and semester_matches(c.semester, me.current_semester) then 0.05 else 0 end
           + least(0.25, ln(1 + c.docs_count) / ln(20) * 0.25)
           + case when c.verified_docs > 0 then 0.05 else 0 end
           as score
      from candidates c
  )
  select coalesce(jsonb_agg(to_jsonb(s) - 'text_score' order by s.score desc, s.docs_count desc, s.name), '[]'::jsonb),
         (select count(*) from scored)
    into mods, v_total
    from (select * from scored order by score desc, docs_count desc, name limit v_limit offset greatest(coalesce(p_offset, 0), 0)) s;

  -- Documents: when the query is specific enough (words, type or year)
  if q <> '' or p_doc_type is not null or p_year is not null then
    with d as (
      select doc.id, coalesce(doc.title, doc.doc_number) as title, doc.doc_type, doc.academic_year, doc.professor,
             doc.status, doc.quality_score, doc.downloads, doc.helpful_count, doc.pages_count, doc.created_at,
             m.id as module_id, m.name as module_name, m.slug as module_slug, m.semester,
             f.id as filiere_id, f.name as filiere_name, u.id as university_id, u.name as university_name,
             case when q = '' then 0 else
               greatest(word_similarity(q, m.search_doc), word_similarity(q, search_norm(concat_ws(' ', doc.title, doc.professor, doc.doc_number))))
               + case when doc.id = any(doc_ids) then 0.3 else 0 end
               + case when not fuzzy then 0.3 else 0 end
             end as text_score
        from documents doc
        join modules m    on m.id = doc.module_id
        join filieres f   on f.id = m.filiere_id
        join faculties fa on fa.id = f.faculty_id
        join universities u on u.id = fa.university_id
       where doc.status in ('published', 'verified')
         and (q = '' or doc.module_id = any(mod_ids) or doc.id = any(doc_ids))
         and (not coalesce(p_verified_only, false) or doc.status = 'verified')
         and (p_university_id is null or u.id  = p_university_id)
         and (p_faculty_id    is null or fa.id = p_faculty_id)
         and (p_filiere_id    is null or f.id  = p_filiere_id)
         and semester_matches(m.semester, p_semester)
         and (p_doc_type is null or doc.doc_type = p_doc_type or (p_doc_type = 'corrige' and doc.doc_type like 'corrige%'))
         and (p_year is null or doc.academic_year like '%' || p_year || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(x) - 'text_score' order by x.score desc), '[]'::jsonb) into docs
      from (
        select d.*,
               d.text_score
               + d.quality_score / 100.0 * 0.4
               + case when d.status = 'verified' then 0.1 else 0 end
               + case when me.university_id is not null and d.university_id = me.university_id then 0.25 else 0 end
               + case when me.filiere_id    is not null and d.filiere_id    = me.filiere_id    then 0.20 else 0 end
               + case when p_year is not null and d.academic_year like '%/' || p_year then 0.05 else 0 end  -- June session of that year first
               + least(0.1, ln(1 + d.downloads) / ln(100) * 0.1)
               as score
          from d
         order by score desc
         limit 8
      ) x;
  end if;

  return jsonb_build_object(
    'query', q, 'expanded', qx, 'fuzzy', fuzzy,
    'documents', coalesce(docs, '[]'::jsonb),
    'modules', mods,
    'total_modules', v_total);
end $$;

revoke all on function public.search_catalog(text, integer, integer, integer, text, text, text, boolean, integer, integer) from public;
grant execute on function public.search_catalog(text, integer, integer, integer, text, text, text, boolean, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Autocomplete
-- ---------------------------------------------------------------------------
create or replace function public.search_suggest(p_prefix text, p_limit integer default 8)
returns table (kind text, id integer, label text, sublabel text, slug text, docs_count integer, score real)
language sql stable security definer set search_path = public, extensions as $$
  with q as (select search_norm(p_prefix) as t),
  me as (select university_id, filiere_id from user_profiles where id = auth.uid()),
  mods as (
    select 'module'::text as kind, m.id, m.name as label,
           concat_ws(' · ', m.semester, coalesce(f.abbreviation, f.name), u.name) as sublabel, m.slug, m.docs_count,
           (greatest(similarity(search_norm(m.name), q.t), word_similarity(q.t, m.search_doc))
            + case when search_norm(m.name) like q.t || '%' then 0.4 else 0 end
            + case when fa.university_id = (select university_id from me) then 0.2 else 0 end
            + case when m.filiere_id = (select filiere_id from me) then 0.2 else 0 end
            + least(0.2, m.docs_count * 0.02))::real as score
      from q, modules m
      join filieres f on f.id = m.filiere_id
      join faculties fa on fa.id = f.faculty_id
      join universities u on u.id = fa.university_id
     where length(q.t) >= 2
       and (search_norm(m.name) like q.t || '%' or q.t <% m.search_doc)
  ),
  fils (kind, id, label, sublabel, slug, docs_count, score) as (
    select 'filiere', f.id, f.name, concat_ws(' · ', nullif(fa.name, '__root__'), u.name), null::text,
           (select coalesce(sum(docs_count), 0)::int from modules where filiere_id = f.id),
           (greatest(similarity(search_norm(f.name), q.t), word_similarity(q.t, search_norm(f.name) || ' ' || filiere_aliases(f.name, f.abbreviation)))
            + case when q.t = any(string_to_array(filiere_aliases(f.name, f.abbreviation), ' ')) then 0.5 else 0 end
            + case when fa.university_id = (select university_id from me) then 0.2 else 0 end)::real
      from q, filieres f
      join faculties fa on fa.id = f.faculty_id
      join universities u on u.id = fa.university_id
     where length(q.t) >= 2
       and (search_norm(f.name) like q.t || '%' or q.t <% (search_norm(f.name) || ' ' || filiere_aliases(f.name, f.abbreviation))
            or q.t = any(string_to_array(filiere_aliases(f.name, f.abbreviation), ' ')))
  ),
  unis (kind, id, label, sublabel, slug, docs_count, score) as (
    select 'university', u.id, u.name, u.city, u.slug, null::int,
           (greatest(similarity(search_norm(u.name), q.t), word_similarity(q.t, search_norm(concat_ws(' ', u.name, u.name_en, u.city))))
            + case when search_norm(u.name) like q.t || '%' then 0.3 else 0 end
            + case when search_norm(concat_ws(' ', u.name, u.name_en)) ~ ('(^| )' || q.t || '( |$)') then 0.8 else 0 end)::real
      from q, universities u
     where length(q.t) >= 2 and q.t <% search_norm(concat_ws(' ', u.name, u.name_en, u.city))
  )
  select * from (
    select * from (select * from mods order by score desc limit greatest(coalesce(p_limit, 8), 1)) a
    union all
    select * from (select * from fils order by score desc limit 3) b
    union all
    select * from (select * from unis order by score desc limit 2) c
  ) x
  order by score desc
  limit greatest(coalesce(p_limit, 8), 1) + 3
$$;
revoke all on function public.search_suggest(text, integer) from public;
grant execute on function public.search_suggest(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Search log → insights for the team and for document requests
-- ---------------------------------------------------------------------------
create table if not exists public.search_log (
  id         bigserial primary key,
  user_id    uuid,
  query      text not null,
  filters    jsonb not null default '{}'::jsonb,
  results    integer not null default 0,
  clicked    text,                 -- 'module:12' / 'document:40' when the student opens a result
  created_at timestamptz not null default now()
);
create index if not exists idx_search_log_time on public.search_log (created_at desc);
alter table public.search_log enable row level security;
drop policy if exists "Staff read search log" on public.search_log;
create policy "Staff read search log" on public.search_log for select to authenticated using (is_staff());
revoke all on public.search_log from anon, authenticated;
grant select on public.search_log to authenticated;

create or replace function public.log_search(p_query text, p_filters jsonb default '{}'::jsonb, p_results integer default 0, p_clicked text default null)
returns void language sql security definer set search_path = public as $$
  insert into search_log (user_id, query, filters, results, clicked)
  select auth.uid(), left(search_norm(p_query), 200), coalesce(p_filters, '{}'::jsonb), greatest(coalesce(p_results, 0), 0), left(p_clicked, 40)
   where length(search_norm(p_query)) >= 2 or coalesce(p_filters, '{}'::jsonb) <> '{}'::jsonb
$$;
revoke all on function public.log_search(text, jsonb, integer, text) from public;
grant execute on function public.log_search(text, jsonb, integer, text) to anon, authenticated;

create or replace function public.get_search_insights(p_days integer default 30)
returns table (query text, searches bigint, zero_results bigint, last_searched timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select l.query, count(*), count(*) filter (where l.results = 0), max(l.created_at)
    from search_log l
   where l.created_at > now() - make_interval(days => coalesce(p_days, 30))
   group by l.query
   order by count(*) filter (where l.results = 0) desc, count(*) desc
   limit 100;
end $$;
revoke all on function public.get_search_insights(integer) from public, anon;
grant execute on function public.get_search_insights(integer) to authenticated;

commit;
