-- ============================================================================
-- 9rawZid9ra — Search v2: institutions, professors, context resolution, new ranking
-- ----------------------------------------------------------------------------
-- • Institution aliases: derived automatically from names ("Faculté des Sciences de Rabat
--   (FSR)" → fsr, fs; "Faculté des Sciences Juridiques, Économiques et Sociales" → fsjes)
--   plus a curated table for the ones names don't contain (UM5, UIT…).
-- • Roman numerals in module names match digits ("Analyse II" ↔ "analyse 2").
-- • Documents get a search_text (title, number, standard professor name) so "examen sbihi" works.
-- • search_catalog v2: new filters p_module_id, p_professor_id, p_doc_types (several types,
--   e.g. examen + corrigé), and the requested document ranking:
--     1. verified (moderator) > community approved > published
--     2. most useful (helpful votes, quality score)
--     3. most recent (academic year / upload date)
--     4. contributor reputation
--   on top of text relevance and the student's own school / filière.
-- • resolve_academic_context(text): "je cherche un examen de réseau GI S5 avec correction"
--   → { filiere: Génie Informatique, module: Réseaux…, semester: S5, doc_types: [examen, corrige_examen] }.
--   Used by the AI assistant and available to the search page.
-- • search_suggest v2 also suggests faculties and professors.
-- Requires the 2026-09-25 migrations and 20260926000100/200. Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Normalisation: roman numerals II–VIII → digits (I and V left alone: "Mohammed V", "I")
-- ---------------------------------------------------------------------------
create or replace function public.search_norm(p text) returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         regexp_replace(regexp_replace(regexp_replace(
           ' ' || regexp_replace(lower(f_unaccent(coalesce(p, ''))), '[^a-z0-9]+', ' ', 'g') || ' ',
         ' viii ', ' 8 ', 'g'), ' vii ', ' 7 ', 'g'), ' vi ', ' 6 ', 'g'),
         ' iv ', ' 4 ', 'g'), ' iii ', ' 3 ', 'g'), ' ii ', ' 2 ', 'g'),
         '\s+', ' ', 'g'), '^ | $', '', 'g'))
$$;

-- ---------------------------------------------------------------------------
-- 2. Institution aliases
-- ---------------------------------------------------------------------------
-- Words that are places, not part of an acronym ("Faculté des Sciences de Rabat" → fs + fsr)
create table if not exists public.search_place_words (word text primary key);
insert into public.search_place_words (word) values
  ('rabat'), ('sale'), ('kenitra'), ('casablanca'), ('casa'), ('mohammedia'), ('settat'), ('fes'), ('meknes'),
  ('marrakech'), ('agadir'), ('tanger'), ('tetouan'), ('oujda'), ('eljadida'), ('jadida'), ('safi'), ('beni'),
  ('mellal'), ('errachidia'), ('nador'), ('larache'), ('khouribga'), ('berrechid'), ('taza'), ('ouarzazate'),
  ('guelmim'), ('laayoune'), ('dakhla'), ('souissi'), ('agdal'), ('maarif'), ('hay'), ('riad'), ('hassan'),
  ('ain'), ('sebaa'), ('chock'), ('benmsik'), ('campus')
on conflict do nothing;
alter table public.search_place_words enable row level security;
drop policy if exists "Place words readable" on public.search_place_words;
create policy "Place words readable" on public.search_place_words for select using (true);
grant select on public.search_place_words to anon, authenticated;

-- Generic aliases: explicit abbreviation, text in parentheses, prefix before " - ",
-- initials of significant words, and the same initials without place words.
create or replace function public.entity_aliases(p_name text, p_abbr text default null) returns text
language sql stable parallel safe set search_path = public, extensions as $$
  with words as (
    select w, ord from regexp_split_to_table(search_norm(regexp_replace(coalesce(p_name, ''), '\([^)]*\)', '', 'g')), ' ')
           with ordinality as t(w, ord)
     where length(w) > 3 or w in ('art', 'bio', 'geo', 'eco')
  )
  select search_norm(concat_ws(' ',
    p_abbr,
    (regexp_match(p_name, '\(([^)]+)\)'))[1],
    case when p_name ~ '^\S{2,10}\s+-\s' then split_part(p_name, ' ', 1) end,
    (select string_agg(left(w, 1), '' order by ord) from words),
    (select string_agg(left(w, 1), '' order by ord) from words where w not in (select word from search_place_words))
  ))
