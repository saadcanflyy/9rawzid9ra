import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  Breadcrumb, SearchBar, Select, Chip, Tabs, ModuleCard, DocType, DocumentRow, Card, Button,
  Input, Sheet, Badge, EmptyState, Skeleton, ProgressBar, Icon, Banner, Switch, LoadMore,
  QualityBadge, StatusBadge, LevelBadge,
} from '../design-system/ui'
import ProfessorPicker from '../components/ProfessorPicker'
import SenpaiSection from '../components/SenpaiSection'
import { notify } from '../design-system/toast'
import { useSearch } from '../hooks/useSearch'
import { qualityLevel, displayStatus } from '../lib/quality'
import { levelFor } from '../lib/reputation'
import { semesterAtLeast } from '../lib/senpai'

const css = `
  .bw-banner { border-bottom: 1px solid var(--border); background: var(--brand-soft); padding: var(--space-3) var(--space-6); display: flex; align-items: center; justify-content: center; gap: var(--space-3); flex-wrap: wrap; }
  .bw-layout { max-width: 1400px; margin: 0 auto; padding: var(--space-6); display: grid; grid-template-columns: 240px 1fr; gap: var(--space-8); align-items: start; }
  @media (min-width: 1300px) { .bw-layout { grid-template-columns: 240px 1fr 280px; } }
  @media (max-width: 1023px) { .bw-layout { grid-template-columns: 1fr; } }
  .bw-sidebar { display: flex; flex-direction: column; gap: var(--space-5); position: sticky; top: 72px; }
  @media (max-width: 1023px) { .bw-sidebar { display: none; } }
  .bw-filter-group { display: flex; flex-direction: column; gap: var(--space-2); }
  .bw-sem-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .bw-type-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .bw-uni-wrap { position: relative; }
  .bw-main { min-width: 0; display: flex; flex-direction: column; gap: var(--space-4); }
  .bw-search-row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .bw-search-row > *:first-child { flex: 1; min-width: 220px; }
  .bw-chips-row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .bw-results-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
  .bw-results-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .bw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-4); }
  .bw-grid--list { grid-template-columns: 1fr; }
  .bw-rail { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: 72px; }
  @media (max-width: 1299px) { .bw-rail { position: static; } }
  .bw-rail-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }
  .bw-rail-row:last-child { margin-bottom: 0; }
  .bw-rail-row__top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .bw-mobile-filter-btn { display: none; position: fixed; bottom: var(--space-6); left: var(--space-5); z-index: 40; }
  @media (max-width: 1023px) { .bw-mobile-filter-btn { display: inline-flex; } }
  .bw-sheet-footer { display: flex; gap: var(--space-2); position: sticky; bottom: calc(-1 * var(--space-5)); background: var(--surface); padding: var(--space-3) 0 0; margin-top: var(--space-2); border-top: 1px solid var(--border); }
  .bw-sheet-footer > :last-child { flex: 1; }
  .bw-req-form { background: var(--brand-soft); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
  .bw-empty-actions { display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap; margin-top: var(--space-4); }
`

const DOC_TYPES = [
  { k: 'examen', l: 'Examen final' },
  { k: 'cc', l: 'Contrôle continu' },
  { k: 'td', l: 'TD' },
  { k: 'tp', l: 'TP' },
  { k: 'cours', l: 'Cours' },
  { k: 'corrige_examen', l: 'Corrigé examen' },
  { k: 'corrige_td', l: 'Corrigé TD' },
  { k: 'corrige_tp', l: 'Corrigé TP' },
  { k: 'quiz', l: 'Quiz' },
  { k: 'projet_final', l: 'Projet final' },
]
const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
const YEAR_OPTIONS = ['2026/2027', '2025/2026', '2024/2025', '2023/2024', '2022/2023', '2021/2022', '2020/2021', '2019/2020', '2018/2019', '2017/2018', '2016/2017']
  .map((label) => ({ value: label.split('/')[1], label }))

