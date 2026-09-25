import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { parseQuery, toSearchParams } from '../lib/searchParser'

const PAGE_SIZE = 20

/**
 * Context-aware search over search_catalog(): parses "exam réseau GI 2024" into
 * facets, merges in explicit filters (which win), debounces, cancels stale
 * responses, and logs the settled query + any opened result via log_search().
 *
 * @param {string} raw - free-text query, e.g. from the search input.
 * @param {{ universityId?, facultyId?, filiereId?, semester?, docType?, year?, verifiedOnly? }} filters
 * @param {{ enabled?: boolean }} [options] - pass enabled: false to skip fetching entirely
 *   (e.g. while the caller is showing a different, non-search view).
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

  const requestIdRef = useRef(0)
  const loggedKeyRef = useRef(null)

  const parsed = parseQuery(raw)
  const filterKey = JSON.stringify(filters)

  // Any change to the query or an explicit filter starts over from the first page.
  useEffect(() => { setOffset(0) }, [raw, filterKey])

  useEffect(() => {
    if (!enabled) return
    const requestId = ++requestIdRef.current
    const t = setTimeout(async () => {
      setLoading(true)
      const params = toSearchParams(parsed, filters)
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
      })
      if (requestId !== requestIdRef.current) return // a newer request superseded this one
      setLoading(false)
      if (err) { setError(err); return }
      setError(null)
      setDocuments(data?.documents || [])
      setModules((prev) => (offset === 0 ? (data?.modules || []) : [...prev, ...(data?.modules || [])]))
      setTotalModules(data?.total_modules || 0)
      setFuzzy(!!data?.fuzzy)

      const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '' && v !== false))
      const logKey = raw + '|' + JSON.stringify(activeFilters)
      if (loggedKeyRef.current !== logKey && (raw || Object.keys(activeFilters).length > 0)) {
        loggedKeyRef.current = logKey
        supabase.rpc('log_search', {
          p_query: raw || '',
          p_filters: activeFilters,
          p_results: (data?.documents?.length || 0) + (data?.total_modules || 0),
        }).then()
      }
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, filterKey, offset, enabled])

  const loadMore = useCallback(() => setOffset((o) => o + PAGE_SIZE), [])

  const logClick = useCallback((clicked) => {
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '' && v !== false))
    supabase.rpc('log_search', {
      p_query: raw || '',
      p_filters: activeFilters,
      p_results: documents.length + totalModules,
      p_clicked: clicked,
    }).then()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, filterKey, documents.length, totalModules])

  return { loading, error, documents, modules, totalModules, fuzzy, parsed, loadMore, logClick }
}
