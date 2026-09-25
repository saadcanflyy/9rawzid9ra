-- ============================================================================
-- 9rawZid9ra — Onboarding + personalised home
-- ----------------------------------------------------------------------------
-- • complete_onboarding(): saves école / faculté / filière / semestre in one call and
--   follows the modules of that semester (so notifications start working at once).
-- • get_home_feed(): everything the personalised home needs in one request.
-- • get_platform_stats(): the public numbers for the landing page.
-- Profile columns (faculty_id, filiere_id, current_semester, onboarded_at) were added
-- in the security migration. Requires migrations 100–400. Safe to re-run.
-- ============================================================================

begin;

create or replace function public.complete_onboarding(
  p_university_id integer, p_faculty_id integer default null, p_filiere_id integer default null,
  p_semester text default null, p_follow_modules boolean default true)
returns integer language plpgsql security definer set search_path = public as $$
declare v_followed integer := 0; v_fac integer := p_faculty_id; v_uni integer := p_university_id;
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;

  -- trust the hierarchy from the database, not the browser
  if p_filiere_id is not null then
    select f.faculty_id, fa.university_id into v_fac, v_uni
      from filieres f join faculties fa on fa.id = f.faculty_id where f.id = p_filiere_id;
  elsif p_faculty_id is not null then
    select university_id into v_uni from faculties where id = p_faculty_id;
  end if;

  update user_profiles
     set university_id = v_uni, faculty_id = v_fac, filiere_id = p_filiere_id,
         current_semester = nullif(p_semester, ''), onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid();

  if p_follow_modules and p_filiere_id is not null and coalesce(p_semester, '') <> '' then
    insert into module_bookmarks (user_id, module_id)
    select auth.uid(), m.id from modules m
     where m.filiere_id = p_filiere_id and semester_matches(m.semester, p_semester)
       and not exists (select 1 from module_bookmarks b where b.user_id = auth.uid() and b.module_id = m.id)
     limit 30;
    get diagnostics v_followed = row_count;
  end if;
  return v_followed;
end $$;
revoke all on function public.complete_onboarding(integer, integer, integer, text, boolean) from public, anon;
grant execute on function public.complete_onboarding(integer, integer, integer, text, boolean) to authenticated;

create or replace function public.get_home_feed()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me record; result jsonb;
begin
  select up.*, u.name as university_name, f.name as filiere_name, f.abbreviation as filiere_abbreviation
    into me
    from user_profiles up
    left join universities u on u.id = up.university_id
    left join filieres f on f.id = up.filiere_id
   where up.id = auth.uid();
  if not found then return null; end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'university_id', me.university_id, 'university_name', me.university_name,
      'filiere_id', me.filiere_id, 'filiere_name', me.filiere_name, 'filiere_abbreviation', me.filiere_abbreviation,
      'semester', me.current_semester, 'onboarded', me.onboarded_at is not null),

    -- modules of my filière + semester (or my followed modules if no filière)
    'my_modules', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.docs_count desc, x.name) from (
        select m.id, m.name, m.slug, m.semester, m.docs_count, m.verified_docs, m.doc_types, m.last_doc_at,
               exists (select 1 from module_bookmarks b where b.user_id = me.id and b.module_id = m.id) as followed
          from modules m
         where (me.filiere_id is not null and m.filiere_id = me.filiere_id and semester_matches(m.semester, me.current_semester))
            or (me.filiere_id is null and m.id in (select module_id from module_bookmarks where user_id = me.id))
         limit 30) x), '[]'::jsonb),

    -- newest documents in my filière (any semester)
    'recent_documents', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
        select d.id, coalesce(d.title, d.doc_number) as title, d.doc_type, d.academic_year, d.status, d.quality_score,
               d.created_at, m.id as module_id, m.name as module_name, m.slug as module_slug, m.semester
          from documents d join modules m on m.id = d.module_id
         where d.status in ('published', 'verified')
           and (m.filiere_id = me.filiere_id
                or (me.filiere_id is null and m.id in (select module_id from module_bookmarks where user_id = me.id)))
         order by d.created_at desc
         limit 8) x), '[]'::jsonb),

    -- empty modules of my semester: "be the first to share"
    'missing', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select m.id, m.name, m.slug, m.semester,
               (select count(*) from document_requests r where r.module_id = m.id and r.status = 'open') as open_requests
          from modules m
         where me.filiere_id is not null and m.filiere_id = me.filiere_id
           and semester_matches(m.semester, me.current_semester) and m.docs_count = 0
         order by 5 desc, m.name
         limit 6) x), '[]'::jsonb),

    -- what my promo is asking for
    'requests', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.votes desc) from (
        select r.id, r.doc_type, r.academic_year, r.votes, m.id as module_id, m.name as module_name, m.slug as module_slug
          from document_requests r join modules m on m.id = r.module_id
         where r.status = 'open' and me.filiere_id is not null and m.filiere_id = me.filiere_id
         order by r.votes desc, r.created_at desc
         limit 5) x), '[]'::jsonb),

    'reputation', (select to_jsonb(r) from get_my_reputation('week') r limit 1)
  ) into result;
  return result;
end $$;
revoke all on function public.get_home_feed() from public, anon;
grant execute on function public.get_home_feed() to authenticated;

create or replace function public.get_platform_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'universities', (select count(*) from universities),
    'filieres',     (select count(*) from filieres),
    'modules',      (select count(*) from modules),
    'documents',    (select count(*) from documents where status in ('published', 'verified')),
    'verified_documents', (select count(*) from documents where status = 'verified'),
    'documents_this_week', (select count(*) from documents where status in ('published', 'verified') and created_at > now() - interval '7 days'),
    'contributors', (select count(distinct uploader_id) from documents where status in ('published', 'verified')),
    'modules_with_documents', (select count(*) from modules where docs_count > 0)
  )
$$;
revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to anon, authenticated;

commit;