export default function Browse() {
  const navigate = useNavigate()
  const [sp, setSearchParams] = useSearchParams()
  const debounceRef = useRef(null)
  const restoringRef = useRef({ fac: sp.get('fac') || '', fil: sp.get('fil') || '' })

  const [query, setQuery] = useState(sp.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState(sp.get('q') || '')
  const [unis, setUnis] = useState([])
  const [facs, setFacs] = useState([])
  const [fils, setFils] = useState([])
  const [mods, setMods] = useState([])
  const [loading, setLoading] = useState(false)

  const [selUni, setSelUni] = useState(sp.get('uni') || '')
  const [selFac, setSelFac] = useState(sp.get('fac') || '')
  const [selFil, setSelFil] = useState(sp.get('fil') || '')
  const [selSem, setSelSem] = useState(sp.get('sem') || '')
  const [selType, setSelType] = useState(sp.get('type') || '')
  const [selDocTypes, setSelDocTypes] = useState(sp.get('types') ? sp.get('types').split(',') : [])
  const [selModuleId, setSelModuleId] = useState(sp.get('mod') || '')
  const [selProfessor, setSelProfessor] = useState(sp.get('prof') ? { id: parseInt(sp.get('prof'), 10), display_name: '' } : null)
  const [moduleOptions, setModuleOptions] = useState([])
  const [selYear, setSelYear] = useState(sp.get('year') || '')
  const [verifiedOnly, setVerifiedOnly] = useState(sp.get('verified') === '1')
  const [sortMode, setSortMode] = useState('pertinence')
  const [viewMode, setViewMode] = useState('grid')
  const [bookmarked, setBookmarked] = useState(new Set())
  const [fetchErr, setFetchErr] = useState('')
  const [uniSearch, setUniSearch] = useState('')
  const [showUniDd, setShowUniDd] = useState(false)
  const { user, profile } = useAuth()

  // Uni request form
  const [showUniReq, setShowUniReq] = useState(false)
  const [uniReqName, setUniReqName] = useState('')
  const [uniReqCity, setUniReqCity] = useState('')
  const [uniReqSent, setUniReqSent] = useState(false)
  const [uniReqBusy, setUniReqBusy] = useState(false)

  const [facsReady, setFacsReady] = useState(false)

  // Faculté request form
  const [showFacReq, setShowFacReq] = useState(false)
  const [facReqName, setFacReqName] = useState('')
  const [facReqSent, setFacReqSent] = useState(false)
  const [facReqBusy, setFacReqBusy] = useState(false)

  // Filière request form (sidebar + inline empty-state)
  const [showFilReq, setShowFilReq] = useState(false)
  const [showEmptyFilForm, setShowEmptyFilForm] = useState(false)
  const [filReqName, setFilReqName] = useState('')
  const [filReqSent, setFilReqSent] = useState(false)
  const [filReqBusy, setFilReqBusy] = useState(false)
  const [userUniId, setUserUniId] = useState(null)
  const [showDrawer, setShowDrawer] = useState(false)

  // Module suggestion state
  const [showModReq, setShowModReq] = useState(false)
  const [modReqName, setModReqName] = useState('')
  const [modReqSem, setModReqSem] = useState('S1')
  const [modReqFilId, setModReqFilId] = useState('')
  const [modReqBusy, setModReqBusy] = useState(false)
  const [modReqSent, setModReqSent] = useState(false)
  const [modReqDup, setModReqDup] = useState(null)

  useEffect(() => {
    if (!user?.id) { setUserUniId(null); setBookmarked(new Set()); return }
    supabase.from('user_profiles').select('university_id').eq('id', user.id).single()
      .then(({ data }) => setUserUniId(data?.university_id || null))
    supabase.from('module_bookmarks').select('module_id').eq('user_id', user.id)
      .then(({ data }) => setBookmarked(new Set((data || []).map(b => b.module_id))))
  }, [user?.id]) // eslint-disable-line

  // Sync from URL when navigated here externally (e.g. Navbar search → /browse?q=,
  // or SearchAutocomplete → /browse?fil=<id> / ?uni=<id>)
  useEffect(() => {
    setQuery(sp.get('q') || '')
    setSelUni(sp.get('uni') || '')
    setSelSem(sp.get('sem') || '')
    setSelType(sp.get('type') || '')
    setSelYear(sp.get('year') || '')
    setVerifiedOnly(sp.get('verified') === '1')
    if (sp.get('fac')) restoringRef.current.fac = sp.get('fac')
    if (sp.get('fil')) restoringRef.current.fil = sp.get('fil')
  }, [sp])

  // Deep link from SearchAutocomplete's filière suggestions (/browse?fil=<id> alone,
  // with no uni/fac in the URL) — resolve the rest of the hierarchy server-side.
  useEffect(() => {
    const filParam = sp.get('fil')
    if (!filParam || sp.get('uni') || filParam === selFil) return
    supabase.from('filieres').select('id, faculty_id, faculties(university_id)').eq('id', filParam).single()
      .then(({ data }) => {
        if (!data?.faculties?.university_id) return
        restoringRef.current.fac = String(data.faculty_id)
        restoringRef.current.fil = String(data.id)
        setSelUni(String(data.faculties.university_id))
      })
  }, [sp]) // eslint-disable-line

  // Debounce: query → debouncedQuery after 500ms idle
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 500)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Persist all active filters to URL + save to sessionStorage for Navbar restore
  useEffect(() => {
    const p = {}
    if (query) p.q = query
    if (selUni) p.uni = selUni
    if (selFac) p.fac = selFac
    if (selFil) p.fil = selFil
    if (selSem) p.sem = selSem
    if (selType) p.type = selType
    if (selDocTypes.length) p.types = selDocTypes.join(',')
    if (selModuleId) p.mod = selModuleId
    if (selProfessor?.id) p.prof = String(selProfessor.id)
    if (selYear) p.year = selYear
    if (verifiedOnly) p.verified = '1'
    setSearchParams(p, { replace: true })
    const qs = new URLSearchParams(p).toString()
    sessionStorage.setItem('lastBrowseUrl', '/browse' + (qs ? '?' + qs : ''))
  }, [query, selUni, selFac, selFil, selSem, selType, selDocTypes, selModuleId, selProfessor, selYear, verifiedOnly, setSearchParams])

  // Load universities once
  useEffect(() => {
    supabase.from('universities').select('*').order('name')
      .then(({ data }) => setUnis(data || []))
  }, [])

  // Dynamic page title + meta description based on active university filter
  useEffect(() => {
    const uniName = unis.find(u => u.id === parseInt(selUni))?.name
    document.title = uniName
      ? `Modules ${uniName} — 9rawZid9ra`
      : 'Explorer les modules — 9rawZid9ra'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', uniName
        ? `Modules et examens de ${uniName} — Annales, TD, TP et cours gratuits sur 9rawZid9ra.`
        : '9rawZid9ra - Plateforme gratuite pour étudiants marocains. Télécharge examens, TD, TP et cours pour EMSI, UM5, UIR, UH2C et plus de 100 établissements au Maroc.'
      )
    }
  }, [selUni, unis])

  // Load faculties when uni changes (preserves URL-restored fac value on first load)
  useEffect(() => {
    if (!selUni) { setFacs([]); setFacsReady(false); setSelFac(''); setSelFil(''); return }
    setFacsReady(false)
    const restoreFac = restoringRef.current.fac
    supabase.from('faculties').select('*').eq('university_id', selUni).order('name')
      .then(({ data }) => {
        setFacs(data || [])
        setFacsReady(true)
        if (restoreFac) { restoringRef.current.fac = ''; setSelFac(restoreFac) }
        else if (data?.length === 1 && data[0].name === '__root__') setSelFac(String(data[0].id))
      })
    if (!restoreFac) { setSelFac(''); setSelFil('') }
  }, [selUni])

  // Load filieres when fac changes (preserves URL-restored fil value on first load)
  useEffect(() => {
    if (!selFac) { setFils([]); setSelFil(''); return }
    const restoreFil = restoringRef.current.fil
    supabase.from('filieres').select('*').eq('faculty_id', selFac).order('name')
      .then(({ data }) => {
        setFils(data || [])
        if (restoreFil) { restoringRef.current.fil = ''; setSelFil(restoreFil) }
      })
    if (!restoreFil) setSelFil('')
  }, [selFac])

  // Load modules — runs on mount AND when filters change
  const loadModules = useCallback(async () => {
    if (!selUni && !selSem && !selType && !debouncedQuery.trim()) {
      setMods([]); setLoading(false); return
    }
    setLoading(true)
    try {
      let q = supabase
        .from('modules')
        .select('*, filieres(name, faculties(name, universities(name)))')
        .order('semester')
        .order('name')
        .limit(300)

      if (selFil) {
        q = q.eq('filiere_id', selFil)
      } else if (selFac) {
        const { data: f } = await supabase.from('filieres').select('id').eq('faculty_id', selFac)
        if (f?.length) q = q.in('filiere_id', f.map(x => x.id))
      } else if (selUni) {
        const { data: fc } = await supabase.from('faculties').select('id').eq('university_id', selUni)
        if (fc?.length) {
          const { data: f } = await supabase.from('filieres').select('id').in('faculty_id', fc.map(x => x.id))
          if (f?.length) q = q.in('filiere_id', f.map(x => x.id))
        }
      }

      if (selSem) q = q.eq('semester', selSem)
      if (debouncedQuery.trim()) q = q.ilike('name', `%${debouncedQuery.trim()}%`)

      // Filter by doc type: only show modules that have at least one doc of that type
      if (selType) {
        const { data: typeDocs } = await supabase.from('documents').select('module_id').eq('doc_type', selType)
        const ids = [...new Set((typeDocs || []).map(d => d.module_id).filter(Boolean))]
        if (ids.length > 0) q = q.in('id', ids)
        else { setMods([]); setLoading(false); return }
      }

      const { data, error } = await q
      if (error) setFetchErr('Erreur lors du chargement des modules.')
      else setFetchErr('')
      setMods(data || [])
    } catch (e) {
      setFetchErr('Erreur de connexion. Vérifie ta connexion internet.')
    }
    setLoading(false)
  }, [selUni, selFac, selFil, selSem, debouncedQuery, selType])

  useEffect(() => { loadModules() }, [loadModules])

  useEffect(() => {
    setShowModReq(false); setModReqSent(false); setModReqDup(null)
  }, [debouncedQuery])

  const flushSearch = () => { clearTimeout(debounceRef.current); setDebouncedQuery(query) }

  const handleUniRequest = async () => {
    if (!uniReqName.trim() || !user) return
    setUniReqBusy(true)
    const { data: newUni, error } = await supabase
      .from('universities')
      .insert({ name: uniReqName.trim().slice(0, 120), city: uniReqCity.trim().slice(0, 80) || null })
      .select().single()
    if (error) { setUniReqBusy(false); return }
    const { data: allUnis } = await supabase.from('universities').select('*').order('name')
    if (allUnis) setUnis(allUnis)
    if (newUni) { setSelUni(String(newUni.id)); setUniSearch(newUni.name) }
    setUniReqBusy(false)
    setUniReqSent(true)
  }

  const handleFacRequest = async () => {
    if (!facReqName.trim() || !user) return
    setFacReqBusy(true)
    const { data: newFac, error } = await supabase
      .from('faculties')
      .insert({ name: facReqName.trim().slice(0, 120), university_id: selUni ? parseInt(selUni) : null })
      .select().single()
    if (error) { setFacReqBusy(false); return }
    if (selUni) {
      const { data: updatedFacs } = await supabase.from('faculties').select('*').eq('university_id', parseInt(selUni)).order('name')
      if (updatedFacs) { setFacs(updatedFacs); setFacsReady(true) }
    }
    if (newFac) setSelFac(String(newFac.id))
    setFacReqBusy(false)
    setFacReqSent(true)
  }

  const handleFilRequest = async () => {
    if (!filReqName.trim() || !user || !selFac) return
    setFilReqBusy(true)
    const { data: newFil, error } = await supabase
      .from('filieres')
      .insert({ name: filReqName.trim().slice(0, 120), faculty_id: parseInt(selFac), total_semesters: 6 })
      .select().single()
    if (error) { setFilReqBusy(false); return }
    const { data: updatedFils } = await supabase.from('filieres').select('*').eq('faculty_id', parseInt(selFac)).order('name')
    if (updatedFils) setFils(updatedFils)
    if (newFil) setSelFil(String(newFil.id))
    setFilReqBusy(false)
    setFilReqSent(true)
  }

  const handleModRequest = async () => {
    const targetFilId = modReqFilId || selFil
    if (!modReqName.trim() || !user || !targetFilId) return
    setModReqBusy(true)
    setModReqDup(null)
    const { data: existing } = await supabase
      .from('modules')
      .select('id, slug, name')
      .ilike('name', modReqName.trim())
      .eq('filiere_id', parseInt(targetFilId))
      .limit(1)
    if (existing?.length > 0) {
      setModReqDup(existing[0])
      setModReqBusy(false)
      return
    }
    const { error } = await supabase
      .from('modules')
      .insert({ name: modReqName.trim().slice(0, 120), filiere_id: parseInt(targetFilId), semester: modReqSem, type: 'cours' })
      .select('id, slug')
      .single()
    setModReqBusy(false)
    if (error) return
    setModReqSent(true)
    notify.success('Module ajouté', 'Tu peux maintenant y partager un document.')
    loadModules()
  }

  const reset = () => {
    setSearchParams({})
    setQuery(''); setDebouncedQuery(''); setSelUni(''); setSelFac(''); setSelFil(''); setSelSem(''); setSelType('')
    setSelDocTypes([]); setSelModuleId(''); setSelProfessor(null)
    setSelYear(''); setVerifiedOnly(false)
    setUniSearch(''); setShowUniDd(false)
    setShowUniReq(false); setUniReqName(''); setUniReqCity(''); setUniReqSent(false)
    setFacsReady(false)
    setShowFacReq(false); setFacReqName(''); setFacReqSent(false)
    setShowFilReq(false); setShowEmptyFilForm(false); setFilReqName(''); setFilReqSent(false)
    setShowModReq(false); setModReqName(''); setModReqSem('S1'); setModReqFilId('')
    setModReqSent(false); setModReqDup(null)
  }

  const uniName = unis.find(u => u.id === parseInt(selUni))?.name
  const facNameRaw = facs.find(f => f.id === parseInt(selFac))?.name
  const facName = facNameRaw === '__root__' ? null : facNameRaw
  const filName = fils.find(f => f.id === parseInt(selFil))?.name
  const typeName = DOC_TYPES.find(t => t.k === selType)?.l
  const hasFilters = selUni || selFac || selFil || selSem || selType || query
  const activeFilterCount = [selUni, facNameRaw === '__root__' ? '' : selFac, selFil, selSem, selType].filter(Boolean).length
  const hasActiveFilter = !!(selUni || selSem || selType || debouncedQuery.trim())
  const isUniEmpty = !loading && facsReady && selUni && !selSem && !selType && !debouncedQuery.trim() && mods.length === 0

  const displayed = (() => {
    const arr = [...mods]
    if (sortMode === 'az') arr.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortMode === 'recent') arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sortMode === 'docs') arr.sort((a, b) => (b.docs_count || 0) - (a.docs_count || 0))
    return arr
  })()

  const coverageRows = selSem ? mods.slice(0, 6).map(m => ({
    id: m.id, name: m.name,
    pct: Math.round(((m.doc_types?.length || 0) / DOC_TYPES.length) * 100),
  })).sort((a, b) => b.pct - a.pct) : []

  const breadcrumbItems = [
    { label: 'Explorer', href: '/browse' },
    uniName && { label: uniName },
    facName && { label: facName },
    filName && { label: filName },
    selSem && { label: selSem },
  ].filter(Boolean)

  // Search mode (free-text query) takes over the results area from the hierarchy
  // browsing below — ranking, fuzzy fallback and quality come from the database.
  const searchMode = debouncedQuery.trim().length > 0
  const search = useSearch(debouncedQuery, {
    universityId: selUni ? parseInt(selUni) : null,
    facultyId: selFac ? parseInt(selFac) : null,
    filiereId: selFil ? parseInt(selFil) : null,
    semester: selSem || null,
    docType: selType || null,
    docTypes: selDocTypes.length ? selDocTypes : null,
    year: selYear || null,
    verifiedOnly,
    moduleId: selModuleId ? parseInt(selModuleId) : null,
    professorId: selProfessor?.id || null,
  }, { enabled: searchMode })

  // Module options for the search-mode "Module" filter, limited to the chosen filière/semester.
  useEffect(() => {
    if (!searchMode || !selFil) { setModuleOptions([]); return }
    let q = supabase.from('modules').select('id, name, semester').eq('filiere_id', selFil)
    if (selSem) q = q.eq('semester', selSem)
    q.order('name').limit(100).then(({ data }) => setModuleOptions(data || []))
  }, [searchMode, selFil, selSem])

  const requestForm = (form) => {
    // form: 'uni' | 'fac' | 'fil'
    if (form === 'uni') return (
      <div className="bw-req-form">
        {uniReqSent ? <span className="t-body-sm" style={{ color: 'var(--success)' }}>Université ajoutée.</span>
          : !user ? <span className="t-body-sm qz-subtle"><Link to="/login" style={{ color: 'var(--brand-text)' }}>Connecte-toi</Link> pour envoyer une demande.</span>
          : (
            <>
              <Input placeholder="Nom de l'université" value={uniReqName} onChange={e => setUniReqName(e.target.value)} />
              <Input placeholder="Ville (optionnel)" value={uniReqCity} onChange={e => setUniReqCity(e.target.value)} />
              <div className="bw-search-row">
                <Button variant="primary" size="sm" loading={uniReqBusy} disabled={!uniReqName.trim()} onClick={handleUniRequest}>Envoyer</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowUniReq(false); setUniReqName(''); setUniReqCity('') }}>Annuler</Button>
              </div>
            </>
          )}
      </div>
    )
    if (form === 'fac') return (
      <div className="bw-req-form">
        {facReqSent ? <span className="t-body-sm" style={{ color: 'var(--success)' }}>Faculté ajoutée.</span>
          : !user ? <span className="t-body-sm qz-subtle"><Link to="/login" style={{ color: 'var(--brand-text)' }}>Connecte-toi</Link> pour envoyer une demande.</span>
          : (
            <>
              <Input placeholder="Nom de la faculté / école" value={facReqName} onChange={e => setFacReqName(e.target.value)} />
              <div className="bw-search-row">
                <Button variant="primary" size="sm" loading={facReqBusy} disabled={!facReqName.trim()} onClick={handleFacRequest}>Envoyer</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowFacReq(false); setFacReqName('') }}>Annuler</Button>
              </div>
            </>
          )}
      </div>
    )
    if (form === 'fil') return (
      <div className="bw-req-form">
        {filReqSent ? <span className="t-body-sm" style={{ color: 'var(--success)' }}>Filière ajoutée.</span>
          : !user ? <span className="t-body-sm qz-subtle"><Link to="/login" style={{ color: 'var(--brand-text)' }}>Connecte-toi</Link> pour envoyer une demande.</span>
          : (
            <>
              <Input placeholder="Nom de la filière" value={filReqName} onChange={e => setFilReqName(e.target.value)} />
              <div className="bw-search-row">
                <Button variant="primary" size="sm" loading={filReqBusy} disabled={!filReqName.trim()} onClick={handleFilRequest}>Envoyer</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowFilReq(false); setFilReqName('') }}>Annuler</Button>
              </div>
            </>
          )}
      </div>
    )
    return null
  }

  const renderFilters = () => (
    <>
      <div className="bw-filter-group">
        <label className="t-eyebrow qz-subtle">École</label>
        {user && userUniId && unis.length > 0 && (() => {
          const myUni = unis.find(u => u.id === userUniId)
          if (!myUni) return null
          return (
            <Chip selected={selUni === String(userUniId)} onClick={() => { setSelUni(String(myUni.id)); setUniSearch(myUni.name) }}>
              {myUni.name}
            </Chip>
          )
        })()}
        <div className="bw-uni-wrap">
          <Input
            placeholder="Toutes les universités"
            value={selUni ? (unis.find(u => String(u.id) === selUni)?.name ?? uniSearch) : uniSearch}
            onChange={e => { setUniSearch(e.target.value); setSelUni(''); setShowUniDd(true) }}
            onFocus={() => setShowUniDd(true)}
            onBlur={() => setTimeout(() => setShowUniDd(false), 150)}
          />
          {showUniDd && (
            <div className="qz-dropdown" style={{ position: 'absolute', left: 0, right: 0, width: 'auto' }}>
              <button type="button" className="qz-dropdown__item" onMouseDown={() => { setSelUni(''); setUniSearch(''); setShowUniDd(false) }}>Toutes les universités</button>
              {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).map(u => (
                <button type="button" key={u.id} className="qz-dropdown__item" onMouseDown={() => { setSelUni(String(u.id)); setUniSearch(u.name); setShowUniDd(false) }}>{u.name}</button>
              ))}
              {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).length === 0 && (
                <div style={{ padding: '8px 12px' }}><span className="t-body-sm qz-subtle">Aucun résultat</span></div>
              )}
              <div className="qz-dropdown__sep" />
              <button type="button" className="qz-dropdown__item" onMouseDown={() => { setShowUniDd(false); setShowUniReq(true); setUniReqSent(false) }}>
                <Icon name="plus" /> Ton école n'est pas dans la liste
              </button>
            </div>
          )}
        </div>
        {showUniReq && requestForm('uni')}
      </div>

      {selUni && facsReady && facs.filter(f => f.name !== '__root__').length > 0 && (
        <div className="bw-filter-group">
          <Select label="Faculté / École" value={selFac} onChange={e => setSelFac(e.target.value)} options={[{ value: '', label: 'Toutes les facultés' }, ...facs.filter(f => f.name !== '__root__').map(f => ({ value: f.id, label: f.name }))]} />
          {!showFacReq && !facReqSent && <Button variant="link" size="sm" onClick={() => setShowFacReq(true)}>Faculté introuvable ?</Button>}
          {showFacReq && requestForm('fac')}
        </div>
      )}

      {selUni && facsReady && facs.length === 0 && (
        <div className="bw-filter-group">
          {!showFilReq && !filReqSent && <Button variant="link" size="sm" onClick={() => { setShowFilReq(true); setShowFacReq(false) }}>Ajouter une filière</Button>}
          {showFilReq && requestForm('fil')}
          {!showFacReq && !facReqSent && <Button variant="link" size="sm" onClick={() => { setShowFacReq(true); setShowFilReq(false) }}>Ajouter une faculté / école</Button>}
          {showFacReq && requestForm('fac')}
        </div>
      )}

      {fils.length > 0 && (
        <div className="bw-filter-group">
          <Select label="Filière" value={selFil} onChange={e => setSelFil(e.target.value)} options={[{ value: '', label: 'Toutes les filières' }, ...fils.map(f => ({ value: f.id, label: f.name }))]} />
          {!showFilReq && !filReqSent && <Button variant="link" size="sm" onClick={() => setShowFilReq(true)}>Filière introuvable ?</Button>}
          {showFilReq && requestForm('fil')}
        </div>
      )}

      <div className="bw-filter-group">
        <label className="t-eyebrow qz-subtle">Semestre</label>
        <div className="bw-sem-grid">
          {SEMESTERS.map(s => (
            <Chip key={s} selected={selSem === s} onClick={() => setSelSem(selSem === s ? '' : s)}>{s}</Chip>
          ))}
        </div>
      </div>

      <div className="bw-filter-group">
        <label className="t-eyebrow qz-subtle">Type de document</label>
        <div className="bw-type-wrap">
          {DOC_TYPES.map(t => (
            <Chip key={t.k} selected={searchMode ? selDocTypes.includes(t.k) : selType === t.k}
              onClick={() => {
                if (searchMode) setSelDocTypes(prev => prev.includes(t.k) ? prev.filter(x => x !== t.k) : [...prev, t.k])
                else setSelType(selType === t.k ? '' : t.k)
              }}>{t.l}</Chip>
          ))}
        </div>
      </div>

      {searchMode && selFil && (
        <div className="bw-filter-group">
          <Select label="Module" value={selModuleId} onChange={e => setSelModuleId(e.target.value)}
            options={[{ value: '', label: 'Tous les modules' }, ...moduleOptions.map(m => ({ value: String(m.id), label: m.name + (m.semester ? ` (${m.semester})` : '') }))]} />
        </div>
      )}

      {searchMode && (
        <div className="bw-filter-group">
          <ProfessorPicker label="Professeur" value={selProfessor} onChange={setSelProfessor}
            universityId={selUni ? parseInt(selUni) : null} facultyId={selFac ? parseInt(selFac) : null} disableAdd />
        </div>
      )}

      <div className="bw-filter-group">
        <Select label="Année" value={selYear} onChange={e => setSelYear(e.target.value)}
          options={[{ value: '', label: 'Toutes les années' }, ...YEAR_OPTIONS]} />
      </div>

      <div className="bw-filter-group">
        <Switch label="Documents vérifiés uniquement" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
      </div>
    </>
  )

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="browse" />

      {user && userUniId && !hasFilters && (() => {
        const myUni = unis.find(u => u.id === userUniId)
        if (!myUni) return null
        return (
          <div className="bw-banner">
            <span className="t-body-sm qz-muted">Tu étudies à <b className="qz-muted" style={{ color: 'var(--text)' }}>{myUni.name}</b> — voir les modules de ton université.</span>
            <Button variant="secondary" size="sm" onClick={() => { setSelUni(String(myUni.id)); setUniSearch(myUni.name) }}>Voir</Button>
          </div>
        )
      })()}

      <div className="bw-layout">
        <aside className="bw-sidebar">
          <div className="bw-search-row">
            <span className="t-eyebrow qz-subtle" style={{ flex: 1 }}>Filtres</span>
            <Button variant="link" size="sm" onClick={reset}>Réinitialiser</Button>
          </div>
          {renderFilters()}
        </aside>

        <main className="bw-main">
          {hasFilters ? <Breadcrumb items={breadcrumbItems} /> : null}

          <div className="bw-search-row">
            <SearchBar
              variant={hasActiveFilter ? 'compact' : undefined}
              placeholder="Recherche un module… ex. Analyse 1, POO, Marketing"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onSubmit={() => flushSearch()}
            />
            <Tabs label="Vue" variant="pill" value={viewMode} onChange={setViewMode} items={[{ id: 'grid', label: 'Grille' }, { id: 'list', label: 'Liste' }]} />
          </div>

          {hasFilters && (
            <div className="bw-chips-row">
              {uniName && <Chip selected onClick={() => setSelUni('')}>{uniName} <Icon name="x" /></Chip>}
              {facName && <Chip selected onClick={() => setSelFac('')}>{facName} <Icon name="x" /></Chip>}
              {filName && <Chip selected onClick={() => setSelFil('')}>{filName} <Icon name="x" /></Chip>}
              {selSem && <Chip selected onClick={() => setSelSem('')}>{selSem} <Icon name="x" /></Chip>}
              {typeName && <Chip selected onClick={() => setSelType('')}>{typeName} <Icon name="x" /></Chip>}
              {debouncedQuery && <Chip selected onClick={() => { setQuery(''); setDebouncedQuery('') }}>"{debouncedQuery}" <Icon name="x" /></Chip>}
              <Button variant="link" size="sm" onClick={reset}>Tout effacer</Button>
            </div>
          )}

          {searchMode && search.understoodChips.length > 0 && (
            <div className="bw-chips-row">
              <span className="t-caption qz-subtle">Compris :</span>
              {search.understoodChips.map(c => (
                <Chip key={c.key} selected onClick={() => search.dropChip(c.key)}>{c.label} <Icon name="x" /></Chip>
              ))}
            </div>
          )}

          {searchMode && search.candidates.length > 0 && (
            <div className="bw-chips-row">
              <span className="t-caption qz-subtle">Tu cherches :</span>
              {search.candidates.slice(0, 4).map(c => (
                <Chip key={c.id} onClick={() => setSelModuleId(String(c.id))}>
                  {c.name} — {[c.filiere, c.semester].filter(Boolean).join(' ')} · {c.university}
                </Chip>
              ))}
            </div>
          )}

          {searchMode && search.context?.module && search.documents.length > 0 && search.documents.length <= 3 && (
            <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="t-body-sm qz-muted">Voir tous les documents de ce module</span>
              <Button variant="primary" as={Link} to={`/module/${search.context.module.slug || search.context.module.id}`}>
                Aller au module {search.context.module.name}
              </Button>
            </Card>
          )}

          {fetchErr && <div className="qz-card" style={{ borderColor: 'var(--danger)' }}><span className="t-body-sm" style={{ color: 'var(--danger)' }}>{fetchErr}</span></div>}

          {!searchMode && hasActiveFilter && (
            <div className="bw-results-bar">
              <span className="t-mono qz-subtle"><b className="qz-muted" style={{ color: 'var(--text)' }}>{displayed.length}</b> module{displayed.length !== 1 ? 's' : ''} trouvé{displayed.length !== 1 ? 's' : ''}</span>
              <div className="bw-results-actions">
                <Select value={sortMode} onChange={e => setSortMode(e.target.value)} options={[
                  { value: 'pertinence', label: 'Trier : Pertinence' },
                  { value: 'docs', label: 'Trier : Plus de documents' },
                  { value: 'recent', label: 'Trier : Récents' },
                  { value: 'az', label: 'Trier : A → Z' },
                ]} />
              </div>
            </div>
          )}

          {selFil && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <SenpaiSection filiereId={parseInt(selFil)}
                recruitEligible={user && semesterAtLeast(profile?.current_semester, 3)} />
            </div>
          )}

          <div id="browse-results">
            {searchMode ? (
              <>
                {search.fuzzy && (
                  <Banner>Aucun résultat exact pour « {debouncedQuery} ». Voici les plus proches.</Banner>
                )}
                {search.loading && search.documents.length === 0 && search.modules.length === 0 ? (
                  <div className="bw-grid">{Array(6).fill(0).map((_, i) => <Card key={i}><Skeleton height={110} /></Card>)}</div>
                ) : search.documents.length === 0 && search.modules.length === 0 ? (
                  <EmptyState icon="search" title={`Rien pour « ${debouncedQuery} »`}>
                    Vérifie l'orthographe ou demande-le : on l'ajoute vite.
                    <div className="bw-empty-actions">
                      <Button variant="secondary" onClick={() => { setShowModReq(true); setModReqName(search.parsed.text || debouncedQuery.trim()); if (search.parsed.semester) setModReqSem(search.parsed.semester) }}>Demander ce document</Button>
                      <Button variant="ghost" onClick={reset}>Effacer les filtres</Button>
                    </div>
                  </EmptyState>
                ) : (
                  <>
                    {search.documents.length > 0 && (
                      <div style={{ marginBottom: 'var(--space-8)' }}>
                        <div className="bw-results-bar">
                          <span className="t-eyebrow qz-subtle">Documents</span>
                          <span className="t-caption qz-subtle" title="Les documents vérifiés ou approuvés par la communauté sont affichés en premier, puis les plus utiles, les plus récents, et ceux de contributeurs de confiance.">
                            Classés par : validés, utiles, récents, contributeurs de confiance
                          </span>
                        </div>
                        <div className="qz-list" style={{ marginTop: 'var(--space-3)' }}>
                          {search.documents.map(d => {
                            const s = displayStatus(d)
                            const level = qualityLevel(d)
                            const upLevel = levelFor(d.uploader_points || 0)
                            return (
                              <Link key={d.id} to={`/module/${d.module_slug || d.module_id}`} className="qz-row"
                                onClick={() => search.logClick(`document:${d.id}`)}>
                                <DocType type={d.doc_type} size="lg" />
                                <div className="qz-row__main">
                                  <p className="qz-row__title">{d.title || `${DOC_TYPES.find(t => t.k === d.doc_type)?.l || d.doc_type} ${d.academic_year || ''}`}</p>
                                  <div className="qz-meta">
                                    {d.academic_year && <span>{d.academic_year}</span>}
                                    <span>{d.module_name}</span>
                                    {d.professor && (d.professor_id ? (
                                      <Link to={`/professeur/${d.professor_id}`} onClick={e => e.stopPropagation()}>Prof. {d.professor}</Link>
                                    ) : <span>Prof. {d.professor}</span>)}
                                    <span>partagé par {d.uploader_name || 'Anonyme'}</span>
                                    <LevelBadge tone={upLevel.tone} icon={upLevel.icon} name={upLevel.name} />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  <StatusBadge {...s} />
                                  {level && <QualityBadge score={d.quality_score ?? 0} label={level.label} tone={level.tone} />}
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {search.modules.length > 0 && (
                      <div>
                        <div className="bw-results-bar">
                          <span className="t-eyebrow qz-subtle">Modules</span>
                          <span className="t-mono qz-subtle">{search.totalModules} module{search.totalModules !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="bw-grid" style={{ marginTop: 'var(--space-3)' }}>
                          {search.modules.map(m => (
                            <div key={m.id} onClick={() => search.logClick(`module:${m.id}`)}>
                              <ModuleCard
                                linkAs={Link}
                                href={`/module/${m.slug || m.id}`}
                                name={m.name}
                                semester={m.semester}
                                school={m.university_name}
                                filiere={m.filiere_name}
                                types={m.doc_types || []}
                                docs={m.docs_count}
                                completeness={Math.round(((m.doc_types?.length || 0) / DOC_TYPES.length) * 100)}
                              />
                            </div>
                          ))}
                        </div>
                        {search.modules.length < search.totalModules && (
                          <LoadMore loading={search.loading} onClick={search.loadMore} />
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : !hasActiveFilter ? (
              <EmptyState icon="search" title="Sélectionne ton université pour commencer">
                Utilise les filtres pour trouver tes modules.
              </EmptyState>
            ) : loading ? (
              <div className={`bw-grid${viewMode === 'list' ? ' bw-grid--list' : ''}`}>
                {Array(9).fill(0).map((_, i) => <Card key={i}><Skeleton height={110} /></Card>)}
              </div>
            ) : displayed.length === 0 ? (
              isUniEmpty ? (
                <EmptyState icon="inbox" title="Cette université n'a pas encore de contenu">
                  Sois le premier à contribuer !
                  <div className="bw-empty-actions">
                    <Button variant="secondary" onClick={() => setShowEmptyFilForm(v => !v)}>Suggérer une filière</Button>
                    <Button variant="primary" as={Link} to="/upload">Partager un document</Button>
                  </div>
                  {showEmptyFilForm && !filReqSent && (
                    <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'left' }}>{requestForm('fil')}</div>
                  )}
                </EmptyState>
              ) : (
                <EmptyState icon="search" title={debouncedQuery.trim() ? `Aucun module pour "${debouncedQuery}"` : 'Aucun module trouvé'}>
                  Vérifie l'orthographe ou demande-le : on l'ajoute vite.
                  {debouncedQuery.trim() && (selFil || fils.length > 0) && !modReqSent && (
                    <div style={{ marginTop: 'var(--space-4)', maxWidth: 380, margin: 'var(--space-4) auto 0', textAlign: 'left' }}>
                      {!showModReq ? (
                        <div style={{ textAlign: 'center' }}>
                          <Button variant="secondary" onClick={() => { setShowModReq(true); setModReqName(debouncedQuery.trim()); setModReqFilId(selFil) }}>Demander ce module</Button>
                        </div>
                      ) : (
                        <div className="bw-req-form">
                          {!user ? (
                            <span className="t-body-sm qz-subtle"><Link to="/login" style={{ color: 'var(--brand-text)' }}>Connecte-toi</Link> pour ajouter ce module.</span>
                          ) : (
                            <>
                              {modReqDup && (
                                <span className="t-body-sm" style={{ color: 'var(--warning)' }}>
                                  Ce module existe déjà. <Button variant="link" size="sm" onClick={() => navigate(`/module/${modReqDup.slug || modReqDup.id}`)}>Voir le module</Button>
                                </span>
                              )}
                              <Input value={modReqName} onChange={e => setModReqName(e.target.value)} placeholder="Nom du module" maxLength={120} />
                              {!selFil && fils.length > 0 && (
                                <Select value={modReqFilId} onChange={e => setModReqFilId(e.target.value)} options={[{ value: '', label: 'Sélectionne la filière' }, ...fils.map(f => ({ value: f.id, label: f.name }))]} />
                              )}
                              <Select value={modReqSem} onChange={e => setModReqSem(e.target.value)} options={SEMESTERS} />
                              <div className="bw-search-row">
                                <Button variant="primary" size="sm" loading={modReqBusy} disabled={!modReqName.trim() || (!selFil && !modReqFilId)} onClick={handleModRequest}>Envoyer la demande</Button>
                                <Button variant="ghost" size="sm" onClick={() => { setShowModReq(false); setModReqDup(null) }}>Annuler</Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {modReqSent && (
                    <div className="bw-empty-actions">
                      <Badge tone="success" icon="check">Module ajouté</Badge>
                      <Button variant="secondary" as={Link} to="/upload">Partager un document</Button>
                    </div>
                  )}
                </EmptyState>
              )
            ) : (
              <div className={`bw-grid${viewMode === 'list' ? ' bw-grid--list' : ''}`}>
                {viewMode === 'list' ? (
                  <div className="qz-list">
                    {displayed.map(m => (
                      <DocumentRow
                        key={m.id}
                        href={`/module/${m.slug || m.id}`}
                        linkAs={Link}
                        hideActions
                        type={m.doc_types?.[0] || 'cours'}
                        title={m.name}
                        year={`S${m.semester}`}
                        professor={m.filieres?.name}
                        downloads={m.docs_count}
                      />
                    ))}
                  </div>
                ) : (
                  displayed.map(m => (
                    <ModuleCard
                      key={m.id}
                      linkAs={Link}
                      href={`/module/${m.slug || m.id}`}
                      name={m.name}
                      semester={m.semester}
                      school={m.filieres?.faculties?.universities?.name}
                      filiere={m.filieres?.faculties?.name && m.filieres.faculties.name !== '__root__' ? `${m.filieres?.name} · ${m.filieres.faculties.name}` : m.filieres?.name}
                      types={m.doc_types || []}
                      docs={m.docs_count || 0}
                      completeness={Math.round(((m.doc_types?.length || 0) / DOC_TYPES.length) * 100)}
                      bookmarked={bookmarked.has(m.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </main>

        {hasActiveFilter && displayed.length > 0 && (
          <aside className="bw-rail">
            {selSem && coverageRows.length > 0 && (
              <Card>
                <span className="t-eyebrow qz-subtle">Complétude {filName ? `— ${filName}` : uniName ? `— ${uniName}` : ''} · {selSem}</span>
                <div style={{ marginTop: 'var(--space-3)' }}>
                  {coverageRows.map(c => (
                    <div key={c.id} className="bw-rail-row">
                      <div className="bw-rail-row__top">
                        <span className="t-body-sm qz-muted">{c.name}</span>
                        <span className="t-mono qz-subtle">{c.pct}%</span>
                      </div>
                      <ProgressBar value={c.pct} />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <Card>
              <h3 className="t-h3">Tu as un examen de ce module ?</h3>
              <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>Aide ta promo en le partageant.</p>
              <Button variant="secondary" block as={Link} to="/upload">Partager</Button>
            </Card>
          </aside>
        )}
      </div>

      <Button className="bw-mobile-filter-btn" variant="primary" icon="menu" onClick={() => setShowDrawer(true)}>
        Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
      </Button>

      {showDrawer && (
        <Sheet title="Filtres" onClose={() => setShowDrawer(false)}>
          {renderFilters()}
          <div className="bw-sheet-footer">
            <Button variant="ghost" onClick={() => { reset(); setShowDrawer(false) }}>Réinitialiser</Button>
            <Button variant="primary" onClick={() => {
              setShowDrawer(false)
              setTimeout(() => document.getElementById('browse-results')?.scrollIntoView({ behavior: 'smooth' }), 100)
            }}>Voir {displayed.length} résultat{displayed.length !== 1 ? 's' : ''}</Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
