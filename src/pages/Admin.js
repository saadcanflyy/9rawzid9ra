import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222; --s3:#111827;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --red:#F87171; --yellow:#FBD34D; --green:#4ADE80;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  html,body { background:var(--bg); font-family:'Outfit',sans-serif; min-height:100vh; }
  .page { min-height:100vh; display:flex; flex-direction:column; }

  /* NAV */
  .nav {
    position:sticky; top:0; z-index:100; height:58px;
    display:flex; align-items:center; justify-content:space-between; padding:0 2rem;
    background:rgba(2,4,10,0.95); backdrop-filter:blur(32px); border-bottom:1px solid var(--border);
  }
  .nav-left { display:flex; align-items:center; gap:1.5rem; }
  .logo { display:flex; align-items:center; gap:10px; cursor:pointer; }
  .logo-box { width:28px; height:28px; border-radius:6px; background:linear-gradient(135deg,var(--accent),var(--teal)); }
  .logo-text { font-family:'DM Mono',monospace; font-size:0.88rem; color:var(--white); }
  .logo-text b { color:var(--accent2); font-weight:500; }
  .nav-divider { width:1px; height:20px; background:var(--border); }
  .admin-badge {
    font-family:'DM Mono',monospace; font-size:0.62rem;
    background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2);
    color:var(--red); padding:3px 10px; border-radius:4px; letter-spacing:1px;
  }
  .nav-right { display:flex; gap:8px; }
  .btn-ghost { background:none; border:1px solid var(--border); color:var(--text2); padding:5px 14px; border-radius:7px; font-size:0.8rem; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .btn-ghost:hover { border-color:var(--borderhi); color:var(--text); }

  /* LAYOUT */
  .layout { display:flex; flex:1; height:calc(100vh - 58px); overflow:hidden; }

  /* SIDEBAR */
  .sidebar { width:220px; flex-shrink:0; border-right:1px solid var(--border); background:var(--surface); padding:1.25rem; }
  .sidebar-title { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); letter-spacing:2px; text-transform:uppercase; margin-bottom:1rem; }
  .nav-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:9px 12px; border-radius:8px; cursor:pointer; transition:all 0.15s;
    margin-bottom:3px; border:1px solid transparent;
  }
  .nav-item:hover { background:var(--s2); }
  .nav-item.active { background:rgba(79,142,247,0.08); border-color:rgba(79,142,247,0.15); }
  .nav-item-left { display:flex; align-items:center; gap:8px; }
  .nav-item-icon { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); width:16px; }
  .nav-item.active .nav-item-icon { color:var(--accent2); }
  .nav-item-label { font-size:0.82rem; color:var(--text2); font-weight:500; }
  .nav-item.active .nav-item-label { color:var(--white); }
  .nav-badge {
    font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:700;
    background:rgba(248,113,113,0.15); color:var(--red); border:1px solid rgba(248,113,113,0.2);
    padding:1px 7px; border-radius:4px; min-width:20px; text-align:center;
  }
  .nav-badge.yellow { background:rgba(251,211,77,0.1); color:var(--yellow); border-color:rgba(251,211,77,0.2); }

  /* MAIN */
  .main { flex:1; overflow-y:auto; padding:1.75rem; }
  .main::-webkit-scrollbar { width:4px; }
  .main::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

  /* STATS */
  .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; margin-bottom:2rem; }
  .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.1rem; }
  .stat-val { font-family:'DM Mono',monospace; font-size:1.6rem; font-weight:500; color:var(--white); margin-bottom:4px; }
  .stat-val.red { color:var(--red); }
  .stat-val.yellow { color:var(--yellow); }
  .stat-val.green { color:var(--green); }
  .stat-val.blue { color:var(--accent2); }
  .stat-label { font-size:0.75rem; color:var(--text2); font-weight:500; }
  .stat-sub { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); margin-top:3px; }

  /* SECTION */
  .section-title {
    font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3);
    letter-spacing:1.5px; text-transform:uppercase; margin-bottom:1rem;
    display:flex; align-items:center; gap:10px;
  }
  .section-title::after { content:''; flex:1; height:1px; background:var(--border); }

  /* TABLE */
  .table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:2rem; }
  .table { width:100%; border-collapse:collapse; }
  .table th { padding:10px 14px; text-align:left; font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border); background:var(--s2); }
  .table td { padding:12px 14px; font-size:0.82rem; color:var(--text2); border-bottom:1px solid var(--border); vertical-align:middle; }
  .table tr:last-child td { border-bottom:none; }
  .table tr:hover td { background:rgba(255,255,255,0.02); }
  .table-name { color:var(--white); font-weight:500; }
  .table-mono { font-family:'DM Mono',monospace; font-size:0.72rem; }

  /* BADGES */
  .badge { font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:600; padding:2px 8px; border-radius:4px; letter-spacing:0.5px; }
  .badge-pending  { background:rgba(251,211,77,0.1); color:var(--yellow); border:1px solid rgba(251,211,77,0.2); }
  .badge-approved { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.2); }
  .badge-rejected { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }
  .badge-flagged  { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }
  .badge-verified { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.2); }

  /* ACTION BUTTONS */
  .actions { display:flex; gap:6px; }
  .act-btn { padding:5px 12px; border-radius:6px; font-size:0.72rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; border:1px solid transparent; }
  .act-approve { background:rgba(74,222,128,0.1); color:var(--green); border-color:rgba(74,222,128,0.2); }
  .act-approve:hover { background:rgba(74,222,128,0.2); }
  .act-reject { background:rgba(248,113,113,0.08); color:var(--red); border-color:rgba(248,113,113,0.15); }
  .act-reject:hover { background:rgba(248,113,113,0.15); }
  .act-rename { background:rgba(79,142,247,0.08); color:var(--accent2); border-color:rgba(79,142,247,0.15); }
  .act-rename:hover { background:rgba(79,142,247,0.15); }
  .act-ban { background:rgba(248,113,113,0.08); color:var(--red); border-color:rgba(248,113,113,0.15); }
  .act-ban:hover { background:rgba(248,113,113,0.15); }
  .act-view { background:var(--s2); color:var(--text2); border-color:var(--border); }
  .act-view:hover { border-color:var(--borderhi); color:var(--text); }

  /* RENAME INLINE */
  .rename-input { background:var(--s2); border:1px solid var(--accent); border-radius:6px; padding:5px 10px; color:var(--text); font-size:0.8rem; font-family:'Outfit',sans-serif; outline:none; width:200px; }

  /* EMPTY */
  .empty { text-align:center; padding:3rem 2rem; color:var(--text3); font-family:'DM Mono',monospace; font-size:0.75rem; }

  /* SKELETON */
  .skel { background:var(--surface); border:1px solid var(--border); border-radius:12px; height:60px; animation:pulse 1.8s ease-in-out infinite; margin-bottom:6px; }
  @keyframes pulse { 0%,100%{opacity:0.35} 50%{opacity:0.7} }

  /* OVERVIEW GRID */
  .overview-cols { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:2rem; }
  .overview-col-title { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:0.75rem; display:flex; align-items:center; gap:10px; }
  .overview-col-title::after { content:''; flex:1; height:1px; background:var(--border); }

  /* RANK BADGE */
  .rank-pill { font-family:'DM Mono',monospace; font-size:0.58rem; padding:2px 7px; border-radius:4px; }
  .rank-etudiant  { background:rgba(148,163,184,0.08); color:var(--text2); border:1px solid var(--border); }
  .rank-contrib   { background:rgba(45,212,191,0.08); color:var(--teal2); border:1px solid rgba(45,212,191,0.2); }
  .rank-senpai    { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.2); }
  .rank-legende   { background:rgba(245,158,11,0.08); color:#F59E0B; border:1px solid rgba(245,158,11,0.25); }

  /* ACTIVITY FEED */
  .feed { display:flex; flex-direction:column; gap:5px; }
  .feed-item { display:flex; align-items:center; gap:10px; background:var(--s2); border:1px solid var(--border); border-radius:8px; padding:9px 12px; }
  .feed-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; background:var(--accent); }
  .feed-info { flex:1; min-width:0; }
  .feed-main { font-size:0.8rem; color:var(--text); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .feed-sub  { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); margin-top:2px; }
  .feed-time { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); flex-shrink:0; }

  /* MONTHLY REPORT */
  .report-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:2rem; }
  .report-card { background:var(--s2); border:1px solid var(--border); border-radius:10px; padding:1rem; }
  .report-val { font-family:'DM Mono',monospace; font-size:1.3rem; font-weight:500; color:var(--white); margin-bottom:3px; }
  .report-label { font-size:0.72rem; color:var(--text2); }
  .report-delta { font-family:'DM Mono',monospace; font-size:0.62rem; margin-top:4px; }
  .delta-up   { color:var(--green); }
  .delta-flat { color:var(--text3); }

  /* ACCESS DENIED */
  .denied { text-align:center; padding:5rem 2rem; }
  .denied-code { font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--text3); margin-bottom:1rem; }
  .denied-title { font-size:1.2rem; font-weight:700; color:var(--white); margin-bottom:0.5rem; }
  .denied-desc { font-size:0.85rem; color:var(--text2); }

  @media(max-width:768px) {
    .layout { flex-direction:column; height:auto; overflow:visible; }
    .sidebar { width:100%; height:auto; border-right:none; border-bottom:1px solid var(--border); padding:0.75rem 1rem; display:flex; flex-direction:row; overflow-x:auto; gap:4px; flex-wrap:nowrap; }
    .sidebar-title { display:none; }
    .nav-item { flex-shrink:0; margin-bottom:0; white-space:nowrap; padding:7px 12px; }
    .main { padding:1rem; overflow:visible; height:auto; }
    .overview-cols { grid-template-columns:1fr; }
    .table-wrap { overflow-x:auto; }
    .table { min-width:600px; }
    .stats-grid { grid-template-columns:repeat(2,1fr); }
    .nav { padding:0 1rem; }
    .nav-left { gap:0.75rem; }
    .admin-badge { display:none; }
  }
  @media(max-width:480px) {
    .stats-grid { grid-template-columns:1fr 1fr; }
    .sidebar { gap:3px; }
    .nav-item-label { font-size:0.75rem; }
    .report-grid { grid-template-columns:1fr 1fr; }
  }