$$;

-- Cached aliases on schools / faculties / filières (used by search, suggest and context resolution)
alter table public.universities add column if not exists search_aliases text not null default '';
alter table public.faculties    add column if not exists search_aliases text not null default '';
alter table public.filieres     add column if not exists search_aliases text not null default '';
create or replace function public.fn_catalog_search_aliases() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'filieres' then
    new.search_aliases := entity_aliases(new.name, new.abbreviation);
  elsif tg_table_name = 'faculties' then
    new.search_aliases := case when new.name = '__root__' then '' else entity_aliases(new.name) end;
  else
    new.search_aliases := entity_aliases(new.name);
  end if;
  return new;
end $$;
drop trigger if exists trg_universities_search_aliases on public.universities;
create trigger trg_universities_search_aliases before insert or update of name on public.universities
  for each row execute function public.fn_catalog_search_aliases();
drop trigger if exists trg_faculties_search_aliases on public.faculties;
create trigger trg_faculties_search_aliases before insert or update of name on public.faculties
  for each row execute function public.fn_catalog_search_aliases();
drop trigger if exists trg_filieres_search_aliases on public.filieres;
create trigger trg_filieres_search_aliases before insert or update of name, abbreviation on public.filieres
  for each row execute function public.fn_catalog_search_aliases();
update public.universities set search_aliases = public.entity_aliases(name);
update public.faculties    set search_aliases = case when name = '__root__' then '' else public.entity_aliases(name) end;
update public.filieres     set search_aliases = public.entity_aliases(name, abbreviation);

create table if not exists public.institution_aliases (
  id            serial primary key,
  alias_norm    text not null,
  university_id integer references public.universities(id) on delete cascade,
  faculty_id    integer references public.faculties(id) on delete cascade,
  check (university_id is not null or faculty_id is not null)
);
create unique index if not exists institution_aliases_uniq
  on public.institution_aliases (alias_norm, coalesce(university_id, 0), coalesce(faculty_id, 0));
create index if not exists idx_institution_aliases_uni on public.institution_aliases (university_id);
create index if not exists idx_institution_aliases_fac on public.institution_aliases (faculty_id);
alter table public.institution_aliases enable row level security;
drop policy if exists "Institution aliases readable" on public.institution_aliases;
create policy "Institution aliases readable" on public.institution_aliases for select using (true);
drop policy if exists "Staff manage institution aliases" on public.institution_aliases;
create policy "Staff manage institution aliases" on public.institution_aliases for all to authenticated using (is_staff()) with check (is_staff());
grant select on public.institution_aliases to anon, authenticated;
grant insert, update, delete on public.institution_aliases to authenticated;
grant usage, select on sequence public.institution_aliases_id_seq to authenticated;

-- Curated aliases that the names don't contain (matched by name; skipped if the school isn't there)
insert into public.institution_aliases (alias_norm, university_id, faculty_id)
select a.alias, u.id, null
  from (values ('um5', '%mohammed v%rabat%'), ('um5r', '%mohammed v%rabat%'), ('mohammed 5', '%mohammed v%rabat%'),
               ('uit', '%ibn tofa%'), ('ibn tofail', '%ibn tofa%'),
               ('uh2c', '%hassan ii%casablanca%'), ('hassan 2', '%hassan ii%casablanca%'),
               ('uae', '%abdelmalek essa%'), ('usmba', '%sidi mohamed ben abdellah%'),
               ('uca', '%cadi ayyad%'), ('uiz', '%ibn zohr%'), ('ump', '%mohammed premier%'),
               ('uhp', '%hassan premier%'), ('umi', '%moulay ismail%'), ('ucd', '%chouaib doukkali%'),
               ('usms', '%sultan moulay slimane%')) as a(alias, pattern)
  join public.universities u on f_unaccent(lower(u.name)) like f_unaccent(a.pattern)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Search documents
