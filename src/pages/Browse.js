import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

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
  .sidebar-reset { font-size:0.7rem; color:var(--text3); background:none; border:none; cursor:pointer; font-family:'DM Mono',monospace; transition:color 0.15s; padding:0; }
  .sidebar-reset:hover { color:var(--accent2); }

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
    .layout { flex-direction:column; height:auto; overflow:visible; }
    .sidebar { width:100%; height:auto; max-height:none; border-right:none; border-bottom:1px solid var(--border); padding:1rem; overflow-x:auto; overflow-y:visible; display:flex; flex-wrap:wrap; align-items:flex-start; gap:12px; }
    .sidebar-header { width:100%; margin-bottom:0; padding-bottom:0; border-bottom:none; }
    .filter-block { min-width:150px; flex:1; margin-bottom:0; }
    .sidebar-divider { display:none; }
    .main { height:auto; overflow:visible; }
    .topbar { padding:0.75rem 1rem; flex-wrap:wrap; gap:8px; }
    .breadcrumb { padding:0.5rem 1rem; }
    .results-bar { padding:0.5rem 1rem; }
    .grid-wrap { padding:0 1rem 1rem; }
    .modules-grid { grid-template-columns:1fr 1fr; }
  }
  @media(max-width:480px) {
    .sidebar { gap:8px; }
    .filter-block { min-width:100%; }
    .modules-grid { grid-template-columns:1fr; }
    .search-prompt { display:none; }
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
  const [sp] = useSearchParams()

  const [query,   setQuery]   = useState(sp.get('q') || '')
  const [unis,    setUnis]    = useState([])
  const [facs,    setFacs]    = useState([])
  const [fils,    setFils]    = useState([])
  const [mods,    setMods]    = useState([])
  const [loading, setLoading] = useState(true)

  const [selUni,  setSelUni]  = useState(sp.get('uni') || '')
  const [selFac,  setSelFac]  = useState('')
  const [selFil,  setSelFil]  = useState('')
  const [selSem,  setSelSem]  = useState('')
  const [selType, setSelType] = useState('')
  const [fetchErr, setFetchErr] = useState('')

  // Load universities once
  useEffect(() => {
    document.title = 'Explorer les modules — 9rawZid9ra'
    supabase.from('universities').select('*').order('name')
      .then(({ data }) => setUnis(data || []))
  }, [])

  // Load faculties when uni changes
  useEffect(() => {
    if (!selUni) { setFacs([]); setSelFac(''); return }
    supabase.from('faculties').select('*').eq('university_id', selUni).order('name')
      .then(({ data }) => setFacs(data || []))
    setSelFac(''); setSelFil('')
  }, [selUni])

  // Load filieres when fac changes
  useEffect(() => {
    if (!selFac) { setFils([]); setSelFil(''); return }
    supabase.from('filieres').select('*').eq('faculty_id', selFac).order('name')
      .then(({ data }) => setFils(data || []))
    setSelFil('')
  }, [selFac])

  // Load modules — runs on mount AND when filters change
  const loadModules = useCallback(async () => {
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
      if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)

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
  }, [selUni, selFac, selFil, selSem, query, selType])

  useEffect(() => { loadModules() }, [loadModules])

  const reset = () => {
    setSelUni(''); setSelFac(''); setSelFil(''); setSelSem(''); setSelType(''); setQuery('')
  }

  const displayed = mods
  const uniName  = unis.find(u => u.id === parseInt(selUni))?.name
  const facName  = facs.find(f => f.id === parseInt(selFac))?.name
  const filName  = fils.find(f => f.id === parseInt(selFil))?.name
  const typeName = DOC_TYPES.find(t => t.k === selType)?.l
  const hasFilters = selUni || selFac || selFil || selSem || selType || query

  return (
    <div className="browse">
      <style>{css}</style>
      <Navbar activePage="browse" />

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">// filtres</span>
            <button className="sidebar-reset" onClick={reset}>reset</button>
          </div>

          <div className="filter-block">
            <span className="filter-label">Université</span>
            <select className="filter-select" value={selUni} onChange={e => setSelUni(e.target.value)}>
              <option value="">Toutes les universités</option>
              {unis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {facs.length > 0 && (
            <div className="filter-block">
              <span className="filter-label">Faculté / École</span>
              <select className="filter-select" value={selFac} onChange={e => setSelFac(e.target.value)}>
                <option value="">Toutes les facultés</option>
                {facs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {fils.length > 0 && (
            <div className="filter-block">
              <span className="filter-label">Filière</span>
              <select className="filter-select" value={selFil} onChange={e => setSelFil(e.target.value)}>
                <option value="">Toutes les filières</option>
                {fils.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
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
                onKeyDown={e => e.key === 'Enter' && loadModules()} />
            </div>
            <button className="search-btn" onClick={loadModules}>Rechercher</button>
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
          <div className="results-bar">
            <span className="results-info">
              <b>{displayed.length}</b> module{displayed.length!==1?'s':''} trouvé{displayed.length!==1?'s':''}
              {!hasFilters && <span style={{color:'var(--text3)'}}> — tous les modules</span>}
            </span>
            {hasFilters && (
              <button className="clear-btn" onClick={reset}>effacer les filtres</button>
            )}
          </div>

          <div className="grid-wrap">
            <div className="modules-grid">
              {loading ? (
                Array(12).fill(0).map((_,i) => <div key={i} className="skel" />)
              ) : displayed.length === 0 ? (
                <div className="empty">
                  <div className="empty-code">// 0 results</div>
                  <div className="empty-title">Aucun module trouvé</div>
                  <div className="empty-sub">Modifie ta recherche ou réinitialise les filtres</div>
                </div>
              ) : displayed.map(m => (
                <div key={m.id} className="mod-card" onClick={() => navigate(`/module/${m.id}`)}>
                  <div className="mod-top">
                    <span className="mod-sem">{m.semester}</span>
                    <span className={`mod-type-tag ${m.type==='projet'?'tag-projet':'tag-cours'}`}>
                      {m.type}
                    </span>
                  </div>
                  <div className="mod-name">{m.name}</div>
                  <div className="mod-path">
                    {m.filieres?.name} · {m.filieres?.faculties?.name}
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
    </div>
  )
}