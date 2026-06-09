import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  :root {
    --bg:       #02040A;
    --surface:  #070C18;
    --s2:       #0C1222;
    --s3:       #111827;
    --border:   #1C2A45;
    --borderhi: #2D4A7A;
    --accent:   #4F8EF7;
    --accent2:  #7BB3FF;
    --teal:     #2DD4BF;
    --teal2:    #5EEAD4;
    --red:      #F87171;
    --yellow:   #FBD34D;
    --text:     #E2E8F0;
    --text2:    #94A3B8;
    --text3:    #4A5568;
    --white:    #FFFFFF;
  }

  html, body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; }
  .page { min-height: 100vh; display: flex; flex-direction: column; }

  /* ─── BREADCRUMB STRIP ─── */
  .breadcrumb-strip {
    display: flex; align-items: center; gap: 6px;
    padding: 0.6rem 2.5rem;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .bc { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--text3); cursor: pointer; transition: color 0.15s; }
  .bc:hover { color: var(--accent2); }
  .bc-sep { font-size: 0.68rem; color: var(--text3); }
  .bc-active { color: var(--text2); cursor: default; }
  .bc-active:hover { color: var(--text2); }

  /* ─── HERO STRIP ─── */
  .mod-hero {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 2rem 2.5rem;
    position: relative; overflow: hidden;
  }
  .mod-hero::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent) 30%, var(--teal) 70%, transparent);
  }
  .mod-hero::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 50% 100% at 100% 50%, rgba(79,142,247,0.05) 0%, transparent 60%);
    pointer-events: none;
  }
  .mod-hero-inner { max-width: 1000px; position: relative; z-index: 1; }
  .mod-tags { display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; }
  .mod-tag {
    font-family: 'DM Mono', monospace; font-size: 0.62rem;
    padding: 3px 10px; border-radius: 4px; letter-spacing: 0.5px;
  }
  .tag-sem  { background: rgba(79,142,247,0.1); color: var(--accent2); border: 1px solid rgba(79,142,247,0.2); }
  .tag-fil  { background: rgba(45,212,191,0.08); color: var(--teal2); border: 1px solid rgba(45,212,191,0.15); }
  .tag-uni  { background: rgba(255,255,255,0.04); color: var(--text3); border: 1px solid var(--border); }
  .mod-name {
    font-size: 2rem; font-weight: 700; color: var(--white);
    letter-spacing: -0.75px; line-height: 1.2; margin-bottom: 1.25rem;
  }
  .mod-meta { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
  .mod-meta-item { display: flex; align-items: center; gap: 6px; }
  .mod-meta-label { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: var(--text3); }
  .mod-meta-val { font-size: 0.82rem; color: var(--text2); font-weight: 500; }

  /* ─── LAYOUT ─── */
  .layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0;
    max-width: 1300px;
    margin: 0 auto;
    padding: 2rem 2.5rem;
    gap: 2rem;
    flex: 1;
    width: 100%;
  }

  /* ─── MAIN CONTENT ─── */
  .main { min-width: 0; }

  /* Filter tabs */
  .filter-tabs {
    display: flex; align-items: center; gap: 4px; flex-wrap: nowrap;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 4px;
    margin-bottom: 1.5rem; width: 100%;
    overflow-x: auto; overflow-y: hidden; white-space: nowrap;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .filter-tabs::-webkit-scrollbar { display: none; }
  .filter-tab {
    padding: 6px 16px; border-radius: 7px; font-size: 0.8rem; font-weight: 500;
    color: var(--text2); cursor: pointer; transition: all 0.15s;
    background: none; border: none; font-family: 'Outfit', sans-serif;
    white-space: nowrap; flex-shrink: 0;
  }
  .filter-tab:hover { color: var(--text); background: var(--s2); }
  .filter-tab.on { background: var(--s3); color: var(--white); }

  /* Doc list */
  .doc-list { display: flex; flex-direction: column; gap: 8px; }

  .doc-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem 1.25rem;
    display: flex; align-items: center; gap: 1rem;
    transition: all 0.15s; cursor: pointer; position: relative; overflow: hidden;
  }
  .doc-card::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: linear-gradient(180deg, var(--accent), var(--teal));
    transform: scaleY(0); transform-origin: top;
    transition: transform 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  .doc-card:hover { border-color: var(--borderhi); background: var(--s2); }
  .doc-card:hover::before { transform: scaleY(1); }

  .doc-icon {
    width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Mono', monospace; font-size: 0.6rem; font-weight: 500;
    letter-spacing: 0.5px;
  }
  .icon-examen { background: rgba(248,113,113,0.08); color: var(--red); border: 1px solid rgba(248,113,113,0.15); }
  .icon-cc     { background: rgba(251,211,77,0.08); color: var(--yellow); border: 1px solid rgba(251,211,77,0.15); }
  .icon-td     { background: rgba(79,142,247,0.08); color: var(--accent2); border: 1px solid rgba(79,142,247,0.15); }
  .icon-tp     { background: rgba(45,212,191,0.08); color: var(--teal2); border: 1px solid rgba(45,212,191,0.15); }
  .icon-quiz   { background: rgba(167,139,250,0.08); color: #C4B5FD; border: 1px solid rgba(167,139,250,0.15); }
  .icon-cours  { background: rgba(94,234,212,0.08); color: var(--teal2); border: 1px solid rgba(94,234,212,0.15); }

  .doc-info { flex: 1; min-width: 0; }
  .doc-title {
    font-size: 0.9rem; font-weight: 600; color: var(--white);
    margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .doc-sub {
    display: flex; align-items: center; gap: 10px;
    font-family: 'DM Mono', monospace; font-size: 0.65rem; color: var(--text3);
  }
  .doc-sub-sep { color: var(--border); }

  .doc-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .doc-pages { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: var(--text3); }
  .doc-dl-btn {
    background: rgba(79,142,247,0.08); border: 1px solid rgba(79,142,247,0.2);
    color: var(--accent2); border-radius: 7px; padding: 6px 14px;
    font-size: 0.75rem; font-weight: 600; cursor: pointer;
    font-family: 'Outfit', sans-serif; transition: all 0.15s; white-space: nowrap;
  }
  .doc-dl-btn:hover { background: rgba(79,142,247,0.15); border-color: var(--accent); }

  /* Empty state */
  .empty {
    text-align: center; padding: 4rem 2rem;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; border-style: dashed;
  }
  .empty-code { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--text3); margin-bottom: 1rem; }
  .empty-title { font-size: 1rem; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
  .empty-sub { font-size: 0.82rem; color: var(--text3); margin-bottom: 1.5rem; }
  .empty-upload-btn {
    background: var(--accent); color: var(--white); border: none;
    border-radius: 8px; padding: 10px 24px; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s;
  }
  .empty-upload-btn:hover { background: #3A7BEF; transform: translateY(-1px); }

  /* Skeleton */
  .skel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; height: 72px; animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:0.35} 50%{opacity:0.7} }

  /* ─── SIDEBAR ─── */
  .aside { display: flex; flex-direction: column; gap: 1rem; }

  .aside-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; overflow: hidden;
  }
  .aside-card-header {
    padding: 0.875rem 1.1rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .aside-card-title {
    font-family: 'DM Mono', monospace; font-size: 0.65rem;
    color: var(--text3); letter-spacing: 1.5px; text-transform: uppercase;
  }
  .aside-card-body { padding: 1.1rem; }

  /* Upload card */
  .upload-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.25rem;
    position: relative; overflow: hidden;
  }
  .upload-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, var(--accent), var(--teal));
  }
  .upload-card-title {
    font-size: 0.9rem; font-weight: 600; color: var(--white); margin-bottom: 6px;
  }
  .upload-card-desc {
    font-size: 0.78rem; color: var(--text2); line-height: 1.6; margin-bottom: 1rem;
  }
  .upload-card-btn {
    width: 100%; background: linear-gradient(135deg, var(--accent), #3A6ED4);
    color: var(--white); border: none; border-radius: 8px;
    padding: 10px; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s;
    position: relative; overflow: hidden;
  }
  .upload-card-btn::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
  }
  .upload-card-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,142,247,0.4); }

  /* Info rows */
  .info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0; border-bottom: 1px solid var(--border);
  }
  .info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .info-row:first-child { padding-top: 0; }
  .info-key { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: var(--text3); }
  .info-val { font-size: 0.8rem; color: var(--text2); font-weight: 500; text-align: right; max-width: 60%; }

  /* Type breakdown */
  .type-rows { display: flex; flex-direction: column; gap: 6px; }
  .type-stat { display: flex; align-items: center; gap: 8px; }
  .type-stat-label { font-size: 0.75rem; color: var(--text2); flex: 1; }
  .type-stat-count {
    font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--text3);
    min-width: 24px; text-align: right;
  }
  .type-stat-bar-wrap { width: 60px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .type-stat-bar {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, var(--accent), var(--teal));
    transition: width 0.4s ease;
  }

  /* Related modules */
  .related-list { display: flex; flex-direction: column; gap: 4px; }
  .related-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 8px; cursor: pointer;
    transition: background 0.15s; border: 1px solid transparent;
  }
  .related-item:hover { background: var(--s2); border-color: var(--border); }
  .related-sem {
    font-family: 'DM Mono', monospace; font-size: 0.6rem; color: var(--accent);
    background: rgba(79,142,247,0.08); padding: 2px 6px; border-radius: 3px;
    flex-shrink: 0;
  }
  .related-name { font-size: 0.8rem; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  @media(max-width:900px) {
    .layout { grid-template-columns:1fr; padding:1.25rem; gap:1.25rem; }
    .aside { display:none; }
  }
  @media(max-width:768px) {
    .breadcrumb-strip { padding:0.5rem 1rem; }
    .mod-hero { padding:1.5rem 1rem; }
    .mod-name { font-size:1.5rem; }
    .mod-meta { gap:1rem; }
    .layout { padding:1rem; }
    .filter-tabs { padding:3px; }
  }
  @media(max-width:480px) {
    .mod-name { font-size:1.25rem; }
    .mod-tags { flex-wrap:wrap; }
    .mod-meta { flex-direction:column; gap:0.5rem; align-items:flex-start; }
  }
`

const TYPE_CONFIG = {
  examen:         { label:'EXAM',  cls:'icon-examen', full:'Examen Final'    },
  cc:             { label:'CC',    cls:'icon-cc',     full:'Contrôle Continu'},
  td:             { label:'TD',    cls:'icon-td',     full:'Travail Dirigé'  },
  tp:             { label:'TP',    cls:'icon-tp',     full:'Travail Pratique'},
  cours:          { label:'COURS', cls:'icon-cours',  full:'Cours'           },
  corrige_examen: { label:'COR.E', cls:'icon-cc',     full:'Corrigé Examen'  },
  corrige_td:     { label:'C.TD',  cls:'icon-td',     full:'Corrigé TD'      },
  corrige_tp:     { label:'C.TP',  cls:'icon-tp',     full:'Corrigé TP'      },
  quiz:           { label:'QUIZ',  cls:'icon-quiz',   full:'Quiz / Interro'  },
  projet_final:   { label:'PROJ',  cls:'icon-examen', full:'Projet Final'    },
}

const TABS = [
  { k:'all',            l:'Tous'          },
  { k:'examen',         l:'Examens'       },
  { k:'corrige_examen', l:'Corrigés exam' },
  { k:'cc',             l:'CC'            },
  { k:'td',             l:'TD'            },
  { k:'corrige_td',     l:'Corrigés TD'   },
  { k:'tp',             l:'TP'            },
  { k:'corrige_tp',     l:'Corrigés TP'   },
  { k:'cours',          l:'Cours'         },
  { k:'quiz',           l:'Quiz'          },
  { k:'projet_final',   l:'Projet Final'  },
]

export default function ModulePage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [mod,          setMod]          = useState(null)
  const [docs,         setDocs]         = useState([])
  const [related,      setRelated]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState('all')
  const [senpaiPosts,  setSenpaiPosts]  = useState([])
  const [user,         setUser]         = useState(null)
  const [userReactions,setUserReactions]= useState({})
  const [isBookmarked, setIsBookmarked] = useState(false)
  const docsRef = useRef([])
  const [requests,     setRequests]     = useState({})
  const [userRequested,setUserRequested]= useState({})

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)

      // Load module with full path
      const { data: m } = await supabase
        .from('modules')
        .select(`*, filieres(name, total_semesters, faculty_id, faculties(name, universities(name)))`)
        .eq('id', parseInt(id))
        .single()

      setMod(m)

      // Load documents (with uploader name)
      const { data: d } = await supabase
        .from('documents')
        .select('*, user_profiles!uploader_id(name)')
        .eq('module_id', parseInt(id))
        .order('created_at', { ascending: false })
      setDocs(d || [])
      docsRef.current = d || []

      // Bookmark status
      if (u && m) {
        const { data: bm } = await supabase.from('module_bookmarks')
          .select('id').eq('user_id', u.id).eq('module_id', parseInt(id)).maybeSingle()
        setIsBookmarked(!!bm)
      }

      // User reactions for documents
      if (u && (d || []).length > 0) {
        const { data: rxns } = await supabase.from('document_reactions')
          .select('*').eq('user_id', u.id).in('document_id', d.map(doc => doc.id))
        const rxnMap = {}
        rxns?.forEach(r => {
          if (!rxnMap[r.document_id]) rxnMap[r.document_id] = {}
          if (r.reaction_type === 'helpful') rxnMap[r.document_id].helpful = true
          if (r.reaction_type === 'rating')  rxnMap[r.document_id].rating  = r.rating
          if (r.reaction_type === 'report')  rxnMap[r.document_id].reported = true
        })
        setUserReactions(rxnMap)
      }

      // Document requests for this module
      const { data: reqs } = await supabase.from('document_requests')
        .select('*, document_request_votes(user_id)')
        .eq('module_id', parseInt(id)).eq('status', 'open')
      const reqMap = {}; const userReqMap = {}
      reqs?.forEach(r => {
        reqMap[r.doc_type] = r
        userReqMap[r.doc_type] = r.document_request_votes?.some(v => v.user_id === u?.id) || false
      })
      setRequests(reqMap)
      setUserRequested(userReqMap)

      // Related modules (same filière)
      if (m) {
        const { data: rel } = await supabase
          .from('modules')
          .select('id, name, semester')
          .eq('filiere_id', m.filiere_id)
          .neq('id', parseInt(id))
          .limit(6)
        setRelated(rel || [])
      }

      setLoading(false)

      supabase.from('senpai_posts')
        .select('*, user_profiles(name, universities(name)), senpai_votes(user_id)')
        .eq('module_id', parseInt(id))
        .eq('is_approved', true)
        .order('helpful_count', { ascending: false })
        .limit(3)
        .then(({ data }) => setSenpaiPosts(data || []))
    }
    load()
  }, [id])

  // real-time: new docs uploaded to this module appear instantly
  useEffect(() => {
    const channel = supabase
      .channel(`module-docs-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, async payload => {
        if (String(payload.new.module_id) !== String(id)) return
        const { data } = await supabase
          .from('documents').select('*, user_profiles!uploader_id(name)').eq('id', payload.new.id).single()
        if (data) setDocs(prev => prev.some(d => d.id === data.id) ? prev : [data, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documents' }, payload => {
        if (String(payload.new.module_id) !== String(id)) return
        setDocs(prev => prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  // reload user reactions when auth state changes (e.g. user logs back in mid-session)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        // re-fetch full docs to get current helpful_count from DB
        const { data: freshDocs } = await supabase.from('documents')
          .select('*, user_profiles!uploader_id(name)')
          .eq('module_id', parseInt(id))
          .order('created_at', { ascending: false })
        if (freshDocs) { setDocs(freshDocs); docsRef.current = freshDocs }
        const currentDocs = freshDocs || docsRef.current
        if (currentDocs.length === 0) return
        const { data: rxns } = await supabase.from('document_reactions')
          .select('*').eq('user_id', session.user.id).in('document_id', currentDocs.map(d => d.id))
        const rxnMap = {}
        rxns?.forEach(r => {
          if (!rxnMap[r.document_id]) rxnMap[r.document_id] = {}
          if (r.reaction_type === 'helpful') rxnMap[r.document_id].helpful = true
          if (r.reaction_type === 'rating')  rxnMap[r.document_id].rating  = r.rating
          if (r.reaction_type === 'report')  rxnMap[r.document_id].reported = true
        })
        setUserReactions(rxnMap)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserReactions({})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const GROUP_ORDER = ['examen','cc','td','tp','cours','corrige_examen','corrige_td','corrige_tp','quiz','projet_final']

  const tabDocs = activeTab === 'all' ? docs : docs.filter(d => d.doc_type === activeTab)

  const grouped = GROUP_ORDER.reduce((acc, type) => {
    const group = tabDocs.filter(d => d.doc_type === type)
    if (group.length > 0) {
      acc[type] = [...group].sort((a, b) => {
        if (['examen','cc','corrige_examen'].includes(type)) {
          return (b.academic_year || '').localeCompare(a.academic_year || '')
        }
        return (a.doc_number || '').localeCompare(b.doc_number || '', undefined, { numeric: true })
      })
    }
    return acc
  }, {})

  const displayed = tabDocs

  const typeCounts = Object.keys(TYPE_CONFIG).reduce((acc, k) => {
    acc[k] = docs.filter(d => d.doc_type === k).length
    return acc
  }, {})

  const maxCount = Math.max(...Object.values(typeCounts), 1)

  const handleDownload = async (doc) => {
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login', { state: { from: `/module/${doc.module_id}` } }); return }

    // Log download
    await supabase.from('downloads_log').insert({ user_id: user.id, document_id: doc.id })
    await supabase.from('documents').update({ downloads: (doc.downloads || 0) + 1 }).eq('id', doc.id)

    // Open file
    if (doc.files && doc.files.length > 0) {
      window.open(doc.files[0], '_blank')
    }
  }

  // ── HELPFUL ──────────────────────────────────────────────────────────────
  const handleHelpful = async (doc) => {
    if (!user) { navigate('/login', { state: { from: `/module/${id}` } }); return }
    const isH = userReactions[doc.id]?.helpful
    console.log('[handleHelpful] START — doc.id:', doc.id, '| isH (removing?):', isH, '| user.id:', user.id)

    // optimistic UI
    setUserReactions(p => ({ ...p, [doc.id]: { ...p[doc.id], helpful: !isH } }))
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, helpful_count: Math.max(0, (d.helpful_count || 0) + (isH ? -1 : 1)) } : d))

    // DB write — trigger trg_doc_helpful_count (SECURITY DEFINER) auto-updates documents.helpful_count
    if (isH) {
      const { error: delErr } = await supabase.from('document_reactions').delete().eq('user_id', user.id).eq('document_id', doc.id).eq('reaction_type', 'helpful')
      console.log('[handleHelpful] DELETE reaction — error:', delErr)
    } else {
      const { data: insData, error: insErr } = await supabase.from('document_reactions').insert({ user_id: user.id, document_id: doc.id, reaction_type: 'helpful' }).select()
      console.log('[handleHelpful] INSERT reaction — data:', insData, '| error:', insErr)
    }

    // fetch true count from documents (trigger already updated it) to correct optimistic UI
    const { data: freshDoc, error: selErr } = await supabase.from('documents').select('helpful_count').eq('id', doc.id).single()
    console.log('[handleHelpful] SELECT documents.helpful_count — freshDoc:', freshDoc, '| error:', selErr)
    if (freshDoc) setDocs(p => p.map(d => d.id === doc.id ? { ...d, helpful_count: freshDoc.helpful_count } : d))
    console.log('[handleHelpful] DONE — final helpful_count set to:', freshDoc?.helpful_count)
  }

  // ── RATING ────────────────────────────────────────────────────────────────
  const handleRating = async (doc, star) => {
    if (!user) { navigate('/login', { state: { from: `/module/${id}` } }); return }
    const prev = userReactions[doc.id]?.rating || 0
    await supabase.from('document_reactions')
      .upsert({ user_id: user.id, document_id: doc.id, reaction_type: 'rating', rating: star },
        { onConflict: 'user_id,document_id,reaction_type' })
    const newSum   = (doc.rating_sum || 0) - prev + star
    const newCount = prev === 0 ? (doc.rating_count || 0) + 1 : (doc.rating_count || 0)
    await supabase.from('documents').update({ rating_sum: newSum, rating_count: newCount }).eq('id', doc.id)
    setUserReactions(p => ({ ...p, [doc.id]: { ...p[doc.id], rating: star } }))
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, rating_sum: newSum, rating_count: newCount } : d))
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  const handleReport = async (doc) => {
    if (!user) { navigate('/login', { state: { from: `/module/${id}` } }); return }
    if (userReactions[doc.id]?.reported) return
    await supabase.from('document_reactions').insert({ user_id: user.id, document_id: doc.id, reaction_type: 'report' })
    await supabase.from('documents').update({ report_count: (doc.report_count || 0) + 1 }).eq('id', doc.id)
    setUserReactions(p => ({ ...p, [doc.id]: { ...p[doc.id], reported: true } }))
  }

  // ── BOOKMARK ──────────────────────────────────────────────────────────────
  const handleBookmark = async () => {
    if (!user) { navigate('/login', { state: { from: `/module/${id}` } }); return }
    if (isBookmarked) {
      await supabase.from('module_bookmarks').delete().eq('user_id', user.id).eq('module_id', parseInt(id))
      setIsBookmarked(false)
    } else {
      await supabase.from('module_bookmarks').insert({ user_id: user.id, module_id: parseInt(id) })
      setIsBookmarked(true)
    }
  }

  // ── DOCUMENT REQUEST ──────────────────────────────────────────────────────
  const handleRequest = async (docType) => {
    if (!user) { navigate('/login', { state: { from: `/module/${id}` } }); return }
    const existing = requests[docType]
    if (existing) {
      if (userRequested[docType]) return
      await supabase.from('document_request_votes').insert({ user_id: user.id, request_id: existing.id })
      const newVotes = (existing.votes || 0) + 1
      await supabase.from('document_requests').update({ votes: newVotes }).eq('id', existing.id)
      if (newVotes >= 5 && mod?.filiere_id) {
        const { data: filUploaders } = await supabase.rpc('get_top_uploaders_in_filiere',
          { filiere_id_param: mod.filiere_id, limit_param: 3 })
        const uids = (filUploaders || []).map(u => u.user_id).filter(uid => uid !== user.id)
        for (const uid of uids) {
          await supabase.from('notifications').insert({
            user_id: uid, type: 'doc_request', actor_id: user.id,
            post_title: `${newVotes} étudiants demandent un(e) ${TYPE_CONFIG[docType]?.full || docType} pour ${mod?.name}`,
          })
        }
      }
      setRequests(p => ({ ...p, [docType]: { ...existing, votes: newVotes } }))
      setUserRequested(p => ({ ...p, [docType]: true }))
    } else {
      const { data: newReq } = await supabase.from('document_requests')
        .insert({ user_id: user.id, module_id: parseInt(id), doc_type: docType, votes: 1, status: 'open' })
        .select().single()
      if (newReq) {
        await supabase.from('document_request_votes').insert({ user_id: user.id, request_id: newReq.id })
        setRequests(p => ({ ...p, [docType]: newReq }))
        setUserRequested(p => ({ ...p, [docType]: true }))
      }
    }
  }

  if (loading) return (
    <div className="page">
      <style>{css}</style>
      <Navbar />
      <div style={{ padding: '4rem 2.5rem', maxWidth: 1000, margin: '0 auto' }}>
        <div className="skel" style={{ height: 120, marginBottom: 16 }} />
        <div className="skel" style={{ height: 72, marginBottom: 8 }} />
        <div className="skel" style={{ height: 72, marginBottom: 8 }} />
        <div className="skel" style={{ height: 72 }} />
      </div>
    </div>
  )

  if (!mod) return (
    <div className="page">
      <style>{css}</style>
      <Navbar />
      <div style={{ padding: '4rem 2.5rem', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '1rem' }}>
          // 404 — module not found
        </div>
        <button
          style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px', padding:'9px 22px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
          onClick={() => navigate('/browse')}
        >
          Retour à l'explorateur
        </button>
      </div>
    </div>
  )

  const uniName = mod.filieres?.faculties?.universities?.name
  const facName = mod.filieres?.faculties?.name
  const filName = mod.filieres?.name

  return (
    <div className="page">
      <style>{css}</style>

      <Navbar />

      {/* BREADCRUMB */}
      <div className="breadcrumb-strip">
        <span className="bc" onClick={() => navigate('/browse')}>modules</span>
        {uniName && <><span className="bc-sep">/</span><span className="bc" onClick={() => navigate(`/browse?uni=${mod.filieres?.faculties?.university_id}`)}>{uniName}</span></>}
        {facName && <><span className="bc-sep">/</span><span className="bc">{facName}</span></>}
        {filName && <><span className="bc-sep">/</span><span className="bc">{filName}</span></>}
        <span className="bc-sep">/</span>
        <span className="bc bc-active">{mod.name}</span>
      </div>

      {/* MODULE HERO */}
      <div className="mod-hero">
        <div className="mod-hero-inner">
          <div className="mod-tags">
            <span className="mod-tag tag-sem">{mod.semester}</span>
            {filName && <span className="mod-tag tag-fil">{filName}</span>}
            {uniName && <span className="mod-tag tag-uni">{uniName}</span>}
          </div>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:'1.25rem' }}>
            <h1 className="mod-name" style={{ marginBottom:0, flex:1 }}>{mod.name}</h1>
            <button
              onClick={handleBookmark}
              title={isBookmarked ? 'Retirer des favoris' : 'Sauvegarder ce module'}
              style={{ marginTop:8, flexShrink:0, background: isBookmarked ? 'rgba(45,212,191,0.12)' : 'rgba(79,142,247,0.08)', border:`1px solid ${isBookmarked ? '#2DD4BF' : 'rgba(79,142,247,0.35)'}`, color: isBookmarked ? '#2DD4BF' : '#7BB3FF', borderRadius:8, padding:'7px 14px', cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:6, fontSize:'0.8rem', fontWeight:600, fontFamily:'Outfit,sans-serif' }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill={isBookmarked ? '#2DD4BF' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              {isBookmarked ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
          <div className="mod-meta">
            <div className="mod-meta-item">
              <span className="mod-meta-label">DOCUMENTS</span>
              <span className="mod-meta-val">{docs.length}</span>
            </div>
            <div className="mod-meta-item">
              <span className="mod-meta-label">SEMESTRE</span>
              <span className="mod-meta-val">{mod.semester}</span>
            </div>
            <div className="mod-meta-item">
              <span className="mod-meta-label">FACULTÉ</span>
              <span className="mod-meta-val">{facName || '—'}</span>
            </div>
            <div className="mod-meta-item">
              <span className="mod-meta-label">STATUT</span>
              <span className="mod-meta-val" style={{ color: 'var(--teal2)' }}>Gratuit</span>
            </div>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="layout">
        {/* MAIN */}
        <div className="main">
          {/* Tabs */}
          <div style={{ position:'relative', overflow:'hidden', marginBottom:'1.5rem' }}>
            <div className="filter-tabs" style={{ marginBottom:0 }}>
              {TABS.map(t => (
                <button key={t.k} className={`filter-tab ${activeTab===t.k?'on':''}`}
                  onClick={() => setActiveTab(t.k)}>
                  {t.l}
                  {t.k !== 'all' && typeCounts[t.k] > 0 && (
                    <span style={{ marginLeft: 6, fontSize: '0.65rem', opacity: 0.6 }}>
                      {typeCounts[t.k]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:40, background:'linear-gradient(to right, transparent, #070C18)', pointerEvents:'none' }} />
          </div>

          {/* Document list */}
          <div className="doc-list">
            {displayed.length === 0 ? (
              activeTab !== 'all' ? (
                <div style={{ border:'1px dashed #1C2A45', borderRadius:12, padding:'24px 20px', textAlign:'center', background:'rgba(79,142,247,0.03)' }}>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'#4A5568', letterSpacing:'2px', marginBottom:8 }}>
                    // aucun {TYPE_CONFIG[activeTab]?.full || activeTab} disponible
                  </div>
                  <div style={{ fontSize:'0.95rem', fontWeight:600, color:'#E2E8F0', marginBottom:6 }}>
                    Ce document n'existe pas encore
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'#4A5568', marginBottom:16 }}>
                    {requests[activeTab]
                      ? `${requests[activeTab].votes} étudiant${requests[activeTab].votes > 1 ? 's' : ''} ont déjà demandé ce document`
                      : 'Sois le premier à demander ce document à la communauté !'}
                  </div>
                  <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                    <button
                      onClick={() => handleRequest(activeTab)}
                      disabled={userRequested[activeTab]}
                      style={{ background: userRequested[activeTab] ? 'rgba(45,212,191,0.1)' : 'rgba(79,142,247,0.12)', border:`1px solid ${userRequested[activeTab] ? 'rgba(45,212,191,0.3)' : 'rgba(79,142,247,0.3)'}`, color: userRequested[activeTab] ? '#2DD4BF' : '#7BB3FF', borderRadius:8, padding:'8px 18px', fontSize:'0.8rem', fontWeight:600, cursor: userRequested[activeTab] ? 'default' : 'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}
                    >
                      {userRequested[activeTab] ? '✓ Demande envoyée' : '📩 Demander ce document'}
                    </button>
                    <button onClick={() => navigate('/upload')}
                      style={{ background:'none', border:'1px solid #1C2A45', color:'#94A3B8', borderRadius:8, padding:'8px 18px', fontSize:'0.8rem', fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
                      Uploader moi-même
                    </button>
                  </div>
                </div>
              ) : (
              <div className="empty">
                <div className="empty-code">// no documents found for this filter</div>
                <div className="empty-title">Aucun document disponible</div>
                <div className="empty-sub">
                  Sois le premier à uploader un document pour ce module !
                </div>
                <button className="empty-upload-btn" onClick={() => navigate('/upload')}>
                  Uploader le premier document
                </button>
              </div>
              )
            ) : (
              GROUP_ORDER.filter(type => grouped[type]).map(type => {
                const groupDocs = grouped[type]
                const cfg = TYPE_CONFIG[type]
                const count = groupDocs.length
                const iconColor = {
                  examen:'#F87171', cc:'#FBD34D', td:'#7BB3FF', tp:'#2DD4BF',
                  cours:'#5EEAD4', corrige_examen:'#FBD34D', corrige_td:'#7BB3FF',
                  corrige_tp:'#2DD4BF', quiz:'#C4B5FD', projet_final:'#F87171',
                }[type] || '#94A3B8'
                const iconBg = {
                  examen:'rgba(248,113,113,0.08)', cc:'rgba(251,211,77,0.08)',
                  td:'rgba(79,142,247,0.08)', tp:'rgba(45,212,191,0.08)',
                  cours:'rgba(94,234,212,0.08)', corrige_examen:'rgba(251,211,77,0.08)',
                  corrige_td:'rgba(79,142,247,0.08)', corrige_tp:'rgba(45,212,191,0.08)',
                  quiz:'rgba(167,139,250,0.08)', projet_final:'rgba(248,113,113,0.08)',
                }[type] || 'rgba(148,163,184,0.08)'
                const iconBorder = {
                  examen:'rgba(248,113,113,0.2)', cc:'rgba(251,211,77,0.2)',
                  td:'rgba(79,142,247,0.2)', tp:'rgba(45,212,191,0.2)',
                  cours:'rgba(94,234,212,0.2)', corrige_examen:'rgba(251,211,77,0.2)',
                  corrige_td:'rgba(79,142,247,0.2)', corrige_tp:'rgba(45,212,191,0.2)',
                  quiz:'rgba(167,139,250,0.2)', projet_final:'rgba(248,113,113,0.2)',
                }[type] || 'rgba(148,163,184,0.2)'

                return (
                  <div key={type} style={{ marginBottom:'2rem' }}>
                    {/* Group header — only when showing all tabs */}
                    {activeTab === 'all' && (
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, paddingBottom:8, borderBottom:'1px solid #1C2A45' }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', letterSpacing:'2px', textTransform:'uppercase' }}>
                          {cfg?.full || type}
                        </span>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4F8EF7', background:'rgba(79,142,247,0.08)', padding:'2px 8px', borderRadius:4 }}>
                          {count} fichier{count > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Docs in group */}
                    {groupDocs.map(doc => (
                      <div key={doc.id} style={{ marginBottom:6, border:'1px solid #1C2A45', borderRadius:10, overflow:'hidden', transition:'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor='#2D4A7A'}
                        onMouseLeave={e => e.currentTarget.style.borderColor='#1C2A45'}
                      >
                      <div
                        style={{ background:'#070C18', padding:'14px 16px', display:'flex', alignItems:'center', gap:14, cursor: doc.files?.length > 1 ? 'default' : 'pointer' }}
                        onClick={() => { if (!doc.files || doc.files.length <= 1) handleDownload(doc) }}
                      >
                        {/* Type icon */}
                        <div style={{ width:42, height:42, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontSize:'0.58rem', fontWeight:600, background:iconBg, color:iconColor, border:`1px solid ${iconBorder}` }}>
                          {cfg?.label || 'DOC'}
                        </div>

                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#FFFFFF', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {doc.doc_number ? doc.doc_number : (cfg?.full || doc.doc_type)}
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', flexWrap:'wrap' }}>
                            {doc.academic_year && <span style={{ color:'#94A3B8' }}>{doc.academic_year}</span>}
                            {doc.academic_year && doc.professor && <span>·</span>}
                            {doc.professor && <span>Prof. {doc.professor}</span>}
                            <span>·</span>
                            <span>{doc.files?.length > 1 ? `${doc.files.length} fichiers` : `${doc.pages_count || 1} page${(doc.pages_count || 1) > 1 ? 's' : ''}`}</span>
                            <span>·</span>
                            <span>{doc.downloads || 0} DL</span>
                            <span style={{ color:'#2D4A7A' }}>·</span>
                            <span
                              style={{ color:'#5EEAD4', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontWeight:500 }}
                              onClick={e => { e.stopPropagation(); navigate(`/user/${doc.uploader_id}`) }}
                              title={`Voir le profil de ${doc.user_profiles?.name || 'Anonyme'}`}
                            >
                              ↑ {doc.user_profiles?.name || 'Anonyme'}
                            </span>
                            <span style={{ marginLeft:4, background: doc.is_verified ? 'rgba(45,212,191,0.1)' : 'rgba(251,211,77,0.1)', color: doc.is_verified ? '#2DD4BF' : '#FBD34D', border:`1px solid ${doc.is_verified ? 'rgba(45,212,191,0.2)' : 'rgba(251,211,77,0.2)'}`, borderRadius:4, padding:'1px 7px', fontSize:'0.6rem' }}>
                              {doc.is_verified ? 'Vérifié' : 'En attente'}
                            </span>
                          </div>
                        </div>

                        {/* Download: multi-file or single */}
                        {doc.files && doc.files.length > 1 ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                            {doc.files.map((fileUrl, i) => (
                              <button key={i}
                                onClick={async e => {
                                  e.stopPropagation()
                                  const { data: { user } } = await supabase.auth.getUser()
                                  if (!user) { navigate('/login', { state: { from: `/module/${doc.module_id}` } }); return }
                                  if (i === 0) {
                                    await supabase.from('downloads_log').insert({ user_id: user.id, document_id: doc.id })
                                    await supabase.from('documents').update({ downloads: (doc.downloads || 0) + 1 }).eq('id', doc.id)
                                  }
                                  window.open(fileUrl, '_blank')
                                }}
                                style={{ background:'rgba(79,142,247,0.08)', border:'1px solid rgba(79,142,247,0.2)', color:'#7BB3FF', borderRadius:6, padding:'5px 12px', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}
                                onMouseEnter={e => { e.currentTarget.style.background='rgba(79,142,247,0.15)'; e.currentTarget.style.borderColor='#4F8EF7' }}
                                onMouseLeave={e => { e.currentTarget.style.background='rgba(79,142,247,0.08)'; e.currentTarget.style.borderColor='rgba(79,142,247,0.2)' }}
                              >
                                {doc.file_names?.[i]
                                  ? doc.file_names[i].replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
                                  : `Fichier ${i + 1}`}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); handleDownload(doc) }}
                            style={{ background:'rgba(79,142,247,0.08)', border:'1px solid rgba(79,142,247,0.2)', color:'#7BB3FF', borderRadius:7, padding:'7px 16px', fontSize:'0.75rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s', flexShrink:0, whiteSpace:'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.background='rgba(79,142,247,0.15)'; e.currentTarget.style.borderColor='#4F8EF7' }}
                            onMouseLeave={e => { e.currentTarget.style.background='rgba(79,142,247,0.08)'; e.currentTarget.style.borderColor='rgba(79,142,247,0.2)' }}
                          >
                            Télécharger
                          </button>
                        )}
                      </div>
                      {/* Reactions row */}
                      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'8px 16px', borderTop:'1px solid #1C2A45', background:'rgba(0,0,0,0.2)' }}>
                        <button onClick={e => { e.stopPropagation(); handleHelpful(doc) }}
                          style={{ display:'flex', alignItems:'center', gap:6,
                            background: userReactions[doc.id]?.helpful ? 'rgba(79,142,247,0.15)' : 'none',
                            border: userReactions[doc.id]?.helpful ? '1px solid rgba(79,142,247,0.3)' : '1px solid transparent',
                            color: userReactions[doc.id]?.helpful ? '#7BB3FF' : '#4A5568',
                            borderRadius:6, padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer',
                            fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
                          👍 Utile{doc.helpful_count > 0 ? ` · ${doc.helpful_count}` : ''}
                        </button>
                        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                          {[1,2,3,4,5].map(star => (
                            <span key={star} onClick={e => { e.stopPropagation(); handleRating(doc, star) }}
                              style={{ cursor:'pointer', fontSize:'0.9rem',
                                color: (userReactions[doc.id]?.rating || 0) >= star ? '#FBD34D' : '#1C2A45',
                                transition:'color 0.1s' }}>★</span>
                          ))}
                          {doc.rating_count > 0 && (
                            <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', marginLeft:4 }}>
                              {(doc.rating_sum / doc.rating_count).toFixed(1)} ({doc.rating_count})
                            </span>
                          )}
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleReport(doc) }}
                          style={{ marginLeft:'auto', background:'none', border:'none',
                            color: userReactions[doc.id]?.reported ? '#F87171' : '#4A5568',
                            fontSize:'0.72rem', cursor:'pointer', fontFamily:'DM Mono,monospace', transition:'color 0.15s' }}>
                          {userReactions[doc.id]?.reported ? '🚩 Signalé' : '🚩 Signaler'}
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>

          {/* SENPAI ZONE SECTION */}
          <div style={{ marginTop:'2.5rem', paddingTop:'2rem', borderTop:'1px solid #1C2A45' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#4A5568', letterSpacing:'2px', textTransform:'uppercase', marginBottom:4 }}>
                  // senpai zone — tips étudiants
                </div>
                <div style={{ fontSize:'1rem', fontWeight:700, color:'#fff' }}>Expériences sur ce module</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button
                  onClick={() => navigate(`/senpai?compose=1&module=${id}`)}
                  style={{ background:'rgba(79,142,247,0.12)', border:'1px solid rgba(79,142,247,0.3)', color:'#7BB3FF', borderRadius:8, padding:'6px 14px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(79,142,247,0.2)'; e.currentTarget.style.borderColor='rgba(79,142,247,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(79,142,247,0.12)'; e.currentTarget.style.borderColor='rgba(79,142,247,0.3)' }}
                >
                  + Partager
                </button>
                <button
                  onClick={() => navigate(`/senpai?module=${id}`)}
                  style={{ background:'none', border:'1px solid #1C2A45', color:'#94A3B8', borderRadius:8, padding:'6px 14px', fontSize:'0.78rem', fontWeight:500, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#2D4A7A'; e.currentTarget.style.color='#E2E8F0' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#1C2A45'; e.currentTarget.style.color='#94A3B8' }}
                >
                  Voir tous →
                </button>
              </div>
            </div>

            {senpaiPosts.length === 0 ? (
              <div style={{ background:'#070C18', border:'1px dashed #1C2A45', borderRadius:12, padding:'2rem', textAlign:'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:'0 auto 10px' }}>
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <div style={{ fontSize:'0.88rem', fontWeight:600, color:'#94A3B8', marginBottom:6 }}>Aucun tip senpai pour ce module</div>
                <div style={{ fontSize:'0.78rem', color:'#4A5568', marginBottom:'1rem' }}>Sois le premier à partager ton expérience !</div>
                <button
                  onClick={() => navigate(`/senpai?compose=1&module=${id}`)}
                  style={{ background:'rgba(196,181,253,0.1)', border:'1px solid rgba(196,181,253,0.25)', color:'#C4B5FD', borderRadius:8, padding:'8px 18px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(196,181,253,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(196,181,253,0.1)' }}
                >
                  Partager ton expérience
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {senpaiPosts.map(post => {
                  const PT_COLORS = {
                    survival_guide: { color:'#7BB3FF', bg:'rgba(79,142,247,0.15)', border:'rgba(79,142,247,0.3)', label:'Guide de survie' },
                    cheat_code:     { color:'#FBD34D', bg:'rgba(251,211,77,0.15)', border:'rgba(251,211,77,0.3)', label:'Cheat Code' },
                    timeline:       { color:'#4ADE80', bg:'rgba(74,222,128,0.15)', border:'rgba(74,222,128,0.3)', label:'Timeline' },
                    red_flag:       { color:'#F87171', bg:'rgba(248,113,113,0.15)', border:'rgba(248,113,113,0.3)', label:'Red Flag' },
                    path_review:    { color:'#C4B5FD', bg:'rgba(196,181,253,0.15)', border:'rgba(196,181,253,0.3)', label:'Bilan' },
                  }
                  const pt = PT_COLORS[post.post_type] || PT_COLORS.survival_guide
                  const authorName = post.user_profiles?.name || 'Anonyme'
                  return (
                    <div key={post.id}
                      style={{ background:'#070C18', border:'1px solid #1C2A45', borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#2D4A7A'; e.currentTarget.style.background='#0C1222' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#1C2A45'; e.currentTarget.style.background='#070C18' }}
                      onClick={() => navigate(`/senpai?post=${post.id}`)}
                    >
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#C4B5FD,#4F8EF7)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontSize:'0.58rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                            {authorName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#E2E8F0' }}>{authorName}</span>
                        </div>
                        <div style={{ padding:'2px 8px', borderRadius:20, background:pt.bg, color:pt.color, fontSize:'0.65rem', fontWeight:600, flexShrink:0, border:`1px solid ${pt.border}` }}>
                          {pt.label}
                        </div>
                      </div>
                      <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#fff', marginBottom:4 }}>{post.title}</div>
                      <div style={{ fontSize:'0.78rem', color:'#94A3B8', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {post.content}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', marginTop:8 }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#4A5568' }}>
                          {post.helpful_count || 0} utile{(post.helpful_count || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={() => navigate(`/senpai?module=${id}`)}
                  style={{ background:'none', border:'1px dashed #1C2A45', borderRadius:10, padding:'10px', fontSize:'0.78rem', color:'#4A5568', cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s', textAlign:'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#2D4A7A'; e.currentTarget.style.color='#94A3B8' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#1C2A45'; e.currentTarget.style.color='#4A5568' }}
                >
                  Voir tous les tips pour ce module →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ASIDE */}
        <aside className="aside">
          {/* Upload card */}
          <div className="upload-card">
            <div className="upload-card-title">Tu as un document ?</div>
            <div className="upload-card-desc">
              Aide ta promo en uploadant tes examens, CCs ou TDs pour ce module.
              Gagne des points à chaque upload.
            </div>
            <button className="upload-card-btn" onClick={() => navigate('/upload')}>
              Uploader un document
            </button>
          </div>

          {/* Module info */}
          <div className="aside-card">
            <div className="aside-card-header">
              <span className="aside-card-title">// infos module</span>
            </div>
            <div className="aside-card-body">
              <div className="info-row">
                <span className="info-key">NOM</span>
                <span className="info-val">{mod.name}</span>
              </div>
              <div className="info-row">
                <span className="info-key">SEMESTRE</span>
                <span className="info-val">{mod.semester}</span>
              </div>
              <div className="info-row">
                <span className="info-key">FILIÈRE</span>
                <span className="info-val">{filName || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">FACULTÉ</span>
                <span className="info-val">{facName || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">UNIVERSITÉ</span>
                <span className="info-val">{uniName || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">TYPE</span>
                <span className="info-val">{mod.type}</span>
              </div>
            </div>
          </div>

          {/* Document breakdown */}
          {docs.length > 0 && (
            <div className="aside-card">
              <div className="aside-card-header">
                <span className="aside-card-title">// répartition</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.65rem', color: 'var(--accent2)' }}>
                  {docs.length} total
                </span>
              </div>
              <div className="aside-card-body">
                <div className="type-rows">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    typeCounts[k] > 0 && (
                      <div key={k} className="type-stat">
                        <span className="type-stat-label">{v.full}</span>
                        <div className="type-stat-bar-wrap">
                          <div className="type-stat-bar" style={{ width: `${(typeCounts[k]/maxCount)*100}%` }} />
                        </div>
                        <span className="type-stat-count">{typeCounts[k]}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related modules */}
          {related.length > 0 && (
            <div className="aside-card">
              <div className="aside-card-header">
                <span className="aside-card-title">// même filière</span>
              </div>
              <div className="aside-card-body">
                <div className="related-list">
                  {related.map(r => (
                    <div key={r.id} className="related-item" onClick={() => navigate(`/module/${r.id}`)}>
                      <span className="related-sem">{r.semester}</span>
                      <span className="related-name">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="aside-card" style={{ background:'rgba(251,211,77,0.03)', borderColor:'rgba(251,211,77,0.12)' }}>
            <div className="aside-card-header" style={{ borderColor:'rgba(251,211,77,0.12)' }}>
              <span className="aside-card-title" style={{ color:'#FBD34D' }}>// soutenir le projet</span>
            </div>
            <div className="aside-card-body" style={{ textAlign:'center' }}>
              <div style={{ fontSize:'0.78rem', color:'#4A5568', lineHeight:1.6, marginBottom:'0.75rem' }}>
                9rawZid9ra est 100% gratuit. Un pourboire nous aide à grandir.
              </div>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID"
                target="_blank"
                rel="noreferrer"
                style={{ display:'inline-block', background:'rgba(251,211,77,0.1)', border:'1px solid rgba(251,211,77,0.3)', color:'#FBD34D', borderRadius:8, padding:'7px 16px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif", textDecoration:'none', transition:'all 0.15s' }}
              >
                ☕ Envoyer un pourboire
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}