-- ---------------------------------------------------------------------------
create or replace function public.module_search_doc(p_module_id integer) returns text
language sql stable set search_path = public, extensions as $$
  select search_norm(concat_ws(' ', m.name, f.name, f.search_aliases,
                               nullif(fa.name, '__root__'), fa.search_aliases,
                               u.name, u.name_en, u.search_aliases, u.city,
                               (select string_agg(alias_norm, ' ') from institution_aliases ia
                                 where ia.university_id = u.id or ia.faculty_id = fa.id),
                               's' || regexp_replace(m.semester, '\D', '', 'g')))
    from modules m
    left join filieres f   on f.id = m.filiere_id
    left join faculties fa on fa.id = f.faculty_id
    left join universities u on u.id = fa.university_id
   where m.id = p_module_id
$$;

create or replace function public.fn_modules_search_doc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.search_doc := coalesce((
    select search_norm(concat_ws(' ', new.name, f.name, f.search_aliases,
                                 nullif(fa.name, '__root__'), fa.search_aliases,
                                 u.name, u.name_en, u.search_aliases, u.city,
                                 (select string_agg(alias_norm, ' ') from institution_aliases ia
                                   where ia.university_id = u.id or ia.faculty_id = fa.id),
                                 's' || regexp_replace(new.semester, '\D', '', 'g')))
      from filieres f
      left join faculties fa on fa.id = f.faculty_id
      left join universities u on u.id = fa.university_id
     where f.id = new.filiere_id), search_norm(new.name));
  return new;
end $$;

-- documents.search_text: title, number, standard professor name + known spellings
alter table public.documents add column if not exists search_text text not null default '';
create or replace function public.fn_documents_search_text() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.search_text := search_norm(concat_ws(' ', new.title, new.doc_number, new.professor,
    (select concat_ws(' ', p.display_name, p.last_name) from professors p where p.id = new.professor_id)));
  return new;
end $$;
drop trigger if exists trg_documents_search_text on public.documents;
create trigger trg_documents_search_text before insert or update of title, doc_number, professor, professor_id on public.documents
  for each row execute function public.fn_documents_search_text();
create index if not exists idx_documents_search_text_trgm on public.documents using gin (search_text gin_trgm_ops);

-- Rebuild everything that depends on search_norm
update public.documents set search_text = search_norm(concat_ws(' ', title, doc_number, professor,
  (select concat_ws(' ', p.display_name, p.last_name) from professors p where p.id = documents.professor_id)));
update public.modules set search_doc = public.module_search_doc(id);
reindex index public.idx_modules_name_norm_trgm;
reindex index public.idx_filieres_name_norm_trgm;
reindex index public.idx_universities_name_norm_trgm;
reindex index public.idx_professors_name_trgm;

-- new aliases refresh the modules of that school / faculty
create or replace function public.fn_institution_aliases_refresh() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  update modules set search_doc = module_search_doc(id)
   where filiere_id in (select f.id from filieres f join faculties fa on fa.id = f.faculty_id
                         where fa.id = r.faculty_id or fa.university_id = r.university_id);
  return null;
end $$;
drop trigger if exists trg_institution_aliases_refresh on public.institution_aliases;
create trigger trg_institution_aliases_refresh after insert or update or delete on public.institution_aliases
  for each row execute function public.fn_institution_aliases_refresh();

