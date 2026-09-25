import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'
import { parseQuery, toSearchParams, contextToFilters, dropChip as dropChipFilter } from '../lib/searchParser'

const PAGE_SIZE = 20

const mergeExplicit = (base, explicit) => {
  const out = { ...base }
  Object.entries(explicit || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) out[k] = v
  })
  return out
}

/**
 * Context-aware search over search_catalog(): resolve_academic_context() first understands
 * "analyse 2 fs rabat examen" as école/faculté/filière/semestre/module/professeur/type/année,
 * then search_catalog() runs with those filters merged under whatever explicit filters the UI
 * picked (explicit always wins). Debounces, cancels stale responses, logs the settled query.
 *
 * @param {string} raw - free-text query, e.g. from the search input.
 * @param {{ universityId?, facultyId?, filiereId?, semester?, docType?, docTypes?, year?, verifiedOnly?, moduleId?, professorId? }} filters
 * @param {{ enabled?: boolean }} [options] - pass enabled: false to skip fetching entirely.
 */
export function useSearch(raw, filters = {}, options = {}) {
  const enabled = options.enabled !== false
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [documents, setDocuments] = useState([])
  const [modules, setModules] = useState([])
  const [totalModules, setTotalModules] = useState(0)
  const [fuzzy, setFuzzy] = useState(false)
  const [offset, setOffset] = useState(0)
  const [context, setContext] = useState(null)
  const [refusedKeys, setRefusedKeys] = useState([])

  const requestIdRef = useRef(0)
  const loggedKeyRef = useRef(null)

  // A new typed query starts fresh: previously dropped chips no longer apply.
  useEffect(() => { setRefusedKeys([]) }, [raw])

  const understood = useMemo(() => contextToFilters(context), [context])
  const understoodChips = useMemo(() => understood.chips.filter((c) => !refusedKeys.includes(c.key)), [understood, refusedKeys])
  const understoodFilters = useMemo(
    () => refusedKeys.reduce((f, k) => dropChipFilter(f, k), understood.filters),
    [understood, refusedKeys]
  )
  const candidates = understood.candidates

  const filterKey = JSON.stringify(filters)
  const mergedFilters = useMemo(() => mergeExplicit(understoodFilters, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [understoodFilters, filterKey])
  const mergedKey = JSON.stringify(mergedFilters)

  // Any change to the query or the effective filters starts over from the first page.
  useEffect(() => { setOffset(0) }, [raw, mergedKey])

  useEffect(() => {
    if (!enabled) return
    const trimmed = raw.trim()
    const requestId = ++requestIdRef.current
    const t = setTimeout(async () => {
      let ctx = null
      if (trimmed) {
        const { data } = await supabase.rpc('resolve_academic_context', { p_text: trimmed })
        if (requestId !== requestIdRef.current) return
        ctx = data || null
      }
      setContext(ctx)
      const u = contextToFilters(ctx)
      const activeFilters = mergeExplicit(refusedKeys.reduce((f, k) => dropChipFilter(f, k), u.filters), filters)
      const text = ctx ? u.text : raw
      const parsedText = parseQuery(text)

      setLoading(true)
      const params = toSearchParams(parsedText, activeFilters)
      const { data, error: err } = await supabase.rpc('search_catalog', {
        p_query: params.p_query,
        p_university_id: params.p_university_id,
        p_faculty_id: params.p_faculty_id,
        p_filiere_id: params.p_filiere_id,
        p_semester: params.p_semester,
        p_doc_type: params.p_doc_type,
        p_year: params.p_year,
        p_verified_only: params.p_verified_only,
        p_limit: PAGE_SIZE,
        p_offset: offset,
        p_module_id: params.p_module_id,
        p_professor_id: params.p_professor_id,
        p_doc_types: params.p_doc_types,
      })
      if (requestId !== requestIdRef.current) return // a newer request superseded this one
      setLoading(false)
      if (err) { setError(err); return }
      setError(null)
      setDocuments(data?.documents || [])
      setModules((prev) => (offset === 0 ? (data?.modules || []) : [...prev, ...(data?.modules || [])]))
      setTotalModules(data?.total_modules || 0)
      setFuzzy(!!data?.fuzzy)

      const loggedFilters = { ...activeFilters, ...(ctx ? { understood: true } : {}) }
      const logKey = raw + '|' + JSON.stringify(loggedFilters)
      if (loggedKeyRef.current !== logKey && (raw || Object.keys(loggedFilters).length > 0)) {
        loggedKeyRef.current = logKey
        supabase.rpc('log_search', {
          p_query: raw || '',
          p_filters: loggedFilters,
          p_results: (data?.documents?.length || 0) + (data?.total_modules || 0),
        }).then()
      }
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, mergedKey, offset, enabled, refusedKeys])

  const dropChip = useCallback((key) => { setRefusedKeys((prev) => (prev.includes(key) ? prev : [...prev, key])) }, [])
  const loadMore = useCallback(() => setOffset((o) => o + PAGE_SIZE), [])

  const logClick = useCallback((clicked) => {
    supabase.rpc('log_search', {
      p_query: raw || '',
      p_filters: mergedFilters,
      p_results: documents.length + totalModules,
      p_clicked: clicked,
    }).then()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, mergedKey, documents.length, totalModules])

  return {
    loading, error, documents, modules, totalModules, fuzzy,
    parsed: parseQuery(raw), loadMore, logClick,
    understoodChips, candidates, dropChip, context,
  }
}
