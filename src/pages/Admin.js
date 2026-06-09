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
  const [users,        setUsers]        = useState([])
  const [topUsers,     setTopUsers]     = useState([])
  const [recentDocs,   setRecentDocs]   = useState([])
  const [flaggedPosts, setFlaggedPosts] = useState([])

  // Doc filter
  const [docFilter, setDocFilter] = useState('all')

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
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'senpai') loadSenpai()
  }, [activeTab, isAdmin]) // eslint-disable-line

  // Reload docs when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === 'documents') loadDocs(docFilter)
  }, [docFilter]) // eslint-disable-line

  const loadStats = async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [docs, mods, schools, usrs, docsMonth, docsLastMonth, usrsMonth, top10, recent, flagged] = await Promise.all([
      supabase.from('documents').select('*', { count:'exact', head:true }),
      supabase.from('modules').select('*', { count:'exact', head:true }).eq('verified', false),
      supabase.from('school_requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
      supabase.from('documents').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
      supabase.from('documents').select('*', { count:'exact', head:true }).gte('created_at', lastMonthStart).lt('created_at', monthStart),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
      supabase.from('user_profiles').select('id, name, email, points, uploads_count').order('points', { ascending: false }).limit(10),
      supabase.from('admin_documents').select('id, doc_type, module_name, uploader_name, created_at, files, academic_year').order('created_at', { ascending: false }).limit(10),
      supabase.from('senpai_posts').select('*', { count:'exact', head:true }).eq('is_approved', false),
    ])
    setStats({
      pendingDocs:     docs.count      || 0,
      pendingMods:     mods.count      || 0,
      pendingSchools:  schools.count   || 0,
      totalUsers:      usrs.count      || 0,
      docsThisMonth:   docsMonth.count || 0,
      docsLastMonth:   docsLastMonth.count || 0,
      usersThisMonth:  usrsMonth.count || 0,
      flaggedPosts:    flagged.count   || 0,
    })
    setTopUsers(top10.data   || [])
    setRecentDocs(recent.data || [])
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
      .eq('verified', false)
      .order('created_at', { ascending: false })
    setPendingMods(data || [])
    setLoading(false)
  }

  const loadSchools = async () => {
    setLoading(true)
    const { data } = await supabase.from('school_requests').select('*, user_profiles(name, email)').order('created_at', { ascending: false })
    setSchoolReqs(data || [])
    setLoading(false)
  }

  const loadSenpai = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('senpai_posts')
      .select('*, user_profiles(name, email)')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
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

  const banUser = async (id, currentBan) => {
    const msg = currentBan ? 'Débannir cet utilisateur ?' : 'Bannir cet utilisateur ?'
    if (!window.confirm(msg)) return
    await supabase.from('user_profiles').update({ is_banned: !currentBan }).eq('id', id)
    setUsers(u => u.map(x => x.id === id ? { ...x, is_banned: !currentBan } : x))
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
    { k:'overview',  label:'Vue d\'ensemble', icon:'~>' },
    { k:'documents', label:'Documents',        icon:'[]', count: stats?.pendingDocs },
    { k:'modules',   label:'Modules',          icon:'#',  count: stats?.pendingMods },
    { k:'schools',   label:'Écoles',           icon:'@',  count: stats?.pendingSchools },
    { k:'users',     label:'Utilisateurs',     icon:'::' },
    { k:'senpai',    label:'Senpai Zone',      icon:'🧠', count: stats?.flaggedPosts },
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
                  <div className="overview-col-title">// activité récente</div>
                  <div className="feed">
                    {recentDocs.map(d => (
                      <div key={d.id} className="feed-item">
                        <div className="feed-dot" />
                        <div className="feed-info">
                          <div className="feed-main">{d.module_name || 'Module inconnu'}</div>
                          <div className="feed-sub">
                            {d.doc_type?.toUpperCase()}{d.academic_year ? ` · ${d.academic_year}` : ''} · par {d.uploader_name || 'Anonyme'}
                          </div>
                        </div>
                        <div className="feed-time">{fmt(d.created_at)}</div>
                      </div>
                    ))}
                    {recentDocs.length === 0 && <div className="empty">// aucune activité récente</div>}
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
                              <button className="act-btn act-reject" onClick={() => handleDeleteDoc(d)}>Supprimer</button>
                              {d.report_count > 0 && (
                                <button className="act-btn act-rename" onClick={() => handleIgnoreReports(d.id)}>Ignorer</button>
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

          {/* MODULES */}
          {activeTab === 'modules' && (
            <>
              <div className="section-title">// modules à vérifier</div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               pendingMods.length === 0 ? <div className="empty">// tous les modules sont vérifiés</div> : (
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
                                  <button className="act-btn act-approve" onClick={() => approveMod(m)}>Approuver</button>
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
                      <tr><th>École</th><th>Ville</th><th>Type</th><th>Demandé par</th><th>Statut</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {schoolReqs.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div className="table-name">{s.school_name}</div>
                            {s.filieres && <div className="table-mono" style={{color:'var(--text3)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.filieres}</div>}
                          </td>
                          <td>{s.city}</td>
                          <td><span className={`badge badge-${s.school_type==='public'?'approved':s.school_type==='private'?'flagged':'pending'}`}>{s.school_type}</span></td>
                          <td className="table-mono">{s.user_profiles?.name || '—'}</td>
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
                      ))}
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
                            <div className="table-name">{u.name || 'Sans nom'}</div>
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
                            {!u.is_admin && (
                              <button className={`act-btn ${u.is_banned ? 'act-approve' : 'act-ban'}`} onClick={() => banUser(u.id, u.is_banned)}>
                                {u.is_banned ? 'Débannir' : 'Bannir'}
                              </button>
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
              <div className="section-title">// senpai zone — posts signalés</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel" style={{height:100}}/>) :
               flaggedPosts.length === 0 ? (
                <div className="empty">// aucun post en attente de vérification ✓</div>
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
                              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#F87171', background:'rgba(248,113,113,0.08)', padding:'2px 8px', borderRadius:4, border:'1px solid rgba(248,113,113,0.2)' }}>⚠ Signalé</span>
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
                            <button className="act-btn act-approve" onClick={() => approvePost(post)}>✓ Approuver</button>
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

        </main>
      </div>
    </div>
  )
}