-- ---------------------------------------------------------------------------
-- 4. resolve_academic_context — understand a natural-language request
-- ---------------------------------------------------------------------------
create or replace function public.resolve_academic_context(p_text text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  t text := search_norm(p_text);
  toks text[];
  used text[] := '{}';
  tok text;
  v_types text[] := '{}';
  want_corrige boolean := false;
  v_year text; v_sem text;
  uni record; fac record; fil record; prof record;
  mods jsonb; v_remaining text; me record;
  stop constant text[] := array['je','j','cherche','chercher','recherche','veux','voudrais','besoin','trouve','trouver','un','une',
    'le','la','les','l','de','des','du','d','pour','avec','sans','en','sur','et','ou','a','au','aux','mon','ma','mes','svp','stp',
    'please','bghit','bghiti','3endkom','chi','wach','fin','dyal','dial','module','cours','matiere','filiere','semestre','annee',
    'fac','faculte','ecole','universite','prof','professeur','pr','document','documents','qui','que','est','il','y','of','the','for',
    'i','need','want','looking','find','exam','with','solution','solutions'];
  type_map constant jsonb := '{"exam":"examen","exams":"examen","examen":"examen","examens":"examen","final":"examen","finale":"examen",
    "cc":"cc","cc1":"cc","cc2":"cc","controle":"cc","controles":"cc","partiel":"cc","partiels":"cc","ds":"cc",
    "td":"td","tds":"td","tp":"tp","tps":"tp","cours":"cours","resume":"cours","resumes":"cours","poly":"cours","polycopie":"cours",
    "quiz":"quiz","qcm":"quiz","projet":"projet_final","pfe":"projet_final"}';
  corr_words constant text[] := array['corrige','corriges','correction','corrections','corr','solution','solutions','corrigee'];