`

export default function Admin() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // Data
  const [stats,        setStats]        = useState(null)
  const [pendingDocs,  setPendingDocs]  = useState([])
  const [pendingMods,  setPendingMods]  = useState([])
  const [schoolReqs,   setSchoolReqs]   = useState([])
  const [filiereReqs,  setFiliereReqs]  = useState([])
  const [users,        setUsers]        = useState([])
  const [topUsers,     setTopUsers]     = useState([])
  const [activityFeed, setActivityFeed] = useState([])
  const [flaggedPosts, setFlaggedPosts] = useState([])

  // Doc filter
  const [docFilter, setDocFilter] = useState('all')

  // Move document state
  const [movingDocId,   setMovingDocId]   = useState(null)
  const [moveSearch,    setMoveSearch]    = useState('')
  const [moveResults,   setMoveResults]   = useState([])
  const [moveSelId,     setMoveSelId]     = useState(null)
  const [moveBusy,      setMoveBusy]      = useState(false)

  // Messages tab
  const [messages,      setMessages]      = useState([])
  const [unreadMsgCount,setUnreadMsgCount]= useState(0)

  // Analytics tab
  const [analytics,     setAnalytics]     = useState(null)

  // Announcement
  const [annText,       setAnnText]       = useState('')
  const [annSending,    setAnnSending]    = useState(false)
  const [annResult,     setAnnResult]     = useState(null)

  // Ban inline form
  const [banningId,     setBanningId]     = useState(null)
  const [banDuration,   setBanDuration]   = useState('7d')
  const [banReason,     setBanReason]     = useState('')
  const [banBusy,       setBanBusy]       = useState(false)

  // Rename state
  const [renamingId,  setRenamingId]  = useState(null)
  const [renameVal,   setRenameVal]   = useState('')

  // Auth check
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAuthLoading(false); return }
      setUser(user)
      const { data: profile } = await supabase.from('user_profiles').select('is_admin').eq('id', user.id).single()
      setIsAdmin(profile?.is_admin === true)
      setAuthLoading(false)
    }
    check()
  }, [])

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'overview') loadStats()
    if (activeTab === 'documents') loadDocs(docFilter)
    if (activeTab === 'modules') loadMods()
    if (activeTab === 'schools') loadSchools()
    if (activeTab === 'filieres') loadFilieres()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'senpai') loadSenpai()
    if (activeTab === 'messages') loadMessages()
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, isAdmin]) // eslint-disable-line

  // Reload docs when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === 'documents') loadDocs(docFilter)
  }, [docFilter]) // eslint-disable-line

  const loadStats = async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [docs, mods, schools, usrs, docsMonth, docsLastMonth, usrsMonth, top10, flagged, filieres_sug,
           feedDocs, feedSchools, feedFils, feedModSugs] = await Promise.all([
      supabase.from('documents').select('*', { count:'exact', head:true }),
      supabase.from('modules').select('*', { count:'exact', head:true }).eq('verified', false),
      supabase.from('school_requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
      supabase.from('documents').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
      supabase.from('documents').select('*', { count:'exact', head:true }).gte('created_at', lastMonthStart).lt('created_at', monthStart),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
      supabase.from('user_profiles').select('id, name, email, points, uploads_count').order('points', { ascending: false }).limit(10),
      supabase.from('senpai_posts').select('*', { count:'exact', head:true }).eq('is_approved', false),
      supabase.from('filiere_suggestions').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('admin_documents').select('id, doc_type, module_name, uploader_name, created_at, academic_year').order('created_at', { ascending: false }).limit(8),
      supabase.from('school_requests').select('id, school_name, created_at, user_profiles(name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('filiere_suggestions').select('id, filiere_name, created_at, user_profiles(name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('modules').select('id, name, created_at').eq('verified', false).order('created_at', { ascending: false }).limit(6),
    ])
    setStats({
      pendingDocs:      docs.count         || 0,
      pendingMods:      mods.count         || 0,
      pendingSchools:   schools.count      || 0,
      totalUsers:       usrs.count         || 0,
      docsThisMonth:    docsMonth.count    || 0,
      docsLastMonth:    docsLastMonth.count|| 0,
      usersThisMonth:   usrsMonth.count    || 0,
      flaggedPosts:     flagged.count      || 0,
      pendingFilieres:  filieres_sug.count || 0,
    })
    setTopUsers(top10.data || [])

    const combined = [
      ...(feedDocs.data || []).map(d => ({ type:'document', label: d.module_name || 'Doc', sub: `${d.doc_type?.toUpperCase() || ''}${d.academic_year ? ' · '+d.academic_year : ''} · par ${d.uploader_name || 'Anonyme'}`, created_at: d.created_at })),
      ...(feedSchools.data || []).map(s => ({ type:'school', label: s.school_name || 'École', sub: `par ${s.user_profiles?.name || 'Anonyme'}`, created_at: s.created_at })),
      ...(feedFils.data || []).map(f => ({ type:'filiere', label: f.filiere_name || 'Filière', sub: `par ${f.user_profiles?.name || 'Anonyme'}`, created_at: f.created_at })),
      ...(feedModSugs.data || []).map(m => ({ type:'module', label: m.name || 'Module', sub: 'En attente de vérif', created_at: m.created_at })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)
    setActivityFeed(combined)
  }

  const loadDocs = async (filter) => {
    setLoading(true)
    const f = filter ?? docFilter
    let q = supabase.from('admin_documents').select('*')
    if (f === 'reported') q = q.gt('report_count', 0).order('report_count', { ascending: false })
    else if (f === 'recent') q = q.order('created_at', { ascending: false })
    else q = q.order('created_at', { ascending: false })
    const { data } = await q.limit(100)
    setPendingDocs(data || [])
    setLoading(false)
  }

  const loadMods = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('modules')
      .select('*, filieres(name, faculties(name, universities(name)))')
      .order('created_at', { ascending: false })
      .limit(100)
    setPendingMods(data || [])
    setLoading(false)
  }

  const loadSchools = async () => {
    setLoading(true)
    const { data } = await supabase.from('school_requests')
      .select('*, user_profiles(name, email), universities!school_requests_parent_university_id_fkey(name)')
      .order('created_at', { ascending: false })
    setSchoolReqs(data || [])
    setLoading(false)
  }

  const loadFilieres = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('filiere_suggestions')
      .select('*, user_profiles(name, email), faculties(name, universities(name))')
      .order('created_at', { ascending: false })
    setFiliereReqs(data || [])
    setLoading(false)
  }

  const loadSenpai = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('senpai_posts')
      .select('*, user_profiles(name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setFlaggedPosts(data || [])
    setLoading(false)
  }

  const approvePost = async (post) => {
    await supabase.from('senpai_posts').update({ is_approved: true }).eq('id', post.id)
    setFlaggedPosts(ps => ps.filter(p => p.id !== post.id))
  }

  const deletePost = async (post) => {
    if (!window.confirm(`Supprimer ce post de "${post.user_profiles?.name || 'Anonyme'}" ?`)) return
    await supabase.from('senpai_posts').delete().eq('id', post.id)
    setFlaggedPosts(ps => ps.filter(p => p.id !== post.id))
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false }).limit(100)
    setUsers(data || [])
    setLoading(false)
  }

  // Actions
  const verifyDoc = async (id) => {
    await supabase.from('documents').update({ is_verified: true, is_flagged: false }).eq('id', id)
    setPendingDocs(d => d.filter(x => x.id !== id))
  }

  const deleteDoc = async (id) => {
    if (!window.confirm('Supprimer ce document ?')) return
    await supabase.from('documents').delete().eq('id', id)
    setPendingDocs(d => d.filter(x => x.id !== id))
  }

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm('Supprimer ce document définitivement ?')) return
    if (doc.files?.length > 0) {
      for (const url of doc.files) {
        const path = url.split('/documents/')[1]
        if (path) await supabase.storage.from('documents').remove([path])
      }
    }
    await supabase.from('document_reactions').delete().eq('document_id', doc.id)
    await supabase.from('downloads_log').delete().eq('document_id', doc.id)
    const { data: prof } = await supabase.from('user_profiles').select('uploads_count, points').eq('id', doc.uploader_id).single()
    if (prof) {
      await supabase.from('user_profiles').update({
        uploads_count: Math.max(0, (prof.uploads_count || 1) - 1),
        points: Math.max(0, (prof.points || 50) - 50),
      }).eq('id', doc.uploader_id)
    }
    await supabase.from('documents').delete().eq('id', doc.id)
    setPendingDocs(d => d.filter(x => x.id !== doc.id))
  }

  const handleIgnoreReports = async (docId) => {
    await supabase.from('documents').update({ report_count: 0 }).eq('id', docId)
    await supabase.from('document_reactions').delete().eq('document_id', docId).eq('reaction_type', 'report')
    setPendingDocs(d => d.map(x => x.id === docId ? { ...x, report_count: 0 } : x))
  }

  const searchModules = async (q) => {
    if (q.length < 2) { setMoveResults([]); return }
    const { data } = await supabase.from('modules')
      .select('id, name, filieres(name, semester)')
      .ilike('name', `%${q}%`)
      .limit(8)
    setMoveResults(data || [])
  }

  const moveDoc = async (docId, moduleId) => {
    setMoveBusy(true)
    await supabase.from('documents').update({ module_id: moduleId }).eq('id', docId)
    setMoveBusy(false)
    setMovingDocId(null)
    setMoveSearch('')
    setMoveResults([])
    setMoveSelId(null)
    setPendingDocs(d => d.map(x => x.id === docId ? { ...x, module_id: moduleId } : x))
  }

  const approveMod = async (mod) => {
    await supabase.from('modules').update({ verified: true }).eq('id', mod.id)
    setPendingMods(m => m.filter(x => x.id !== mod.id))
  }

  const renameMod = async (mod) => {
    if (!renameVal.trim()) return
    await supabase.from('modules').update({ name: renameVal.trim(), verified: true }).eq('id', mod.id)
    setPendingMods(m => m.filter(x => x.id !== mod.id))
    setRenamingId(null); setRenameVal('')
  }

  const rejectMod = async (mod) => {
    const { count } = await supabase.from('documents').select('*', { count:'exact', head:true }).eq('module_id', mod.id)
    if (count > 0) {
      alert(`Ce module contient ${count} document(s) et ne peut pas être supprimé.`)
      return
    }
    if (!window.confirm(`Supprimer le module "${mod.name}" ?`)) return
    await supabase.from('modules').delete().eq('id', mod.id)
    setPendingMods(m => m.filter(x => x.id !== mod.id))
  }

  const approveSchool = async (id) => {
    await supabase.from('school_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', id)
    setSchoolReqs(s => s.map(x => x.id === id ? { ...x, status: 'approved' } : x))
  }

  const rejectSchool = async (id) => {
    await supabase.from('school_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', id)
    setSchoolReqs(s => s.map(x => x.id === id ? { ...x, status: 'rejected' } : x))
  }

  const approveFiliere = async (id) => {
    await supabase.from('filiere_suggestions').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', id)
    setFiliereReqs(f => f.map(x => x.id === id ? { ...x, status: 'approved' } : x))
  }

  const rejectFiliere = async (id) => {
    await supabase.from('filiere_suggestions').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', id)
    setFiliereReqs(f => f.map(x => x.id === id ? { ...x, status: 'rejected' } : x))
  }

  const banUser = async (id, currentBan) => {
    const msg = currentBan ? 'Débannir cet utilisateur ?' : 'Bannir cet utilisateur ?'
    if (!window.confirm(msg)) return
    await supabase.from('user_profiles').update({ is_banned: !currentBan }).eq('id', id)
    setUsers(u => u.map(x => x.id === id ? { ...x, is_banned: !currentBan } : x))
  }

  const toggleModerator = async (id, currentMod) => {
    const msg = currentMod ? 'Retirer le rôle Modérateur ?' : 'Donner le rôle Modérateur à cet utilisateur ?'
    if (!window.confirm(msg)) return
    const { error } = await supabase.from('user_profiles').update({ is_moderator: !currentMod }).eq('id', id)
    if (error) { console.error('toggleModerator error:', error); alert('Erreur : ' + error.message); return }
    setUsers(u => u.map(x => x.id === id ? { ...x, is_moderator: !currentMod } : x))
    const notifContent = !currentMod
      ? 'Tu as été nommé modérateur de 9rawZid9ra 🛡️ Bienvenue dans l\'équipe !'
      : 'Ton rôle de modérateur a été retiré.'
    const notifType = !currentMod ? 'moderator_assigned' : 'moderator_removed'
    supabase.from('notifications').insert({ user_id: id, type: notifType, content: notifContent, read: false }).then()
  }

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase.from('messages')
      .select('*, user_profiles!sender_id(name)')
      .order('created_at', { ascending: false })
      .limit(100)
    setMessages(data || [])
    const unread = (data || []).filter(m => !m.read).length
    setUnreadMsgCount(unread)
    setLoading(false)
  }

  const markMsgRead = async (id) => {
    await supabase.from('messages').update({ read: true }).eq('id', id)
    setMessages(m => m.map(x => x.id === id ? { ...x, read: true } : x))
    setUnreadMsgCount(c => Math.max(0, c - 1))
  }

  const loadAnalytics = async () => {
    setLoading(true)
    const [usersDay, docsDay, topMods, topUnis, totalDocs, totalUsers, flaggedContent, storage] = await Promise.all([
      supabase.rpc('get_users_per_day').catch(() => ({ data: null })),
      supabase.rpc('get_docs_per_day').catch(() => ({ data: null })),
      supabase.from('documents')
        .select('module_id, downloads, modules!inner(name)')
        .order('downloads', { ascending: false })
        .limit(200),
      supabase.rpc('get_top_unis_by_docs').catch(() => ({ data: null })),
      supabase.from('documents').select('*', { count:'exact', head:true }),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
      supabase.from('documents').select('*', { count:'exact', head:true }).eq('is_flagged', true),
      Promise.resolve({ data: null }),
    ])

    // Aggregate top modules from documents
    const modMap = {}
    ;(docsDay.data ? [] : (topMods.data || [])).forEach(d => {
      const name = d.modules?.name
      if (!name) return
      modMap[name] = (modMap[name] || 0) + (d.downloads || 0)
    })
    const topModsList = Object.entries(modMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, total]) => ({ name, total }))

    setAnalytics({
      usersPerDay: usersDay.data || [],
      docsPerDay: docsDay.data || [],
      topModules: topModsList,
      topUnis: topUnis.data || [],
      totalDocs: totalDocs.count || 0,
      totalUsers: totalUsers.count || 0,
      flaggedDocs: flaggedContent.count || 0,
    })
    setLoading(false)
  }

  const sendAnnouncement = async () => {
    if (!annText.trim() || annSending) return
    setAnnSending(true)
    const { data: allUsers } = await supabase.from('user_profiles').select('id').neq('id', user.id)
    if (allUsers && allUsers.length > 0) {
      const inserts = allUsers.map(u => ({ user_id: u.id, type: 'announcement', content: annText.trim(), read: false }))
      await supabase.from('notifications').insert(inserts)
    }
    setAnnResult(`Annonce envoyée à ${allUsers?.length || 0} utilisateurs ✓`)
    setAnnText('')
    setAnnSending(false)
    setTimeout(() => setAnnResult(null), 5000)
  }

  const confirmBan = async (u) => {
    setBanBusy(true)
    const durations = { '24h': 1, '7d': 7, '30d': 30, 'perm': null }
    const days = durations[banDuration]
    const bannedUntil = days ? new Date(Date.now() + days * 86400000).toISOString() : null
    const { error } = await supabase.from('user_profiles').update({
      is_banned: true,
      banned_until: bannedUntil,
      ban_reason: banReason.trim() || null,
    }).eq('id', u.id)
    if (error) { console.error('confirmBan error:', error); alert('Erreur : ' + error.message); setBanBusy(false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: true, banned_until: bannedUntil, ban_reason: banReason.trim() || null } : x))
    setBanningId(null)
    setBanReason('')
    setBanBusy(false)
  }

  const unbanUser = async (id) => {
    const { error } = await supabase.from('user_profiles').update({ is_banned: false, banned_until: null, ban_reason: null }).eq('id', id)
    if (error) { console.error('unbanUser error:', error); alert('Erreur : ' + error.message); return }
    setUsers(prev => prev.map(x => x.id === id ? { ...x, is_banned: false, banned_until: null, ban_reason: null } : x))
  }

  const fmt = (d) => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'2-digit' })

  if (authLoading) return <div className="page"><style>{css}</style><div style={{padding:'4rem',textAlign:'center',fontFamily:'DM Mono',fontSize:'0.75rem',color:'var(--text3)'}}>Chargement...</div></div>

  if (!user || !isAdmin) return (
    <div className="page">
      <style>{css}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div className="denied">
          <div className="denied-code">// 403 — access forbidden</div>
          <div className="denied-title">Accès non autorisé</div>
          <div className="denied-desc">Cette page est réservée aux administrateurs.</div>
        </div>
      </div>
    </div>
  )

  const TABS = [
    { k:'overview',   label:'Vue d\'ensemble', icon:'~>' },
    { k:'documents',  label:'Documents',        icon:'[]', count: stats?.pendingDocs },
    { k:'modules',    label:'Modules',          icon:'#',  count: stats?.pendingMods },
    { k:'schools',    label:'Écoles',           icon:'@',  count: stats?.pendingSchools },
    { k:'filieres',   label:'Filières',         icon:'≡',  count: stats?.pendingFilieres },
    { k:'users',      label:'Utilisateurs',     icon:'::' },
    { k:'senpai',     label:'Senpai Zone',      icon:'🧠', count: stats?.flaggedPosts },
    { k:'messages',   label:'Messages',         icon:'✉',  count: unreadMsgCount },
    { k:'analytics',  label:'Analytiques',      icon:'📊' },
  ]

  return (
    <div className="page">
      <style>{css}</style>

      <nav className="nav">
        <div className="nav-left">
          <div className="logo" onClick={() => navigate('/')}><div className="logo-box"/><span className="logo-text">9raw<b>Zid</b>9ra</span></div>
          <div className="nav-divider"/>
          <span className="admin-badge">ADMIN</span>
        </div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={() => navigate('/')}>Retour au site</button>
        </div>
      </nav>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-title">// panneau admin</div>
          {TABS.map(t => (
            <div key={t.k} className={`nav-item ${activeTab===t.k?'active':''}`} onClick={() => setActiveTab(t.k)}>
              <div className="nav-item-left">
                <span className="nav-item-icon">{t.icon}</span>
                <span className="nav-item-label">{t.label}</span>
              </div>
              {t.count > 0 && <span className={`nav-badge ${t.k==='modules'||t.k==='schools'?'yellow':''}`}>{t.count}</span>}
            </div>
          ))}
        </aside>

        {/* MAIN */}
        <main className="main">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* ANNOUNCEMENT */}
              <div className="section-title">// envoyer une annonce</div>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'1.1rem 1.25rem', marginBottom:'1.75rem' }}>
                <textarea
                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:'0.85rem', fontFamily:'Outfit,sans-serif', outline:'none', resize:'vertical', minHeight:70, marginBottom:8 }}
                  placeholder="Message de l'annonce... (max 200 caractères)"
                  maxLength={200}
                  value={annText}
                  onChange={e => setAnnText(e.target.value)}
                />
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <button
                    onClick={sendAnnouncement}
                    disabled={!annText.trim() || annSending}
                    style={{ background: annText.trim() ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', border:`1px solid ${annText.trim() ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`, color: annText.trim() ? 'var(--accent2)' : 'var(--text3)', borderRadius:7, padding:'7px 16px', fontSize:'0.78rem', fontWeight:600, cursor: annText.trim() ? 'pointer' : 'not-allowed', fontFamily:'Outfit,sans-serif' }}
                  >
                    {annSending ? 'Envoi...' : '📢 Envoyer à tous les utilisateurs'}
                  </button>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'var(--text3)' }}>{annText.length} / 200</span>
                  {annResult && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.68rem', color:'var(--teal2)' }}>{annResult}</span>}
                </div>
              </div>

              {/* MONTHLY REPORT */}
              <div className="section-title">// rapport — {new Date().toLocaleDateString('fr-MA',{month:'long',year:'numeric'})}</div>
              <div className="report-grid">
                <div className="report-card">
                  <div className="report-val">{stats?.docsThisMonth ?? '—'}</div>
                  <div className="report-label">Documents ce mois</div>
                  {stats && <div className={`report-delta ${stats.docsThisMonth >= stats.docsLastMonth ? 'delta-up':'delta-flat'}`}>
                    {stats.docsLastMonth > 0 ? `vs ${stats.docsLastMonth} le mois dernier` : 'premier mois'}
                  </div>}
                </div>
                <div className="report-card">
                  <div className="report-val">{stats?.usersThisMonth ?? '—'}</div>
                  <div className="report-label">Nouveaux utilisateurs</div>
                  <div className="report-delta delta-flat">ce mois-ci</div>
                </div>
                <div className="report-card">
                  <div className="report-val" style={{color:'var(--text3)'}}>—</div>
                  <div className="report-label">Revenus publicitaires</div>
                  <div className="report-delta delta-flat">fonctionnalité à venir</div>
                </div>
                <div className="report-card">
                  <div className="report-val" style={{color:'var(--text3)'}}>—</div>
                  <div className="report-label">Abonnements premium</div>
                  <div className="report-delta delta-flat">fonctionnalité à venir</div>
                </div>
              </div>

              {/* STATS TOTALS */}
              <div className="section-title">// totaux plateforme</div>
              <div className="stats-grid" style={{marginBottom:'2rem'}}>
                <div className="stat-card"><div className="stat-val blue">{stats?.pendingDocs ?? '—'}</div><div className="stat-label">Total documents</div><div className="stat-sub">uploadés</div></div>
                <div className="stat-card"><div className="stat-val blue">{stats?.totalUsers ?? '—'}</div><div className="stat-label">Utilisateurs</div><div className="stat-sub">inscrits</div></div>
                <div className="stat-card"><div className={`stat-val ${stats?.pendingMods > 0 ? 'yellow':'green'}`}>{stats?.pendingMods ?? '—'}</div><div className="stat-label">Modules en attente</div><div className="stat-sub">à approuver</div></div>
                <div className="stat-card"><div className={`stat-val ${stats?.pendingSchools > 0 ? 'yellow':'green'}`}>{stats?.pendingSchools ?? '—'}</div><div className="stat-label">Écoles demandées</div><div className="stat-sub">à examiner</div></div>
              </div>

              {/* TWO COLUMNS: top users + recent activity */}
              <div className="overview-cols">
                {/* TOP 10 */}
                <div>
                  <div className="overview-col-title">// top 10 contributeurs</div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>#</th><th>Utilisateur</th><th>Points</th><th>Uploads</th><th>Niveau</th></tr></thead>
                      <tbody>
                        {topUsers.map((u, i) => {
                          const pts = u.points || 0
                          const rank = pts >= 600 ? {l:'Légende',c:'rank-legende'} : pts >= 300 ? {l:'Senpai',c:'rank-senpai'} : pts >= 100 ? {l:'Contributeur',c:'rank-contrib'} : {l:'Étudiant',c:'rank-etudiant'}
                          return (
                            <tr key={u.id}>
                              <td className="table-mono" style={{color: i===0?'#F59E0B':i===1?'#94A3B8':i===2?'#CD7F32':'var(--text3)', fontWeight:i<3?700:400}}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                              </td>
                              <td>
                                <div className="table-name">{u.name || 'Anonyme'}</div>
                                <div className="table-mono" style={{color:'var(--text3)'}}>{u.email}</div>
                              </td>
                              <td className="table-mono" style={{color:'var(--accent2)'}}>{pts}</td>
                              <td className="table-mono">{u.uploads_count || 0}</td>
                              <td><span className={`rank-pill ${rank.c}`}>{rank.l}</span></td>
                            </tr>
                          )
                        })}
                        {topUsers.length === 0 && <tr><td colSpan={5} className="empty">// aucun utilisateur</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RECENT ACTIVITY */}
                <div>
                  <div className="overview-col-title">// activité récente des utilisateurs</div>
                  <div className="feed">
                    {activityFeed.map((item, i) => {
                      const typeStyle = item.type === 'document'
                        ? { bg:'rgba(74,222,128,0.1)', color:'#4ADE80', border:'rgba(74,222,128,0.25)', label:'DOC' }
                        : item.type === 'school'
                        ? { bg:'rgba(79,142,247,0.1)', color:'#7BB3FF', border:'rgba(79,142,247,0.25)', label:'ÉCOLE' }
                        : item.type === 'filiere'
                        ? { bg:'rgba(45,212,191,0.1)', color:'#5EEAD4', border:'rgba(45,212,191,0.25)', label:'FILIÈRE' }
                        : { bg:'rgba(251,211,77,0.1)', color:'#FBD34D', border:'rgba(251,211,77,0.25)', label:'MODULE' }
                      return (
                        <div key={i} className="feed-item">
                          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.55rem', fontWeight:700, padding:'1px 5px', borderRadius:3, background:typeStyle.bg, color:typeStyle.color, border:`1px solid ${typeStyle.border}`, flexShrink:0 }}>{typeStyle.label}</span>
                          <div className="feed-info">
                            <div className="feed-main">{item.label}</div>
                            <div className="feed-sub">{item.sub}</div>
                          </div>
                          <div className="feed-time">{fmt(item.created_at)}</div>
                        </div>
                      )
                    })}
                    {activityFeed.length === 0 && <div className="empty">// aucune activité récente</div>}
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              {(stats?.pendingMods > 0 || stats?.pendingSchools > 0) && (
                <>
                  <div className="section-title">// actions requises</div>
                  <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                    {stats?.pendingMods   > 0 && <button className="act-btn act-rename" style={{padding:'10px 20px',fontSize:'0.82rem'}} onClick={() => setActiveTab('modules')}>Traiter {stats.pendingMods} module{stats.pendingMods>1?'s':''}</button>}
                    {stats?.pendingSchools > 0 && <button className="act-btn act-rename" style={{padding:'10px 20px',fontSize:'0.82rem'}} onClick={() => setActiveTab('schools')}>Voir {stats.pendingSchools} école{stats.pendingSchools>1?'s':''}</button>}
                  </div>
                </>
              )}
            </>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <>
              <div className="section-title">// tous les documents uploadés</div>
              <div style={{display:'flex', gap:8, marginBottom:'1rem'}}>
                {[{k:'all',l:'Tous'},{k:'reported',l:'🚩 Signalés'},{k:'recent',l:'Récents'}].map(f => (
                  <button key={f.k} onClick={() => setDocFilter(f.k)}
                    style={{ background: docFilter===f.k ? 'rgba(79,142,247,0.15)' : 'none', border: `1px solid ${docFilter===f.k ? 'rgba(79,142,247,0.3)' : '#1C2A45'}`, color: docFilter===f.k ? '#7BB3FF' : '#4A5568', borderRadius:7, padding:'6px 14px', fontSize:'0.78rem', cursor:'pointer', fontFamily:'Outfit', transition:'all 0.15s' }}
                  >{f.l}</button>
                ))}
              </div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               pendingDocs.length === 0 ? <div className="empty">// aucun document trouvé</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Document</th><th>Module</th><th>Uploadé par</th><th>Date</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDocs.map(d => (
                        <tr key={d.id}>
                          <td>
                            <div className="table-name">{d.doc_type?.toUpperCase()} — {d.academic_year}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{d.pages_count} page{d.pages_count>1?'s':''} · {d.file_type}</div>
                            {d.report_count > 0 && (
                              <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:4, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:5, padding:'2px 8px', fontSize:'0.7rem', color:'#F87171', fontFamily:'DM Mono,monospace' }}>
                                🚩 {d.report_count} signalement{d.report_count>1?'s':''}
                              </div>
                            )}
                          </td>
                          <td>
                            <div>{d.module_name}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{d.fac_name}</div>
                          </td>
                          <td className="table-mono">{d.uploader_name || 'Anonyme'}</td>
                          <td className="table-mono">{fmt(d.created_at)}</td>
                          <td>
                            <div className="actions">
                              {d.files?.[0] && <a href={d.files[0]} target="_blank" rel="noreferrer"><button className="act-btn act-view">Voir</button></a>}
                              <button className="act-btn act-approve" onClick={() => verifyDoc(d.id)}>Approuver</button>
                              <button className="act-btn act-rename" onClick={() => { setMovingDocId(movingDocId === d.id ? null : d.id); setMoveSearch(''); setMoveResults([]); setMoveSelId(null) }}>Déplacer</button>
                              <button className="act-btn act-reject" onClick={() => handleDeleteDoc(d)}>Supprimer</button>
                              {d.report_count > 0 && (
                                <button className="act-btn act-rename" onClick={() => handleIgnoreReports(d.id)}>Ignorer</button>
                              )}
                            </div>
                            {movingDocId === d.id && (
                              <div style={{ marginTop:8, padding:'10px 12px', background:'rgba(79,142,247,0.05)', border:'1px solid rgba(79,142,247,0.2)', borderRadius:8 }}>
                                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--accent2)', marginBottom:6 }}>// déplacer vers un autre module</div>
                                <input
                                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', color:'var(--text)', fontSize:'0.78rem', fontFamily:'Outfit,sans-serif', outline:'none', marginBottom:6 }}
                                  placeholder="Recherche module (min 2 chars)..."
                                  value={moveSearch}
                                  onChange={e => { setMoveSearch(e.target.value); searchModules(e.target.value); setMoveSelId(null) }}
                                />
                                {moveResults.length > 0 && (
                                  <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:6 }}>
                                    {moveResults.map(m => (
                                      <div key={m.id}
                                        onClick={() => setMoveSelId(m.id)}
                                        style={{ padding:'5px 8px', borderRadius:5, cursor:'pointer', fontSize:'0.76rem', background: moveSelId === m.id ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', border:`1px solid ${moveSelId === m.id ? 'rgba(79,142,247,0.4)' : 'transparent'}`, color: moveSelId === m.id ? 'var(--accent2)' : 'var(--text2)' }}>
                                        {m.name}
                                        {m.filieres?.name && <span style={{ color:'var(--text3)', fontSize:'0.68rem', marginLeft:6, fontFamily:'DM Mono,monospace' }}>{m.filieres.name}{m.filieres.semester ? ` · S${m.filieres.semester}` : ''}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button
                                  disabled={!moveSelId || moveBusy}
                                  onClick={() => moveDoc(d.id, moveSelId)}
                                  style={{ background: moveSelId ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', border:`1px solid ${moveSelId ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`, color: moveSelId ? 'var(--accent2)' : 'var(--text3)', borderRadius:6, padding:'5px 12px', fontSize:'0.76rem', fontWeight:600, cursor: moveSelId ? 'pointer' : 'not-allowed', fontFamily:'Outfit,sans-serif' }}>
                                  {moveBusy ? 'Déplacement...' : 'Confirmer'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* MODULES */}
          {activeTab === 'modules' && (
            <>
              <div className="section-title">// modules (100 derniers)</div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               pendingMods.length === 0 ? <div className="empty">// aucun module trouvé</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Module</th><th>Filière</th><th>Semestre</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {pendingMods.map(m => (
                        <tr key={m.id}>
                          <td>
                            {renamingId === m.id ? (
                              <input className="rename-input" value={renameVal} onChange={e => setRenameVal(e.target.value)} placeholder="Nouveau nom..."/>
                            ) : (
                              <span className="table-name">{m.name}</span>
                            )}
                          </td>
                          <td>
                            <div>{m.filieres?.name || '—'}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{m.filieres?.faculties?.universities?.name || '—'}</div>
                          </td>
                          <td className="table-mono">{m.semester}</td>
                          <td>
                            <div className="actions">
                              {renamingId === m.id ? (
                                <>
                                  <button className="act-btn act-approve" onClick={() => renameMod(m)}>Sauvegarder</button>
                                  <button className="act-btn act-view" onClick={() => { setRenamingId(null); setRenameVal(''); }}>Annuler</button>
                                </>
                              ) : (
                                <>
                                  <button className="act-btn act-rename" onClick={() => { setRenamingId(m.id); setRenameVal(m.name); }}>Renommer</button>
                                  <button className="act-btn act-reject" onClick={() => rejectMod(m)}>Supprimer</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* SCHOOLS */}
          {activeTab === 'schools' && (
            <>
              <div className="section-title">// demandes d'ajout d'écoles</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               schoolReqs.length === 0 ? <div className="empty">// aucune demande d'école</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Établissement</th><th>Type de demande</th><th>Demandé par</th><th>Statut</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {schoolReqs.map(s => {
                        const rt = s.request_type || 'independent'
                        const RT_LABEL = { independent:'École indép.', faculty:'Faculté', university_with_faculties:'Université' }
                        const RT_COLOR = { independent:'rgba(79,142,247,0.1)', faculty:'rgba(45,212,191,0.08)', university_with_faculties:'rgba(245,158,11,0.08)' }
                        const RT_BORDER = { independent:'rgba(79,142,247,0.2)', faculty:'rgba(45,212,191,0.18)', university_with_faculties:'rgba(245,158,11,0.22)' }
                        const RT_TEXT = { independent:'var(--accent2)', faculty:'var(--teal2)', university_with_faculties:'#F59E0B' }
                        return (
                          <tr key={s.id}>
                            <td>
                              <div className="table-name">{s.school_name}</div>
                              {rt === 'faculty' && s.universities?.name && (
                                <div className="table-mono" style={{color:'var(--text3)'}}>Sous : {s.universities.name}</div>
                              )}
                              {s.city && <div className="table-mono" style={{color:'var(--text3)'}}>{s.city}</div>}
                              {rt === 'university_with_faculties' && s.details?.length > 0 && (
                                <div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:3}}>
                                  {s.details.map((f,i) => (
                                    <span key={i} style={{fontFamily:'DM Mono,monospace',fontSize:'0.58rem',background:'rgba(255,255,255,0.04)',border:'1px solid var(--border)',borderRadius:3,padding:'1px 6px',color:'var(--text3)'}}>
                                      {f.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',background:RT_COLOR[rt],border:`1px solid ${RT_BORDER[rt]}`,color:RT_TEXT[rt],padding:'2px 8px',borderRadius:4}}>
                                {RT_LABEL[rt]}
                              </span>
                              {s.school_type && (
                                <div className="table-mono" style={{color:'var(--text3)',marginTop:3}}>{s.school_type}</div>
                              )}
                            </td>
                            <td>
                              <div className="table-name">{s.user_profiles?.name || '—'}</div>
                              <div className="table-mono" style={{color:'var(--text3)'}}>{fmt(s.created_at)}</div>
                            </td>
                            <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                            <td>
                              {s.status === 'pending' && (
                                <div className="actions">
                                  <button className="act-btn act-approve" onClick={() => approveSchool(s.id)}>Approuver</button>
                                  <button className="act-btn act-reject" onClick={() => rejectSchool(s.id)}>Rejeter</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <>
              <div className="section-title">// gestion des utilisateurs</div>
              {loading ? Array(5).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               users.length === 0 ? <div className="empty">// aucun utilisateur</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Utilisateur</th><th>Points</th><th>Uploads</th><th>Inscrit le</th><th>Statut</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
                              <span className="table-name">{u.name || 'Sans nom'}</span>
                              {u.is_moderator && !u.is_admin && (
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.58rem',fontWeight:700,padding:'1px 6px',borderRadius:3,background:'rgba(45,212,191,0.1)',color:'var(--teal2)',border:'1px solid rgba(45,212,191,0.25)'}}>MOD</span>
                              )}
                            </div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{u.email}</div>
                          </td>
                          <td className="table-mono">{u.points || 0}</td>
                          <td className="table-mono">{u.uploads_count || 0}</td>
                          <td className="table-mono">{fmt(u.created_at)}</td>
                          <td>
                            <span className={`badge ${u.is_admin ? 'badge-approved' : u.is_banned ? 'badge-flagged' : 'badge-verified'}`}>
                              {u.is_admin ? 'ADMIN' : u.is_banned ? 'BANNI' : 'ACTIF'}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              {!u.is_admin && (
                                <button
                                  className="act-btn"
                                  style={u.is_moderator ? {background:'rgba(45,212,191,0.1)',color:'var(--teal2)',border:'1px solid rgba(45,212,191,0.25)'} : {background:'rgba(45,212,191,0.05)',color:'var(--text3)',border:'1px solid var(--border)'}}
                                  onClick={() => toggleModerator(u.id, u.is_moderator)}>
                                  {u.is_moderator ? 'Retirer MOD' : '+ MOD'}
                                </button>
                              )}
                              {!u.is_admin && u.is_banned && (
                                <button className="act-btn act-approve" onClick={() => unbanUser(u.id)}>Débannir</button>
                              )}
                              {!u.is_admin && !u.is_banned && (
                                <button className="act-btn act-ban" onClick={() => setBanningId(banningId === u.id ? null : u.id)}>Bannir</button>
                              )}
                            </div>
                            {banningId === u.id && (
                              <div style={{ marginTop:8, padding:'10px 12px', background:'rgba(248,113,113,0.04)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8 }}>
                                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--red)', marginBottom:8 }}>// durée du bannissement</div>
                                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                                  {[{k:'24h',l:'24 heures'},{k:'7d',l:'7 jours'},{k:'30d',l:'30 jours'},{k:'perm',l:'Permanent'}].map(opt => (
                                    <button key={opt.k} onClick={() => setBanDuration(opt.k)}
                                      style={{ padding:'4px 10px', borderRadius:5, fontSize:'0.72rem', cursor:'pointer', background: banDuration===opt.k ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.03)', border:`1px solid ${banDuration===opt.k ? 'rgba(248,113,113,0.5)' : 'var(--border)'}`, color: banDuration===opt.k ? 'var(--red)' : 'var(--text3)', fontFamily:'DM Mono,monospace' }}>
                                      {opt.l}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', color:'var(--text)', fontSize:'0.78rem', fontFamily:'Outfit,sans-serif', outline:'none', marginBottom:8 }}
                                  placeholder="Raison (optionnel)..."
                                  value={banReason}
                                  onChange={e => setBanReason(e.target.value)}
                                />
                                <button onClick={() => confirmBan(u)} disabled={banBusy}
                                  style={{ background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'var(--red)', borderRadius:6, padding:'5px 14px', fontSize:'0.76rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
                                  {banBusy ? 'Bannissement...' : 'Confirmer le bannissement'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* SENPAI MODERATION */}
          {activeTab === 'senpai' && (
            <>
              <div className="section-title">// senpai zone — 100 derniers posts</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel" style={{height:100}}/>) :
               flaggedPosts.length === 0 ? (
                <div className="empty">// aucun post trouvé</div>
               ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {flaggedPosts.map(post => {
                    const TYPE_COLORS = {
                      survival_guide:'#4F8EF7', cheat_code:'#FBD34D',
                      timeline:'#4ADE80', red_flag:'#F87171', path_review:'#C4B5FD',
                    }
                    const TYPE_LABELS = {
                      survival_guide:'Guide de survie', cheat_code:'Cheat Code',
                      timeline:'Timeline', red_flag:'Red Flag', path_review:'Bilan de parcours',
                    }
                    const color = TYPE_COLORS[post.post_type] || '#94A3B8'
                    return (
                      <div key={post.id} style={{ background:'var(--surface)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, padding:'1rem 1.25rem' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color, background:`${color}18`, padding:'2px 8px', borderRadius:4, border:`1px solid ${color}33` }}>
                                {TYPE_LABELS[post.post_type] || post.post_type}
                              </span>
                              {post.is_anonymous && (
                                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#94A3B8', background:'rgba(148,163,184,0.08)', padding:'2px 8px', borderRadius:4, border:'1px solid rgba(148,163,184,0.15)' }}>🎭 Anonyme</span>
                              )}
                              {!post.is_approved && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#F87171', background:'rgba(248,113,113,0.08)', padding:'2px 8px', borderRadius:4, border:'1px solid rgba(248,113,113,0.2)' }}>⚠ Signalé</span>}
                            </div>
                            <div style={{ fontSize:'0.92rem', fontWeight:700, color:'#fff', marginBottom:4 }}>{post.title}</div>
                            <div style={{ fontSize:'0.78rem', color:'#94A3B8', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:8 }}>
                              {post.content}
                            </div>
                            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#4A5568' }}>
                              Par : {post.user_profiles?.name || '—'} · {post.user_profiles?.email || '—'} · {fmt(post.created_at)}
                            </div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                            <button className="act-btn act-ban" onClick={() => deletePost(post)}>✕ Supprimer</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
               )}
            </>
          )}

          {/* FILIÈRES */}
          {activeTab === 'filieres' && (
            <>
              <div className="section-title">// demandes d'ajout de filières</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               filiereReqs.length === 0 ? <div className="empty">// aucune demande de filière</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Filière</th><th>Faculté / Université</th><th>Semestres</th><th>Demandé par</th><th>Statut</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filiereReqs.map(f => (
                        <tr key={f.id}>
                          <td><div className="table-name">{f.name}</div></td>
                          <td>
                            <div>{f.faculties?.name || '—'}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{f.faculties?.universities?.name || '—'}</div>
                          </td>
                          <td className="table-mono">{f.total_semesters ?? '—'}</td>
                          <td>
                            <div className="table-name">{f.user_profiles?.name || '—'}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{fmt(f.created_at)}</div>
                          </td>
                          <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                          <td>
                            {f.status === 'pending' && (
                              <div className="actions">
                                <button className="act-btn act-approve" onClick={() => approveFiliere(f.id)}>Approuver</button>
                                <button className="act-btn act-reject" onClick={() => rejectFiliere(f.id)}>Rejeter</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <>
              <div className="section-title">// messages des utilisateurs</div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               messages.length === 0 ? <div className="empty">// aucun message</div> : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {messages.map(m => (
                    <div key={m.id}
                      onClick={() => !m.read && markMsgRead(m.id)}
                      style={{ background: m.read ? 'var(--surface)' : 'rgba(79,142,247,0.05)', border:`1px solid ${m.read ? 'var(--border)' : 'rgba(79,142,247,0.25)'}`, borderRadius:10, padding:'0.85rem 1.1rem', cursor: m.read ? 'default' : 'pointer', transition:'all 0.15s' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {!m.read && <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', display:'inline-block', flexShrink:0 }} />}
                          <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text)' }}>{m.user_profiles?.name || 'Anonyme'}</span>
                        </div>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'var(--text3)' }}>{fmt(m.created_at)}</span>
                      </div>
                      <div style={{ fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{m.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <>
              <div className="section-title">// analytiques plateforme</div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel" style={{height:80}}/>) : analytics && (
                <>
                  {/* HEALTH */}
                  <div className="section-title" style={{marginTop:0}}>// santé plateforme</div>
                  <div className="stats-grid" style={{marginBottom:'2rem'}}>
                    <div className="stat-card"><div className="stat-val blue">{analytics.totalDocs}</div><div className="stat-label">Documents total</div></div>
                    <div className="stat-card"><div className="stat-val blue">{analytics.totalUsers}</div><div className="stat-label">Utilisateurs</div></div>
                    <div className="stat-card"><div className={`stat-val ${analytics.flaggedDocs > 0 ? 'red' : 'green'}`}>{analytics.flaggedDocs}</div><div className="stat-label">Docs signalés</div></div>
                  </div>

                  {/* TOP MODULES */}
                  <div className="section-title">// top 10 modules les plus téléchargés</div>
                  <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'1.1rem 1.25rem', marginBottom:'2rem' }}>
                    {analytics.topModules.length === 0
                      ? <div className="empty" style={{padding:'1rem 0'}}>// pas encore de données</div>
                      : analytics.topModules.map((m, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color: i===0?'#F59E0B':i===1?'#94A3B8':i===2?'#CD7F32':'var(--text3)', width:24, textAlign:'right', flexShrink:0 }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                          </span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</span>
                              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.68rem', color:'var(--accent2)', flexShrink:0, marginLeft:8 }}>{m.total} DL</span>
                            </div>
                            <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', background:`linear-gradient(90deg,var(--accent),var(--teal))`, width:`${Math.round((m.total / (analytics.topModules[0]?.total || 1)) * 100)}%`, borderRadius:3, transition:'width 0.4s' }} />
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </>
              )}
              {!analytics && !loading && <div className="empty">// données non disponibles</div>}
            </>
          )}

        </main>
      </div>
    </div>
  )
}