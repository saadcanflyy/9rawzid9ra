import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiSearch, FiArrowRight } from 'react-icons/fi'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}
const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --bg2:#080C14; --surface:#070C18; --s2:#0C1222; --s3:#111827;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }

  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--text); font-family:'Outfit',sans-serif; }
  .page { min-height:100vh; overflow-x:hidden; }

  /* HERO */
  .hero { position:relative; z-index:1; min-height:calc(100vh - 58px); display:flex; align-items:center; justify-content:center; padding:4rem 2rem 6rem; overflow:hidden; }
  .hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(79,142,247,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(79,142,247,0.06) 1px,transparent 1px); background-size:50px 50px; animation:gridMove 20s linear infinite; }
  @keyframes gridMove { 0%{transform:translateY(0)} 100%{transform:translateY(50px)} }
  .blob1 { position:absolute; width:600px; height:600px; border-radius:50%; background:radial-gradient(circle,rgba(79,142,247,0.12) 0%,transparent 70%); top:-100px; left:50%; transform:translateX(-50%); }
  .blob2 { position:absolute; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle,rgba(79,142,247,0.08) 0%,transparent 70%); bottom:100px; right:10%; }
  .hero-inner { position:relative; z-index:2; max-width:800px; text-align:center; }

  .status-chip { display:inline-flex; align-items:center; gap:8px; background:rgba(79,142,247,0.06); border:1px solid rgba(79,142,247,0.2); border-radius:100px; padding:5px 16px 5px 10px; margin-bottom:2rem; animation:fadeUp 0.5s ease both; }
  .status-dot { width:7px; height:7px; border-radius:50%; background:var(--teal); box-shadow:0 0 0 3px rgba(79,142,247,0.2); animation:sPulse 2s ease-in-out infinite; }
  @keyframes sPulse { 0%,100%{box-shadow:0 0 0 3px rgba(79,142,247,0.2)} 50%{box-shadow:0 0 0 6px rgba(79,142,247,0.05)} }
  .status-text { font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--text2); letter-spacing:0.3px; }
  .status-text span { color:var(--teal2); }

  .hero-title { font-size:clamp(2.8rem,7vw,5.2rem); font-weight:800; line-height:1.07; letter-spacing:-2px; color:var(--white); margin-bottom:1.5rem; animation:fadeUp 0.5s 0.08s ease both; }
  .grad { background:linear-gradient(90deg,var(--accent2) 0%,var(--teal2) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; display:block; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  .hero-sub-slogan { font-size:1rem; font-weight:600; color:var(--accent); letter-spacing:0.04em; margin:0 auto 0.6rem; animation:fadeUp 0.5s 0.12s ease both; }
  .hero-byline { font-size:0.82rem; font-weight:500; color:var(--text3); margin:0 auto 1.2rem; animation:fadeUp 0.5s 0.14s ease both; letter-spacing:0.02em; }
  .hero-byline span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-weight:700; }
  .hero-desc { max-width:520px; font-size:1.05rem; font-weight:400; color:var(--text2); line-height:1.75; margin:0 auto 2.5rem; animation:fadeUp 0.5s 0.16s ease both; }

  /* SEARCH */
  .search-wrap { width:100%; max-width:620px; animation:fadeUp 0.5s 0.24s ease both; margin:0 auto 1.25rem; }
  .search-bar { display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:5px 5px 5px 20px; gap:12px; transition:border-color 0.2s,box-shadow 0.2s; }
  .search-bar:focus-within { border-color:var(--accent); box-shadow:0 0 0 4px rgba(79,142,247,0.12),0 8px 32px rgba(79,142,247,0.08); }
  .search-ico { font-family:'DM Mono',monospace; font-size:0.875rem; color:var(--text3); flex-shrink:0; }
  .search-input { flex:1; background:none; border:none; outline:none; font-size:0.95rem; color:var(--text); font-family:'Outfit',sans-serif; padding:11px 0; }
  .search-input::placeholder { color:var(--text3); }
  .search-submit { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:11px 24px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; white-space:nowrap; position:relative; overflow:hidden; }
  .search-submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .search-submit:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,142,247,0.45); }

  .search-tags { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center; animation:fadeUp 0.5s 0.3s ease both; }
  .search-tag-label { font-size:0.78rem; color:var(--text3); font-family:'DM Mono',monospace; }
  .search-tag { background:none; border:1px solid var(--border); border-radius:6px; padding:4px 12px; font-size:0.75rem; color:var(--text2); cursor:pointer; transition:all 0.15s; font-family:'DM Mono',monospace; }
  .search-tag:hover, .search-tag.on { border-color:var(--accent); color:var(--accent2); background:rgba(79,142,247,0.1); }
  .search-tag-hint { font-size:0.68rem; color:var(--text3); font-family:'DM Mono',monospace; margin-left:6px; opacity:0.75; }
  .search-kbd { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--text3); background:var(--s2); border:1px solid var(--border); border-radius:5px; padding:2px 7px; margin-right:6px; flex-shrink:0; }

  /* STATS */
  .stats-row { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; max-width:640px; margin:3rem auto 0; animation:fadeUp 0.5s 0.4s ease both; }
  .stat { flex:1; padding:1.2rem 0.75rem; text-align:center; position:relative; }
  .stat+.stat::before { content:''; position:absolute; left:0; top:18%; bottom:18%; width:1px; background:var(--border); }
  .stat-n { font-family:'DM Mono',monospace; font-size:1.5rem; font-weight:500; background:linear-gradient(135deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:3px; }
  .stat-l { font-size:0.7rem; color:var(--text3); font-weight:500; letter-spacing:0.5px; text-transform:uppercase; }
  .stat.free { background:rgba(79,142,247,0.06); }
  .stat.free .stat-n { -webkit-text-fill-color:var(--accent2); background:none; }
  .stat-sub-free { font-size:0.62rem; color:var(--text3); margin-top:4px; line-height:1.3; }
  .stat-spark { display:flex; align-items:flex-end; justify-content:center; gap:2px; margin-top:6px; height:22px; }
  .stat-spark span { display:block; width:4px; background:rgba(79,142,247,0.35); border-radius:1px 1px 0 0; }
  .stat-spark span.today { background:var(--accent); }
  .stat-delta { font-family:'DM Mono',monospace; font-size:0.6rem; margin-top:4px; }
  .stat-delta.up { color:var(--green); }
  .stat-delta.down { color:var(--red); }
  .stat-pills { display:flex; align-items:center; justify-content:center; gap:3px; margin-top:5px; flex-wrap:wrap; }
  .stat-pill { font-family:'DM Mono',monospace; font-size:0.55rem; color:var(--text3); background:var(--s2); border:1px solid var(--border); border-radius:3px; padding:1px 5px; }

  /* RECENT ACTIVITY */
  .recent-row { display:flex; gap:10px; max-width:900px; margin:1.5rem auto 0; flex-wrap:wrap; justify-content:center; animation:fadeUp 0.5s 0.45s ease both; }
  .recent-card { flex:1; min-width:220px; max-width:280px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:0.75rem 1rem; text-align:left; cursor:pointer; transition:border-color 0.15s; }
  .recent-card:hover { border-color:var(--borderhi); }
  .recent-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px; }
  .recent-ago { font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--text3); }
  .recent-badge { font-family:'DM Mono',monospace; font-size:0.55rem; font-weight:700; padding:1px 6px; border-radius:3px; background:rgba(79,142,247,0.1); color:var(--accent2); border:1px solid rgba(79,142,247,0.2); white-space:nowrap; }
  .recent-badge.corrige { background:rgba(74,222,128,0.1); color:var(--green); border-color:rgba(74,222,128,0.2); }
  .recent-name { font-size:0.8rem; font-weight:600; color:var(--text); line-height:1.35; }

  /* SCHOOLS */
  .section { max-width:1200px; margin:0 auto; padding:5rem 2.5rem; }
  .section-eyebrow { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--accent); letter-spacing:3px; text-transform:uppercase; margin-bottom:0.75rem; }
  .section-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; }
  .section-title { font-size:1.75rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; line-height:1.2; }
  .section-title span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .section-link { font-size:0.8rem; color:var(--text2); cursor:pointer; background:none; border:1px solid var(--border); border-radius:8px; padding:8px 16px; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .section-link:hover { border-color:var(--accent); color:var(--accent2); }

  .school-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .school-card { background:var(--surface); padding:1.5rem; cursor:pointer; transition:background 0.15s; display:flex; flex-direction:column; gap:0.75rem; position:relative; }
  .school-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--accent),var(--teal)); transform:scaleX(0); transform-origin:left; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); }
  .school-card:hover { background:var(--s2); }
  .school-card:hover::after { transform:scaleX(1); }
  .school-row1 { display:flex; align-items:center; justify-content:space-between; }
  .school-abbr { font-family:'DM Mono',monospace; font-size:0.65rem; font-weight:500; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; }
  .school-badge { font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:500; padding:2px 8px; border-radius:4px; letter-spacing:0.5px; }
  .badge-pub  { background:rgba(79,142,247,0.08); color:var(--teal2); border:1px solid rgba(79,142,247,0.15); }
  .badge-priv { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.15); }
  .badge-semi { background:rgba(123,179,255,0.08); color:#5EEAD4; border:1px solid rgba(123,179,255,0.15); }
  .school-name { font-size:0.95rem; font-weight:600; color:var(--white); line-height:1.35; }
  .school-meta { display:flex; align-items:center; gap:1rem; padding-top:0.75rem; border-top:1px solid var(--border); }
  .school-meta-item { font-size:0.72rem; color:var(--text3); }
  .school-meta-item b { color:var(--text2); font-weight:500; }
  .school-city { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--text3); margin-left:auto; }

  /* METRICS */
  .metrics { border-top:1px solid var(--border); border-bottom:1px solid var(--border); background:var(--surface); padding:4rem 2.5rem; }
  .metrics-inner { max-width:1000px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:2rem; }
  .metric-val { font-family:'DM Mono',monospace; font-size:2.2rem; font-weight:500; background:linear-gradient(135deg,var(--white),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:6px; }
  .metric-label { font-size:0.82rem; color:var(--text2); font-weight:500; margin-bottom:4px; }
  .metric-sub { font-size:0.72rem; color:var(--text3); font-family:'DM Mono',monospace; }

  /* HOW */
  .how-section { max-width:1000px; margin:0 auto; padding:5rem 2.5rem; }
  .steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:2rem; margin-top:2rem; }
  .step { position:relative; }
  .step-num { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); margin-bottom:1rem; letter-spacing:1px; }
  .step-bar { height:3px; width:40px; border-radius:2px; background:linear-gradient(90deg,var(--accent),var(--teal)); margin-bottom:1rem; }
  .step-title { font-size:1rem; font-weight:600; color:var(--white); margin-bottom:8px; }
  .step-desc { font-size:0.82rem; color:var(--text2); line-height:1.7; }

  /* CTA */
  .cta-wrap { max-width:1200px; margin:0 auto; padding:0 2.5rem 5rem; }
  .cta-block { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:3.5rem; display:grid; grid-template-columns:1fr auto; gap:2rem; align-items:center; position:relative; overflow:hidden; }
  .cta-block::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent) 30%,var(--teal) 70%,transparent); }
  .cta-block::after { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 60% 80% at 0% 50%,rgba(79,142,247,0.06) 0%,transparent 60%); pointer-events:none; }
  .cta-label { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:0.75rem; }
  .cta-title { font-size:1.6rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; margin-bottom:0.75rem; }
  .cta-title span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .cta-desc { font-size:0.875rem; color:var(--text2); line-height:1.7; }
  .cta-actions { display:flex; flex-direction:column; gap:10px; align-items:flex-end; position:relative; z-index:1; }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:12px 28px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; position:relative; overflow:hidden; white-space:nowrap; }
  .btn-primary::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(79,142,247,0.45); }
  .btn-outline { background:none; color:var(--text2); border:1px solid var(--border); border-radius:10px; padding:12px 28px; font-size:0.875rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; white-space:nowrap; }
  .btn-outline:hover { border-color:var(--accent); color:var(--accent2); }

  /* FOOTER */
  .footer { border-top:1px solid var(--border); background:var(--surface); }
  .footer-grid { max-width:1200px; margin:0 auto; padding:3rem 2.5rem 2rem; display:grid; grid-template-columns:1fr 1fr 1fr; gap:3rem; }
  @media(max-width:768px){ .footer-grid{ grid-template-columns:1fr; gap:2rem; padding:2rem 1.5rem 1.5rem; } }
  .footer-brand { font-family:'DM Mono',monospace; font-size:1rem; color:var(--text); }
  .footer-brand b { color:var(--accent2); font-weight:400; }
  .footer-tagline { font-size:0.78rem; color:var(--text3); margin-top:8px; line-height:1.6; }
  .footer-col-title { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); letter-spacing:2px; text-transform:uppercase; margin-bottom:1rem; }
  .footer-link { display:block; font-size:0.82rem; color:var(--text2); cursor:pointer; transition:color 0.15s; font-weight:500; background:none; border:none; font-family:'Outfit',sans-serif; padding:0; margin-bottom:8px; text-align:left; }
  .footer-link:hover { color:var(--accent2); }
  .footer-bar { border-top:1px solid var(--border); padding:1rem 2.5rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .footer-copy { font-size:0.7rem; color:var(--text3); font-family:'DM Mono',monospace; }
  .footer-bar-links { display:flex; align-items:center; gap:1rem; }
  .footer-bar-link { font-size:0.7rem; color:var(--text3); background:none; border:none; cursor:pointer; font-family:'Outfit',sans-serif; transition:color 0.15s; padding:0; }
  .footer-bar-link:hover { color:var(--accent2); }
  .footer-dev { font-size:0.7rem; color:var(--text3); font-family:'DM Mono',monospace; }

  .suggest-wrap { max-width:960px; margin:0 auto; padding:0 2rem 2rem; }
  .suggest-card { background:var(--surface); border:1px solid rgba(79,142,247,0.2); border-radius:14px; padding:1.1rem 1.4rem; display:flex; align-items:center; gap:1rem; position:relative; }
  .suggest-card::before { content:''; position:absolute; inset:0; border-radius:14px; background:linear-gradient(135deg,rgba(79,142,247,0.04),rgba(79,142,247,0.02)); pointer-events:none; }
  .suggest-av { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--teal)); display:flex; align-items:center; justify-content:center; font-family:'DM Mono',monospace; font-size:1rem; font-weight:700; color:#fff; flex-shrink:0; }
  .suggest-info { flex:1; min-width:0; }
  .suggest-tag { font-family:'DM Mono',monospace; font-size:0.58rem; color:var(--accent2); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:2px; }
  .suggest-name { font-size:0.88rem; font-weight:700; color:var(--white); }
  .suggest-bio { font-size:0.75rem; color:var(--text2); }
  .suggest-follow-btn { background:var(--accent); color:#fff; border:none; border-radius:8px; padding:7px 18px; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; flex-shrink:0; }
  .suggest-follow-btn.done { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.22); cursor:default; }
  .suggest-dismiss { position:absolute; top:8px; right:10px; background:none; border:none; color:var(--text3); cursor:pointer; font-size:0.85rem; line-height:1; padding:2px; transition:color 0.15s; }
  .suggest-dismiss:hover { color:var(--text); }

  /* SKELETON */
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel {
    background:linear-gradient(90deg,#070C18,#0C1222,#070C18);
    background-size:200% 100%; animation:shimmer 1.5s infinite;
    border-radius:8px;
  }

  @media(max-width:768px) {
    .hero { padding:2.5rem 1.25rem 3.5rem; min-height:auto; }
    .hero-inner h1 { font-size:2.1rem; }
    .hero-inner p { font-size:0.85rem; }
    .school-grid { grid-template-columns:1fr 1fr; gap:1px; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .steps { grid-template-columns:1fr 1fr; gap:1.25rem; }
    .section { padding:3rem 1.25rem; }
    .cta-block { grid-template-columns:1fr; padding:2rem 1.5rem; }
    .cta-actions { align-items:stretch; flex-direction:row; flex-wrap:wrap; }
    .footer-bar { padding:1rem 1.25rem; }
  }
  @media(max-width:480px) {
    .hero-inner h1 { font-size:1.65rem; }
    .school-grid { grid-template-columns:1fr; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .steps { grid-template-columns:1fr; }
    .search-row { flex-direction:column; gap:8px; }
    .cta-actions { flex-direction:column; }
    .btn-primary, .btn-outline { width:100%; text-align:center; }
  }

  /* FAQ */
  .faq-section { max-width:780px; margin:0 auto; padding:4rem 2.5rem; }
  .faq-label { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:0.6rem; }
  .faq-title { font-size:1.4rem; font-weight:700; color:var(--white); margin-bottom:2rem; letter-spacing:-0.4px; }
  .faq-list { display:flex; flex-direction:column; gap:8px; }
  details.faq-item { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:border-color 0.2s; }
  details.faq-item[open] { border-color:var(--borderhi); }
  details.faq-item summary { list-style:none; cursor:pointer; padding:1.1rem 1.4rem; font-size:0.92rem; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:space-between; gap:1rem; user-select:none; }
  details.faq-item summary::-webkit-details-marker { display:none; }
  details.faq-item summary::after { content:'+'; font-family:'DM Mono',monospace; font-size:1.1rem; color:var(--text3); transition:transform 0.2s, color 0.2s; flex-shrink:0; }
  details.faq-item[open] summary::after { content:'−'; color:var(--accent2); }
  details.faq-item summary:hover { color:var(--accent2); }
  .faq-body { padding:0 1.4rem 1.2rem; font-size:0.875rem; color:var(--text2); line-height:1.8; border-top:1px solid var(--border); padding-top:1rem; margin-top:0; }
  .faq-body a { color:var(--accent2); cursor:pointer; }
  @media(max-width:768px) { .faq-section { padding:3rem 1.25rem; } }
`

const SCHOOLS = [
  { id:1, name:'Université Mohammed V', abbr:'UM5', city:'Rabat', type:'public', facs:10, fils:28 },
  { id:2, name:'Université Ibn Tofail', abbr:'UIT', city:'Kénitra', type:'public', facs:5, fils:10 },
  { id:3, name:'École Marocaine des Sciences de l\'Ingénieur', abbr:'EMSI', city:'Rabat', type:'private', facs:1, fils:1 },
  { id:4, name:'École Sup. de Management, Télécommunication et Informatique', abbr:'SUPMTI', city:'Rabat', type:'private', facs:1, fils:2 },
  { id:5, name:'Université Internationale de Rabat', abbr:'UIR', city:'Rabat', type:'private', facs:1, fils:2 },
  { id:6, name:'Institut Supérieur de Commerce et d\'Administration', abbr:'ISCAE', city:'Rabat', type:'semi-public', facs:1, fils:1 },
]

const STEPS = [
  { n:'01', title:'Sélectionne ton école', desc:'Choisis parmi 19 établissements. Université publique ou école privée — tout est couvert.' },
  { n:'02', title:'Filtre par module', desc:'Navigue jusqu\'à ton semestre et module exact. 762+ modules structurés et vérifiés.' },
  { n:'03', title:'Accède aux documents', desc:'Examens finaux, contrôles continus, TDs, TPs — uploadés par la communauté.' },
  { n:'04', title:'Contribue & progresse', desc:'Upload tes propres annales, gagne des points et aide les étudiants de ta promo.' },
]

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'

const DOC_LABEL = { examen:'EXAMEN', cc:'CC', td:'TD', tp:'TP', quiz:'QUIZ', cours:'COURS', corrige_examen:'CORRIGÉ', corrige_td:'CORRIGÉ', corrige_tp:'CORRIGÉ', projet_final:'PROJET' }
const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'à l\'instant'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

export default function Home() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [query,        setQuery]        = useState('')
  const [docCount,     setDocCount]     = useState(0)
  const [uniCount,     setUniCount]     = useState(null)
  const [modCount,     setModCount]     = useState(null)
  const [weekDelta,    setWeekDelta]    = useState(null)
  const [sparkline,    setSparkline]    = useState([])
  const [recentDocs,   setRecentDocs]   = useState([])
  const [activeTag,    setActiveTag]    = useState(-1)
  const [schoolsReady, setSchoolsReady] = useState(false)
  const searchInputRef = useRef(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [suggestFollowing, setSuggestFollowing] = useState(false)
  const [suggestDismissed, setSuggestDismissed] = useState(() =>
    localStorage.getItem('suggest_admin_dismissed') === 'true'
  )
  const [uploadNudgeDismissed, setUploadNudgeDismissed] = useState(
    () => localStorage.getItem('9rz_upload_nudge') === '1'
  )

  useEffect(() => {
    document.title = '9rawZid9ra — Annales & examens pour étudiants marocains'
    supabase.from('documents').select('*', { count:'exact', head:true })
      .eq('is_verified', true)
      .then(({ count }) => { if (count) setDocCount(count) })
      .catch(() => {})
      .finally(() => setSchoolsReady(true))

    supabase.from('universities').select('*', { count:'exact', head:true }).then(({ count }) => setUniCount(count || 0))
    supabase.from('modules').select('*', { count:'exact', head:true }).then(({ count }) => setModCount(count || 0))

    // Real weekly delta + 7-day sparkline — computed from documents.created_at
    supabase.from('documents').select('created_at').eq('is_verified', true)
      .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
      .then(({ data }) => {
        const rows = data || []
        const dayKey = d => new Date(d).toISOString().slice(0, 10)
        const counts = {}
        for (const r of rows) counts[dayKey(r.created_at)] = (counts[dayKey(r.created_at)] || 0) + 1
        const days = [...Array(7)].map((_, i) => counts[dayKey(new Date(Date.now() - (6 - i) * 86400000))] || 0)
        const thisWeek = days.reduce((s, n) => s + n, 0)
        const prevWeek = rows.length - thisWeek
        setSparkline(days)
        setWeekDelta(prevWeek > 0 || thisWeek > 0 ? thisWeek - prevWeek : null)
      })

    // Real recent-activity feed
    supabase.from('documents')
      .select('id, doc_type, academic_year, created_at, modules(id, name, slug)')
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentDocs(data || []))
  }, [])

  useEffect(() => {
    if (user) loadFollowingState(user.id)
  }, [user?.id]) // eslint-disable-line

  // Real ⌘K / Ctrl+K shortcut — focuses the hero search input
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const loadFollowingState = async (uid) => {
    const { count } = await supabase.from('user_follows').select('*', { count:'exact', head:true }).eq('follower_id', uid)
    setFollowingCount(count || 0)
    const { data: alreadyF } = await supabase.from('user_follows').select('id').eq('follower_id', uid).eq('following_id', ADMIN_ID).maybeSingle()
    setSuggestFollowing(!!alreadyF)
  }

  const handleSuggestFollow = async () => {
    if (!user || suggestFollowing) return
    await supabase.from('user_follows').insert({ follower_id: user.id, following_id: ADMIN_ID })
    setSuggestFollowing(true)
    toast.success('Abonné avec succès !')
  }

  const dismissSuggest = () => {
    setSuggestDismissed(true)
    localStorage.setItem('suggest_admin_dismissed', 'true')
  }

  const showSuggest = user && followingCount === 0 && !suggestDismissed

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/browse${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
  }

  const TAGS = ['Analyse 1', 'Algorithmique', 'Droit Civil', 'Comptabilité', 'POO Java', 'Marketing']
  const badgeClass = t => t === 'public' ? 'badge-pub' : t === 'private' ? 'badge-priv' : 'badge-semi'
  const badgeLabel = t => t === 'public' ? 'PUBLIC' : t === 'private' ? 'PRIVÉ' : 'SEMI-PUB'

  return (
    <div className="page">
      <style>{css}</style>
      <Navbar activePage="home" />

      {/* UPLOAD NUDGE */}
      {user && !uploadNudgeDismissed && profile?.uploads_count === 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(79,142,247,0.07),rgba(79,142,247,0.05))', borderBottom:'1px solid rgba(79,142,247,0.15)', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap', position:'relative' }}>
          <span style={{ fontSize:'0.875rem', color:'var(--text2)', fontFamily:'Outfit,sans-serif' }}>
            📤 Upload ton premier document et gagne <b style={{ color:'var(--accent2)' }}>50 points</b> !
          </span>
          <button
            onClick={() => navigate('/upload')}
            style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, padding:'5px 16px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}>
            Uploader maintenant
          </button>
          <button
            onClick={() => { setUploadNudgeDismissed(true); localStorage.setItem('9rz_upload_nudge', '1') }}
            style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1.2rem', lineHeight:1, padding:'0 4px' }}
            aria-label="Fermer">
            ×
          </button>
        </div>
      )}

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="blob1" />
        <div className="blob2" />
        <div className="hero-inner">
          <div className="status-chip">
            <div className="status-dot" />
            <span className="status-text">
              Plateforme marocaine de ressources &nbsp;—&nbsp; <span>100% gratuit</span>
            </span>
          </div>
          <h1 className="hero-title">
            Trouve tes ressources
            <span className="grad">en 30 secondes.</span>
          </h1>
          <p className="hero-sub-slogan">Annales, examens, TD et TP gratuits — 9ra w zid 9ra m3a 9rawZid9ra</p>
          <p className="hero-byline">Créé par un étudiant, pour les <span>étudiants</span></p>
          <p className="hero-desc">
            Examens, CCs, TDs et TPs organisés par école, filière et semestre.
            Uploadés par des étudiants comme toi. Gratuit, rapide, structuré.
          </p>
          <div className="search-wrap">
            <form onSubmit={onSearch}>
              <div className="search-bar">
                <FiSearch size={16} style={{ color:'var(--text3)', flexShrink:0 }} />
                <input className="search-input" ref={searchInputRef}
                  placeholder="Recherche un module... ex: Analyse 1, POO, Droit Commercial"
                  value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveTag(i => (i + 1) % TAGS.length) }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveTag(i => (i - 1 + TAGS.length) % TAGS.length) }
                    else if (e.key === 'Enter' && activeTag >= 0 && !query.trim()) { e.preventDefault(); navigate(`/browse?q=${encodeURIComponent(TAGS[activeTag])}`) }
                  }} />
                <span className="search-kbd">⌘K</span>
                <button type="submit" className="search-submit">Rechercher</button>
              </div>
            </form>
          </div>
          <div className="search-tags">
            <span className="search-tag-label">// suggestions</span>
            {TAGS.map((t, i) => (
              <button key={t} className={`search-tag ${activeTag === i ? 'on' : ''}`}
                onMouseEnter={() => setActiveTag(i)}
                onClick={() => { setQuery(t); navigate(`/browse?q=${encodeURIComponent(t)}`) }}>
                {t}
              </button>
            ))}
            <span className="search-tag-hint">↑↓ naviguer · ↵ ouvrir</span>
          </div>
          <div className="stats-row">
            <div className="stat">
              <div className="stat-n">{modCount !== null ? modCount.toLocaleString() : '—'}</div>
              <div className="stat-l">Modules</div>
              {sparkline.length > 0 && (
                <div className="stat-spark">
                  {sparkline.map((n, i) => {
                    const max = Math.max(...sparkline, 1)
                    return <span key={i} className={i === sparkline.length - 1 ? 'today' : ''} style={{ height: `${8 + Math.round((n / max) * 14)}px` }} />
                  })}
                </div>
              )}
            </div>
            <div className="stat">
              <div className="stat-n">{docCount || '0'}</div>
              <div className="stat-l">Documents</div>
              {weekDelta !== null && weekDelta !== 0 && (
                <div className={`stat-delta ${weekDelta > 0 ? 'up' : 'down'}`}>
                  {weekDelta > 0 ? '▲' : '▼'} {Math.abs(weekDelta)} cette semaine
                </div>
              )}
            </div>
            <div className="stat">
              <div className="stat-n">{uniCount !== null ? uniCount : '—'}</div>
              <div className="stat-l">Établissements</div>
              <div className="stat-pills">
                {SCHOOLS.slice(0, 3).map(s => <span key={s.id} className="stat-pill">{s.abbr}</span>)}
                {uniCount > 3 && <span className="stat-pill">+{uniCount - 3}</span>}
              </div>
            </div>
            <div className="stat free">
              <div className="stat-n">FREE</div>
              <div className="stat-l">Accès</div>
              <div className="stat-sub-free">Aucune carte, aucun quota</div>
            </div>
          </div>

          {recentDocs.length > 0 && (
            <div className="recent-row">
              {recentDocs.map(d => (
                <div key={d.id} className="recent-card" onClick={() => navigate(`/module/${d.modules?.slug || d.modules?.id}`)}>
                  <div className="recent-top">
                    <span className="recent-ago">// ajouté {fmtAgo(d.created_at)}</span>
                    <span className={`recent-badge ${d.doc_type?.startsWith('corrige') ? 'corrige' : ''}`}>{DOC_LABEL[d.doc_type] || d.doc_type?.toUpperCase()}</span>
                  </div>
                  <div className="recent-name">{d.modules?.name || 'Module'}{d.academic_year ? ` — ${d.academic_year}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SUGGEST ADMIN FOLLOW */}
      {showSuggest && (
        <div className="suggest-wrap">
          <div className="suggest-card">
            <button className="suggest-dismiss" onClick={dismissSuggest} title="Masquer">✕</button>
            <div className="suggest-av">S</div>
            <div className="suggest-info">
              <div className="suggest-tag">// suggestion</div>
              <div className="suggest-name">Saad GENIUS</div>
              <div className="suggest-bio">Créateur de 9rawZid9ra 🇲🇦 — Suis-moi pour rester informé des nouveautés</div>
            </div>
            <button
              className={`suggest-follow-btn ${suggestFollowing ? 'done' : ''}`}
              onClick={handleSuggestFollow}
              disabled={suggestFollowing}
            >
              {suggestFollowing ? 'Abonné ✓' : 'Suivre'}
            </button>
          </div>
        </div>
      )}

      {/* SCHOOLS */}
      <motion.section className="section" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={reveal}>
        <div className="section-eyebrow">// établissements couverts</div>
        <div className="section-head">
          <h2 className="section-title">Couverture <span>complète</span><br />de la région</h2>
          <button className="section-link" onClick={() => navigate('/browse')}>Voir tous les modules</button>
        </div>
        <motion.div className="school-grid" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} variants={staggerParent}>
          {!schoolsReady ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="school-card" style={{ cursor:'default', gap:12, display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div className="skel" style={{ height:12, width:'25%', borderRadius:4 }} />
                  <div className="skel" style={{ height:18, width:'22%', borderRadius:4 }} />
                </div>
                <div className="skel" style={{ height:20, width:'82%', borderRadius:4 }} />
                <div style={{ display:'flex', gap:16, paddingTop:'0.75rem', borderTop:'1px solid #1C2A45' }}>
                  <div className="skel" style={{ height:13, width:'28%', borderRadius:4 }} />
                  <div className="skel" style={{ height:13, width:'28%', borderRadius:4 }} />
                </div>
              </div>
            ))
          ) : (
            SCHOOLS.map(s => (
              <motion.div key={s.id} className="school-card" variants={reveal} whileHover={{ y: -3 }} transition={{ duration: 0.15 }} onClick={() => navigate(`/browse?uni=${s.id}`)}>
                <div className="school-row1">
                  <span className="school-abbr">{s.abbr}</span>
                  <span className={`school-badge ${badgeClass(s.type)}`}>{badgeLabel(s.type)}</span>
                </div>
                <div className="school-name">{s.name}</div>
                <div className="school-meta">
                  <span className="school-meta-item"><b>{s.facs}</b> facultés</span>
                  <span className="school-meta-item"><b>{s.fils}</b> filières</span>
                  <span className="school-city">{s.city}</span>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.section>

      {/* METRICS */}
      <div className="metrics">
        <motion.div className="metrics-inner" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={staggerParent}>
          {[
            { v:'762+',  l:'Modules structurés',    s:'Organisés par filière et semestre' },
            { v:'19',    l:'Établissements',         s:'Toutes les grandes écoles' },
            { v:'48',    l:'Filières couvertes',     s:'Licence, Ingénieur, Master' },
            { v:'0 MAD', l:'Coût d\'accès',          s:'Gratuit pour tous les étudiants' },
          ].map(m => (
            <motion.div key={m.l} variants={reveal}>
              <div className="metric-val">{m.v}</div>
              <div className="metric-label">{m.l}</div>
              <div className="metric-sub">{m.s}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* HOW IT WORKS */}
      <motion.div className="how-section" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={reveal}>
        <div className="section-eyebrow">// comment ça marche</div>
        <h2 className="section-title" style={{marginBottom:0}}>
          Simple.{' '}
          <span style={{background:'linear-gradient(90deg,#7BB3FF,#4F8EF7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
            Rapide. Gratuit.
          </span>
        </h2>
        <motion.div className="steps" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} variants={staggerParent}>
          {STEPS.map(s => (
            <motion.div key={s.n} className="step" variants={reveal}>
              <div className="step-num">ÉTAPE {s.n}</div>
              <div className="step-bar" />
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.div className="cta-wrap" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={reveal}>
        <div className="cta-block">
          <div>
            <div className="cta-label">// contribue à la communauté</div>
            <h2 className="cta-title">Tu as des annales ?<br /><span>Partage-les avec ta promo.</span></h2>
            <p className="cta-desc">
              Chaque document uploadé aide des dizaines d'étudiants. Upload tes examens,
              gagne des points. La plateforme grandit grâce à toi.
            </p>
          </div>
          <div className="cta-actions">
            {!user && (
              <button className="btn-primary" onClick={() => navigate('/register')}>Créer un compte</button>
            )}
            <button className="btn-outline" onClick={() => navigate('/upload')}>Uploader un document <FiArrowRight size={14} style={{marginLeft:6, verticalAlign:'-2px'}}/></button>
          </div>
        </div>
      </motion.div>

      {/* FLOATING TIP BUTTON */}
      <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:100 }}>
        <motion.a
          href="https://paypal.me/saadga2003"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{ background:'linear-gradient(135deg,#FBD34D,#F59E0B)', color:'#02040A', border:'none', borderRadius:100, padding:'12px 20px', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', fontFamily:"'Outfit',sans-serif", display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 20px rgba(251,211,77,0.35)', textDecoration:'none' }}
        >
          ☕ Soutenir le projet
        </motion.a>
      </div>

      {/* FAQ */}
      <section className="faq-section">
        <div className="faq-label">// FAQ</div>
        <h2 className="faq-title">Questions fréquentes</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Comment trouver les examens de mon université ?</summary>
            <div className="faq-body">
              Clique sur <strong>Explorer</strong> dans la barre de navigation, puis sélectionne ton université dans la liste. Tu peux ensuite filtrer par faculté, filière et semestre pour trouver exactement ce que tu cherches — examens, contrôles continus, TDs et TPs.
            </div>
          </details>
          <details className="faq-item">
            <summary>Comment uploader mes documents ?</summary>
            <div className="faq-body">
              Crée un compte gratuitement, puis clique sur <strong>Uploader</strong>. Sélectionne l'université, la filière, le module et le semestre correspondants, puis dépose ton fichier PDF. Tes documents sont vérifiés avant publication pour garantir la qualité.
            </div>
          </details>
          <details className="faq-item">
            <summary>9rawZid9ra est-il gratuit ?</summary>
            <div className="faq-body">
              Oui, 100% gratuit et sans publicité intrusive. Télécharge autant d'examens, de TDs et de cours que tu veux sans limite. La plateforme est entièrement financée par la communauté — si tu veux la soutenir, il y a un bouton de don optionnel.
            </div>
          </details>
          <details className="faq-item">
            <summary>Quelles universités et écoles sont disponibles ?</summary>
            <div className="faq-body">
              Plus de 55 établissements marocains sont référencés : universités publiques (UM5 Rabat, UH2C Casablanca, Université Ibn Tofaïl, UAE Tétouan…), grandes écoles d'ingénieurs (EMSI, ENSA, EHTP, ENSEM, ENSET…), écoles de commerce (ENCG, ISCAE, HEM, ISGA…) et instituts privés. Si ton école est absente, tu peux la demander directement dans l'explorateur.
            </div>
          </details>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">9raw<b>Zid</b>9ra</div>
            <div className="footer-tagline">La plateforme de partage de documents pour les étudiants marocains.</div>
          </div>
          <div>
            <div className="footer-col-title">Liens</div>
            <button className="footer-link" onClick={() => navigate('/browse')}>Explorer les modules</button>
            <button className="footer-link" onClick={() => navigate('/upload')}>Uploader un document</button>
            <button className="footer-link" onClick={() => navigate('/senpai')}>Senpai Zone</button>
            <button className="footer-link" onClick={() => navigate('/ai')}>IA Coach</button>
          </div>
          <div>
            <div className="footer-col-title">Application mobile</div>
            <div style={{ background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:10, padding:'1rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.82rem', color:'#94A3B8', marginBottom:8 }}>📱 L'app mobile arrive bientôt sur iOS & Android.</div>
              <button
                onClick={() => window.open("https://wa.me/212677246703?text=Je veux être notifié quand l'app 9rawZid9ra sera disponible", '_blank')}
                style={{ background:'rgba(79,142,247,0.12)', border:'1px solid rgba(79,142,247,0.25)', color:'#7BB3FF', borderRadius:7, padding:'6px 14px', fontSize:'0.78rem', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:600 }}
              >Me notifier</button>
            </div>
            <div style={{ fontSize:'0.72rem', color:'#4A5568', fontFamily:'DM Mono,monospace' }}>
              Développé par <span style={{ color:'#7BB3FF' }}>Saad GENIUS</span>
            </div>
            <div style={{ fontSize:'0.7rem', color:'#4A5568', marginTop:2, fontFamily:'DM Mono,monospace' }}>saadga2003@gmail.com</div>
          </div>
        </div>
        <div className="footer-bar">
          <div className="footer-copy">© 2025 9rawZid9ra — Fait pour les étudiants marocains</div>
          <div className="footer-bar-links">
            <button className="footer-bar-link" onClick={() => window.open('https://wa.me/212677246703', '_blank')}>WhatsApp</button>
            <button className="footer-bar-link" onClick={() => window.location.href='mailto:saadga2003@gmail.com'}>Contact</button>
          </div>
        </div>
      </footer>
    </div>
  )
}