begin
  toks := case when t = '' then '{}'::text[] else string_to_array(t, ' ') end;
  select university_id, filiere_id, current_semester into me from user_profiles where id = auth.uid();

  -- 4a. type / year / semester
  for i in 1 .. coalesce(array_length(toks, 1), 0) loop
    tok := toks[i];
    if tok = any(corr_words) then want_corrige := true; used := used || tok;
    elsif type_map ? tok then v_types := v_types || (type_map ->> tok); used := used || tok;
    elsif tok ~ '^s(1[0-4]|[1-9])$' then v_sem := upper(tok); used := used || tok;
    elsif tok in ('semestre', 'sem') and i < array_length(toks, 1) and toks[i + 1] ~ '^(1[0-4]|[1-9])$' then
      v_sem := 'S' || toks[i + 1]; used := used || tok || toks[i + 1];
    elsif tok ~ '^20[0-9]{2}$' then v_year := tok; used := used || tok;
    end if;
  end loop;
  select array_agg(distinct x) into v_types from unnest(v_types) x;
  if want_corrige then
    v_types := coalesce(v_types, '{}') || coalesce((select array_agg('corrige_' || x) from unnest(v_types) x where x in ('examen', 'td', 'tp')), '{}');
    if cardinality(v_types) = 0 then v_types := array['corrige_examen', 'corrige_td', 'corrige_tp']; end if;
  end if;

  -- 4b. school: a token (or pair of tokens) equal to one of its aliases, city as a tie-break
  select u.id, u.name, u.city, a.alias into uni
    from universities u
    cross join lateral (
      select alias from unnest(string_to_array(u.search_aliases || ' ' ||
                        coalesce((select string_agg(alias_norm, ' ') from institution_aliases ia where ia.university_id = u.id and ia.faculty_id is null), ''), ' ')) alias
       where length(alias) >= 2 and (alias = any(toks) or t ~ ('(^| )' || alias || '( |$)'))
       order by length(alias) desc limit 1) a
   order by length(a.alias) desc,
            (search_norm(u.city) = any(toks)) desc,
            (u.id = me.university_id) desc
   limit 1;

  -- 4c. faculty (inside the school if we found one)
  select fa.id, fa.name, fa.university_id, a.alias into fac
    from faculties fa
    cross join lateral (
      select alias from unnest(string_to_array(fa.search_aliases || ' ' ||
                        coalesce((select string_agg(alias_norm, ' ') from institution_aliases ia where ia.faculty_id = fa.id), ''), ' ')) alias
       where length(alias) >= 2 and alias = any(toks)
       order by length(alias) desc limit 1) a
    join universities u on u.id = fa.university_id
   where fa.name <> '__root__' and (uni.id is null or fa.university_id = uni.id)
   order by length(a.alias) desc, (search_norm(u.city) = any(toks)) desc, (fa.university_id = me.university_id) desc
   limit 1;
  if uni.id is null and fac.id is not null then
    select u.id, u.name, u.city, null::text as alias into uni from universities u where u.id = fac.university_id;
  end if;

  -- 4d. filière: exact alias token (gi, smi…) or strong name match, inside the school/faculty
  select f.id, f.name, f.abbreviation, f.faculty_id, a.alias into fil
    from filieres f
    join faculties fa on fa.id = f.faculty_id
    cross join lateral (
      select alias from unnest(string_to_array(f.search_aliases, ' ')) alias
       where length(alias) >= 2 and alias = any(toks) limit 1) a
   where (fac.id is null or f.faculty_id = fac.id) and (uni.id is null or fa.university_id = uni.id)
   order by (f.id = me.filiere_id) desc, (fa.university_id = me.university_id) desc,
            (select count(*) from modules m where m.filiere_id = f.id and m.docs_count > 0) desc
   limit 1;
  if fil.id is null then
    select f.id, f.name, f.abbreviation, f.faculty_id, null::text as alias into fil
      from filieres f join faculties fa on fa.id = f.faculty_id
     where (fac.id is null or f.faculty_id = fac.id) and (uni.id is null or fa.university_id = uni.id)
       and word_similarity(search_norm(f.name), t) >= 0.8 and length(search_norm(f.name)) >= 6
     order by word_similarity(search_norm(f.name), t) desc limit 1;
  end if;

  -- 4e. professor: a family name token
  select p.id, p.display_name, p.name_key into prof
    from professors p
   where p.status in ('pending', 'verified') and p.name_key = any(toks) and length(p.name_key) >= 4
   order by (p.university_id = uni.id) desc, p.status = 'verified' desc limit 1;

  -- words left for the module name
  select string_agg(w, ' ') into v_remaining
    from unnest(toks) w
   where not (w = any(used)) and not (w = any(stop))
     and w is distinct from uni.alias and w is distinct from fac.alias and w is distinct from fil.alias
     and w is distinct from prof.name_key
     and (uni.city is null or w <> search_norm(uni.city));

  -- 4f. modules
  if coalesce(v_remaining, '') <> '' then
    select coalesce(jsonb_agg(x order by (x->>'score')::numeric desc), '[]'::jsonb) into mods from (
      select jsonb_build_object('id', m.id, 'name', m.name, 'slug', m.slug, 'semester', m.semester,
                                'filiere_id', f.id, 'filiere', f.name, 'university', u.name, 'docs_count', m.docs_count,
                                'score', round((greatest(similarity(search_norm(m.name), v_remaining), word_similarity(v_remaining, search_norm(m.name)))
                                                + case when search_norm(m.name) like v_remaining || '%' then 0.2 else 0 end
                                                + case when fil.id is not null and m.filiere_id = fil.id then 0.3 else 0 end
                                                + case when v_sem is not null and semester_matches(m.semester, v_sem) then 0.1 else 0 end
                                                + least(0.1, ln(1 + m.docs_count) / ln(20) * 0.1)
                                                + case when cardinality(v_types) > 0 and m.doc_types && v_types then 0.15 else 0 end)::numeric, 2)) as x
        from modules m
        join filieres f on f.id = m.filiere_id join faculties fa on fa.id = f.faculty_id join universities u on u.id = fa.university_id
       where (fil.id is null or m.filiere_id = fil.id)
         and (fac.id is null or fa.id = fac.id)
         and (uni.id is null or u.id = uni.id)
         and (v_sem is null or semester_matches(m.semester, v_sem) or fil.id is null)
         and (v_remaining <% search_norm(m.name) or search_norm(m.name) % v_remaining
              or search_norm(m.name) ~ ('(^| )' || split_part(v_remaining, ' ', 1)))
       order by 1 desc
       limit 5) s;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'query', t,
    'university', case when uni.id is not null then jsonb_build_object('id', uni.id, 'name', uni.name) end,
    'faculty',    case when fac.id is not null then jsonb_build_object('id', fac.id, 'name', fac.name) end,
    'filiere',    case when fil.id is not null then jsonb_build_object('id', fil.id, 'name', fil.name, 'abbreviation', fil.abbreviation) end,
    'module',     case when jsonb_array_length(coalesce(mods, '[]')) > 0 and (mods->0->>'score')::numeric >= 0.6 then mods->0 end,
    'module_candidates', mods,
    'professor',  case when prof.id is not null then jsonb_build_object('id', prof.id, 'name', prof.display_name) end,
    'semester',   v_sem,
    'year',       v_year,
    'doc_types',  case when cardinality(v_types) > 0 then to_jsonb(v_types) end,
    'remaining',  nullif(v_remaining, '')));
