import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ConfirmModal from '../components/ConfirmModal'

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
  .mod-badge {
    font-family:'DM Mono',monospace; font-size:0.62rem;
    background:rgba(79,142,247,0.1); border:1px solid rgba(79,142,247,0.25);
    color:var(--teal2); padding:3px 10px; border-radius:4px; letter-spacing:1px;
  }
  .nav-right { display:flex; gap:8px; align-items:center; }
  .nav-user { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--text3); }
  .btn-ghost { background:none; border:1px solid var(--border); color:var(--text2); padding:5px 14px; border-radius:7px; font-size:0.8rem; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .btn-ghost:hover { border-color:var(--borderhi); color:var(--text); }

  /* LAYOUT */
  .layout { display:flex; flex:1; height:calc(100vh - 58px); overflow:hidden; }

  /* SIDEBAR */
  .sidebar { width:220px; flex-shrink:0; border-right:1px solid var(--border); background:var(--surface); padding:1.25rem; }
  .sidebar-title { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--teal2); letter-spacing:2px; text-transform:uppercase; margin-bottom:1rem; }
  .nav-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:9px 12px; border-radius:8px; cursor:pointer; transition:all 0.15s;
    margin-bottom:3px; border:1px solid transparent;
  }
  .nav-item:hover { background:var(--s2); }
  .nav-item.active { background:rgba(79,142,247,0.06); border-color:rgba(79,142,247,0.15); }
  .nav-item-left { display:flex; align-items:center; gap:8px; }
  .nav-item-icon { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); width:16px; }
  .nav-item.active .nav-item-icon { color:var(--teal2); }
  .nav-item-label { font-size:0.82rem; color:var(--text2); font-weight:500; }
  .nav-item.active .nav-item-label { color:var(--white); }
  .nav-badge {
    font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:700;
    background:rgba(248,113,113,0.15); color:var(--red); border:1px solid rgba(248,113,113,0.2);
    padding:1px 7px; border-radius:4px; min-width:20px; text-align:center;
  }
  .nav-badge.yellow { background:rgba(251,211,77,0.1); color:var(--yellow); border-color:rgba(251,211,77,0.2); }

  /* MAIN */
  .main { flex:1; overflow-y:auto; padding:1.75rem 2rem; }
  .section-title { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--teal2); letter-spacing:2px; text-transform:uppercase; margin-bottom:1.25rem; }

  /* TABLE */
  .table-wrap { overflow-x:auto; border-radius:10px; border:1px solid var(--border); }
  .table { width:100%; border-collapse:collapse; }
  .table th { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); text-transform:uppercase; letter-spacing:1px; padding:10px 14px; text-align:left; background:var(--s2); border-bottom:1px solid var(--border); }
  .table td { padding:11px 14px; border-bottom:1px solid rgba(28,42,69,0.5); vertical-align:middle; }
  .table tr:last-child td { border-bottom:none; }
  .table tr:hover td { background:rgba(255,255,255,0.012); }
  .table-name { font-size:0.82rem; font-weight:600; color:var(--text); }
  .table-mono { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--text2); }

  /* ACTIONS */
  .actions { display:flex; gap:6px; flex-wrap:wrap; }
  .act-btn { border:none; border-radius:6px; padding:4px 10px; font-size:0.72rem; font-weight:600; cursor:pointer; font-family:'DM Mono',monospace; transition:all 0.15s; }
  .act-view    { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.2); }
  .act-view:hover { background:rgba(79,142,247,0.15); }
  .act-approve { background:rgba(74,222,128,0.08); color:var(--green); border:1px solid rgba(74,222,128,0.2); }
  .act-approve:hover { background:rgba(74,222,128,0.15); }
  .act-reject  { background:rgba(248,113,113,0.08); color:var(--red); border:1px solid rgba(248,113,113,0.2); }
  .act-reject:hover { background:rgba(248,113,113,0.15); }
  .act-rename  { background:rgba(251,211,77,0.08); color:var(--yellow); border:1px solid rgba(251,211,77,0.2); }
  .act-rename:hover { background:rgba(251,211,77,0.15); }

  /* BADGES */
  .badge { font-family:'DM Mono',monospace; font-size:0.6rem; padding:2px 8px; border-radius:4px; font-weight:700; letter-spacing:0.5px; }
  .badge-pending  { background:rgba(251,211,77,0.1); color:var(--yellow); border:1px solid rgba(251,211,77,0.2); }
  .badge-approved { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.2); }
  .badge-rejected { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }
  .badge-verified { background:rgba(79,142,247,0.1); color:var(--accent2); border:1px solid rgba(79,142,247,0.2); }
  .badge-flagged  { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }

  /* STAT CARDS */
  .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:1.75rem; }
  .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:1rem 1.25rem; }
  .stat-n { font-size:1.6rem; font-weight:700; color:var(--white); font-family:'DM Mono',monospace; line-height:1; margin-bottom:4px; }
  .stat-l { font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; }

  /* SKEL */
  .skel { background:linear-gradient(90deg,var(--surface) 25%,var(--s2) 50%,var(--surface) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; height:48px; margin-bottom:8px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .empty { font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--text3); padding:2rem; text-align:center; }

  /* DENIED */
  .denied { text-align:center; padding:3rem; }
  .denied-code { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); letter-spacing:2px; margin-bottom:1rem; }
  .denied-title { font-size:1.4rem; font-weight:700; color:var(--white); margin-bottom:0.5rem; }
  .denied-desc { font-size:0.85rem; color:var(--text2); }

  /* MODULE ADD FORM */
  .add-mod-form { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:1.25rem; margin-bottom:1.25rem; }
  .add-mod-row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; }
  .field-label { font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px; }
  .field-input { background:var(--s2); border:1px solid var(--border); border-radius:7px; padding:8px 12px; color:var(--text); font-size:0.82rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s; }
  .field-input:focus { border-color:var(--teal); }
  .field-input::placeholder { color:var(--text3); }
  .rename-input { background:var(--s2); border:1px solid var(--teal); border-radius:6px; padding:5px 10px; color:var(--text); font-size:0.8rem; font-family:'Outfit',sans-serif; outline:none; width:200px; }

  /* OVERVIEW GRID */
  .overview-cols { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
  .overview-col-title { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.85rem; }

  /* MESSAGES RESPONSIVE */
  .msg-layout { display:flex; border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .msg-left   { width:280px; flex-shrink:0; border-right:1px solid var(--border); display:flex; flex-direction:column; background:var(--surface); overflow-y:auto; }
  .msg-right  { flex:1; display:flex; flex-direction:column; background:var(--surface); overflow:hidden; min-width:0; }
  @media(max-width:700px) {
    .msg-layout { flex-direction:column; height:auto !important; }
    .msg-left   { width:100%; max-height:220px; border-right:none; border-bottom:1px solid var(--border); }
    .msg-right  { min-height:320px; }
  }

  @media(max-width:900px) {
    .layout { flex-direction:column; height:auto; overflow:visible; }
    .sidebar { width:100%; height:auto; border-right:none; border-bottom:1px solid var(--border); display:flex; flex-wrap:wrap; gap:4px; padding:0.75rem; }
    .sidebar-title { display:none; }
    .overview-cols { grid-template-columns:1fr; }
  }
`

export default function ModeratorPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading]     = useState(false)

  const [stats,       setStats]       = useState(null)
  const [flaggedDocs, setFlaggedDocs] = useState([])
  const [flaggedPosts,setFlaggedPosts]= useState([])
  const [schoolReqs,  setSchoolReqs]  = useState([])
  const [filiereReqs, setFiliereReqs] = useState([])
  const [modules,     setModules]     = useState([])
  const [users,       setUsers]       = useState([])

  const [modSearch,    setModSearch]    = useState('')
  const modSearchDebounceRef = useRef(null)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const [newModName,   setNewModName]   = useState('')
  const [newModFilId,  setNewModFilId]  = useState('')
  const [newModSem,    setNewModSem]    = useState('')

  const [modal, setModal] = useState(null)
  const showAlert = (message) => setModal({ message, confirmText: 'OK', confirmColor: '#4F8EF7', onCancel: null, onConfirm: () => setModal(null) })

  // Ban state
  const [banningId,  setBanningId]  = useState(null)
  const [banDuration,setBanDuration]= useState('7d')
  const [banReason,  setBanReason]  = useState('')
  const [banBusy,    setBanBusy]    = useState(false)
  const [filieresList, setFilieresList] = useState([])

  // Messages state
  const [msgConvos,      setMsgConvos]      = useState([])
  const [selectedConvo,  setSelectedConvo]  = useState(null)
  const [msgThread,      setMsgThread]      = useState([])
  const [replyText,      setReplyText]      = useState('')
  const [replySending,   setReplySending]   = useState(false)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'

  const fmt = (d) => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'2-digit' })

  useEffect(() => {
    document.title = 'Panneau Modérateur — 9rawZid9ra'
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user
      if (!u) { setAuthLoading(false); return }
      setUser(u)
      const { data: prof } = await supabase.from('user_profiles')
        .select('name, is_admin, is_moderator').eq('id', u.id).single()
      setProfile(prof)
      setAuthLoading(false)
    }
    check()
  }, [])

  useEffect(() => {
    if (!profile) return
    const allowed = profile.is_moderator || profile.is_admin
    if (!allowed) return
    if (activeTab === 'overview') loadStats()
    if (activeTab === 'documents') loadFlaggedDocs()
    if (activeTab === 'senpai') loadFlaggedPosts()
    if (activeTab === 'schools') loadSchools()
    if (activeTab === 'filieres') loadFilieres()
    if (activeTab === 'modules') loadModules()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'messages') loadMessages()
  }, [activeTab, profile]) // eslint-disable-line

  const loadStats = async () => {
    const [docs, posts, schools, filieres, mods, usrs] = await Promise.all([
      supabase.from('admin_documents').select('*', { count:'exact', head:true }).gt('report_count', 0),
      supabase.from('senpai_posts').select('*', { count:'exact', head:true }).eq('is_flagged', true),
      supabase.from('school_requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('filiere_suggestions').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('modules').select('*', { count:'exact', head:true }),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
    ])
    setStats({
      flaggedDocs:    docs.count     || 0,
      flaggedPosts:   posts.count    || 0,
      pendingSchools: schools.count  || 0,
      pendingFils:    filieres.count || 0,
      totalModules:   mods.count     || 0,
      totalUsers:     usrs.count     || 0,
    })
  }

  const loadFlaggedDocs = async () => {
    setLoading(true)
    const { data } = await supabase.from('admin_documents')
      .select('id, doc_type, module_name, uploader_name, created_at, files, academic_year, pages_count, file_type, report_count, fac_name')
      .or('report_count.gt.0,is_flagged.eq.true')
      .order('report_count', { ascending: false })
      .limit(50)
    setFlaggedDocs(data || [])
    setLoading(false)
  }

  const loadFlaggedPosts = async () => {
    setLoading(true)
    const { data } = await supabase.from('senpai_posts')
      .select('id, title, content, post_type, is_anonymous, created_at, user_profiles(name)')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false })
      .limit(50)
    setFlaggedPosts(data || [])
    setLoading(false)
  }

  const loadSchools = async () => {
    setLoading(true)
    const { data } = await supabase.from('school_requests')
      .select('*, user_profiles(name), universities!school_requests_parent_university_id_fkey(name)')
      .order('created_at', { ascending: false })
    setSchoolReqs(data || [])
    setLoading(false)
  }

  const loadFilieres = async () => {
    setLoading(true)
    const { data } = await supabase.from('filiere_suggestions')
      .select('*, user_profiles(name), faculties(name, universities(name))')
      .order('created_at', { ascending: false })
    setFiliereReqs(data || [])
    setLoading(false)
  }

  const loadModules = async () => {
    setLoading(true)
    const [{ data: mods }, { data: fils }] = await Promise.all([
      supabase.from('modules').select('*, filieres(name, total_semesters)')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('filieres').select('id, name, total_semesters').order('name'),
    ])
    setModules(mods || [])
    setFilieresList(fils || [])
    setLoading(false)
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('user_profiles')
      .select('id, name, uploads_count, points, is_admin, is_banned, banned_until, ban_reason, universities(name)')
      .order('created_at', { ascending: false }).limit(100)
    setUsers(data || [])
    setLoading(false)
  }

  const confirmBan = async (u) => {
    setBanBusy(true)
    const days = { '24h': 1, '7d': 7, '30d': 30, 'perm': null }[banDuration]
    const bannedUntil = days != null ? new Date(Date.now() + days * 86400000).toISOString() : null
    const { data: ok } = await supabase.rpc('mod_ban_user', {
      p_target_id: u.id,
      p_is_banned: true,
      p_banned_until: bannedUntil,
      p_ban_reason: banReason.trim() || null,
    })
    if (!ok) { showAlert('Erreur lors du bannissement.'); setBanBusy(false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: true, banned_until: bannedUntil, ban_reason: banReason.trim() || null } : x))
    setBanningId(null)
    setBanReason('')
    setBanBusy(false)
  }

  const unbanUser = async (id) => {
    const { data: ok } = await supabase.rpc('mod_ban_user', { p_target_id: id, p_is_banned: false, p_banned_until: null, p_ban_reason: null })
    if (!ok) { showAlert('Erreur lors du débannissement.'); return }
    setUsers(prev => prev.map(x => x.id === id ? { ...x, is_banned: false, banned_until: null, ban_reason: null } : x))
  }

  const getLevel = (pts) => pts >= 600 ? {l:'Légende',c:'rank-legende'} : pts >= 300 ? {l:'Senpai',c:'rank-senpai'} : pts >= 100 ? {l:'Contributeur',c:'rank-contrib'} : {l:'Étudiant',c:'rank-etudiant'}

  const verifyDoc = async (id) => {
    // Only award points if this was a held-for-review upload that never got
    // published/awarded (is_verified false) — a previously-published doc that
    // got reported later already earned its points at upload time.
    const { data: doc } = await supabase.from('documents').select('is_flagged, is_verified, uploader_id').eq('id', id).single()
    const wasHeldForReview = doc?.is_flagged && !doc?.is_verified
    await supabase.from('documents').update({ is_flagged: false, is_verified: true, report_count: 0 }).eq('id', id)
    if (wasHeldForReview && doc.uploader_id) {
      const { data: prof } = await supabase.from('user_profiles').select('points, uploads_count').eq('id', doc.uploader_id).single()
      await supabase.from('user_profiles').update({
        points: (prof?.points || 0) + 50,
        uploads_count: (prof?.uploads_count || 0) + 1,
      }).eq('id', doc.uploader_id)
      await supabase.from('points_log').insert({ user_id: doc.uploader_id, points: 50, reason: 'Upload approuvé après modération', document_id: id })
    }
    setFlaggedDocs(d => d.filter(x => x.id !== id))
  }

  const deleteDoc = (doc) => {
    setModal({
      title: 'Supprimer ce document ?',
      message: 'Action irréversible.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        if (doc.files?.length > 0) {
          for (const url of doc.files) {
            const path = url.split('/documents/')[1]
            if (path) await supabase.storage.from('documents').remove([path])
          }
        }
        await supabase.from('document_reactions').delete().eq('document_id', doc.id)
        await supabase.from('downloads_log').delete().eq('document_id', doc.id)
        await supabase.from('documents').delete().eq('id', doc.id)
        setFlaggedDocs(d => d.filter(x => x.id !== doc.id))
      },
    })
  }

  const approvePost = async (id) => {
    await supabase.from('senpai_posts').update({ is_flagged: false, is_approved: true }).eq('id', id)
    setFlaggedPosts(p => p.filter(x => x.id !== id))
  }

  const deletePost = (post) => {
    setModal({
      title: 'Supprimer ce post ?',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        await supabase.from('senpai_posts').delete().eq('id', post.id)
        setFlaggedPosts(p => p.filter(x => x.id !== post.id))
      },
    })
  }

  const renameMod = async (mod) => {
    if (!renameVal.trim()) return
    await supabase.from('modules').update({ name: renameVal.trim() }).eq('id', mod.id)
    setModules(m => m.map(x => x.id === mod.id ? { ...x, name: renameVal.trim() } : x))
    setRenamingId(null)
    setRenameVal('')
  }

  const addModule = async () => {
    if (!newModName.trim() || !newModFilId) return
    const { data } = await supabase.from('modules').insert({
      name: newModName.trim(),
      filiere_id: parseInt(newModFilId),
      semester: newModSem ? parseInt(newModSem) : null,
      verified: true,
    }).select('*, filieres(name, total_semesters)').single()
    if (data) {
      setModules(m => [data, ...m])
      setNewModName('')
      setNewModFilId('')
      setNewModSem('')
    }
  }

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_get_inbox')
    if (!data?.length) { setMsgConvos([]); setUnreadMsgCount(0); setLoading(false); return }
    const convos = data.map(row => ({
      id:       row.user_id,
      name:     row.username || 'Anonyme',
      unread:   Number(row.unread_count) || 0,
      lastMsg:  row.last_message,
      lastDate: row.last_message_time,
    }))
    setMsgConvos(convos)
    setUnreadMsgCount(convos.reduce((s, c) => s + c.unread, 0))
    setLoading(false)
  }

  const loadThread = async (conv) => {
    setSelectedConvo(conv)
    setMsgThread([])
    const { data } = await supabase.rpc('admin_get_thread', { p_user_id: conv.id })
    setMsgThread(data || [])
    await supabase.rpc('admin_get_inbox').then()
    setMsgConvos(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))
    setUnreadMsgCount(prev => Math.max(0, prev - (conv.unread || 0)))
  }

  const sendReply = async () => {
    if (!replyText.trim() || replySending || !selectedConvo) return
    setReplySending(true)
    const content = replyText.trim()
    setReplyText('')
    await supabase.rpc('mod_send_message', { p_receiver_id: selectedConvo.id, p_content: content })
    const { data } = await supabase.rpc('admin_get_thread', { p_user_id: selectedConvo.id })
    setMsgThread(data || [])
    await supabase.from('notifications').insert({
      user_id: selectedConvo.id,
      type:    'message_reply',
      content: `Support 9rawZid9ra : ${content.slice(0, 80)}`,
      read:    false,
    })
    setReplySending(false)
  }

  const searchMods = async (q) => {
    if (q.length < 2) { loadModules(); return }
    const { data } = await supabase.from('modules')
      .select('*, filieres(name, total_semesters)')
      .ilike('name', `%${q}%`).limit(50)
    setModules(data || [])
  }

  const TYPE_COLORS = { survival_guide:'#4F8EF7', cheat_code:'#FBD34D', timeline:'#4ADE80', red_flag:'#F87171', path_review:'#C4B5FD' }
  const TYPE_LABELS = { survival_guide:'Guide de survie', cheat_code:'Cheat Code', timeline:'Timeline', red_flag:'Red Flag', path_review:'Bilan de parcours' }

  if (authLoading) return (
    <div className="page"><style>{css}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'DM Mono',fontSize:'0.75rem',color:'var(--text3)'}}>Chargement...</div>
    </div>
  )

  if (!user || !profile || (!profile.is_moderator && !profile.is_admin)) return (
    <div className="page"><style>{css}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div className="denied">
          <div className="denied-code">// 403 — access forbidden</div>
          <div className="denied-title">Accès non autorisé</div>
          <div className="denied-desc">Cette page est réservée aux modérateurs.</div>
          <button style={{marginTop:'1.5rem',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text2)',padding:'8px 20px',borderRadius:8,cursor:'pointer',fontSize:'0.82rem',fontFamily:'Outfit,sans-serif'}} onClick={() => navigate('/')}>Retour à l'accueil</button>
        </div>
      </div>
    </div>
  )

  const TABS = [
    { k:'overview',  label:'Vue d\'ensemble', icon:'~>' },
    { k:'documents', label:'Documents signalés', icon:'[]', count: stats?.flaggedDocs },
    { k:'senpai',    label:'Senpai Zone', icon:'🧠', count: stats?.flaggedPosts },
    { k:'schools',   label:'Écoles', icon:'@', count: stats?.pendingSchools },
    { k:'filieres',  label:'Filières', icon:'≡', count: stats?.pendingFils },
    { k:'modules',   label:'Modules', icon:'#' },
    { k:'users',     label:'Utilisateurs', icon:'::' },
    { k:'messages',  label:'Messages', icon:'✉', count: unreadMsgCount },
  ]

  return (
    <div className="page">
      <style>{css}</style>

      <nav className="nav">
        <div className="nav-left">
          <div className="logo" onClick={() => navigate('/')}><div className="logo-box"/><span className="logo-text">9raw<b>Zid</b>9ra</span></div>
          <div className="nav-divider"/>
          <span className="mod-badge">MODÉRATEUR</span>
        </div>
        <div className="nav-right">
          <span className="nav-user">{profile?.name || ''}</span>
          <button className="btn-ghost" onClick={() => navigate('/')}>Retour au site</button>
        </div>
      </nav>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-title">// panneau modérateur</div>
          {TABS.map(t => (
            <div key={t.k} className={`nav-item ${activeTab===t.k?'active':''}`} onClick={() => setActiveTab(t.k)}>
              <div className="nav-item-left">
                <span className="nav-item-icon">{t.icon}</span>
                <span className="nav-item-label">{t.label}</span>
              </div>
              {t.count > 0 && <span className={`nav-badge ${t.k==='schools'||t.k==='filieres'?'yellow':''}`}>{t.count}</span>}
            </div>
          ))}
        </aside>

        <main className="main">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="section-title">// vue d'ensemble</div>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-n" style={{color:'var(--red)'}}>{stats?.flaggedDocs ?? '—'}</div><div className="stat-l">Docs signalés</div></div>
                <div className="stat-card"><div className="stat-n" style={{color:'var(--red)'}}>{stats?.flaggedPosts ?? '—'}</div><div className="stat-l">Posts signalés</div></div>
                <div className="stat-card"><div className="stat-n" style={{color:'var(--yellow)'}}>{stats?.pendingSchools ?? '—'}</div><div className="stat-l">Écoles en attente</div></div>
                <div className="stat-card"><div className="stat-n" style={{color:'var(--yellow)'}}>{stats?.pendingFils ?? '—'}</div><div className="stat-l">Filières en attente</div></div>
                <div className="stat-card"><div className="stat-n" style={{color:'var(--accent2)'}}>{stats?.totalModules ?? '—'}</div><div className="stat-l">Modules total</div></div>
                <div className="stat-card"><div className="stat-n" style={{color:'var(--teal2)'}}>{stats?.totalUsers ?? '—'}</div><div className="stat-l">Utilisateurs</div></div>
              </div>
              {(stats?.flaggedDocs > 0 || stats?.flaggedPosts > 0) && (
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {stats?.flaggedDocs > 0 && <button className="act-btn act-reject" style={{padding:'10px 20px',fontSize:'0.82rem'}} onClick={() => setActiveTab('documents')}>⚠ {stats.flaggedDocs} doc{stats.flaggedDocs>1?'s':''} signalé{stats.flaggedDocs>1?'s':''}</button>}
                  {stats?.flaggedPosts > 0 && <button className="act-btn act-reject" style={{padding:'10px 20px',fontSize:'0.82rem'}} onClick={() => setActiveTab('senpai')}>⚠ {stats.flaggedPosts} post{stats.flaggedPosts>1?'s':''} signalé{stats.flaggedPosts>1?'s':''}</button>}
                  {stats?.pendingSchools > 0 && <button className="act-btn act-rename" style={{padding:'10px 20px',fontSize:'0.82rem'}} onClick={() => setActiveTab('schools')}>Voir {stats.pendingSchools} école{stats.pendingSchools>1?'s':''}</button>}
                  {stats?.pendingFils > 0 && <button className="act-btn act-rename" style={{padding:'10px 20px',fontSize:'0.82rem'}} onClick={() => setActiveTab('filieres')}>Voir {stats.pendingFils} filière{stats.pendingFils>1?'s':''}</button>}
                </div>
              )}
            </>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <>
              <div className="section-title">// documents signalés</div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               flaggedDocs.length === 0 ? <div className="empty">// aucun document signalé</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Document</th><th>Module</th><th>Uploadé par</th><th>Signalements</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {flaggedDocs.map(d => (
                        <tr key={d.id}>
                          <td>
                            <div className="table-name">{d.doc_type?.toUpperCase()} — {d.academic_year}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{d.pages_count} page{d.pages_count>1?'s':''} · {d.file_type}</div>
                          </td>
                          <td>
                            <div>{d.module_name}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{d.fac_name}</div>
                          </td>
                          <td className="table-mono">{d.uploader_name || 'Anonyme'}</td>
                          <td>
                            {d.report_count > 0 ? (
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.68rem',background:'rgba(248,113,113,0.1)',color:'var(--red)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:4,padding:'2px 8px'}}>
                                🚩 {d.report_count} signalement{d.report_count>1?'s':''}
                              </span>
                            ) : d.flag_reason ? (
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.65rem',background:'rgba(251,211,77,0.1)',color:'var(--yellow)',border:'1px solid rgba(251,211,77,0.2)',borderRadius:4,padding:'2px 8px',display:'inline-block',maxWidth:220}}>
                                🔍 {d.flag_reason}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <div className="actions">
                              {d.files?.[0] && <a href={d.files[0]} target="_blank" rel="noreferrer"><button className="act-btn act-view">Voir</button></a>}
                              <button className="act-btn act-approve" onClick={() => verifyDoc(d.id)}>Vérifier ✓</button>
                              <button className="act-btn act-reject" onClick={() => deleteDoc(d)}>Supprimer</button>
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

          {/* SENPAI */}
          {activeTab === 'senpai' && (
            <>
              <div className="section-title">// senpai zone — posts signalés</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel" style={{height:100}}/>) :
               flaggedPosts.length === 0 ? <div className="empty">// aucun post signalé</div> : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {flaggedPosts.map(post => {
                    const color = TYPE_COLORS[post.post_type] || '#94A3B8'
                    return (
                      <div key={post.id} style={{background:'var(--surface)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:10,padding:'1rem 1.25rem'}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:10}}>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.65rem',color,background:`${color}18`,padding:'2px 8px',borderRadius:4,border:`1px solid ${color}33`}}>
                                {TYPE_LABELS[post.post_type] || post.post_type}
                              </span>
                              {post.is_anonymous && (
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'#94A3B8',background:'rgba(148,163,184,0.08)',padding:'2px 8px',borderRadius:4,border:'1px solid rgba(148,163,184,0.15)'}}>🎭 Anonyme</span>
                              )}
                            </div>
                            <div style={{fontSize:'0.92rem',fontWeight:700,color:'#fff',marginBottom:4}}>{post.title}</div>
                            <div style={{fontSize:'0.78rem',color:'#94A3B8',lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden',marginBottom:8}}>
                              {post.content}
                            </div>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'#4A5568'}}>
                              Par : {post.user_profiles?.name || '—'} · {fmt(post.created_at)}
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                            <button className="act-btn act-approve" onClick={() => approvePost(post.id)}>Approuver</button>
                            <button className="act-btn act-reject" onClick={() => deletePost(post)}>Supprimer</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
               )}
            </>
          )}

          {/* SCHOOLS */}
          {activeTab === 'schools' && (
            <>
              <div className="section-title">// demandes d'ajout d'écoles</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'var(--text3)',marginBottom:'1rem'}}>// lecture seule — les approbations sont réservées à l'admin</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               schoolReqs.length === 0 ? <div className="empty">// aucune demande d'école</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Établissement</th><th>Type</th><th>Demandé par</th><th>Statut</th></tr>
                    </thead>
                    <tbody>
                      {schoolReqs.map(s => {
                        const rt = s.request_type || 'independent'
                        const RT_LABEL = { independent:'École indép.', faculty:'Faculté', university_with_faculties:'Université' }
                        const RT_COLOR = { independent:'rgba(79,142,247,0.1)', faculty:'rgba(79,142,247,0.08)', university_with_faculties:'rgba(245,158,11,0.08)' }
                        const RT_BORDER = { independent:'rgba(79,142,247,0.2)', faculty:'rgba(79,142,247,0.18)', university_with_faculties:'rgba(245,158,11,0.22)' }
                        const RT_TEXT = { independent:'var(--accent2)', faculty:'var(--teal2)', university_with_faculties:'#F59E0B' }
                        return (
                          <tr key={s.id}>
                            <td>
                              <div className="table-name">{s.school_name}</div>
                              {s.city && <div className="table-mono" style={{color:'var(--text3)'}}>{s.city}</div>}
                            </td>
                            <td>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',background:RT_COLOR[rt],border:`1px solid ${RT_BORDER[rt]}`,color:RT_TEXT[rt],padding:'2px 8px',borderRadius:4}}>
                                {RT_LABEL[rt]}
                              </span>
                            </td>
                            <td>
                              <div className="table-name">{s.user_profiles?.name || '—'}</div>
                              <div className="table-mono" style={{color:'var(--text3)'}}>{fmt(s.created_at)}</div>
                            </td>
                            <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* FILIÈRES */}
          {activeTab === 'filieres' && (
            <>
              <div className="section-title">// demandes d'ajout de filières</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'var(--text3)',marginBottom:'1rem'}}>// lecture seule — les approbations sont réservées à l'admin</div>
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               filiereReqs.length === 0 ? <div className="empty">// aucune demande de filière</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Filière</th><th>Faculté / Université</th><th>Semestres</th><th>Demandé par</th><th>Statut</th></tr>
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
              <div className="section-title">// modules</div>

              <div className="add-mod-form">
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'var(--teal2)',marginBottom:'0.85rem'}}>// ajouter un module</div>
                <div className="add-mod-row">
                  <div>
                    <div className="field-label">Nom du module</div>
                    <input className="field-input" style={{width:220}} placeholder="Ex: Analyse 2" value={newModName} onChange={e => setNewModName(e.target.value)} />
                  </div>
                  <div>
                    <div className="field-label">Filière</div>
                    <select className="field-input" style={{width:200}} value={newModFilId} onChange={e => setNewModFilId(e.target.value)}>
                      <option value="">— Choisir —</option>
                      {filieresList.map(f => (
                        <option key={f.id} value={f.id}>{f.name}{f.total_semesters ? ` (${f.total_semesters}S)` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="field-label">Semestre</div>
                    <input className="field-input" style={{width:80}} type="number" min="1" max="12" placeholder="S?" value={newModSem} onChange={e => setNewModSem(e.target.value)} />
                  </div>
                  <button className="act-btn act-approve" style={{padding:'8px 16px',fontSize:'0.78rem'}} onClick={addModule} disabled={!newModName.trim() || !newModFilId}>
                    + Ajouter
                  </button>
                </div>
              </div>

              <div style={{marginBottom:'0.85rem'}}>
                <input
                  style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 14px',color:'var(--text)',fontSize:'0.82rem',fontFamily:'Outfit,sans-serif',outline:'none',width:'100%',maxWidth:320}}
                  placeholder="Rechercher un module..."
                  value={modSearch}
                  onChange={e => { const v = e.target.value; setModSearch(v); clearTimeout(modSearchDebounceRef.current); modSearchDebounceRef.current = setTimeout(() => searchMods(v), 500) }}
                />
              </div>

              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               modules.length === 0 ? <div className="empty">// aucun module trouvé</div> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Module</th><th>Filière</th><th>Semestre</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {modules.map(m => (
                        <tr key={m.id}>
                          <td>
                            {renamingId === m.id ? (
                              <input className="rename-input" value={renameVal} onChange={e => setRenameVal(e.target.value)} placeholder="Nouveau nom..." />
                            ) : (
                              <span className="table-name">{m.name}</span>
                            )}
                          </td>
                          <td>
                            <div>{m.filieres?.name || '—'}</div>
                            <div className="table-mono" style={{color:'var(--text3)'}}>{m.filieres?.faculties?.universities?.name || '—'}</div>
                          </td>
                          <td className="table-mono">{m.semester ?? '—'}</td>
                          <td>
                            <div className="actions">
                              {renamingId === m.id ? (
                                <>
                                  <button className="act-btn act-approve" onClick={() => renameMod(m)}>Sauvegarder</button>
                                  <button className="act-btn act-view" onClick={() => { setRenamingId(null); setRenameVal('') }}>Annuler</button>
                                </>
                              ) : (
                                <button className="act-btn act-rename" onClick={() => { setRenamingId(m.id); setRenameVal(m.name) }}>Renommer</button>
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

          {/* USERS */}
          {activeTab === 'users' && (
            <>
              <div className="section-title">// utilisateurs</div>
              {loading ? Array(5).fill(0).map((_,i) => <div key={i} className="skel"/>) :
               users.length === 0 ? <div className="empty">// aucun utilisateur</div> : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {users.map(u => {
                    const lvl = getLevel(u.points || 0)
                    const isBanning = banningId === u.id
                    return (
                      <div key={u.id} style={{background:'var(--surface)',border:`1px solid ${u.is_banned?'rgba(248,113,113,0.25)':'var(--border)'}`,borderRadius:10,padding:'12px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <span style={{fontWeight:600,fontSize:'0.85rem',color:'var(--text)'}}>{u.name || 'Sans nom'}</span>
                            <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.6rem',color:'var(--text2)'}}>{u.universities?.name || ''}</span>
                            <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.6rem',color:'var(--accent2)'}}>{u.uploads_count||0} docs · {u.points||0}pts</span>
                            {u.is_banned && <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.58rem',background:'rgba(248,113,113,0.1)',color:'#F87171',border:'1px solid rgba(248,113,113,0.25)',borderRadius:4,padding:'1px 7px'}}>BANNI</span>}
                          </div>
                          <div className="actions">
                            {u.is_admin
                              ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.6rem',color:'var(--text3)',padding:'5px 10px'}}>admin</span>
                              : u.is_banned
                                ? <button className="act-btn act-approve" onClick={() => unbanUser(u.id)}>Débannir</button>
                                : <button className="act-btn act-ban" onClick={() => { setBanningId(isBanning ? null : u.id); setBanReason('') }}>
                                    {isBanning ? 'Annuler' : 'Bannir'}
                                  </button>
                            }
                          </div>
                        </div>
                        {u.is_banned && u.ban_reason && (
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'#F87171',marginTop:6}}>
                            Raison : {u.ban_reason} {u.banned_until ? `· jusqu'au ${new Date(u.banned_until).toLocaleDateString('fr-MA',{day:'2-digit',month:'short'})}` : '· permanent'}
                          </div>
                        )}
                        {isBanning && (
                          <div style={{marginTop:10,padding:'12px 14px',background:'var(--s2)',borderRadius:8,border:'1px solid rgba(248,113,113,0.2)',display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
                            <select value={banDuration} onChange={e => setBanDuration(e.target.value)}
                              style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 10px',color:'var(--text)',fontSize:'0.78rem',fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                              <option value="24h">24 heures</option>
                              <option value="7d">7 jours</option>
                              <option value="30d">30 jours</option>
                              <option value="perm">Permanent</option>
                            </select>
                            <input value={banReason} onChange={e => setBanReason(e.target.value)}
                              placeholder="Raison (optionnel)"
                              style={{flex:1,minWidth:160,background:'var(--s2)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 10px',color:'var(--text)',fontSize:'0.78rem',fontFamily:'Outfit,sans-serif',outline:'none'}}
                            />
                            <button className="act-btn act-ban" disabled={banBusy} onClick={() => confirmBan(u)}>
                              {banBusy ? '...' : 'Confirmer le bannissement'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <>
              <div className="section-title">// messages des utilisateurs</div>
              {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skel" style={{height:56}}/>) : (
                <div className="msg-layout" style={{ height:'calc(100vh - 170px)', minHeight:400 }}>

                  {/* Left panel */}
                  <div className="msg-left">
                    <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--text3)', letterSpacing:'1.5px' }}>
                      // CONVERSATIONS
                    </div>
                    {msgConvos.length === 0 && (
                      <div className="empty" style={{padding:'3rem 1rem'}}>// aucun message</div>
                    )}
                    {msgConvos.map(c => {
                      const initial = (c.name || '?')[0].toUpperCase()
                      const isSelected = selectedConvo?.id === c.id
                      const colors = ['#4F8EF7','#4F8EF7','#F59E0B','#C4B5FD','#4ADE80','#F87171']
                      const color = colors[c.id.charCodeAt(0) % colors.length]
                      return (
                        <div key={c.id} onClick={() => loadThread(c)}
                          style={{
                            display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer',
                            background: isSelected ? 'rgba(79,142,247,0.06)' : 'transparent',
                            borderLeft: isSelected ? '3px solid var(--teal)' : '3px solid transparent',
                            transition:'all 0.15s',
                          }}
                        >
                          <div style={{ width:36, height:36, borderRadius:'50%', background:`${color}22`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.82rem', fontWeight:700, color, flexShrink:0 }}>
                            {initial}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                              <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                              {c.unread > 0 && (
                                <span style={{ background:'var(--red)', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:'0.58rem', fontWeight:700, flexShrink:0, marginLeft:6, fontFamily:'DM Mono,monospace' }}>
                                  {c.unread}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:'0.72rem', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {c.lastMsg?.slice(0, 42) || '—'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Right panel */}
                  <div className="msg-right">
                    {!selectedConvo ? (
                      <div style={{ margin:'auto', textAlign:'center', color:'var(--text3)', fontFamily:'DM Mono,monospace', fontSize:'0.72rem' }}>
                        💬 Sélectionne une conversation
                      </div>
                    ) : (
                      <>
                        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexShrink:0, background:'var(--s2)' }}>
                          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'var(--teal2)', letterSpacing:'1px' }}>
                            // {selectedConvo.name}
                          </span>
                        </div>
                        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                          {msgThread.length === 0 && (
                            <div style={{ margin:'auto', fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'var(--text3)' }}>chargement...</div>
                          )}
                          {msgThread.map(m => {
                            const fromAdmin = m.sender_id === ADMIN_ID
                            return (
                              <div key={m.id} style={{ display:'flex', justifyContent: fromAdmin ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                  maxWidth:'72%', padding:'8px 12px',
                                  borderRadius: fromAdmin ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                                  background: fromAdmin ? 'rgba(79,142,247,0.15)' : 'var(--s2)',
                                  border: `1px solid ${fromAdmin ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`,
                                }}>
                                  {fromAdmin && (
                                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.56rem', color:'var(--teal2)', marginBottom:4 }}>Support 9rawZid9ra</div>
                                  )}
                                  <div style={{ fontSize:'0.82rem', color:'var(--text)', lineHeight:1.55, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{m.content}</div>
                                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'var(--text3)', marginTop:4, textAlign: fromAdmin ? 'right' : 'left' }}>{fmt(m.created_at)}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0 }}>
                          <input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                            placeholder="Répondre (envoyé en tant que Support)..."
                            style={{ flex:1, background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:'0.82rem', fontFamily:'Outfit,sans-serif', outline:'none', transition:'border-color 0.15s' }}
                            onFocus={e => e.target.style.borderColor='rgba(79,142,247,0.4)'}
                            onBlur={e => e.target.style.borderColor='var(--border)'}
                          />
                          <button onClick={sendReply} disabled={!replyText.trim() || replySending}
                            style={{ background: replyText.trim() ? 'var(--teal)' : 'var(--border)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:'0.8rem', fontWeight:600, cursor: replyText.trim() ? 'pointer' : 'not-allowed', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
                            {replySending ? '...' : 'Envoyer'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
      {modal && <ConfirmModal {...modal} onCancel={modal.onCancel !== undefined ? modal.onCancel : () => setModal(null)} />}
    </div>
  )
}
