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
  .rank-contrib   { background:rgba(79,142,247,0.07); color:var(--teal2); border:1px solid rgba(79,142,247,0.2); }
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
  .social-actions { margin-left:auto; display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .follow-btn {
    display:flex; align-items:center; gap:6px;
    padding:7px 18px; border-radius:8px; font-size:0.82rem; font-weight:600; cursor:pointer;
    font-family:'Outfit',sans-serif; transition:all 0.15s;
  }
  .follow-btn.off { background:var(--accent); color:#fff; border:none; }
  .follow-btn.off:hover { background:#3A6ED4; }
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
  .icon-tp     { background:rgba(79,142,247,0.08); color:var(--teal2); border:1px solid rgba(79,142,247,0.15); }
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
  .save-ok  { background:rgba(79,142,247,0.08); border:1px solid rgba(79,142,247,0.2); color:var(--teal2); }
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
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel {
    background:linear-gradient(90deg,#070C18,#0C1222,#070C18);
    background-size:200% 100%; animation:shimmer 1.5s infinite;
    border-radius:8px;
  }

  @media(max-width:768px) {
    .layout { padding:1.25rem 1rem; }
    .profile-header { flex-direction:column; align-items:flex-start; gap:1rem; padding:1.25rem; }
    .profile-right { align-items:flex-start; flex-direction:row; width:100%; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .stat:nth-child(3)::before { display:none; }
    .social-row { gap:0.75rem; flex-wrap:wrap; }
    .social-actions { margin-left:0; width:100%; padding-top:4px; border-top:1px solid var(--border); }
    .follow-btn { flex:1; justify-content:center; }
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

  /* ── FOLLOW LIST MODAL ── */
  .fl-overlay {
    position:fixed; inset:0; background:rgba(2,4,10,0.82); z-index:1000;
    display:flex; align-items:center; justify-content:center; padding:1rem;
  }
  .fl-modal {
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    width:100%; max-width:380px; max-height:72vh; display:flex; flex-direction:column; overflow:hidden;
  }
  .fl-modal-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 18px; border-bottom:1px solid var(--border); flex-shrink:0;
  }
  .fl-modal-title { font-family:'Outfit',sans-serif; font-size:0.92rem; font-weight:600; color:var(--white); }
  .fl-close {
    background:none; border:none; color:var(--text3); font-size:1.4rem; cursor:pointer;
    padding:2px 8px; line-height:1; border-radius:6px; transition:color 0.15s;
  }
  .fl-close:hover { color:var(--white); }
  .fl-list { overflow-y:auto; flex:1; padding:6px 0; }
  .fl-item {
    display:flex; align-items:center; gap:12px; padding:10px 18px;
    cursor:pointer; transition:background 0.12s;
  }
  .fl-item:hover { background:var(--s2); }
  .fl-avatar {
    width:38px; height:38px; border-radius:50%;
    background:linear-gradient(135deg,var(--accent),var(--teal));
    display:flex; align-items:center; justify-content:center;
    font-family:'DM Mono',monospace; font-size:0.78rem; font-weight:700; color:#fff; flex-shrink:0;
  }
  .fl-name { font-family:'Outfit',sans-serif; font-size:0.88rem; font-weight:500; color:var(--white); }
  .fl-uni  { font-size:0.72rem; color:var(--text2); margin-top:1px; }
  .fl-empty { padding:2.5rem; text-align:center; color:var(--text3); font-size:0.83rem; font-family:'Outfit',sans-serif; }
  .social-stat-click { cursor:pointer; transition:opacity 0.15s; }
  .social-stat-click:hover { opacity:0.75; }
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
  const [showFollowersList, setShowFollowersList] = useState(false)
  const [showFollowingList, setShowFollowingList] = useState(false)
  const [followersList,     setFollowersList]     = useState([])
  const [followingList,     setFollowingList]     = useState([])
  const [listLoading,       setListLoading]       = useState(false)

  const [showPointsInfo,       setShowPointsInfo]       = useState(false)
  const [uploadNudgeDismissed, setUploadNudgeDismissed] = useState(
    () => localStorage.getItem('9rz_upload_nudge') === '1'
  )
  const [showUniModal,  setShowUniModal]  = useState(false)
  const [uniModalSel,   setUniModalSel]   = useState('')
  const [uniModalSaving, setUniModalSaving] = useState(false)

  // Doc delete confirmation
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null)
  const [deleteDocBusy,    setDeleteDocBusy]    = useState(false)

  // Doc edit state
  const [editingDocId,  setEditingDocId]  = useState(null)
  const [editDocNumber, setEditDocNumber] = useState('')
  const [editDocYear,   setEditDocYear]   = useState('')
  const [editDocProf,   setEditDocProf]   = useState('')
  const [editDocSaving, setEditDocSaving] = useState(false)

  // Move request state
  const [moveReqDocId,  setMoveReqDocId]  = useState(null)
  const [moveReqSearch, setMoveReqSearch] = useState('')
  const [moveReqMods,   setMoveReqMods]   = useState([])
  const [moveReqSelMod, setMoveReqSelMod] = useState(null)
  const [moveReqBusy,   setMoveReqBusy]   = useState(false)
  const [moveReqSent,   setMoveReqSent]   = useState({})

  // Settings fields
  const [editName,    setEditName]    = useState('')
  const [editBio,     setEditBio]     = useState('')
  const [editUni,     setEditUni]     = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [saveMsgType, setSaveMsgType] = useState('ok')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const cu = session?.user
      setCurrentUser(cu)

      const uid = targetId || cu?.id
      if (!uid) { sessionStorage.setItem('redirectAfterLogin', '/profile'); navigate('/login', { state:{ from: '/profile' } }); return }

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
          .select('id, doc_type, doc_number, academic_year, professor, pages_count, downloads, is_verified, is_flagged, created_at, files, modules(id, name, semester)')
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
      document.title = prof?.name ? `${prof.name} — 9rawZid9ra` : 'Profil — 9rawZid9ra'
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

  const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'
  const isAdminProfile = targetId === ADMIN_ID
  const canSendMessage = currentUser && !isOwnProfile

  const startEditDoc = (doc) => {
    setEditingDocId(doc.id)
    setEditDocNumber(doc.doc_number || '')
    setEditDocYear(doc.academic_year || '')
    setEditDocProf(doc.professor || '')
  }

  const handleSaveDoc = async (docId) => {
    setEditDocSaving(true)
    await supabase.from('documents').update({
      doc_number:    editDocNumber.trim() || null,
      academic_year: editDocYear || null,
      professor:     editDocProf.trim() || null,
    }).eq('id', docId)
    setUploads(u => u.map(d => d.id === docId ? {
      ...d,
      doc_number:    editDocNumber.trim() || null,
      academic_year: editDocYear || null,
      professor:     editDocProf.trim() || null,
    } : d))
    setEditDocSaving(false)
    setEditingDocId(null)
  }

  const handleDeleteDoc = (doc) => {
    setConfirmDeleteDoc(doc)
  }

  const executeDeleteDoc = async () => {
    const doc = confirmDeleteDoc
    if (!doc) return
    setDeleteDocBusy(true)
    if (doc.files?.length > 0) {
      for (const url of doc.files) {
        const path = url.split('/documents/')[1]
        if (path) await supabase.storage.from('documents').remove([path])
      }
    }
    await Promise.all([
      supabase.from('document_reactions').delete().eq('document_id', doc.id),
      supabase.from('downloads_log').delete().eq('document_id', doc.id),
      supabase.from('documents').delete().eq('id', doc.id),
    ])
    await supabase.from('user_profiles').update({
      uploads_count: Math.max(0, (profile?.uploads_count || 1) - 1),
      points:        Math.max(0, (profile?.points || 50) - 50),
    }).eq('id', currentUser.id)
    setUploads(u => u.filter(d => d.id !== doc.id))
    setProfile(p => ({
      ...p,
      uploads_count: Math.max(0, (p?.uploads_count || 1) - 1),
      points:        Math.max(0, (p?.points || 50) - 50),
    }))
    setDeleteDocBusy(false)
    setConfirmDeleteDoc(null)
  }

  const searchModules = async (q) => {
    setMoveReqSearch(q)
    setMoveReqSelMod(null)
    if (q.trim().length < 2) { setMoveReqMods([]); return }
    const { data } = await supabase.from('modules').select('id, name').ilike('name', `%${q.trim()}%`).limit(8)
    setMoveReqMods(data || [])
  }

  const submitMoveReq = async (doc) => {
    if (!moveReqSelMod || !currentUser) return
    setMoveReqBusy(true)
    await supabase.from('document_move_requests').insert({
      document_id: doc.id,
      requester_id: currentUser.id,
      requested_module_id: moveReqSelMod.id,
      requested_module_name: moveReqSelMod.name,
      status: 'open',
    })
    setMoveReqSent(p => ({ ...p, [doc.id]: true }))
    setMoveReqBusy(false)
    setMoveReqDocId(null)
    setMoveReqSearch('')
    setMoveReqSelMod(null)
    setMoveReqMods([])
  }

  const handleSave = async () => {
    if (!editName.trim()) {
      setSaveMsg('Le nom ne peut pas être vide.'); setSaveMsgType('err'); return
    }
    setSaving(true); setSaveMsg('')
    const stripHtml = (s) => s.replace(/<[^>]*>/g, '').trim()
    const cleanBio  = stripHtml(editBio).slice(0, 300)
    const cleanName = stripHtml(editName).slice(0, 60)
    const { error } = await supabase.from('user_profiles').upsert({
      id:            currentUser.id,
      email:         currentUser.email,
      name:          cleanName,
      bio:           cleanBio,
      university_id: editUni ? parseInt(editUni) : null,
    }, { onConflict: 'id' })
    if (!error) await supabase.auth.updateUser({ data:{ name: editName.trim() } })
    setSaving(false)
    if (error) {
      setSaveMsg('Erreur lors de la sauvegarde.'); setSaveMsgType('err')
    } else {
      setSaveMsg('Profil mis à jour avec succès !'); setSaveMsgType('ok')
      setProfile(p => ({ ...p, name:cleanName, bio:cleanBio, university_id:editUni||null }))
    }
  }

  const saveUniFromModal = async () => {
    if (!uniModalSel || !currentUser) return
    setUniModalSaving(true)
    await supabase.from('user_profiles').update({ university_id: parseInt(uniModalSel) }).eq('id', currentUser.id)
    const uniObj = unis.find(u => String(u.id) === uniModalSel)
    setProfile(p => ({ ...p, university_id: parseInt(uniModalSel), universities: { name: uniObj?.name || '' } }))
    setUniModalSaving(false)
    setShowUniModal(false)
  }

  async function openFollowers() {
    setShowFollowersList(true)
    setListLoading(true)
    const { data: follows } = await supabase.from('user_follows').select('follower_id').eq('following_id', profile.id)
    if (follows?.length) {
      const ids = follows.map(f => f.follower_id)
      const { data: users } = await supabase.from('user_profiles').select('id, name, universities(name)').in('id', ids)
      setFollowersList(users || [])
    } else { setFollowersList([]) }
    setListLoading(false)
  }

  async function openFollowing() {
    setShowFollowingList(true)
    setListLoading(true)
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', profile.id)
    if (follows?.length) {
      const ids = follows.map(f => f.following_id)
      const { data: users } = await supabase.from('user_profiles').select('id, name, universities(name)').in('id', ids)
      setFollowingList(users || [])
    } else { setFollowingList([]) }
    setListLoading(false)
  }

  if (loading) return (
    <div className="page">
      <style>{css}</style>
      <Navbar />
      <div className="layout">
        {/* Header card skeleton */}
        <div className="skel" style={{ height:156, marginBottom:10, borderRadius:16 }} />
        {/* Social row skeleton */}
        <div className="skel" style={{ height:48, marginBottom:10, borderRadius:10 }} />
        {/* Stats row skeleton */}
        <div className="skel" style={{ height:72, marginBottom:10, borderRadius:12 }} />
        {/* Tabs skeleton */}
        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {[80,72,80,100].map((w,i) => <div key={i} className="skel" style={{ height:34, width:w, borderRadius:8 }} />)}
        </div>
        {/* Upload card skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ marginBottom:8, border:'1px solid #1C2A45', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
            <div className="skel" style={{ width:44, height:44, borderRadius:9, flexShrink:0 }} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
              <div className="skel" style={{ height:14, width:'55%', borderRadius:4 }} />
              <div className="skel" style={{ height:11, width:'75%', borderRadius:4 }} />
            </div>
            <div className="skel" style={{ height:28, width:70, borderRadius:7 }} />
          </div>
        ))}
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
              {profile?.is_fondateur && (
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  background:'#FBD34D', color:'#02040A',
                  borderRadius:6, padding:'2px 8px',
                  fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700,
                  letterSpacing:'0.5px',
                }}>
                  🏆 Fondateur
                </span>
              )}
              {profile?.is_moderator && !profile?.is_admin && (
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  background:'rgba(79,142,247,0.12)', color:'#4F8EF7',
                  border:'1px solid rgba(79,142,247,0.3)',
                  borderRadius:6, padding:'2px 8px',
                  fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700,
                  letterSpacing:'0.5px',
                }}>
                  🛡 MOD
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
            {isOwnProfile && !loading && !profile?.university_id && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.72rem', color:'var(--text3)' }}>
                  📍 Ajoute ton université pour personnaliser ton expérience
                </span>
                <button
                  onClick={() => { setUniModalSel(''); setShowUniModal(true) }}
                  style={{ background:'none', border:'1px solid rgba(79,142,247,0.25)', color:'var(--accent2)', borderRadius:6, padding:'2px 10px', fontSize:'0.72rem', cursor:'pointer', fontFamily:'DM Mono,monospace', whiteSpace:'nowrap', transition:'border-color 0.15s' }}>
                  Ajouter →
                </button>
              </div>
            )}
          </div>

          <div className="profile-right">
            <div style={{ position:'relative' }}>
              <div className="points-badge">
                <div className="points-val">{points}</div>
                <div className="points-label">POINTS</div>
              </div>
              <button
                onClick={() => setShowPointsInfo(true)}
                style={{ position:'absolute', top:5, right:7, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'0.78rem', lineHeight:1, padding:2, transition:'color 0.15s' }}
                title="Comment fonctionnent les points ?">
                ⓘ
              </button>
            </div>
            <span className={`rank-badge ${level.cls}`}>{level.label}</span>
          </div>
        </div>

        {/* ── SOCIAL ROW ── */}
        <div className="social-row">
          <div className="social-stat social-stat-click" onClick={openFollowers}>
            <span className="social-n">{followersCount}</span>
            <span className="social-l">Abonnés</span>
          </div>
          <div className="social-sep"/>
          <div className="social-stat social-stat-click" onClick={openFollowing}>
            <span className="social-n">{followingCount}</span>
            <span className="social-l">Abonnements</span>
          </div>
          <div className="social-sep"/>
          <div className="social-stat">
            <span className="social-n">{senpaiPosts.length}</span>
            <span className="social-l">Tips Senpai</span>
          </div>
          {!isOwnProfile && currentUser && (
            <div className="social-actions">
              <button
                className={`follow-btn ${isFollowing ? 'on' : 'off'}`}
                onClick={handleFollow}
                disabled={followBusy}
              >
                {isFollowing ? 'Abonné ✓' : '+ Suivre'}
              </button>
              {canSendMessage && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-dm', { detail: { userId: targetId, name: profile?.name || 'Étudiant' } }))}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, background:'rgba(79,142,247,0.08)', border:'1px solid rgba(79,142,247,0.25)', color:'var(--accent2)', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s', whiteSpace:'nowrap' }}
                >
                  ✉ Message
                </button>
              )}
            </div>
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

        {/* ── UPLOAD NUDGE (own profile, 0 uploads) ── */}
        {isOwnProfile && !loading && uploads.length === 0 && !uploadNudgeDismissed && (
          <div style={{ background:'linear-gradient(135deg,rgba(79,142,247,0.07),rgba(79,142,247,0.05))', border:'1px solid rgba(79,142,247,0.18)', borderRadius:12, padding:'14px 18px', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', position:'relative' }}>
            <span style={{ fontSize:'1.1rem' }}>📤</span>
            <span style={{ flex:1, fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.4 }}>
              Upload ton premier document et gagne <b style={{ color:'var(--accent2)' }}>50 points</b> !
            </span>
            <button
              onClick={() => navigate('/upload')}
              style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, padding:'6px 16px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}>
              Uploader maintenant
            </button>
            <button
              onClick={() => { setUploadNudgeDismissed(true); localStorage.setItem('9rz_upload_nudge', '1') }}
              style={{ position:'absolute', top:8, right:10, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, padding:'0 4px' }}
              aria-label="Fermer">
              ×
            </button>
          </div>
        )}

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
              {uploads.map(doc => {
                const isEditing = editingDocId === doc.id
                return (
                  <div key={doc.id}>
                    <div className="upload-card"
                      style={{ borderRadius: (isEditing || moveReqDocId === doc.id) ? '12px 12px 0 0' : undefined, cursor: isEditing ? 'default' : 'pointer', marginBottom:0 }}
                      onClick={() => !isEditing && doc.modules?.id && navigate(`/module/${doc.modules.id}`)}>
                      <div className={`doc-icon ${DOC_ICON[doc.doc_type] || 'icon-cours'}`}>
                        {DOC_LABEL[doc.doc_type] || 'DOC'}
                      </div>
                      <div className="upload-info">
                        <div className="upload-title">{doc.modules?.name || 'Module inconnu'}</div>
                        <div className="upload-sub">
                          <span>{DOC_LABEL[doc.doc_type] || doc.doc_type?.toUpperCase()}</span>
                          {doc.doc_number && <><span>·</span><span style={{color:'var(--text2)'}}>{doc.doc_number}</span></>}
                          {doc.academic_year && <><span>·</span><span>{doc.academic_year}</span></>}
                          <span>·</span><span>{doc.modules?.semester || '—'}</span>
                          <span>·</span><span>{doc.pages_count} p.</span>
                          {doc.professor && <><span>·</span><span>Prof. {doc.professor}</span></>}
                        </div>
                        {isOwnProfile && !isEditing && (
                          <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
                            <button
                              style={{ background:'rgba(79,142,247,0.07)', border:'1px solid rgba(79,142,247,0.18)', color:'var(--accent2)', borderRadius:5, padding:'2px 9px', fontSize:'0.68rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                              onClick={e => { e.stopPropagation(); startEditDoc(doc) }}>
                              Modifier
                            </button>
                            <button
                              style={{ background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.15)', color:'var(--red)', borderRadius:5, padding:'2px 9px', fontSize:'0.68rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                              onClick={e => { e.stopPropagation(); handleDeleteDoc(doc) }}>
                              Supprimer
                            </button>
                            {moveReqSent[doc.id] ? (
                              <span style={{ fontSize:'0.68rem', color:'#4ADE80', fontFamily:'DM Mono,monospace', padding:'2px 4px', display:'flex', alignItems:'center' }}>
                                ✓ Demande envoyée
                              </span>
                            ) : (
                              <button
                                style={{ background:'rgba(251,211,77,0.06)', border:'1px solid rgba(251,211,77,0.18)', color:'#FBD34D', borderRadius:5, padding:'2px 9px', fontSize:'0.68rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                                onClick={e => { e.stopPropagation(); setMoveReqDocId(moveReqDocId === doc.id ? null : doc.id); setMoveReqSearch(''); setMoveReqSelMod(null); setMoveReqMods([]) }}>
                                ⚠ Mauvais module ?
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="upload-right">
                        <span className="dl-count">⬇ {doc.downloads || 0} téléchargements</span>
                        <span className="upload-date">{fmtShort(doc.created_at)}</span>
                        <span className={doc.is_verified ? 'tag-verified' : 'tag-pending'}>
                          {doc.is_verified ? 'VÉRIFIÉ' : 'EN ATTENTE'}
                        </span>
                      </div>
                    </div>
                    {isOwnProfile && !isEditing && moveReqDocId === doc.id && !moveReqSent[doc.id] && (
                      <div style={{ background:'rgba(251,211,77,0.03)', border:'1px solid rgba(251,211,77,0.15)', borderTop:'none', borderRadius:'0 0 12px 12px', padding:'0.875rem 1.25rem' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'#FBD34D', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>// Quel est le bon module ?</div>
                        <div style={{ position:'relative' }}>
                          <input
                            style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 10px', color:'var(--text)', fontSize:'0.8rem', fontFamily:'Outfit,sans-serif', outline:'none', transition:'border-color 0.15s' }}
                            placeholder="Cherche le bon module..."
                            value={moveReqSearch}
                            onChange={e => searchModules(e.target.value)}
                            onFocus={e => e.currentTarget.style.borderColor='rgba(251,211,77,0.4)'}
                            onBlur={e => { e.currentTarget.style.borderColor='var(--border)'; setTimeout(() => setMoveReqMods([]), 150) }}
                            autoFocus
                          />
                          {moveReqMods.length > 0 && (
                            <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'var(--s2)', border:'1px solid var(--borderhi)', borderRadius:8, marginTop:3, maxHeight:160, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                              {moveReqMods.map(m => (
                                <div key={m.id}
                                  style={{ padding:'8px 10px', cursor:'pointer', fontSize:'0.82rem', color:'var(--text)', borderBottom:'1px solid var(--border)', fontFamily:'Outfit,sans-serif' }}
                                  onMouseDown={() => { setMoveReqSelMod(m); setMoveReqSearch(m.name); setMoveReqMods([]) }}
                                  onMouseEnter={e => e.currentTarget.style.background='var(--s3)'}
                                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                  {m.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:7, marginTop:8 }}>
                          <button
                            disabled={!moveReqSelMod || moveReqBusy}
                            style={{ background:'rgba(251,211,77,0.1)', border:'1px solid rgba(251,211,77,0.28)', color:'#FBD34D', borderRadius:6, padding:'5px 14px', fontSize:'0.75rem', fontWeight:600, cursor: (!moveReqSelMod || moveReqBusy) ? 'not-allowed' : 'pointer', fontFamily:'Outfit,sans-serif', opacity: (!moveReqSelMod || moveReqBusy) ? 0.5 : 1, transition:'opacity 0.15s' }}
                            onClick={() => submitMoveReq(doc)}>
                            {moveReqBusy ? 'Envoi...' : 'Envoyer la demande'}
                          </button>
                          <button
                            style={{ background:'none', border:'1px solid var(--border)', color:'var(--text3)', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                            onClick={e => { e.stopPropagation(); setMoveReqDocId(null) }}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {isOwnProfile && isEditing && (
                      <div style={{ background:'rgba(79,142,247,0.03)', border:'1px solid rgba(79,142,247,0.15)', borderTop:'none', borderRadius:'0 0 12px 12px', padding:'1rem 1.25rem' }}>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--accent2)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'0.75rem' }}>// modifier le document</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                          <div>
                            <label style={{ display:'block', fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>Label / Numéro</label>
                            <input className="input" placeholder="Ex: Examen 1, TD n°3..."
                              value={editDocNumber} onChange={e => setEditDocNumber(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ display:'block', fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>Année académique</label>
                            <select className="select" value={editDocYear} onChange={e => setEditDocYear(e.target.value)}>
                              <option value="">—</option>
                              {['2026/2027','2025/2026','2024/2025','2023/2024','2022/2023','2021/2022','2020/2021','2019/2020','2018/2019'].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom:'0.75rem' }}>
                          <label style={{ display:'block', fontFamily:'DM Mono,monospace', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>Professeur (optionnel)</label>
                          <input className="input" placeholder="Ex: Dr. Alaoui, Pr. Benali..."
                            value={editDocProf} onChange={e => setEditDocProf(e.target.value)} />
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button
                            style={{ background:'linear-gradient(135deg,var(--accent),#3A6ED4)', color:'#fff', border:'none', borderRadius:7, padding:'7px 18px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', opacity: editDocSaving ? 0.6 : 1 }}
                            disabled={editDocSaving}
                            onClick={() => handleSaveDoc(doc.id)}>
                            {editDocSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                          </button>
                          <button
                            style={{ background:'none', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:7, padding:'7px 14px', fontSize:'0.8rem', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                            onClick={() => setEditingDocId(null)}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
                  <textarea className="textarea-bio" value={editBio} onChange={e => setEditBio(e.target.value.slice(0, 300))}
                    placeholder="Décris-toi en quelques mots — filière, objectifs, what you're about..."/>
                  <div className="char-count" style={{color: editBio.length > 270 ? '#F87171' : undefined}}>{editBio.length} / 300</div>
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
                  href="https://paypal.me/saadga2003"
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

    {showFollowersList && (
      <div className="fl-overlay" onClick={() => setShowFollowersList(false)}>
        <div className="fl-modal" onClick={e => e.stopPropagation()}>
          <div className="fl-modal-head">
            <span className="fl-modal-title">Abonnés · {followersCount}</span>
            <button className="fl-close" onClick={() => setShowFollowersList(false)}>×</button>
          </div>
          <div className="fl-list">
            {listLoading ? (
              <div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px' }}>
                    <div className="skel" style={{ width:38, height:38, borderRadius:'50%', flexShrink:0 }} />
                    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                      <div className="skel" style={{ height:13, width:'50%', borderRadius:4 }} />
                      <div className="skel" style={{ height:11, width:'32%', borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : followersList.length === 0 ? (
              <div className="fl-empty">Aucun abonné pour l'instant</div>
            ) : followersList.map(u => (
              <div key={u.id} className="fl-item" onClick={() => { setShowFollowersList(false); navigate(`/user/${u.id}`) }}>
                <div className="fl-avatar">{(u.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="fl-name">{u.name}</div>
                  {u.universities?.name && <div className="fl-uni">{u.universities.name}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    {showFollowingList && (
      <div className="fl-overlay" onClick={() => setShowFollowingList(false)}>
        <div className="fl-modal" onClick={e => e.stopPropagation()}>
          <div className="fl-modal-head">
            <span className="fl-modal-title">Abonnements · {followingCount}</span>
            <button className="fl-close" onClick={() => setShowFollowingList(false)}>×</button>
          </div>
          <div className="fl-list">
            {listLoading ? (
              <div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px' }}>
                    <div className="skel" style={{ width:38, height:38, borderRadius:'50%', flexShrink:0 }} />
                    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                      <div className="skel" style={{ height:13, width:'50%', borderRadius:4 }} />
                      <div className="skel" style={{ height:11, width:'32%', borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : followingList.length === 0 ? (
              <div className="fl-empty">Aucun abonnement pour l'instant</div>
            ) : followingList.map(u => (
              <div key={u.id} className="fl-item" onClick={() => { setShowFollowingList(false); navigate(`/user/${u.id}`) }}>
                <div className="fl-avatar">{(u.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="fl-name">{u.name}</div>
                  {u.universities?.name && <div className="fl-uni">{u.universities.name}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {showPointsInfo && (
      <div className="fl-overlay" onClick={() => setShowPointsInfo(false)}>
        <div className="fl-modal" style={{ maxWidth:360, padding:0 }} onClick={e => e.stopPropagation()}>
          <div style={{ padding:'1.5rem 1.5rem 1.25rem' }}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'var(--teal2)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'0.75rem' }}>// système de points</div>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'1rem', fontWeight:700, color:'var(--white)', marginBottom:'1rem' }}>Comment gagner des points ?</div>
            <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:'0.82rem', color:'var(--text2)' }}>📤 Upload un document</span>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.82rem', color:'var(--teal2)', fontWeight:600 }}>+50 pts</span>
              </div>
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'var(--text3)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'0.6rem' }}>Niveaux</div>
            {[
              { label:'Étudiant',      range:'0 – 99 pts',    cls:'rank-etudiant' },
              { label:'Contributeur',  range:'100 – 299 pts',  cls:'rank-contrib' },
              { label:'Senpai',        range:'300 – 599 pts',  cls:'rank-senpai' },
              { label:'Légende',       range:'600+ pts',       cls:'rank-legende' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                <span className={`rank-badge ${r.cls}`}>{r.label}</span>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.72rem', color:'var(--text3)' }}>{r.range}</span>
              </div>
            ))}
            <div style={{ marginTop:'1rem', fontFamily:'Outfit,sans-serif', fontSize:'0.8rem', color:'var(--text2)', textAlign:'center', background:'rgba(79,142,247,0.05)', border:'1px solid rgba(79,142,247,0.12)', borderRadius:8, padding:'8px 12px' }}>
              Plus tu contribues, plus tu montes en grade !
            </div>
            <button
              onClick={() => setShowPointsInfo(false)}
              style={{ width:'100%', marginTop:'1rem', background:'var(--s2)', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:8, padding:'9px', fontSize:'0.85rem', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}

    {confirmDeleteDoc && (
      <div className="fl-overlay" onClick={() => !deleteDocBusy && setConfirmDeleteDoc(null)}>
        <div className="fl-modal" style={{ maxWidth:360, padding:0 }} onClick={e => e.stopPropagation()}>
          <div style={{ padding:'1.5rem 1.5rem 1.25rem' }}>
            <div style={{ fontSize:'1.5rem', marginBottom:'0.75rem' }}>🗑️</div>
            <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'1rem', fontWeight:700, color:'var(--white)', marginBottom:'0.4rem' }}>
              Supprimer ce document ?
            </div>
            <div style={{ fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.55, marginBottom:'0.5rem' }}>
              <b style={{ color:'var(--text)' }}>{confirmDeleteDoc.modules?.name || 'Document'}</b> sera supprimé définitivement.
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.72rem', color:'var(--red)', background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.18)', borderRadius:7, padding:'7px 11px', marginBottom:'1.25rem' }}>
              −50 points · action irréversible
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button
                disabled={deleteDocBusy}
                style={{ flex:1, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'var(--red)', borderRadius:8, padding:'9px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', opacity: deleteDocBusy ? 0.6 : 1 }}
                onClick={executeDeleteDoc}>
                {deleteDocBusy ? 'Suppression...' : 'Supprimer'}
              </button>
              <button
                disabled={deleteDocBusy}
                style={{ flex:1, background:'none', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:8, padding:'9px', fontSize:'0.85rem', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                onClick={() => setConfirmDeleteDoc(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {showUniModal && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(2,4,10,0.85)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={() => setShowUniModal(false)}>
          <div style={{ background:'#070C18', border:'1px solid #1C2A45', borderRadius:14, padding:'1.75rem', maxWidth:400, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'var(--accent)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:8 }}>// ton université</div>
            <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'#FFFFFF', marginBottom:6 }}>Quelle est ton université ?</h3>
            <p style={{ fontSize:'0.82rem', color:'var(--text2)', marginBottom:'1.25rem', lineHeight:1.5 }}>Personnalise ton expérience pour voir directement les modules de ton université.</p>
            <select
              style={{ width:'100%', background:'#0C1222', border:'1px solid #1C2A45', borderRadius:9, padding:'10px 12px', color:'#E2E8F0', fontSize:'0.875rem', fontFamily:'Outfit,sans-serif', outline:'none', marginBottom:'1.25rem', cursor:'pointer' }}
              value={uniModalSel}
              onChange={e => setUniModalSel(e.target.value)}>
              <option value="">Sélectionner ton université...</option>
              {unis.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button
                style={{ background:'none', border:'1px solid #1C2A45', color:'#94A3B8', borderRadius:8, padding:'8px 18px', fontSize:'0.85rem', fontFamily:'Outfit,sans-serif', cursor:'pointer' }}
                onClick={() => setShowUniModal(false)}>
                Annuler
              </button>
              <button
                disabled={!uniModalSel || uniModalSaving}
                style={{ background:'#4F8EF7', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:'0.85rem', fontWeight:600, fontFamily:'Outfit,sans-serif', cursor: !uniModalSel ? 'not-allowed' : 'pointer', opacity: !uniModalSel || uniModalSaving ? 0.5 : 1 }}
                onClick={saveUniFromModal}>
                {uniModalSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
