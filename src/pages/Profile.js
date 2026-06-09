import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222; --s3:#111827;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --red:#F87171; --yellow:#FBD34D; --green:#4ADE80;
    --gold:#F59E0B; --gold2:#FCD34D;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  html, body { background:var(--bg); color:var(--text); font-family:'Outfit',sans-serif; }
  .page { min-height:100vh; display:flex; flex-direction:column; }
  .layout { max-width:960px; margin:0 auto; padding:2.5rem 2rem; width:100%; flex:1; }

  /* ── HEADER CARD ── */
  .profile-header {
    background:var(--surface); border:1px solid var(--border); border-radius:16px;
    padding:2rem 2.25rem; display:flex; align-items:flex-start; gap:2rem;
    position:relative; overflow:hidden; margin-bottom:10px;
  }
  .profile-header::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,var(--accent) 30%,var(--teal) 70%,transparent);
  }
  .profile-header::after {
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse 60% 100% at 0% 50%,rgba(79,142,247,0.04) 0%,transparent 60%);
    pointer-events:none;
  }
  .avatar {
    width:76px; height:76px; border-radius:50%; flex-shrink:0;
    background:linear-gradient(135deg,var(--accent),var(--teal));
    display:flex; align-items:center; justify-content:center;
    font-family:'DM Mono',monospace; font-size:1.5rem; font-weight:700; color:var(--white);
    border:3px solid rgba(79,142,247,0.25); position:relative; z-index:1;
  }
  .profile-info { flex:1; min-width:0; position:relative; z-index:1; }
  .profile-name { font-size:1.35rem; font-weight:700; color:var(--white); letter-spacing:-0.3px; margin-bottom:4px; }
  .profile-email { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--text3); margin-bottom:6px; }
  .profile-bio { font-size:0.82rem; color:var(--text2); line-height:1.65; margin-bottom:10px; max-width:520px; }
  .profile-meta { display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap; }
  .meta-item { font-size:0.75rem; color:var(--text2); }
  .meta-item b { color:var(--text); font-weight:600; }
  .meta-sep { color:var(--border); font-size:0.7rem; }
  .profile-right { display:flex; flex-direction:column; align-items:flex-end; gap:10px; flex-shrink:0; position:relative; z-index:1; }
  .points-badge {
    background:rgba(245,158,11,0.07); border:1px solid rgba(245,158,11,0.22);
    border-radius:12px; padding:10px 18px; text-align:center;
  }
  .points-val { font-family:'DM Mono',monospace; font-size:1.6rem; font-weight:700; color:var(--gold); line-height:1; }
  .points-label { font-family:'DM Mono',monospace; font-size:0.58rem; color:rgba(245,158,11,0.6); letter-spacing:1.5px; margin-top:3px; }
  .rank-badge {
    font-family:'DM Mono',monospace; font-size:0.62rem; font-weight:600;
    padding:4px 14px; border-radius:6px; letter-spacing:0.8px;
  }
  .rank-etudiant  { background:rgba(148,163,184,0.07); color:var(--text2); border:1px solid var(--border); }
  .rank-contrib   { background:rgba(45,212,191,0.07); color:var(--teal2); border:1px solid rgba(45,212,191,0.2); }
  .rank-senpai    { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.22); }
  .rank-legende   { background:rgba(245,158,11,0.08); color:var(--gold); border:1px solid rgba(245,158,11,0.28); }

  /* ── SOCIAL ROW ── */
  .social-row {
    display:flex; align-items:center; gap:1.5rem; padding:12px 18px;
    background:var(--surface); border:1px solid var(--border); border-radius:10px;
    margin-bottom:10px;
  }
  .social-stat { display:flex; align-items:center; gap:8px; }
  .social-n { font-family:'DM Mono',monospace; font-size:1rem; font-weight:700; color:var(--white); }
  .social-l { font-size:0.73rem; color:var(--text2); }
  .social-sep { width:1px; height:22px; background:var(--border); }
  .follow-btn {
    margin-left:auto; display:flex; align-items:center; gap:6px;
    padding:7px 18px; border-radius:8px; font-size:0.82rem; font-weight:600; cursor:pointer;
    font-family:'Outfit',sans-serif; transition:all 0.15s;
  }
  .follow-btn.off { background:var(--accent); color:#fff; border:none; }
  .follow-btn.off:hover { background:#3A7BEF; }
  .follow-btn.on { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.22); }
  .follow-btn.on:hover { background:rgba(248,113,113,0.08); color:var(--red); border-color:rgba(248,113,113,0.22); }

  /* ── STATS ROW ── */
  .stats-row {
    display:grid; grid-template-columns:repeat(4,1fr);
    background:var(--surface); border:1px solid var(--border);
    border-radius:12px; overflow:hidden; margin-bottom:1.25rem;
  }
  .stat { padding:1.25rem 1rem; text-align:center; position:relative; }
  .stat+.stat::before {
    content:''; position:absolute; left:0; top:18%; bottom:18%; width:1px; background:var(--border);
  }
  .stat-n {
    font-family:'DM Mono',monospace; font-size:1.5rem; font-weight:500;
    background:linear-gradient(135deg,var(--accent2),var(--teal2));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    margin-bottom:4px; line-height:1.1;
  }
  .stat-l { font-size:0.68rem; color:var(--text3); text-transform:uppercase; letter-spacing:0.5px; font-weight:500; }

  /* ── TABS ── */
  .tabs {
    display:flex; gap:2px; background:var(--surface); border:1px solid var(--border);
    border-radius:10px; padding:4px; margin-bottom:1.5rem; flex-wrap:wrap;
  }
  .tab-btn {
    padding:7px 18px; border-radius:7px; font-size:0.82rem; font-weight:500;
    color:var(--text2); cursor:pointer; transition:all 0.15s;
    background:none; border:none; font-family:'Outfit',sans-serif; white-space:nowrap;
  }
  .tab-btn:hover { color:var(--text); background:var(--s2); }
  .tab-btn.on { background:var(--s3); color:var(--white); }

  /* ── SECTION TAG ── */
  .section-tag {
    font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3);
    text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.875rem;
    display:flex; align-items:center; gap:10px;
  }
  .section-tag::after { content:''; flex:1; height:1px; background:var(--border); }

  /* ── UPLOAD CARDS ── */
  .upload-list { display:flex; flex-direction:column; gap:8px; }
  .upload-card {
    background:var(--surface); border:1px solid var(--border); border-radius:12px;
    padding:1rem 1.25rem; display:flex; align-items:center; gap:1rem;
    cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden;
  }
  .upload-card::before {
    content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
    background:linear-gradient(180deg,var(--accent),var(--teal));
    transform:scaleY(0); transform-origin:top; transition:transform 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  .upload-card:hover { border-color:var(--borderhi); background:var(--s2); }
  .upload-card:hover::before { transform:scaleY(1); }
  .doc-icon {
    width:42px; height:42px; border-radius:9px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-family:'DM Mono',monospace; font-size:0.58rem; font-weight:600; letter-spacing:0.5px;
  }
  .icon-examen { background:rgba(248,113,113,0.08); color:var(--red); border:1px solid rgba(248,113,113,0.15); }
  .icon-cc     { background:rgba(251,211,77,0.08); color:var(--yellow); border:1px solid rgba(251,211,77,0.15); }
  .icon-td     { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.15); }
  .icon-tp     { background:rgba(45,212,191,0.08); color:var(--teal2); border:1px solid rgba(45,212,191,0.15); }
  .icon-quiz   { background:rgba(167,139,250,0.08); color:#C4B5FD; border:1px solid rgba(167,139,250,0.15); }
  .icon-cours  { background:rgba(94,234,212,0.08); color:var(--teal2); border:1px solid rgba(94,234,212,0.15); }
  .upload-info { flex:1; min-width:0; }
  .upload-title { font-size:0.875rem; font-weight:600; color:var(--white); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .upload-sub { font-family:'DM Mono',monospace; font-size:0.63rem; color:var(--text3); display:flex; gap:8px; flex-wrap:wrap; }
  .upload-right { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }
  .dl-count { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--accent2); }
  .upload-date { font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--text3); }
  .tag-pending  { font-family:'DM Mono',monospace; font-size:0.55rem; padding:2px 7px; border-radius:3px; background:rgba(251,211,77,0.08); color:var(--yellow); border:1px solid rgba(251,211,77,0.2); }
  .tag-verified { font-family:'DM Mono',monospace; font-size:0.55rem; padding:2px 7px; border-radius:3px; background:rgba(74,222,128,0.08); color:var(--green); border:1px solid rgba(74,222,128,0.2); }

  /* ── SENPAI POST CARDS ── */
  .sp-list { display:flex; flex-direction:column; gap:8px; }
  .sp-card {
    background:var(--surface); border:1px solid var(--border); border-radius:12px;
    padding:14px 18px; cursor:pointer; transition:all 0.15s;
  }
  .sp-card:hover { border-color:var(--borderhi); background:var(--s2); }
  .sp-card-top { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .sp-type-pill {
    display:flex; align-items:center; gap:4px; padding:2px 9px; border-radius:20px;
    font-size:0.62rem; font-weight:600; border:1px solid; white-space:nowrap;
    font-family:'DM Mono',monospace;
  }
  .sp-title { font-size:0.88rem; font-weight:700; color:var(--white); margin-bottom:5px; }
  .sp-body {
    font-size:0.78rem; color:var(--text2); line-height:1.6;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
    margin-bottom:8px;
  }
  .sp-footer { display:flex; align-items:center; gap:10px; }
  .sp-meta { font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--text3); }

  /* ── ACTIVITY ── */
  .activity-list { display:flex; flex-direction:column; gap:6px; margin-bottom:2rem; }
  .activity-item {
    background:var(--surface); border:1px solid var(--border); border-radius:10px;
    padding:0.875rem 1.1rem; display:flex; align-items:center; gap:14px;
  }
  .activity-item.clickable { cursor:pointer; transition:background 0.15s; }
  .activity-item.clickable:hover { background:var(--s2); border-color:var(--borderhi); }
  .activity-badge {
    font-family:'DM Mono',monospace; font-size:0.58rem; font-weight:600;
    padding:3px 8px; border-radius:4px; flex-shrink:0; letter-spacing:0.5px;
  }
  .badge-pts  { background:rgba(74,222,128,0.08); color:var(--green); border:1px solid rgba(74,222,128,0.2); }
  .badge-dl   { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.15); }
  .activity-desc { flex:1; font-size:0.82rem; color:var(--text2); line-height:1.4; }
  .activity-desc b { color:var(--text); }
  .activity-points { font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--green); font-weight:700; flex-shrink:0; }
  .activity-time { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); flex-shrink:0; }

  /* ── SETTINGS ── */
  .settings-card {
    background:var(--surface); border:1px solid var(--border);
    border-radius:12px; overflow:hidden; margin-bottom:1rem;
  }
  .settings-head {
    padding:0.875rem 1.25rem; border-bottom:1px solid var(--border);
    font-family:'DM Mono',monospace; font-size:0.63rem; color:var(--text3);
    text-transform:uppercase; letter-spacing:1.5px;
  }
  .settings-body { padding:1.25rem; }
  .field { margin-bottom:1.1rem; }
  .field:last-child { margin-bottom:0; }
  .label { display:block; font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.5rem; }
  .input { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font-size:0.875rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s; }
  .input:focus { border-color:var(--accent); }
  .input::placeholder { color:var(--text3); }
  .textarea-bio { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font-size:0.875rem; font-family:'Outfit',sans-serif; outline:none; resize:vertical; min-height:90px; line-height:1.6; transition:border-color 0.15s; }
  .textarea-bio:focus { border-color:var(--accent); }
  .textarea-bio::placeholder { color:var(--text3); }
  .select { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font-size:0.875rem; font-family:'Outfit',sans-serif; outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5568' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:30px; transition:border-color 0.15s; }
  .select:focus { border-color:var(--accent); outline:none; }
  .select option { background:var(--s2); }
  .btn-save { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:8px; padding:9px 24px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; margin-top:1rem; position:relative; overflow:hidden; }
  .btn-save::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 16px rgba(79,142,247,0.4); }
  .btn-save:disabled { opacity:0.5; cursor:not-allowed; }
  .btn-outline { background:none; border:1px solid var(--border); color:var(--text2); border-radius:8px; padding:9px 24px; font-size:0.85rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .btn-outline:hover { border-color:var(--accent); color:var(--accent2); }
  .save-msg { font-family:'DM Mono',monospace; font-size:0.75rem; margin-top:0.75rem; padding:8px 12px; border-radius:7px; }
  .save-ok  { background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.2); color:var(--teal2); }
  .save-err { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
  .char-count { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); text-align:right; margin-top:3px; }

  /* ── EMPTY STATE ── */
  .empty { text-align:center; padding:3.5rem 2rem; background:var(--surface); border:1px dashed var(--border); border-radius:12px; }
  .empty-code { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--text3); margin-bottom:0.75rem; }
  .empty-title { font-size:0.95rem; font-weight:600; color:var(--text2); margin-bottom:6px; }
  .empty-sub { font-size:0.78rem; color:var(--text3); margin-bottom:1.25rem; }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:8px; padding:9px 22px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; }
  .btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(79,142,247,0.4); }

  /* ── SKELETON ── */
  .skel { background:var(--surface); border:1px solid var(--border); border-radius:12px; animation:pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:0.35} 50%{opacity:0.7} }

  @media(max-width:768px) {
    .layout { padding:1.25rem 1rem; }
    .profile-header { flex-direction:column; align-items:flex-start; gap:1rem; padding:1.25rem; }
    .profile-right { align-items:flex-start; flex-direction:row; width:100%; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .stat:nth-child(3)::before { display:none; }
    .social-row { gap:1rem; }
    .tabs { width:100%; overflow-x:auto; flex-wrap:nowrap; }
    .tab-btn { flex-shrink:0; padding:7px 12px; font-size:0.78rem; }
  }
  @media(max-width:480px) {
    .layout { padding:1rem 0.75rem; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .tab-btn { padding:6px 10px; font-size:0.72rem; }
    .upload-card { padding:1rem; }
    .sp-item { padding:0.75rem 1rem; }
  }
`

const PT_COLORS = {
  survival_guide: { color:'#4F8EF7', bg:'rgba(79,142,247,0.1)',  border:'rgba(79,142,247,0.22)',  label:'Guide' },
  cheat_code:     { color:'#FBD34D', bg:'rgba(251,211,77,0.1)',  border:'rgba(251,211,77,0.22)',  label:'Cheat Code' },
  timeline:       { color:'#4ADE80', bg:'rgba(74,222,128,0.1)',  border:'rgba(74,222,128,0.22)',  label:'Timeline' },
  red_flag:       { color:'#F87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.22)', label:'Red Flag' },
  path_review:    { color:'#C4B5FD', bg:'rgba(196,181,253,0.1)', border:'rgba(196,181,253,0.22)', label:'Bilan' },
}

const DOC_ICON = {
  examen:'icon-examen', cc:'icon-cc', td:'icon-td',
  tp:'icon-tp', quiz:'icon-quiz', cours:'icon-cours',
  corrige_examen:'icon-cc', corrige_td:'icon-td', corrige_tp:'icon-tp',
  projet_final:'icon-examen',
}
const DOC_LABEL = {
  examen:'EXAM', cc:'CC', td:'TD', tp:'TP', quiz:'QUIZ', cours:'COURS',
  corrige_examen:'COR.E', corrige_td:'C.TD', corrige_tp:'C.TP',
  projet_final:'PROJ',
}

function getLevel(points) {
  if (points >= 600) return { label:'Légende',     cls:'rank-legende' }
  if (points >= 300) return { label:'Senpai',      cls:'rank-senpai' }
  if (points >= 100) return { label:'Contributeur', cls:'rank-contrib' }
  return               { label:'Étudiant',     cls:'rank-etudiant' }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short' })
}
function fmtAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 3600) return `${Math.floor(s/60)} min`
  if (s < 86400) return `${Math.floor(s/3600)} h`
  return fmtShort(d)
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
// Works as own profile (/profile) and public profile (/user/:id)
export default function Profile() {
  const navigate        = useNavigate()
  const params          = useParams()
  const targetId        = params.id || null  // null = own profile

  const [currentUser, setCurrentUser] = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [unis,        setUnis]        = useState([])
  const [uploads,     setUploads]     = useState([])
  const [dlogs,       setDlogs]       = useState([])
  const [ptsLog,      setPtsLog]      = useState([])
  const [senpaiPosts, setSenpaiPosts] = useState([])
  const [userReplies, setUserReplies] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState('posts')

  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [followBusy,     setFollowBusy]     = useState(false)

  // Settings fields
  const [editName,    setEditName]    = useState('')
  const [editBio,     setEditBio]     = useState('')
  const [editUni,     setEditUni]     = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [saveMsgType, setSaveMsgType] = useState('ok')

  useEffect(() => {
    async function load() {
      const { data: { user: cu } } = await supabase.auth.getUser()
      setCurrentUser(cu)

      const uid = targetId || cu?.id
      if (!uid) { navigate('/login', { state:{ from: '/profile' } }); return }

      const [
        { data: prof },
        { count: frs },
        { count: fng },
        { data: docs },
        { data: posts },
        { data: uniData },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*, universities(name)').eq('id', uid).single(),
        supabase.from('user_follows').select('*', { count:'exact', head:true }).eq('following_id', uid),
        supabase.from('user_follows').select('*', { count:'exact', head:true }).eq('follower_id', uid),
        supabase.from('documents')
          .select('id, doc_type, academic_year, pages_count, downloads, is_verified, is_flagged, created_at, modules(id, name, semester)')
          .eq('uploader_id', uid)
          .order('created_at', { ascending: false }),
        supabase.from('senpai_posts')
          .select('*, senpai_votes(user_id)')
          .eq('author_id', uid)
          .eq('is_approved', true)
          .order('helpful_count', { ascending: false }),
        supabase.from('universities').select('id, name').order('name'),
      ])

      setProfile(prof || {})
      setEditName(prof?.name || '')
      setEditBio(prof?.bio || '')
      setEditUni(prof?.university_id ? String(prof.university_id) : '')
      setFollowersCount(frs || 0)
      setFollowingCount(fng || 0)
      setUploads(docs || [])
      setSenpaiPosts(posts || [])
      setUnis(uniData || [])

      // Check if current user is following target
      if (cu && targetId && cu.id !== targetId) {
        const { count } = await supabase.from('user_follows')
          .select('*', { count:'exact', head:true })
          .eq('follower_id', cu.id)
          .eq('following_id', targetId)
        setIsFollowing((count || 0) > 0)
      }

      // Load user's replies (both own and public)
      const { data: repliesData } = await supabase
        .from('senpai_replies')
        .select('*, senpai_posts(id, title, post_type)')
        .eq('author_id', uid)
        .order('created_at', { ascending: false })
        .limit(30)
      setUserReplies(repliesData || [])

      // Own profile: load extra data
      if (!targetId || cu?.id === targetId) {
        const [{ data: downloadLogs }, { data: pts }] = await Promise.all([
          supabase.from('downloads_log')
            .select('created_at, documents(doc_type, academic_year, modules(id, name))')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(15),
          supabase.from('points_log')
            .select('points, reason, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20),
        ])
        setDlogs(downloadLogs || [])
        setPtsLog(pts || [])
      }

      setLoading(false)
    }
    load()
  }, [targetId])

  const isOwnProfile = !targetId || (currentUser && currentUser.id === targetId)
  const totalDLReceived = uploads.reduce((s, d) => s + (d.downloads || 0), 0)
  const points = profile?.points || 0
  const level  = getLevel(points)

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (isOwnProfile ? currentUser?.email?.[0]?.toUpperCase() : '?') || '?'

  const handleFollow = async () => {
    if (!currentUser || currentUser.id === targetId) return
    setFollowBusy(true)
    if (isFollowing) {
      setIsFollowing(false)
      setFollowersCount(c => Math.max(0, c - 1))
      await supabase.from('user_follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId)
    } else {
      setIsFollowing(true)
      setFollowersCount(c => c + 1)
      await supabase.from('user_follows').insert({ follower_id: currentUser.id, following_id: targetId })
      supabase.from('notifications').insert({ user_id: targetId, type: 'follow', actor_id: currentUser.id }).then()
    }
    setFollowBusy(false)
  }

  const handleSave = async () => {
    if (!editName.trim()) {
      setSaveMsg('Le nom ne peut pas être vide.'); setSaveMsgType('err'); return
    }
    setSaving(true); setSaveMsg('')
    const { error } = await supabase.from('user_profiles').upsert({
      id:            currentUser.id,
      email:         currentUser.email,
      name:          editName.trim(),
      bio:           editBio.trim(),
      university_id: editUni ? parseInt(editUni) : null,
    }, { onConflict: 'id' })
    if (!error) await supabase.auth.updateUser({ data:{ name: editName.trim() } })
    setSaving(false)
    if (error) {
      setSaveMsg('Erreur lors de la sauvegarde.'); setSaveMsgType('err')
    } else {
      setSaveMsg('Profil mis à jour avec succès !'); setSaveMsgType('ok')
      setProfile(p => ({ ...p, name:editName.trim(), bio:editBio.trim(), university_id:editUni||null }))
    }
  }

  if (loading) return (
    <div className="page">
      <style>{css}</style>
      <Navbar />
      <div className="layout">
        <div className="skel" style={{ height:160, marginBottom:12 }} />
        <div className="skel" style={{ height:48,  marginBottom:12 }} />
        <div className="skel" style={{ height:80,  marginBottom:12 }} />
        <div className="skel" style={{ height:44,  marginBottom:16 }} />
        <div className="skel" style={{ height:72,  marginBottom:8  }} />
        <div className="skel" style={{ height:72  }} />
      </div>
    </div>
  )

  const tabList = isOwnProfile
    ? [{ k:'posts', l:'Posts' }, { k:'replies', l:'Réponses' }, { k:'uploads', l:'Uploadés' }, { k:'settings', l:'Paramètres' }]
    : [{ k:'posts', l:'Posts' }, { k:'replies', l:'Réponses' }, { k:'uploads', l:'Uploadés' }]

  return (
    <div className="page">
      <style>{css}</style>
      <Navbar activePage="profile" />

      <div className="layout">

        {/* ── HEADER ── */}
        <div className="profile-header">
          <div className="avatar">{initials}</div>

          <div className="profile-info">
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div className="profile-name" style={{ marginBottom:0 }}>{profile?.name || 'Étudiant'}</div>
              {profile?.is_admin && (
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  background:'linear-gradient(135deg,rgba(251,211,77,0.12),rgba(248,113,113,0.08))',
                  border:'1px solid rgba(251,211,77,0.5)',
                  borderRadius:7, padding:'3px 11px',
                  fontFamily:'DM Mono,monospace', fontSize:'0.62rem', fontWeight:700,
                  color:'#FBD34D', letterSpacing:'1.5px', textTransform:'uppercase',
                  boxShadow:'0 0 18px rgba(251,211,77,0.18), inset 0 0 10px rgba(251,211,77,0.04)',
                }}>
                  👑 Admin
                </span>
              )}
            </div>
            {profile?.bio && (
              <p className="profile-bio">{profile.bio}</p>
            )}
            <div className="profile-meta">
              {profile?.universities?.name && (
                <>
                  <span className="meta-item"><b>{profile.universities.name}</b></span>
                  <span className="meta-sep">·</span>
                </>
              )}
              <span className="meta-item">Membre depuis <b>{fmtDate(profile?.created_at || currentUser?.created_at)}</b></span>
              <span className="meta-sep">·</span>
              <span className="meta-item"><b>{profile?.uploads_count || uploads.length}</b> uploads</span>
            </div>
          </div>

          <div className="profile-right">
            <div className="points-badge">
              <div className="points-val">{points}</div>
              <div className="points-label">POINTS</div>
            </div>
            <span className={`rank-badge ${level.cls}`}>{level.label}</span>
          </div>
        </div>

        {/* ── SOCIAL ROW ── */}
        <div className="social-row">
          <div className="social-stat">
            <span className="social-n">{followersCount}</span>
            <span className="social-l">Abonnés</span>
          </div>
          <div className="social-sep"/>
          <div className="social-stat">
            <span className="social-n">{followingCount}</span>
            <span className="social-l">Abonnements</span>
          </div>
          <div className="social-sep"/>
          <div className="social-stat">
            <span className="social-n">{senpaiPosts.length}</span>
            <span className="social-l">Tips Senpai</span>
          </div>
          {!isOwnProfile && currentUser && (
            <button
              className={`follow-btn ${isFollowing ? 'on' : 'off'}`}
              onClick={handleFollow}
              disabled={followBusy}
            >
              {isFollowing ? 'Abonné ✓' : '+ Suivre'}
            </button>
          )}
        </div>

        {/* ── STATS ROW ── */}
        <div className="stats-row">
          <div className="stat">
            <div className="stat-n">{uploads.length}</div>
            <div className="stat-l">Uploads</div>
          </div>
          <div className="stat">
            <div className="stat-n">{totalDLReceived}</div>
            <div className="stat-l">Téléchargements</div>
          </div>
          <div className="stat">
            <div className="stat-n">{points}</div>
            <div className="stat-l">Points</div>
          </div>
          <div className="stat">
            <div className="stat-n" style={{ fontSize:'1rem', WebkitTextFillColor:'var(--accent2)', backgroundImage:'none' }}>
              {level.label}
            </div>
            <div className="stat-l">Niveau</div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="tabs">
          {tabList.map(t => (
            <button key={t.k} className={`tab-btn ${activeTab===t.k?'on':''}`} onClick={() => setActiveTab(t.k)}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── UPLOADS TAB ── */}
        {activeTab === 'uploads' && (
          uploads.length === 0 ? (
            <div className="empty">
              <div className="empty-code">// 0 uploads</div>
              <div className="empty-title">{isOwnProfile ? "Tu n'as rien uploadé encore" : "Aucun document uploadé"}</div>
              {isOwnProfile && <div className="empty-sub">Partage tes annales et gagne +50 points par upload !</div>}
              {isOwnProfile && <button className="btn-primary" onClick={() => navigate('/upload')}>Uploader un document</button>}
            </div>
          ) : (
            <div className="upload-list">
              {uploads.map(doc => (
                <div key={doc.id} className="upload-card" onClick={() => doc.modules?.id && navigate(`/module/${doc.modules.id}`)}>
                  <div className={`doc-icon ${DOC_ICON[doc.doc_type] || 'icon-cours'}`}>
                    {DOC_LABEL[doc.doc_type] || 'DOC'}
                  </div>
                  <div className="upload-info">
                    <div className="upload-title">{doc.modules?.name || 'Module inconnu'}</div>
                    <div className="upload-sub">
                      <span>{DOC_LABEL[doc.doc_type] || doc.doc_type?.toUpperCase()}</span>
                      <span>·</span><span>{doc.academic_year}</span>
                      <span>·</span><span>{doc.modules?.semester || '—'}</span>
                      <span>·</span><span>{doc.pages_count} p.</span>
                    </div>
                  </div>
                  <div className="upload-right">
                    <span className="dl-count">{doc.downloads || 0} DL</span>
                    <span className="upload-date">{fmtShort(doc.created_at)}</span>
                    <span className={doc.is_verified ? 'tag-verified' : 'tag-pending'}>
                      {doc.is_verified ? 'VÉRIFIÉ' : 'EN ATTENTE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── POSTS TAB ── */}
        {activeTab === 'posts' && (
          senpaiPosts.length === 0 ? (
            <div className="empty">
              <div className="empty-code">// 0 posts senpai</div>
              <div className="empty-title">{isOwnProfile ? "Tu n'as pas encore posté" : "Aucun post Senpai"}</div>
              {isOwnProfile && <div className="empty-sub">Partage ton expérience dans la Senpai Zone !</div>}
              {isOwnProfile && (
                <button className="btn-primary" onClick={() => navigate('/senpai')}>
                  Aller dans la Senpai Zone
                </button>
              )}
            </div>
          ) : (
            <div className="sp-list">
              {senpaiPosts.map(post => {
                const pt = PT_COLORS[post.post_type] || PT_COLORS.survival_guide
                const votes = post.senpai_votes?.length || 0
                return (
                  <div key={post.id} className="sp-card" onClick={() => navigate('/senpai')}>
                    <div className="sp-card-top">
                      <div className="sp-type-pill" style={{color:pt.color,background:pt.bg,borderColor:pt.border}}>
                        {pt.label}
                      </div>
                      <span className="sp-meta" style={{marginLeft:'auto'}}>{fmtAgo(post.created_at)}</span>
                    </div>
                    <div className="sp-title">{post.title}</div>
                    <div className="sp-body">{post.content}</div>
                    <div className="sp-footer">
                      <span className="sp-meta">{votes} utile{votes !== 1 ? 's' : ''}</span>
                      <span className="sp-meta">·</span>
                      <span className="sp-meta">{post.reply_count || 0} réponse{(post.reply_count||0) !== 1 ? 's' : ''}</span>
                      {post.is_anonymous && <span className="sp-meta" style={{marginLeft:'auto',opacity:0.6}}>anonyme</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── REPLIES TAB ── */}
        {activeTab === 'replies' && (
          userReplies.length === 0 ? (
            <div className="empty">
              <div className="empty-code">// 0 réponses</div>
              <div className="empty-title">{isOwnProfile ? "Aucune réponse encore" : "Aucune réponse"}</div>
              {isOwnProfile && <div className="empty-sub">Tes réponses aux posts Senpai apparaîtront ici.</div>}
            </div>
          ) : (
            <div className="sp-list">
              {userReplies.map(r => {
                const pt = PT_COLORS[r.senpai_posts?.post_type] || PT_COLORS.survival_guide
                return (
                  <div key={r.id} className="sp-card" onClick={() => navigate('/senpai')}>
                    <div className="sp-card-top">
                      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontFamily: 'DM Mono,monospace' }}>
                        En réponse à :
                      </div>
                      <div className="sp-type-pill" style={{ color: pt.color, background: pt.bg, borderColor: pt.border, marginLeft: 8 }}>
                        {pt.label}
                      </div>
                      <span className="sp-meta" style={{ marginLeft: 'auto' }}>{fmtAgo(r.created_at)}</span>
                    </div>
                    {r.senpai_posts?.title && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 6, fontStyle: 'italic' }}>
                        « {r.senpai_posts.title} »
                      </div>
                    )}
                    <div className="sp-body" style={{ WebkitLineClamp: 'unset', color: 'var(--text)' }}>{r.content}</div>
                    {r.is_anonymous && (
                      <div className="sp-footer" style={{ marginTop: 8 }}>
                        <span className="sp-meta" style={{ opacity: 0.6 }}>anonyme</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── ACTIVITY TAB (own only) ── */}
        {activeTab === 'activity' && isOwnProfile && (
          ptsLog.length === 0 && dlogs.length === 0 ? (
            <div className="empty">
              <div className="empty-code">// no activity yet</div>
              <div className="empty-title">Aucune activité récente</div>
              <div className="empty-sub">Tes uploads et téléchargements apparaîtront ici.</div>
            </div>
          ) : (
            <>
              {ptsLog.length > 0 && (
                <>
                  <div className="section-tag">// historique des points</div>
                  <div className="activity-list">
                    {ptsLog.map((p, i) => (
                      <div key={i} className="activity-item">
                        <span className="activity-badge badge-pts">PTS</span>
                        <span className="activity-desc">{p.reason || 'Points gagnés'}</span>
                        <span className="activity-points">+{p.points}</span>
                        <span className="activity-time">{fmtShort(p.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {dlogs.length > 0 && (
                <>
                  <div className="section-tag">// téléchargements récents</div>
                  <div className="activity-list">
                    {dlogs.map((dl, i) => {
                      const modId  = dl.documents?.modules?.id
                      const modName = dl.documents?.modules?.name || 'un document'
                      const year   = dl.documents?.academic_year
                      return (
                        <div key={i} className={`activity-item ${modId ? 'clickable' : ''}`}
                          onClick={() => modId && navigate(`/module/${modId}`)}>
                          <span className="activity-badge badge-dl">DL</span>
                          <span className="activity-desc">
                            Téléchargé <b>{modName}</b>{year ? ` — ${year}` : ''}
                          </span>
                          <span className="activity-time">{fmtShort(dl.created_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )
        )}

        {/* ── SETTINGS TAB (own only) ── */}
        {activeTab === 'settings' && isOwnProfile && (
          <>
            <div className="settings-card">
              <div className="settings-head">// informations personnelles</div>
              <div className="settings-body">
                <div className="field">
                  <label className="label">Nom d'affichage</label>
                  <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ton nom complet"/>
                </div>
                <div className="field">
                  <label className="label">Bio</label>
                  <textarea className="textarea-bio" value={editBio} onChange={e => setEditBio(e.target.value)}
                    placeholder="Décris-toi en quelques mots — filière, objectifs, what you're about..." maxLength={200}/>
                  <div className="char-count">{editBio.length} / 200</div>
                </div>
                <div className="field">
                  <label className="label">Université</label>
                  <select className="select" value={editUni} onChange={e => setEditUni(e.target.value)}>
                    <option value="">Sélectionner une université</option>
                    {unis.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
                  </select>
                </div>
                {saveMsg && <div className={`save-msg save-${saveMsgType}`}>{saveMsg}</div>}
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                </button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-head">// sécurité du compte</div>
              <div className="settings-body">
                <p style={{ fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.7, marginBottom:'1.1rem' }}>
                  Pour changer ton mot de passe, tu recevras un email à <b style={{color:'var(--text)'}}>{currentUser?.email}</b>.
                </p>
                <button className="btn-outline" onClick={() => navigate('/forgot-password')}>
                  Changer le mot de passe
                </button>
              </div>
            </div>

            <div className="settings-card" style={{ background:'rgba(251,211,77,0.02)', borderColor:'rgba(251,211,77,0.12)' }}>
              <div className="settings-head" style={{ color:'#FBD34D', borderColor:'rgba(251,211,77,0.12)' }}>// soutenir 9rawZid9ra</div>
              <div className="settings-body" style={{ textAlign:'center' }}>
                <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#FBD34D', marginBottom:6 }}>☕ La plateforme t'a aidé ?</div>
                <div style={{ fontSize:'0.78rem', color:'#94A3B8', lineHeight:1.6, marginBottom:'0.75rem' }}>
                  9rawZid9ra est 100% gratuit. Si tu veux soutenir le projet et nous aider à grandir, un petit pourboire fait toute la différence.
                </div>
                <a
                  href="https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display:'inline-block', background:'rgba(251,211,77,0.1)', border:'1px solid rgba(251,211,77,0.3)', color:'#FBD34D', borderRadius:8, padding:'8px 20px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif", textDecoration:'none', transition:'all 0.15s' }}
                >
                  Envoyer un pourboire ☕
                </a>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-head">// danger zone</div>
              <div className="settings-body">
                <p style={{ fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.7, marginBottom:'1.1rem' }}>
                  Se déconnecter de tous les appareils.
                </p>
                <button className="btn-outline" style={{ color:'var(--red)', borderColor:'rgba(248,113,113,0.3)' }}
                  onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
