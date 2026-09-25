-- ============================================================================
-- 9rawZid9ra — Fix resolve_academic_context() faculty resolution
-- ----------------------------------------------------------------------------
-- entity_aliases() (20260926000300_search_v2.sql) extracts a faculty's entire
-- parenthesised short name verbatim as one alias string — e.g. "École Normale
-- Supérieure de Rabat (ENS Rabat)" contributed the bare word "rabat" as a
-- standalone matchable alias, not just "ens"/"ensr". Since the faculty-matching
-- ORDER BY length(alias) DESC treated every matched alias equally, a query like
-- "fs rabat" (meant as Faculté des Sciences + Rabat) could resolve to any
-- Rabat-based faculty whose parenthetical happened to contain "Rabat" (ENS
-- Rabat, ENSAM Rabat…) instead of Faculté des Sciences de Rabat (FSR), because
-- the incidental 5-letter alias "rabat" outranked FSR's legitimate 2-letter
-- alias "fs".
--
-- Fix: the faculty-matching lateral excludes search_place_words from its
-- candidate aliases. University resolution is untouched — city-name matching
-- is correct there (a university's own city is a legitimate disambiguator).
--
-- Requires 20260925000200_document_quality.sql (search_place_words) and
-- 20260926000300_search_v2.sql. Safe to re-run.
-- ============================================================================

begin;

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

  -- Faculties never match on a bare place-word alias (e.g. the literal "Rabat" leaked from a
  -- parenthetical short name like "(ENS Rabat)") — many faculties in the same city would tie on
  -- it and the wrong one could win by alias length. Universities keep city-name matching above.
  select fa.id, fa.name, fa.university_id, a.alias into fac
    from faculties fa
    cross join lateral (
      select alias from unnest(string_to_array(fa.search_aliases || ' ' ||
                        coalesce((select string_agg(alias_norm, ' ') from institution_aliases ia where ia.faculty_id = fa.id), ''), ' ')) alias
       where length(alias) >= 2 and alias = any(toks)
         and alias not in (select word from search_place_words)
       order by length(alias) desc limit 1) a
    join universities u on u.id = fa.university_id
   where fa.name <> '__root__' and (uni.id is null or fa.university_id = uni.id)
   order by length(a.alias) desc, (search_norm(u.city) = any(toks)) desc, (fa.university_id = me.university_id) desc
   limit 1;
  if uni.id is null and fac.id is not null then
    select u.id, u.name, u.city, null::text as alias into uni from universities u where u.id = fac.university_id;
  end if;

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

  select p.id, p.display_name, p.name_key into prof
    from professors p
   where p.status in ('pending', 'verified') and p.name_key = any(toks) and length(p.name_key) >= 4
   order by (p.university_id = uni.id) desc, p.status = 'verified' desc limit 1;

  select string_agg(w, ' ') into v_remaining
    from unnest(toks) w
   where not (w = any(used)) and not (w = any(stop))
     and w is distinct from uni.alias and w is distinct from fac.alias and w is distinct from fil.alias
     and w is distinct from prof.name_key
     and (uni.city is null or w <> search_norm(uni.city));

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

commit;