end $$;
revoke all on function public.resolve_academic_context(text) from public;
grant execute on function public.resolve_academic_context(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. search_catalog v2
-- ---------------------------------------------------------------------------
drop function if exists public.search_catalog(text, integer, integer, integer, text, text, text, boolean, integer, integer);

create or replace function public.search_catalog(
  p_query          text    default '',
  p_university_id  integer default null,
  p_faculty_id     integer default null,
  p_filiere_id     integer default null,
  p_semester       text    default null,
  p_doc_type       text    default null,   -- examen | cc | td | tp | cours | quiz | projet_final | corrige (any) | corrige_examen …
  p_year           text    default null,   -- '2024' matches 2023/2024 and 2024/2025
  p_verified_only  boolean default false,  -- only moderator-verified or community-approved
  p_limit          integer default 20,
  p_offset         integer default 0,
  p_module_id      integer default null,
  p_professor_id   integer default null,
  p_doc_types      text[]  default null)   -- several types at once (overrides p_doc_type)
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
  v_types    text[];
  has_filter boolean;
  mods       jsonb;
  docs       jsonb;
  v_total    integer;
begin
  v_types := coalesce(p_doc_types, case when p_doc_type is null then null
                                        when p_doc_type = 'corrige' then array['corrige_examen', 'corrige_td', 'corrige_tp']
                                        else array[p_doc_type] end);
  has_filter := p_university_id is not null or p_faculty_id is not null or p_filiere_id is not null
             or p_semester is not null or v_types is not null or p_year is not null
             or coalesce(p_verified_only, false) or p_module_id is not null or p_professor_id is not null;
  if q = '' and not has_filter then
    return jsonb_build_object('query', q, 'expanded', qx, 'fuzzy', false, 'documents', '[]'::jsonb, 'modules', '[]'::jsonb, 'total_modules', 0);
  end if;
  select university_id, filiere_id, current_semester into me from user_profiles where id = auth.uid();

  if q <> '' then
    select array_agg('(^| )(' || array_to_string(array[w] || coalesce(string_to_array(s.expansion, ' '), '{}'), '|') || ')')
      into patterns
      from unnest(string_to_array(q, ' ')) w left join search_synonyms s on s.term = w;

    select array_agg(m.id) into mod_ids from (
      select id from modules m where (select bool_and(m.search_doc ~ p) from unnest(patterns) p) limit 3000) m;
    select array_agg(d.id) into doc_ids from (
      select d.id from documents d join modules m on m.id = d.module_id
       where d.status in ('published', 'verified')
         and (select bool_and((d.search_text || ' ' || m.search_doc) ~ p) from unnest(patterns) p)
       limit 1000) d;

    if mod_ids is null and doc_ids is null then
      fuzzy := true;
      select array_agg(m.id) into mod_ids from (
        select id from modules m where search_norm(m.name) % q or q <% search_norm(m.name) limit 500) m;
      select array_agg(d.id) into doc_ids from (
        select id from documents d where d.status in ('published', 'verified') and q <% d.search_text limit 200) d;
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
     where (q = '' or m.id = any(mod_ids) or m.id in (select module_id from documents where id = any(doc_ids)))
       and (p_module_id     is null or m.id  = p_module_id)
       and (p_university_id is null or u.id  = p_university_id)
       and (p_faculty_id    is null or fa.id = p_faculty_id)
       and (p_filiere_id    is null or f.id  = p_filiere_id)
       and semester_matches(m.semester, p_semester)
       and (v_types is null or m.doc_types && v_types)
       and (p_year is null or exists (select 1 from unnest(m.years) y where y like '%' || p_year || '%'))
       and (not coalesce(p_verified_only, false) or m.verified_docs > 0)
       and (p_professor_id is null or exists (select 1 from documents d where d.module_id = m.id and d.professor_id = p_professor_id
                                                                     and d.status in ('published', 'verified')))
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

  if q <> '' or v_types is not null or p_year is not null or p_module_id is not null or p_professor_id is not null then
    with d as (
      select doc.id, coalesce(doc.title, doc.doc_number) as title, doc.doc_type, doc.academic_year,
             coalesce(pr.display_name, doc.professor) as professor, doc.professor_id,
             doc.status, doc.display_status, doc.quality_score, doc.downloads, doc.helpful_count, doc.pages_count, doc.created_at,
             doc.rating_sum, doc.rating_count,
             m.id as module_id, m.name as module_name, m.slug as module_slug, m.semester,
             f.id as filiere_id, f.name as filiere_name, u.id as university_id, u.name as university_name,
             up.id as uploader_id, up.name as uploader_name, coalesce(up.points, 0) as uploader_points,
             -- age in days from the end of the academic year (June 30) or the upload date
             greatest(0, extract(epoch from (now() - coalesce(
               make_date(nullif(substring(doc.academic_year from '(\d{4})$'), '')::int, 6, 30)::timestamp,
               doc.created_at))) / 86400.0) as age_days,
             case when q = '' then 0 else
               greatest(word_similarity(q, m.search_doc), word_similarity(q, doc.search_text))
               + case when doc.id = any(doc_ids) then 0.3 else 0 end
               + case when not fuzzy then 0.3 else 0 end
             end as text_score
        from documents doc
        join modules m    on m.id = doc.module_id
        join filieres f   on f.id = m.filiere_id
        join faculties fa on fa.id = f.faculty_id
        join universities u on u.id = fa.university_id
        left join professors pr on pr.id = doc.professor_id
        left join user_profiles up on up.id = doc.uploader_id
       where doc.status in ('published', 'verified')
         and (q = '' or doc.module_id = any(mod_ids) or doc.id = any(doc_ids))
         and (not coalesce(p_verified_only, false) or doc.status = 'verified')
         and (p_module_id     is null or m.id  = p_module_id)
         and (p_professor_id  is null or doc.professor_id = p_professor_id)
         and (p_university_id is null or u.id  = p_university_id)
         and (p_faculty_id    is null or fa.id = p_faculty_id)
         and (p_filiere_id    is null or f.id  = p_filiere_id)
         and semester_matches(m.semester, p_semester)
         and (v_types is null or doc.doc_type = any(v_types))
         and (p_year is null or doc.academic_year like '%' || p_year || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(x) - 'text_score' - 'age_days' order by x.score desc), '[]'::jsonb) into docs
      from (
        select d.*,
               d.text_score
               -- 1. validation
               + case when d.display_status = 'verified' then 0.45 when d.display_status = 'community_approved' then 0.35 else 0 end
               -- 2. usefulness
               + least(0.30, ln(1 + d.helpful_count) / ln(30) * 0.30)
               + d.quality_score / 100.0 * 0.15
               -- 3. recency (half-weight after ~1 year)
               + 0.20 * exp(-d.age_days / 540.0)
               -- 4. contributor reputation
               + least(0.10, ln(1 + d.uploader_points) / ln(2500) * 0.10)
               -- context
               + case when me.university_id is not null and d.university_id = me.university_id then 0.25 else 0 end
               + case when me.filiere_id    is not null and d.filiere_id    = me.filiere_id    then 0.20 else 0 end
               + case when p_year is not null and d.academic_year like '%/' || p_year then 0.05 else 0 end
               as score
          from d
         order by score desc
         limit case when p_module_id is not null or p_professor_id is not null then 50 else 10 end
      ) x;
  end if;

  return jsonb_build_object(
    'query', q, 'expanded', qx, 'fuzzy', fuzzy,
    'documents', coalesce(docs, '[]'::jsonb),
    'modules', mods,
    'total_modules', v_total);
end $$;
revoke all on function public.search_catalog(text, integer, integer, integer, text, text, text, boolean, integer, integer, integer, integer, text[]) from public;
grant execute on function public.search_catalog(text, integer, integer, integer, text, text, text, boolean, integer, integer, integer, integer, text[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. search_suggest v2 — modules, filières, faculties, schools, professors
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
     where length(q.t) >= 2 and (m.search_doc like q.t || '%' or m.search_doc like '% ' || q.t || '%')   -- word-prefix, uses the trigram index
  ),
  fils (kind, id, label, sublabel, slug, docs_count, score) as (
    select 'filiere', f.id, f.name, concat_ws(' · ', nullif(fa.name, '__root__'), u.name), null::text,
           (select coalesce(sum(docs_count), 0)::int from modules where filiere_id = f.id),
           (greatest(similarity(search_norm(f.name), q.t), word_similarity(q.t, search_norm(f.name)))
            + case when q.t = any(string_to_array(f.search_aliases, ' ')) then 0.5 else 0 end
            + case when fa.university_id = (select university_id from me) then 0.2 else 0 end)::real
      from q, filieres f
      join faculties fa on fa.id = f.faculty_id
      join universities u on u.id = fa.university_id
     where length(q.t) >= 2
       and (search_norm(f.name) like q.t || '%' or q.t <% search_norm(f.name)
            or q.t = any(string_to_array(f.search_aliases, ' ')))
  ),
  facs (kind, id, label, sublabel, slug, docs_count, score) as (
    select 'faculty', fa.id, fa.name, u.name, null::text, null::int,
           (greatest(similarity(search_norm(fa.name), q.t), word_similarity(q.t, search_norm(fa.name)))
            + case when q.t = any(string_to_array(fa.search_aliases, ' ')) then 0.6 else 0 end)::real
      from q, faculties fa join universities u on u.id = fa.university_id
     where length(q.t) >= 2 and fa.name <> '__root__'
       and (q.t <% search_norm(fa.name) or q.t = any(string_to_array(fa.search_aliases, ' ')))
  ),
  unis (kind, id, label, sublabel, slug, docs_count, score) as (
    select 'university', u.id, u.name, u.city, u.slug, null::int,
           (greatest(similarity(search_norm(u.name), q.t), word_similarity(q.t, search_norm(concat_ws(' ', u.name, u.name_en, u.city))))
            + case when search_norm(u.name) like q.t || '%' then 0.3 else 0 end
            + case when q.t = any(string_to_array(u.search_aliases || ' ' ||
                     coalesce((select string_agg(alias_norm, ' ') from institution_aliases ia where ia.university_id = u.id), ''), ' ')) then 0.8 else 0 end)::real
      from q, universities u
     where length(q.t) >= 2
       and (q.t <% search_norm(concat_ws(' ', u.name, u.name_en, u.city))
            or q.t = any(string_to_array(u.search_aliases || ' ' ||
                 coalesce((select string_agg(alias_norm, ' ') from institution_aliases ia where ia.university_id = u.id), ''), ' ')))
  ),
  profs (kind, id, label, sublabel, slug, docs_count, score) as (
    select 'professor', p.id, p.display_name, u.name, null::text,
           (select count(*)::int from documents d where d.professor_id = p.id and d.status in ('published', 'verified')),
           (greatest(similarity(search_norm(p.display_name), q.t), word_similarity(q.t, search_norm(p.display_name)))
            + case when p.name_key like replace(q.t, ' ', '') || '%' then 0.4 else 0 end)::real
      from q, professors p left join universities u on u.id = p.university_id
     where length(q.t) >= 3 and p.status in ('pending', 'verified')
       and (p.name_key like replace(q.t, ' ', '') || '%' or q.t <% search_norm(p.display_name))
  )
  select * from (
    select * from (select * from mods  order by score desc limit greatest(coalesce(p_limit, 8), 1)) a
    union all select * from (select * from fils  order by score desc limit 3) b
    union all select * from (select * from facs  order by score desc limit 2) c
    union all select * from (select * from unis  order by score desc limit 2) d
    union all select * from (select * from profs order by score desc limit 3) e
  ) x
  order by score desc
  limit greatest(coalesce(p_limit, 8), 1) + 4
$$;

commit;
