import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222; --s3:#111827;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  html, body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; height:100%; }
  .browse { min-height:100vh; display:flex; flex-direction:column; }
  .layout { display:flex; flex:1; overflow:hidden; height:calc(100vh - 58px); }

  /* SIDEBAR */
  .sidebar { width:272px; flex-shrink:0; border-right:1px solid var(--border); background:var(--surface); overflow-y:auto; padding:1.25rem; }
  .sidebar::-webkit-scrollbar { width:4px; }
  .sidebar::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
  .sidebar-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid var(--border); }
  .sidebar-title { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); letter-spacing:2px; text-transform:uppercase; }
  .sidebar-reset { font-size:0.7rem; color:var(--red); background:none; border:none; cursor:pointer; font-family:'DM Mono',monospace; transition:color 0.15s; padding:0; font-weight:500; }
  .sidebar-reset:hover { color:#FF9999; }

  .filter-block { margin-bottom:1.25rem; }
  .filter-label { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.5rem; display:block; }
  .filter-select { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text); font-size:0.82rem; font-family:'Outfit',sans-serif; outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5568' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; transition:border-color 0.15s; }
  .filter-select:focus { border-color:var(--accent); }
  .filter-select option { background:var(--s2); }

  .sem-wrap { display:grid; grid-template-columns:repeat(5,1fr); gap:4px; }
  .sem-btn { background:var(--s2); border:1px solid var(--border); border-radius:6px; padding:6px 2px; font-size:0.68rem; color:var(--text3); cursor:pointer; transition:all 0.15s; text-align:center; font-family:'DM Mono',monospace; }
  .sem-btn:hover { border-color:var(--borderhi); color:var(--text2); }
  .sem-btn.on { background:rgba(79,142,247,0.1); border-color:var(--accent); color:var(--accent2); }

  .type-wrap { display:flex; flex-direction:column; gap:3px; }
  .type-row { display:flex; align-items:center; gap:10px; background:var(--s2); border:1px solid var(--border); border-radius:8px; padding:8px 10px; cursor:pointer; transition:all 0.15s; font-family:'Outfit',sans-serif; }
  .type-row:hover { border-color:var(--borderhi); }
  .type-row.on { background:rgba(79,142,247,0.06); border-color:var(--accent); }
  .type-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; background:var(--border); }
  .type-row.on .type-dot { background:var(--accent); }
  .type-name { font-size:0.8rem; color:var(--text2); }
  .type-row.on .type-name { color:var(--accent2); font-weight:500; }
  .sidebar-divider { height:1px; background:var(--border); margin:1.25rem 0; }

  /* SEARCHABLE UNI DROPDOWN */
  .uni-wrap { position:relative; }
  .uni-input { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text); font-size:0.82rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s; }
  .uni-input:focus { border-color:var(--accent); }
  .uni-input::placeholder { color:var(--text3); }
  .uni-dd { position:absolute; top:100%; left:0; right:0; z-index:100; background:var(--s2); border:1px solid var(--borderhi); border-radius:8px; margin-top:4px; overflow:hidden; max-height:220px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.4); }
  .uni-dd::-webkit-scrollbar { width:3px; }
  .uni-dd::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
  .uni-dd-item { padding:8px 10px; cursor:pointer; font-size:0.82rem; color:var(--text); border-bottom:1px solid var(--border); transition:background 0.12s; font-family:'Outfit',sans-serif; }
  .uni-dd-item:last-child { border-bottom:none; }
  .uni-dd-item:hover { background:var(--s3); }
  .uni-dd-item.reset { color:var(--text3); font-style:italic; }
  .uni-dd-empty { padding:8px 10px; font-size:0.78rem; color:var(--text3); font-family:'DM Mono',monospace; }
  .uni-dd-ask { padding:8px 10px; cursor:pointer; font-size:0.75rem; color:var(--accent2); font-family:'DM Mono',monospace; border-top:1px solid var(--border); border-bottom:none; transition:background 0.12s; }
  .uni-dd-ask:hover { background:var(--s3); }

  /* REQUEST FORMS */
  .req-form { margin-top:8px; background:rgba(79,142,247,0.04); border:1px solid rgba(79,142,247,0.18); border-radius:8px; padding:10px 12px; }
  .req-form-title { font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--accent2); letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; }
  .req-input { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:7px; padding:7px 10px; color:var(--text); font-size:0.8rem; font-family:'Outfit',sans-serif; outline:none; margin-bottom:6px; transition:border-color 0.15s; }
  .req-input:focus { border-color:var(--accent); }
  .req-input::placeholder { color:var(--text3); }
  .req-send { background:rgba(79,142,247,0.1); border:1px solid rgba(79,142,247,0.3); color:var(--accent2); border-radius:6px; padding:5px 12px; font-size:0.75rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.12s; }
  .req-send:disabled { opacity:0.4; cursor:not-allowed; }
  .req-cancel { background:none; border:none; color:var(--text3); font-size:0.72rem; cursor:pointer; font-family:'DM Mono',monospace; margin-left:6px; }
  .req-link { display:block; margin-top:6px; background:none; border:none; color:var(--text3); font-size:0.7rem; cursor:pointer; font-family:'DM Mono',monospace; padding:0; text-align:left; transition:color 0.15s; }
  .req-link:hover { color:var(--accent2); }
  .req-ok { font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--teal2); margin-top:6px; }

  /* MAIN */
  .main { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .main::-webkit-scrollbar { width:4px; }
  .main::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

  .topbar { position:sticky; top:0; z-index:10; background:rgba(2,4,10,0.92); backdrop-filter:blur(20px); border-bottom:1px solid var(--border); padding:0.875rem 1.5rem; display:flex; align-items:center; gap:1rem; }
  .search-field { flex:1; display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:0 4px 0 14px; gap:10px; transition:border-color 0.15s, box-shadow 0.15s; }
  .search-field:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.1); }
  .search-prompt { font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--text3); flex-shrink:0; }
  .search-input { flex:1; background:none; border:none; outline:none; font-size:0.875rem; color:var(--text); font-family:'Outfit',sans-serif; padding:9px 0; }
  .search-input::placeholder { color:var(--text3); }
  .search-btn { background:var(--accent); color:var(--white); border:none; border-radius:7px; padding:7px 16px; font-size:0.8rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .search-btn:hover { background:#3A7BEF; }

  .breadcrumb { display:flex; align-items:center; gap:6px; padding:0.6rem 1.5rem; border-bottom:1px solid var(--border); background:var(--surface); flex-wrap:wrap; }
  .bc-item { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--text3); }
  .bc-sep { font-size:0.68rem; color:var(--text3); }
  .bc-active { color:var(--accent2); }

  .results-bar { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1.5rem; }
  .results-info { font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--text3); }
  .results-info b { color:var(--accent2); }
  .clear-btn { font-size:0.72rem; color:var(--text3); background:none; border:none; cursor:pointer; font-family:'DM Mono',monospace; transition:color 0.15s; }
  .clear-btn:hover { color:var(--accent2); }

  .grid-wrap { padding:0 1.5rem 1.5rem; }
  .modules-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:14px; overflow:hidden; }

  .mod-card { background:var(--surface); padding:1.25rem; cursor:pointer; transition:background 0.15s; display:flex; flex-direction:column; gap:0.5rem; position:relative; overflow:hidden; }
  .mod-card::before { content:''; position:absolute; top:0; left:0; bottom:0; width:2px; background:linear-gradient(180deg,var(--accent),var(--teal)); transform:scaleY(0); transform-origin:top; transition:transform 0.25s cubic-bezier(0.4,0,0.2,1); }
  .mod-card:hover { background:var(--s2); }
  .mod-card:hover::before { transform:scaleY(1); }
  .mod-top { display:flex; align-items:center; justify-content:space-between; }
  .mod-sem { font-family:'DM Mono',monospace; font-size:0.62rem; font-weight:500; color:var(--accent); background:rgba(79,142,247,0.08); border:1px solid rgba(79,142,247,0.15); padding:2px 8px; border-radius:4px; letter-spacing:0.5px; }
  .mod-type-tag { font-family:'DM Mono',monospace; font-size:0.58rem; text-transform:uppercase; letter-spacing:0.5px; padding:2px 7px; border-radius:3px; }
  .tag-cours { background:rgba(45,212,191,0.08); color:var(--teal2); }
  .tag-projet { background:rgba(79,142,247,0.08); color:var(--accent2); }
  .mod-name { font-size:0.9rem; font-weight:600; color:var(--white); line-height:1.35; }
  .mod-path { font-size:0.72rem; color:var(--text3); font-family:'DM Mono',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mod-footer { display:flex; align-items:center; justify-content:space-between; padding-top:0.75rem; margin-top:0.25rem; border-top:1px solid var(--border); }
  .mod-docs { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--text3); }
  .mod-docs b { color:var(--accent2); }
  .mod-arr { font-size:0.7rem; color:var(--text3); transition:all 0.15s; font-family:'DM Mono',monospace; }
  .mod-card:hover .mod-arr { color:var(--accent2); transform:translateX(4px); }

  .empty { grid-column:1/-1; padding:5rem 2rem; text-align:center; }
  .empty-code { font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--text3); margin-bottom:0.75rem; }
  .empty-title { font-size:1rem; font-weight:600; color:var(--text2); margin-bottom:6px; }
  .empty-sub { font-size:0.8rem; color:var(--text3); }

  .skel { background:var(--surface); height:130px; animation:pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:0.35} 50%{opacity:0.7} }

  @media(max-width:768px) {
    .layout { height:auto; overflow:visible; }
    .sidebar { display:none; }
    .main { height:auto; overflow:visible; }
    .topbar { padding:0.75rem 1rem; flex-wrap:wrap; gap:8px; }
    .breadcrumb { padding:0.5rem 1rem; }
    .results-bar { padding:0.5rem 1rem; }
    .grid-wrap { padding:0 1rem 1rem; }
    .modules-grid { grid-template-columns:1fr 1fr; }
  }
  @media(max-width:480px) {
    .modules-grid { grid-template-columns:1fr; }
    .search-prompt { display:none; }
  }

  /* MOBILE FILTER DRAWER */
  .mob-filter-btn { display:none; }
  @media(max-width:768px) {
    .mob-filter-btn {
      display:flex; align-items:center; gap:7px;
      position:fixed; bottom:24px; left:20px; z-index:500;
      background:var(--accent); color:#fff; border:none; border-radius:24px;
      padding:11px 20px; font-size:0.875rem; font-weight:700;
      font-family:'Outfit',sans-serif; cursor:pointer;
      box-shadow:0 4px 24px rgba(79,142,247,0.5); transition:all 0.2s;
    }
  }
  .mob-badge {
    background:#F87171; color:#fff; border-radius:10px;
    min-width:18px; height:18px; display:flex; align-items:center; justify-content:center;
    font-size:0.68rem; font-weight:700; padding:0 4px;
  }
  .mob-overlay {
    position:fixed; inset:0; z-index:600; background:rgba(2,4,10,0.75);
    backdrop-filter:blur(4px);
  }
  .mob-drawer {
    position:fixed; bottom:0; left:0; right:0; z-index:601;
    background:var(--surface); border-top:1px solid var(--border);
    border-radius:18px 18px 0 0; padding:0 1.25rem 2rem;
    max-height:85vh; overflow-y:auto;
    animation:mob-slide-up 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes mob-slide-up { from { transform:translateY(100%) } to { transform:translateY(0) } }
  .mob-drawer::-webkit-scrollbar { width:3px; }
  .mob-drawer::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
  .mob-handle { width:40px; height:4px; background:var(--border); border-radius:2px; margin:14px auto 1.25rem; }
  .mob-drawer-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid var(--border); }
  .mob-drawer-title { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); letter-spacing:2px; text-transform:uppercase; }
  .mob-drawer-reset { background:none; border:none; color:#F87171; font-size:0.7rem; cursor:pointer; font-family:'DM Mono',monospace; font-weight:500; }
  .mob-apply { width:100%; background:linear-gradient(135deg,#4F8EF7,#3A6ED4); color:#fff; border:none; border-radius:12px; padding:13px; font-size:0.9rem; font-weight:700; font-family:'Outfit',sans-serif; cursor:pointer; margin-top:1.25rem; }

  @keyframes fade-hint {
    0%   { opacity:0; transform:translateX(-50%) translateY(8px); }
    15%  { opacity:1; transform:translateX(-50%) translateY(0); }
    70%  { opacity:1; transform:translateX(-50%) translateY(0); }
    100% { opacity:0; transform:translateX(-50%) translateY(-6px); }
  }
  .scroll-hint {
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    z-index:700; background:#0C1222; border:1px solid #2D4A7A;
    border-radius:10px; padding:10px 22px;
    font-family:'DM Mono',monospace; font-size:0.78rem; color:#5EEAD4;
    box-shadow:0 8px 32px rgba(0,0,0,0.5); white-space:nowrap;
    pointer-events:none; animation:fade-hint 1.5s ease forwards;
  }
`

const DOC_TYPES = [
  { k: 'examen',         l: 'Examen Final',     short: 'EXAM'  },
  { k: 'cc',             l: 'Contrôle Continu',  short: 'CC'    },
  { k: 'td',             l: 'Travail Dirigé',    short: 'TD'    },
  { k: 'tp',             l: 'Travail Pratique',  short: 'TP'    },
  { k: 'cours',          l: 'Cours',             short: 'COURS' },
  { k: 'corrige_examen', l: 'Corrigé Examen',    short: 'COR.'  },
  { k: 'corrige_td',     l: 'Corrigé TD',        short: 'C.TD'  },
  { k: 'corrige_tp',     l: 'Corrigé TP',        short: 'C.TP'  },
  { k: 'quiz',           l: 'Quiz / Interro',    short: 'QUIZ'  },
  { k: 'projet_final',  l: 'Projet Final',      short: 'PROJ'  },
]

export default function Browse() {
  const navigate = useNavigate()
  const [sp, setSearchParams] = useSearchParams()
  const debounceRef  = useRef(null)
  const restoringRef = useRef({ fac: sp.get('fac') || '', fil: sp.get('fil') || '' })

  const [query,          setQuery]          = useState(sp.get('q')    || '')
  const [debouncedQuery, setDebouncedQuery] = useState(sp.get('q')    || '')
  const [unis,    setUnis]    = useState([])
  const [facs,    setFacs]    = useState([])
  const [fils,    setFils]    = useState([])
  const [mods,    setMods]    = useState([])
  const [loading, setLoading] = useState(false)

  const [selUni,  setSelUni]  = useState(sp.get('uni')  || '')
  const [selFac,  setSelFac]  = useState(sp.get('fac')  || '')
  const [selFil,  setSelFil]  = useState(sp.get('fil')  || '')
  const [selSem,  setSelSem]  = useState(sp.get('sem')  || '')
  const [selType, setSelType] = useState(sp.get('type') || '')
  const [fetchErr, setFetchErr] = useState('')
  const [uniSearch,  setUniSearch]  = useState('')
  const [showUniDd,  setShowUniDd]  = useState(false)
  const { user } = useAuth()

  // Uni request form
  const [showUniReq,     setShowUniReq]     = useState(false)
  const [uniReqName,     setUniReqName]     = useState('')
  const [uniReqCity,     setUniReqCity]     = useState('')
  const [uniReqSent,     setUniReqSent]     = useState(false)
  const [uniReqBusy,     setUniReqBusy]     = useState(false)

  const [facsReady,      setFacsReady]      = useState(false)

  // Faculté request form
  const [showFacReq,     setShowFacReq]     = useState(false)
  const [facReqName,     setFacReqName]     = useState('')
  const [facReqSent,     setFacReqSent]     = useState(false)
  const [facReqBusy,     setFacReqBusy]     = useState(false)

  // Filière request form (sidebar + inline empty-state)
  const [showFilReq,       setShowFilReq]       = useState(false)
  const [showEmptyFilForm, setShowEmptyFilForm] = useState(false)
  const [filReqName,       setFilReqName]       = useState('')
  const [filReqSent,       setFilReqSent]       = useState(false)
  const [filReqBusy,       setFilReqBusy]       = useState(false)
  const [userUniId,        setUserUniId]        = useState(null)
  const [showDrawer,       setShowDrawer]       = useState(false)
  const [showScrollHint,   setShowScrollHint]   = useState(false)

  useEffect(() => {
    if (!user?.id) { setUserUniId(null); return }
    supabase.from('user_profiles').select('university_id').eq('id', user.id).single()
      .then(({ data }) => setUserUniId(data?.university_id || null))
  }, [user?.id]) // eslint-disable-line

  // Sync from URL when navigated here externally (e.g. Navbar search → /browse?q=)
  useEffect(() => {
    setQuery(sp.get('q') || '')
    setSelUni(sp.get('uni') || '')
    setSelSem(sp.get('sem') || '')
    setSelType(sp.get('type') || '')
  }, [sp])

  // Debounce: query → debouncedQuery after 500ms idle
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 500)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Persist all active filters to URL + save to sessionStorage for Navbar restore
  useEffect(() => {
    const p = {}
    if (query)   p.q    = query
    if (selUni)  p.uni  = selUni
    if (selFac)  p.fac  = selFac
    if (selFil)  p.fil  = selFil
    if (selSem)  p.sem  = selSem
    if (selType) p.type = selType
    setSearchParams(p, { replace: true })
    const qs = new URLSearchParams(p).toString()
    sessionStorage.setItem('lastBrowseUrl', '/browse' + (qs ? '?' + qs : ''))
  }, [query, selUni, selFac, selFil, selSem, selType, setSearchParams])

  // Load universities once
  useEffect(() => {
    supabase.from('universities').select('*').order('name')
      .then(({ data }) => setUnis(data || []))
  }, [])

  // Dynamic page title based on active university filter
  useEffect(() => {
    const uniName = unis.find(u => u.id === parseInt(selUni))?.name
    document.title = uniName
      ? `Modules ${uniName} — 9rawZid9ra`
      : 'Explorer les modules — 9rawZid9ra'
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

  const reset = () => {
    setSearchParams({})
    setQuery(''); setDebouncedQuery(''); setSelUni(''); setSelFac(''); setSelFil(''); setSelSem(''); setSelType('')
    setUniSearch(''); setShowUniDd(false)
    setShowUniReq(false); setUniReqName(''); setUniReqCity(''); setUniReqSent(false)
    setFacsReady(false)
    setShowFacReq(false); setFacReqName(''); setFacReqSent(false)
    setShowFilReq(false); setShowEmptyFilForm(false); setFilReqName(''); setFilReqSent(false)
  }

  const displayed = mods
  const uniName  = unis.find(u => u.id === parseInt(selUni))?.name
  const facNameRaw = facs.find(f => f.id === parseInt(selFac))?.name
  const facName  = facNameRaw === '__root__' ? null : facNameRaw
  const filName  = fils.find(f => f.id === parseInt(selFil))?.name
  const typeName = DOC_TYPES.find(t => t.k === selType)?.l
  const hasFilters         = selUni || selFac || selFil || selSem || selType || query
  const activeFilterCount  = [selUni, facNameRaw === '__root__' ? '' : selFac, selFil, selSem, selType].filter(Boolean).length
  const hasActiveFilter = !!(selUni || selSem || selType || debouncedQuery.trim())
  // University selected, facs loaded, no other filters, no results → uni has no content yet
  const isUniEmpty = !loading && facsReady && selUni && !selSem && !selType && !debouncedQuery.trim() && displayed.length === 0

  return (
    <div className="browse">
      <style>{css}</style>
      <Navbar activePage="browse" />

      {user && userUniId && !hasFilters && (() => {
        const myUni = unis.find(u => u.id === userUniId)
        if (!myUni) return null
        return (
          <div style={{ borderBottom:'1px solid rgba(79,142,247,0.1)', padding:'9px 24px', display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap', background:'rgba(79,142,247,0.04)' }}>
            <span style={{ fontSize:'0.875rem', color:'var(--text2)', fontFamily:'Outfit,sans-serif' }}>
              🎓 Tu étudies à <b style={{ color:'var(--accent2)' }}>{myUni.name}</b> — voir les modules de ton université
            </span>
            <button
              onClick={() => { setSelUni(String(myUni.id)); setUniSearch(myUni.name) }}
              style={{ background:'rgba(79,142,247,0.1)', border:'1px solid rgba(79,142,247,0.25)', color:'var(--accent2)', borderRadius:7, padding:'4px 14px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}>
              Voir →
            </button>
          </div>
        )
      })()}

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">// filtres</span>
            <button className="sidebar-reset" onClick={reset}>reset</button>
          </div>

          {user && userUniId && unis.length > 0 && (() => {
            const myUni = unis.find(u => u.id === userUniId)
            if (!myUni) return null
            const active = selUni === String(userUniId)
            return (
              <div style={{marginBottom:'1rem'}}>
                <button
                  onClick={() => { setSelUni(String(myUni.id)); setUniSearch(myUni.name) }}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:7,
                    background: active ? 'rgba(79,142,247,0.12)' : 'rgba(79,142,247,0.05)',
                    border: `1px solid ${active ? 'rgba(79,142,247,0.4)' : 'rgba(79,142,247,0.15)'}`,
                    borderRadius:8, padding:'7px 10px', cursor:'pointer', transition:'all 0.15s',
                    fontFamily:'Outfit,sans-serif', fontSize:'0.8rem',
                    color: active ? 'var(--accent2)' : 'var(--text2)', textAlign:'left',
                  }}>
                  <span>🎓</span>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{myUni.name}</span>
                </button>
              </div>
            )
          })()}

          <div className="filter-block">
            <span className="filter-label">Université</span>
            <div className="uni-wrap">
              <input
                className="uni-input"
                placeholder="Toutes les universités"
                value={selUni ? (unis.find(u => String(u.id) === selUni)?.name ?? uniSearch) : uniSearch}
                onChange={e => { setUniSearch(e.target.value); setSelUni(''); setShowUniDd(true); }}
                onFocus={() => setShowUniDd(true)}
                onBlur={() => setTimeout(() => setShowUniDd(false), 150)}
              />
              {showUniDd && (
                <div className="uni-dd">
                  <div className="uni-dd-item reset"
                    onMouseDown={() => { setSelUni(''); setUniSearch(''); setShowUniDd(false); }}>
                    Toutes les universités
                  </div>
                  {unis
                    .filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase()))
                    .map(u => (
                      <div key={u.id} className="uni-dd-item"
                        onMouseDown={() => { setSelUni(String(u.id)); setUniSearch(u.name); setShowUniDd(false); }}>
                        {u.name}
                      </div>
                    ))
                  }
                  {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).length === 0 && (
                    <div className="uni-dd-empty">Aucun résultat</div>
                  )}
                  <div className="uni-dd-ask"
                    onMouseDown={() => { setShowUniDd(false); setShowUniReq(true); setUniReqSent(false); }}>
                    + Tu ne trouves pas ton université ?
                  </div>
                </div>
              )}
              {showUniReq && (
                <div className="req-form">
                  {uniReqSent ? (
                    <div className="req-ok">✓ Université ajoutée !</div>
                  ) : !user ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',color:'var(--text3)'}}>
                      <a href="/login" style={{color:'var(--accent2)',textDecoration:'none'}}>Connecte-toi</a> pour envoyer une demande
                    </div>
                  ) : (
                    <>
                      <div className="req-form-title">// université manquante</div>
                      <input className="req-input" placeholder="Nom de l'université *" value={uniReqName} onChange={e => setUniReqName(e.target.value)} />
                      <input className="req-input" placeholder="Ville (optionnel)" value={uniReqCity} onChange={e => setUniReqCity(e.target.value)} />
                      <div>
                        <button className="req-send" onClick={handleUniRequest} disabled={!uniReqName.trim() || uniReqBusy}>
                          {uniReqBusy ? '...' : 'Envoyer'}
                        </button>
                        <button className="req-cancel" onClick={() => { setShowUniReq(false); setUniReqName(''); setUniReqCity(''); }}>Annuler</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Faculté dropdown — only when named (non-root) faculties exist */}
          {selUni && facsReady && facs.filter(f => f.name !== '__root__').length > 0 && (
            <div className="filter-block">
              <span className="filter-label">Faculté / École</span>
              <select className="filter-select" value={selFac} onChange={e => setSelFac(e.target.value)}>
                <option value="">Toutes les facultés</option>
                {facs.filter(f => f.name !== '__root__').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {!showFacReq && !facReqSent && (
                <button className="req-link" onClick={() => setShowFacReq(true)}>Faculté introuvable ?</button>
              )}
              {facReqSent && <div className="req-ok">✓ Faculté ajoutée !</div>}
              {showFacReq && !facReqSent && (
                <div className="req-form">
                  <div className="req-form-title">// faculté manquante</div>
                  {!user ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',color:'var(--text3)'}}>
                      <a href="/login" style={{color:'var(--accent2)',textDecoration:'none'}}>Connecte-toi</a> pour envoyer une demande
                    </div>
                  ) : (
                    <>
                      <input className="req-input" placeholder="Nom de la faculté / école *" value={facReqName} onChange={e => setFacReqName(e.target.value)} />
                      <div>
                        <button className="req-send" onClick={handleFacRequest} disabled={!facReqName.trim() || facReqBusy}>
                          {facReqBusy ? '...' : 'Envoyer'}
                        </button>
                        <button className="req-cancel" onClick={() => { setShowFacReq(false); setFacReqName(''); }}>Annuler</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No faculties yet — show contribute CTAs directly, no empty dropdowns */}
          {selUni && facsReady && facs.length === 0 && (
            <div className="filter-block">
              {!showFilReq && !filReqSent && (
                <button className="req-link" onClick={() => { setShowFilReq(true); setShowFacReq(false) }}>+ Ajouter une filière</button>
              )}
              {showFilReq && !filReqSent && (
                <div className="req-form">
                  <div className="req-form-title">// filière manquante</div>
                  {!user ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',color:'var(--text3)'}}>
                      <a href="/login" style={{color:'var(--accent2)',textDecoration:'none'}}>Connecte-toi</a> pour envoyer une demande
                    </div>
                  ) : (
                    <>
                      <input className="req-input" placeholder="Nom de la filière *" value={filReqName} onChange={e => setFilReqName(e.target.value)} />
                      <div>
                        <button className="req-send" onClick={handleFilRequest} disabled={!filReqName.trim() || filReqBusy}>{filReqBusy ? '...' : 'Envoyer'}</button>
                        <button className="req-cancel" onClick={() => { setShowFilReq(false); setFilReqName(''); }}>Annuler</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {filReqSent && <div className="req-ok">✓ Filière ajoutée !</div>}
              {!showFacReq && !facReqSent && (
                <button className="req-link" onClick={() => { setShowFacReq(true); setShowFilReq(false) }}>+ Ajouter une faculté / école</button>
              )}
              {showFacReq && !facReqSent && (
                <div className="req-form">
                  <div className="req-form-title">// faculté manquante</div>
                  {!user ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',color:'var(--text3)'}}>
                      <a href="/login" style={{color:'var(--accent2)',textDecoration:'none'}}>Connecte-toi</a> pour envoyer une demande
                    </div>
                  ) : (
                    <>
                      <input className="req-input" placeholder="Nom de la faculté / école *" value={facReqName} onChange={e => setFacReqName(e.target.value)} />
                      <div>
                        <button className="req-send" onClick={handleFacRequest} disabled={!facReqName.trim() || facReqBusy}>{facReqBusy ? '...' : 'Envoyer'}</button>
                        <button className="req-cancel" onClick={() => { setShowFacReq(false); setFacReqName(''); }}>Annuler</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {facReqSent && <div className="req-ok">✓ Faculté ajoutée !</div>}
            </div>
          )}

          {fils.length > 0 && (
            <div className="filter-block">
              <span className="filter-label">Filière</span>
              <select className="filter-select" value={selFil} onChange={e => setSelFil(e.target.value)}>
                <option value="">Toutes les filières</option>
                {fils.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {!showFilReq && !filReqSent && (
                <button className="req-link" onClick={() => setShowFilReq(true)}>Filière introuvable ?</button>
              )}
              {filReqSent && <div className="req-ok">✓ Filière ajoutée !</div>}
              {showFilReq && !filReqSent && (
                <div className="req-form">
                  {!user ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',color:'var(--text3)'}}>
                      <a href="/login" style={{color:'var(--accent2)',textDecoration:'none'}}>Connecte-toi</a> pour envoyer une demande
                    </div>
                  ) : (
                    <>
                      <div className="req-form-title">// filière manquante</div>
                      <input className="req-input" placeholder="Nom de la filière *" value={filReqName} onChange={e => setFilReqName(e.target.value)} />
                      <div>
                        <button className="req-send" onClick={handleFilRequest} disabled={!filReqName.trim() || filReqBusy}>
                          {filReqBusy ? '...' : 'Envoyer'}
                        </button>
                        <button className="req-cancel" onClick={() => { setShowFilReq(false); setFilReqName(''); }}>Annuler</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="sidebar-divider" />

          <div className="filter-block">
            <span className="filter-label">Semestre</span>
            <div className="sem-wrap">
              {['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'].map(s => (
                <button key={s} className={`sem-btn ${selSem===s?'on':''}`}
                  onClick={() => setSelSem(selSem===s?'':s)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="sidebar-divider" />

          <div className="filter-block">
            <span className="filter-label">Type de document</span>
            <div className="type-wrap">
              {DOC_TYPES.map(t => (
                <div key={t.k} className={`type-row ${selType===t.k?'on':''}`}
                  onClick={() => setSelType(selType===t.k?'':t.k)}>
                  <div className="type-dot" />
                  <span className="type-name">{t.l}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div className="search-field">
              <span className="search-prompt">$_</span>
              <input className="search-input"
                placeholder="Recherche un module... ex: Analyse 1, POO, Marketing Stratégique"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && flushSearch()} />
            </div>
            <button className="search-btn" onClick={flushSearch}>Rechercher</button>
          </div>

          {/* Breadcrumb */}
          {hasFilters && (
            <div className="breadcrumb">
              <span className="bc-item">modules</span>
              {uniName && <><span className="bc-sep">/</span><span className="bc-item">{uniName}</span></>}
              {facName && <><span className="bc-sep">/</span><span className="bc-item">{facName}</span></>}
              {filName && <><span className="bc-sep">/</span><span className="bc-item bc-active">{filName}</span></>}
              {selSem   && <><span className="bc-sep">/</span><span className="bc-item bc-active">{selSem}</span></>}
              {typeName && <><span className="bc-sep">/</span><span className="bc-item bc-active">{typeName}</span></>}
              {query    && <><span className="bc-sep">/</span><span className="bc-item bc-active">"{query}"</span></>}
            </div>
          )}

          {fetchErr && (
            <div style={{ margin:'0.5rem 1.5rem', padding:'8px 14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, fontSize:'0.78rem', color:'#F87171', fontFamily:'DM Mono,monospace' }}>
              {fetchErr}
            </div>
          )}
          {hasActiveFilter && (
            <div className="results-bar">
              <span className="results-info">
                <b>{displayed.length}</b> module{displayed.length!==1?'s':''} trouvé{displayed.length!==1?'s':''}
              </span>
              {hasFilters && (
                <button className="clear-btn" onClick={reset}>effacer les filtres</button>
              )}
            </div>
          )}

          <div className="grid-wrap" id="browse-results">
            <div className="modules-grid">
              {!hasActiveFilter ? (
                <div className="empty">
                  <div className="empty-code">// no filter selected</div>
                  <div className="empty-title">Sélectionne ton université pour commencer</div>
                  <div className="empty-sub">Utilise les filtres à gauche pour trouver tes modules</div>
                </div>
              ) : loading ? (
                Array(12).fill(0).map((_,i) => <div key={i} className="skel" />)
              ) : displayed.length === 0 ? (
                isUniEmpty ? (
                  <div className="empty">
                    <div className="empty-code">// aucun contenu</div>
                    <div className="empty-title">Cette université n'a pas encore de contenu sur la plateforme</div>
                    <div className="empty-sub">Sois le premier à contribuer !</div>
                    <div style={{marginTop:'1.25rem',display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                      <button
                        onClick={() => setShowEmptyFilForm(v => !v)}
                        style={{background:'rgba(79,142,247,0.1)',border:'1px solid rgba(79,142,247,0.3)',color:'var(--accent2)',borderRadius:8,padding:'9px 18px',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',fontFamily:'Outfit,sans-serif',transition:'all 0.15s'}}>
                        Suggérer une filière
                      </button>
                      <button
                        onClick={() => navigate('/upload')}
                        style={{background:'linear-gradient(135deg,#4F8EF7,#3A6ED4)',border:'none',color:'#fff',borderRadius:8,padding:'9px 18px',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',fontFamily:'Outfit,sans-serif',transition:'opacity 0.15s'}}>
                        Uploader un document
                      </button>
                    </div>
                    {showEmptyFilForm && !filReqSent && (
                      <div style={{marginTop:'1rem',background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.18)',borderRadius:8,padding:'12px 14px',width:'100%',maxWidth:300,textAlign:'left'}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.6rem',color:'var(--accent2)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>// filière manquante</div>
                        {!user ? (
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',color:'var(--text3)'}}>
                            <a href="/login" style={{color:'var(--accent2)',textDecoration:'none'}}>Connecte-toi</a> pour envoyer une suggestion
                          </div>
                        ) : (
                          <>
                            <input className="req-input" placeholder="Nom de la filière *" value={filReqName} onChange={e => setFilReqName(e.target.value)} />
                            <div>
                              <button className="req-send" onClick={handleFilRequest} disabled={!filReqName.trim() || filReqBusy}>
                                {filReqBusy ? '...' : 'Envoyer'}
                              </button>
                              <button className="req-cancel" onClick={() => { setShowEmptyFilForm(false); setFilReqName(''); }}>Annuler</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {filReqSent && <div className="req-ok" style={{marginTop:'0.75rem'}}>✓ Filière ajoutée !</div>}
                  </div>
                ) : (
                  <div className="empty">
                    <div className="empty-code">// 0 results</div>
                    <div className="empty-title">Aucun module trouvé</div>
                    <div className="empty-sub">Modifie ta recherche ou réinitialise les filtres</div>
                  </div>
                )
              ) : displayed.map(m => (
                <div key={m.id} className="mod-card" onClick={() => navigate(`/module/${m.slug || m.id}`)}>
                  <div className="mod-top">
                    <span className="mod-sem">{m.semester}</span>
                    <span className={`mod-type-tag ${m.type==='projet'?'tag-projet':'tag-cours'}`}>
                      {m.type}
                    </span>
                  </div>
                  <div className="mod-name">{m.name}</div>
                  <div className="mod-path">
                    {m.filieres?.faculties?.name && m.filieres.faculties.name !== '__root__'
                      ? `${m.filieres?.name} · ${m.filieres.faculties.name}`
                      : m.filieres?.name}
                  </div>
                  <div className="mod-footer">
                    <span className="mod-docs">{m.filieres?.faculties?.universities?.name || ''}</span>
                    <span className="mod-arr">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {showScrollHint && <div className="scroll-hint">👇 Voir les résultats</div>}

      {/* Mobile floating filter button */}
      <button className="mob-filter-btn" onClick={() => setShowDrawer(true)}>
        ⚙ Filtres
        {activeFilterCount > 0 && <span className="mob-badge">{activeFilterCount}</span>}
      </button>

      {/* Mobile filter drawer */}
      {showDrawer && (
        <>
          <div className="mob-overlay" onClick={() => setShowDrawer(false)} />
          <div className="mob-drawer">
            <div className="mob-handle" />
            <div className="mob-drawer-head">
              <span className="mob-drawer-title">// Filtres</span>
              <button className="mob-drawer-reset" onClick={() => { reset(); setShowDrawer(false) }}>Tout effacer</button>
            </div>

            <div className="filter-block">
              <span className="filter-label">Université</span>
              <div className="uni-wrap">
                <input className="uni-input"
                  placeholder="Toutes les universités"
                  value={selUni ? (unis.find(u => String(u.id) === selUni)?.name ?? uniSearch) : uniSearch}
                  onChange={e => { setUniSearch(e.target.value); setSelUni(''); setShowUniDd(true) }}
                  onFocus={() => setShowUniDd(true)}
                  onBlur={() => setTimeout(() => setShowUniDd(false), 150)} />
                {showUniDd && (
                  <div className="uni-dd">
                    <div className="uni-dd-item reset" onMouseDown={() => { setSelUni(''); setUniSearch(''); setShowUniDd(false) }}>Toutes les universités</div>
                    {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).map(u => (
                      <div key={u.id} className="uni-dd-item"
                        onMouseDown={() => { setSelUni(String(u.id)); setUniSearch(u.name); setShowUniDd(false) }}>
                        {u.name}
                      </div>
                    ))}
                    {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).length === 0 && (
                      <div className="uni-dd-empty">Aucun résultat</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {fils.length > 0 && (
              <div className="filter-block">
                <span className="filter-label">Filière</span>
                <select className="filter-select" value={selFil} onChange={e => setSelFil(e.target.value)}>
                  <option value="">Toutes les filières</option>
                  {fils.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}

            <div className="filter-block">
              <span className="filter-label">Semestre</span>
              <div className="sem-wrap">
                {['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'].map(s => (
                  <button key={s} className={`sem-btn ${selSem===s?'on':''}`}
                    onClick={() => setSelSem(selSem===s?'':s)}>{s}</button>
                ))}
              </div>
            </div>

            <div className="filter-block">
              <span className="filter-label">Type de document</span>
              <div className="type-wrap">
                {DOC_TYPES.map(t => (
                  <div key={t.k} className={`type-row ${selType===t.k?'on':''}`}
                    onClick={() => setSelType(selType===t.k?'':t.k)}>
                    <div className="type-dot" />
                    <span className="type-name">{t.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="mob-apply" onClick={() => {
              setShowDrawer(false)
              setShowScrollHint(true)
              setTimeout(() => setShowScrollHint(false), 1500)
              setTimeout(() => {
                const el = document.getElementById('browse-results')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }}>
              Appliquer{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </>
      )}
    </div>
  )
}