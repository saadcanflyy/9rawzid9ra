import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const ICONS = {
  map:      ['M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'],
  bolt:     ['M13 10V3L4 14h7v7l9-11h-7z'],
  clock:    ['M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
  warn:     ['M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'],
  road:     ['M8 18l4-14 4 14M6 14h12'],
  heart:    ['M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'],
  reply:    ['M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'],
  send:     ['M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'],
  close:    ['M6 18L18 6M6 6l12 12'],
  plus:     ['M12 4v16m8-8H4'],
  search:   ['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'],
  userPlus: ['M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'],
  userMinus:['M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6'],
  check:    ['M5 13l4 4L19 7'],
  user:     ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z'],
  chevD:    ['M19 9l-7 7-7-7'],
  chevR:    ['M9 18l6-6-6-6'],
  link:     ['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'],
  trend:    ['M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'],
  star:     ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  home:     ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  explore:  ['M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
  upload:   ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12'],
  book:     ['M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'],
  more:     ['M12 5h.01M12 12h.01M12 19h.01'],
  edit:     ['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7', 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'],
  trash:    ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  eye:      ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0'],
  senpai:   ['M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'],
}

const Ico = ({ n, size = 16, sw = 1.8, fill = 'none', color = 'currentColor' }) => {
  const paths = ICONS[n] || ICONS.close
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

// ─── POST TYPE CONFIG ─────────────────────────────────────────────────────────
const PT = {
  survival_guide: { label: 'Guide de survie', icon: 'map',   color: '#7BB3FF', bg: 'rgba(79,142,247,0.15)',  border: 'rgba(79,142,247,0.3)' },
  cheat_code:     { label: 'Cheat Code',       icon: 'bolt',  color: '#FBD34D', bg: 'rgba(251,211,77,0.15)', border: 'rgba(251,211,77,0.3)' },
  timeline:       { label: 'Timeline',          icon: 'clock', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' },
  red_flag:       { label: 'Red Flag',          icon: 'warn',  color: '#F87171', bg: 'rgba(248,113,113,0.15)',border: 'rgba(248,113,113,0.3)' },
  path_review:    { label: 'Bilan',             icon: 'road',  color: '#C4B5FD', bg: 'rgba(196,181,253,0.15)',border: 'rgba(196,181,253,0.3)' },
}

// ─── MODERATION ───────────────────────────────────────────────────────────────
const BAD = ['merde','putain','connard','connasse','salope','pute','enculé','enculer','chier',
             'fuck','shit','asshole','bitch','cunt','motherfucker','bastard','dickhead',
             'kahba','zebi','zob','lhmar','tboun']
const isFlagged = t => BAD.some(w => new RegExp(`\\b${w}\\b`, 'i').test(t || ''))

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const GRADS = [
  'linear-gradient(135deg,#4F8EF7,#2DD4BF)',
  'linear-gradient(135deg,#C4B5FD,#4F8EF7)',
  'linear-gradient(135deg,#4ADE80,#2DD4BF)',
  'linear-gradient(135deg,#FBD34D,#F87171)',
  'linear-gradient(135deg,#F87171,#C4B5FD)',
]
const aGrad = id => GRADS[(id || '').charCodeAt(0) % GRADS.length]
const inits = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'maintenant'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}j`
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' })
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#02040A;--surface:#070C18;--s2:#0C1222;--s3:#111827;
  --border:#1C2A45;--bhi:#2D4A7A;
  --accent:#4F8EF7;--a2:#7BB3FF;--teal:#2DD4BF;--t2:#5EEAD4;
  --red:#F87171;--yellow:#FBD34D;--green:#4ADE80;
  --text:#E2E8F0;--text2:#94A3B8;--text3:#4A5568;
}
html,body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif}
.sz-page{min-height:100vh;background:var(--bg)}

/* ── 3-COLUMN GRID ── */
.sz-main{
  display:grid;
  grid-template-columns:240px minmax(0,600px) 300px;
  max-width:1200px;
  margin:0 auto;
  min-height:calc(100vh - 58px);
  align-items:start;
}

/* ── LEFT SIDEBAR ── */
.sz-left{
  position:sticky;top:58px;height:calc(100vh - 58px);
  overflow-y:auto;border-right:1px solid var(--border);
  padding:1.25rem 0.875rem;
  display:flex;flex-direction:column;gap:2px;
  scrollbar-width:thin;scrollbar-color:var(--border) transparent;
}
.sz-left-section{font-family:'DM Mono',monospace;font-size:0.58rem;color:var(--text3);
  text-transform:uppercase;letter-spacing:2px;padding:10px 12px 4px;margin-top:8px}
.sz-nav{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:9999px;
  font-size:0.88rem;color:var(--text2);cursor:pointer;background:none;border:none;
  font-family:'Outfit',sans-serif;transition:all 0.15s;text-align:left;width:100%}
.sz-nav:hover{background:rgba(255,255,255,0.05);color:var(--text)}
.sz-nav.on{color:#fff;font-weight:600}
.sz-nav-icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;background:rgba(255,255,255,0.04)}
.sz-type-btn{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;
  font-size:0.82rem;color:var(--text2);cursor:pointer;background:none;border:none;
  font-family:'Outfit',sans-serif;transition:all 0.15s;text-align:left;width:100%;margin-bottom:1px}
.sz-type-btn:hover{background:var(--s2);color:var(--text)}
.sz-type-btn.on{background:var(--s2);font-weight:600}
.sz-type-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.sz-uni-select{width:100%;background:var(--s2);border:1px solid var(--border);color:var(--text2);
  border-radius:8px;padding:8px 10px;font-size:0.78rem;font-family:'Outfit',sans-serif;
  cursor:pointer;outline:none;margin-top:4px}
.sz-uni-select option{background:var(--s2)}
.sz-uni-select:hover{border-color:var(--bhi)}

/* ── CENTER FEED ── */
.sz-center{border-right:1px solid var(--border);min-height:calc(100vh - 58px)}

/* ── COMPOSE BOX ── */
.sz-compose{border-bottom:1px solid var(--border);padding:14px 16px;cursor:text}
.sz-compose-row{display:flex;gap:12px;align-items:flex-start}
.sz-av{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;
  justify-content:center;font-family:'DM Mono',monospace;font-size:0.65rem;font-weight:700;color:#fff}
.sz-compose-right{flex:1;min-width:0}
.sz-compose-ph{padding:9px 0;font-size:0.92rem;color:var(--text3);user-select:none}
.sz-compose-ta{width:100%;background:none;border:none;color:var(--text);font-size:0.92rem;
  font-family:'Outfit',sans-serif;resize:none;outline:none;line-height:1.6;min-height:72px}
.sz-compose-ta::placeholder{color:var(--text3)}
.sz-compose-divider{height:1px;background:var(--border);margin:10px 0}
.sz-compose-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.sz-compose-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sz-chip-btn{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;
  background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text2);
  font-size:0.76rem;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.15s;
  white-space:nowrap;position:relative}
.sz-chip-btn:hover{border-color:var(--bhi);color:var(--text)}
.sz-chip-btn.selected{background:rgba(79,142,247,0.1);border-color:rgba(79,142,247,0.3);color:var(--a2)}
.sz-chip-btn.anon-on{background:rgba(74,222,128,0.08);border-color:rgba(74,222,128,0.25);color:var(--green)}
.sz-publish-btn{background:linear-gradient(135deg,#4F8EF7,#3A6ED4);color:#fff;border:none;
  border-radius:20px;padding:7px 20px;font-size:0.84rem;font-weight:700;cursor:pointer;
  font-family:'Outfit',sans-serif;transition:all 0.15s;white-space:nowrap}
.sz-publish-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,142,247,0.35)}
.sz-publish-btn:disabled{opacity:0.45;cursor:not-allowed}

/* floating dropdowns inside compose */
.sz-float-dd{position:absolute;top:calc(100% + 6px);left:0;min-width:200px;z-index:400;
  background:var(--s2);border:1px solid var(--bhi);border-radius:10px;
  box-shadow:0 8px 28px rgba(0,0,0,0.45);overflow:hidden}
.sz-float-dd-item{display:flex;align-items:center;gap:10px;padding:9px 14px;
  font-size:0.82rem;color:var(--text2);cursor:pointer;transition:background 0.1s;
  background:none;border:none;width:100%;text-align:left;font-family:'Outfit',sans-serif}
.sz-float-dd-item:hover{background:var(--s3);color:var(--text)}
.sz-float-dd-item.on{color:#fff;font-weight:600;background:rgba(79,142,247,0.08)}
.sz-float-dd-sub{font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--text3);margin-top:1px}
.sz-float-search{padding:8px 12px;border-bottom:1px solid var(--border)}
.sz-float-search-input{width:100%;background:none;border:none;color:var(--text);
  font-size:0.82rem;font-family:'Outfit',sans-serif;outline:none}
.sz-float-search-input::placeholder{color:var(--text3)}
.sz-compose-cta{display:flex;align-items:center;justify-content:space-between;
  padding:12px 0;cursor:default}
.sz-compose-cta-text{font-size:0.92rem;color:var(--text3)}
.sz-login-btn{background:var(--accent);color:#fff;border:none;border-radius:20px;
  padding:7px 18px;font-size:0.82rem;font-weight:700;cursor:pointer;
  font-family:'Outfit',sans-serif;transition:background 0.15s}
.sz-login-btn:hover{background:#3A7BEF}

/* ── FEED TABS ── */
.sz-feed-tabs{display:flex;border-bottom:1px solid var(--border)}
.sz-feed-tab{flex:1;padding:14px 0;text-align:center;font-size:0.84rem;font-weight:500;
  color:var(--text2);background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;
  transition:all 0.15s;border-bottom:2px solid transparent;margin-bottom:-1px;letter-spacing:0.2px}
.sz-feed-tab:hover{color:var(--text);background:rgba(255,255,255,0.02)}
.sz-feed-tab.on{color:#fff;font-weight:700;border-bottom-color:var(--accent)}

/* ── POST CARD ── */
.sz-post{border-bottom:1px solid var(--border);padding:14px 16px;cursor:pointer;
  transition:background 0.1s}
.sz-post:hover{background:rgba(255,255,255,0.015)}
.sz-post-row{display:flex;gap:11px}
.sz-post-body-wrap{flex:1;min-width:0}
.sz-post-header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px}
.sz-post-author-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.sz-post-name{font-size:0.85rem;font-weight:700;color:#fff;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.sz-post-name:hover{text-decoration:underline;text-decoration-color:rgba(255,255,255,0.3)}
.sz-post-sub{font-size:0.72rem;color:var(--text3);white-space:nowrap;font-family:'DM Mono',monospace}
.sz-post-sep{color:var(--text3);font-size:0.6rem}
.sz-post-ago{font-size:0.72rem;color:var(--text3);white-space:nowrap;font-family:'DM Mono',monospace;margin-left:2px}
.sz-follow-inline{display:flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;
  font-size:0.68rem;font-weight:600;cursor:pointer;background:none;border:1px solid var(--border);
  color:var(--text3);font-family:'Outfit',sans-serif;transition:all 0.15s;white-space:nowrap;flex-shrink:0}
.sz-follow-inline:hover{border-color:var(--a2);color:var(--a2)}
.sz-follow-inline.on{border-color:rgba(74,222,128,0.3);color:var(--green);background:rgba(74,222,128,0.07)}
.sz-type-badge{display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;
  font-size:0.64rem;font-weight:600;border:1px solid;white-space:nowrap;flex-shrink:0;
  font-family:'DM Mono',monospace}
.sz-anon-badge{font-family:'DM Mono',monospace;font-size:0.58rem;color:var(--text3);
  background:rgba(148,163,184,0.06);border:1px solid var(--border);border-radius:3px;
  padding:1px 5px;flex-shrink:0}
.sz-post-title{font-size:0.93rem;font-weight:700;color:#fff;line-height:1.3;margin-bottom:4px}
.sz-post-content{font-size:0.81rem;color:var(--text2);line-height:1.65;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.sz-post-content.expanded{-webkit-line-clamp:unset;overflow:visible}
.sz-see-more{background:none;border:none;color:var(--a2);font-size:0.78rem;cursor:pointer;
  font-family:'Outfit',sans-serif;padding:2px 0;margin-top:3px;display:block}
.sz-post-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.sz-post-chip{padding:2px 7px;border-radius:5px;font-size:0.62rem;font-family:'DM Mono',monospace;
  background:rgba(79,142,247,0.07);color:var(--a2);border:1px solid rgba(79,142,247,0.14);white-space:nowrap}
.sz-post-chip.uni{background:rgba(45,212,191,0.07);color:var(--t2);border-color:rgba(45,212,191,0.14)}
.sz-post-actions{display:flex;align-items:center;gap:2px;margin-top:10px}
.sz-act{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:20px;
  border:none;background:none;font-size:0.76rem;color:var(--text3);cursor:pointer;
  font-family:'Outfit',sans-serif;transition:all 0.15s}
.sz-act:hover{background:rgba(255,255,255,0.04);color:var(--text2)}
.sz-act.liked{color:var(--red)}
.sz-act.liked:hover{background:rgba(248,113,113,0.08)}
.sz-act.replied{color:var(--a2)}
.sz-act-spacer{flex:1}

/* ── EMPTY / LOADING ── */
.sz-empty{padding:4rem 2rem;text-align:center}
.sz-empty-icon{margin-bottom:14px;color:var(--text3)}
.sz-empty-title{font-size:0.95rem;font-weight:700;color:var(--text2);margin-bottom:6px}
.sz-empty-sub{font-size:0.8rem;color:var(--text3);margin-bottom:1.25rem}
@keyframes szpulse{0%,100%{opacity:.3}50%{opacity:.7}}
.sz-skel{animation:szpulse 1.8s ease-in-out infinite}

/* ── THREAD MODAL ── */
.sz-overlay{position:fixed;inset:0;z-index:600;background:rgba(2,4,10,0.85);
  backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
.sz-thread{background:var(--surface);border:1px solid var(--bhi);border-radius:16px;
  width:100%;max-width:600px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}
.sz-thread-hd{display:flex;align-items:center;gap:10px;padding:12px 16px;
  border-bottom:1px solid var(--border);flex-shrink:0}
.sz-thread-back{display:flex;align-items:center;gap:8px;font-size:0.84rem;font-weight:600;
  color:var(--text2);background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;
  transition:color 0.15s}
.sz-thread-back:hover{color:var(--text)}
.sz-thread-body{overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.sz-thread-post{padding:16px 18px;border-bottom:1px solid var(--border)}
.sz-thread-full-content{font-size:0.88rem;color:var(--text2);line-height:1.8;
  white-space:pre-wrap;word-break:break-word;margin:12px 0}
.sz-thread-stats{display:flex;align-items:center;gap:16px;padding:10px 0;
  border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:0 0 2px}
.sz-thread-stat{font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--text2);
  cursor:pointer;transition:color 0.15s}
.sz-thread-stat b{color:#fff}
.sz-thread-stat:hover{color:var(--text)}
.sz-replies-sep{padding:8px 18px;background:var(--s2);border-bottom:1px solid var(--border);
  font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--text3);
  text-transform:uppercase;letter-spacing:1.5px}
.sz-reply-item{padding:12px 18px;border-bottom:1px solid var(--border);display:flex;gap:10px}
.sz-reply-item:last-child{border-bottom:none}
.sz-reply-content{font-size:0.82rem;color:var(--text2);line-height:1.6;margin-top:2px}
.sz-reply-compose{padding:12px 16px;border-top:1px solid var(--border);
  display:flex;gap:10px;align-items:flex-end;flex-shrink:0;background:var(--surface)}
.sz-reply-ta{flex:1;background:var(--s2);border:1px solid var(--border);border-radius:10px;
  padding:9px 12px;font-size:0.83rem;color:var(--text);font-family:'Outfit',sans-serif;
  outline:none;resize:none;min-height:52px;max-height:110px;line-height:1.5;transition:border-color 0.15s}
.sz-reply-ta:focus{border-color:var(--accent)}
.sz-reply-ta::placeholder{color:var(--text3)}
.sz-reply-send{background:var(--accent);color:#fff;border:none;border-radius:8px;
  padding:9px 12px;cursor:pointer;transition:all 0.15s;flex-shrink:0;
  display:flex;align-items:center;justify-content:center}
.sz-reply-send:hover{background:#3A7BEF}
.sz-reply-send:disabled{opacity:0.4;cursor:not-allowed}
.sz-anon-row{display:flex;align-items:center;gap:7px;margin-top:5px}
.sz-toggle{width:30px;height:17px;border-radius:9px;background:var(--border);position:relative;
  transition:background 0.2s;cursor:pointer;border:none;flex-shrink:0}
.sz-toggle.on{background:var(--accent)}
.sz-toggle::after{content:'';position:absolute;top:3px;left:3px;width:11px;height:11px;
  border-radius:50%;background:#fff;transition:left 0.2s}
.sz-toggle.on::after{left:16px}
.sz-toggle-label{font-size:0.72rem;color:var(--text2)}

/* ── RIGHT SIDEBAR ── */
.sz-right{position:sticky;top:58px;height:calc(100vh - 58px);overflow-y:auto;
  padding:1.25rem 1rem;display:flex;flex-direction:column;gap:14px;
  scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.sz-widget{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.sz-widget-head{padding:10px 14px;border-bottom:1px solid var(--border);
  font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--text3);
  text-transform:uppercase;letter-spacing:1.5px}
.sz-widget-item{display:flex;align-items:center;gap:10px;padding:10px 14px;
  border-bottom:1px solid var(--border);transition:background 0.1s;cursor:pointer}
.sz-widget-item:last-child{border-bottom:none}
.sz-widget-item:hover{background:var(--s2)}
.sz-wi-rank{font-family:'DM Mono',monospace;font-size:0.64rem;color:var(--text3);
  width:18px;flex-shrink:0;text-align:center}
.sz-wi-info{flex:1;min-width:0}
.sz-wi-name{font-size:0.82rem;font-weight:600;color:var(--text);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.sz-wi-sub{font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--text3);margin-top:1px}
.sz-cta-widget{background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:1.25rem;text-align:center}
.sz-cta-title{font-size:0.88rem;font-weight:700;color:#fff;margin-bottom:6px}
.sz-cta-sub{font-size:0.76rem;color:var(--text2);margin-bottom:1rem;line-height:1.5}
.sz-cta-btn{width:100%;background:var(--accent);color:#fff;border:none;border-radius:8px;
  padding:9px;font-size:0.84rem;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;
  transition:background 0.15s}
.sz-cta-btn:hover{background:#3A7BEF}

/* ── MOBILE FILTER BAR (shown at ≤768px) ── */
.sz-mobile-bar{display:none;padding:8px 12px;border-bottom:1px solid var(--border);
  gap:7px;overflow-x:auto;scrollbar-width:none}
.sz-mobile-bar::-webkit-scrollbar{display:none}
.sz-mobile-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;font-size:0.76rem;
  background:var(--s2);border:1px solid var(--border);color:var(--text2);
  cursor:pointer;white-space:nowrap;font-family:'Outfit',sans-serif;transition:all 0.15s}
.sz-mobile-pill.on{border-color:var(--accent);color:var(--a2);background:rgba(79,142,247,0.1)}

/* ── RESPONSIVE ── */
@media(max-width:1100px){
  .sz-main{grid-template-columns:240px minmax(0,1fr)}
  .sz-right{display:none}
}
@media(max-width:768px){
  .sz-main{grid-template-columns:1fr}
  .sz-left{display:none}
  .sz-mobile-bar{display:flex}
  .sz-center{border-right:none}
  .sz-thread{max-width:100%;border-radius:16px 16px 0 0;max-height:98vh}
  .sz-overlay{padding:0;align-items:flex-end}
  .sz-compose{padding:12px}
  .sz-post{padding:12px}
}
@media(max-width:480px){
  .sz-post-title{font-size:0.88rem}
  .sz-compose-chips{gap:4px}
  .sz-chip-btn{padding:4px 8px;font-size:0.7rem}
  .sz-act{padding:4px 7px;font-size:0.7rem}
}
`

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SenpaiZone() {
  const navigate   = useNavigate()
  const [sp, setSP] = useSearchParams()
  const composeRef  = useRef(null)
  const modDdRef    = useRef(null)
  const typeDdRef   = useRef(null)

  // ── auth / data state ──
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts,   setPosts]   = useState([])
  const [unis,    setUnis]    = useState([])
  const [loading, setLoading] = useState(true)

  // ── feed state ──
  const [feedTab,   setFeedTab]   = useState('recent')    // recent | tendances | abonnements
  const [filterType,setFilterType]= useState(sp.get('type') || '')
  const [filterUni, setFilterUni] = useState(sp.get('university') || '')
  const [filterMod, setFilterMod] = useState(sp.get('module') || '')
  const [filterModName,setFilterModName]= useState('')

  // ── compose state ──
  const [composeFocused, setComposeFocused] = useState(false)
  const [composeText,    setComposeText]    = useState('')
  const [composeType,    setComposeType]    = useState('cheat_code')
  const [composeAnon,    setComposeAnon]    = useState(false)
  const [composeMod,     setComposeMod]     = useState(null)
  const [showTypeDd,     setShowTypeDd]     = useState(false)
  const [showModDd,      setShowModDd]      = useState(false)
  const [modSearch,      setModSearch]      = useState('')
  const [modResults,     setModResults]     = useState([])
  const [submitting,     setSubmitting]     = useState(false)

  // ── thread / reply state ──
  const [viewPost,  setViewPost]  = useState(null)
  const [replies,   setReplies]   = useState([])
  const [replyText, setReplyText] = useState('')
  const [replyAnon, setReplyAnon] = useState(false)
  const [sendingR,  setSendingR]  = useState(false)
  const [loadingR,  setLoadingR]  = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())

  // ── social state ──
  const [voting,   setVoting]   = useState(new Set())
  const [following,setFollowing]= useState(new Set()) // set of author_ids
  const [toggling, setToggling] = useState(new Set())
  const [copyId,   setCopyId]   = useState(null)

  // ── post CRUD state ──
  const [menuPostId,  setMenuPostId]  = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editText,    setEditText]    = useState('')

  // ── LOAD ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      setUser(u)
      if (u) {
        const [{ data: prof }, { data: fols }] = await Promise.all([
          supabase.from('user_profiles').select('name,university_id,is_admin').eq('id', u.id).single(),
          supabase.from('user_follows').select('following_id').eq('follower_id', u.id),
        ])
        setProfile(prof)
        setFollowing(new Set((fols || []).map(f => f.following_id)))
      }
    })
    supabase.from('universities').select('id,name').order('name').then(({ data }) => setUnis(data || []))
    loadPosts()
    if (sp.get('module')) {
      supabase.from('modules').select('name').eq('id', sp.get('module')).single()
        .then(({ data }) => setFilterModName(data?.name || ''))
    }
    if (sp.get('compose') === '1') {
      setComposeFocused(true)
      if (sp.get('module')) {
        supabase.from('modules').select('id,name,semester').eq('id', sp.get('module')).single()
          .then(({ data }) => data && setComposeMod(data))
      }
    }
  }, [])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('senpai_posts')
      .select('*, user_profiles(name, universities(name)), senpai_votes(user_id), modules(id, name)')
      .is('parent_id', null)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(100)
    setPosts(data || [])
    setLoading(false)
  }, [])

  // module search for compose
  useEffect(() => {
    if (modSearch.trim().length < 2) { setModResults([]); return }
    supabase.from('modules').select('id,name,semester,filieres(name)').ilike('name', `%${modSearch.trim()}%`).limit(5)
      .then(({ data }) => setModResults(data || []))
  }, [modSearch])

  // click-outside to close post menu
  useEffect(() => {
    if (!menuPostId) return
    const handler = e => { if (!e.target.closest('[data-post-menu]')) setMenuPostId(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuPostId])

  // real-time feed subscription
  useEffect(() => {
    const channel = supabase
      .channel('senpai-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'senpai_posts' }, async payload => {
        const { data } = await supabase
          .from('senpai_posts')
          .select('*, user_profiles(name, universities(name)), senpai_votes(user_id), modules(id, name)')
          .eq('id', payload.new.id)
          .single()
        if (data && data.is_approved) {
          setPosts(prev => prev.some(p => p.id === data.id) ? prev : [data, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'senpai_posts' }, payload => {
        const n = payload.new
        setPosts(prev => prev.map(p =>
          p.id === n.id
            ? { ...p, helpful_count: n.helpful_count ?? p.helpful_count, reply_count: n.reply_count ?? p.reply_count }
            : p
        ))
        setViewPost(vp => vp?.id === n.id
          ? { ...vp, helpful_count: n.helpful_count ?? vp.helpful_count, reply_count: n.reply_count ?? vp.reply_count }
          : vp
        )
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // click-outside to close compose
  useEffect(() => {
    if (!composeFocused) return
    const handler = e => {
      if (composeRef.current && !composeRef.current.contains(e.target)) {
        if (!composeText) setComposeFocused(false)
        setShowTypeDd(false); setShowModDd(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [composeFocused, composeText])

  // re-fetch posts and user data when auth state changes (login/logout mid-session)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const [{ data: prof }, { data: fols }] = await Promise.all([
          supabase.from('user_profiles').select('name,university_id,is_admin').eq('id', session.user.id).single(),
          supabase.from('user_follows').select('following_id').eq('follower_id', session.user.id),
        ])
        setProfile(prof)
        setFollowing(new Set((fols || []).map(f => f.following_id)))
        loadPosts()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setFollowing(new Set())
        loadPosts()
      }
    })
    return () => subscription.unsubscribe()
  }, [loadPosts])

  // ── FILTERED POSTS ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let f = posts
    if (feedTab === 'abonnements') f = f.filter(p => following.has(p.author_id))
    if (feedTab === 'tendances') f = [...f].sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0))
    if (filterType) f = f.filter(p => p.post_type === filterType)
    if (filterUni)  f = f.filter(p => String(p.university_id) === String(filterUni))
    if (filterMod)  f = f.filter(p => String(p.module_id) === String(filterMod))
    return f
  }, [posts, feedTab, following, filterType, filterUni, filterMod])

  // ── RIGHT SIDEBAR DATA ────────────────────────────────────────────────────
  const topSenpais = useMemo(() => {
    const map = {}
    posts.forEach(p => {
      if (!map[p.author_id]) map[p.author_id] = { id: p.author_id, name: p.user_profiles?.name || 'Anonyme', count: 0, votes: 0 }
      map[p.author_id].count++
      map[p.author_id].votes += (p.helpful_count || 0)
    })
    return Object.values(map).sort((a, b) => b.votes - a.votes).slice(0, 5)
  }, [posts])

  const trendingMods = useMemo(() => {
    const map = {}
    posts.forEach(p => {
      if (p.module_id && p.modules?.name) {
        if (!map[p.module_id]) map[p.module_id] = { id: p.module_id, name: p.modules.name, count: 0 }
        map[p.module_id].count++
      }
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [posts])

  // ── VOTE ──────────────────────────────────────────────────────────────────
  const handleVote = async (post, e) => {
    e?.stopPropagation()
    if (!user) { navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    if (voting.has(post.id)) return
    setVoting(s => new Set([...s, post.id]))
    const isVoted = post.senpai_votes?.some(v => v.user_id === user.id)
    // optimistic UI
    const optimisticCount = Math.max(0, (post.helpful_count || 0) + (isVoted ? -1 : 1))
    const patch = p => p.id !== post.id ? p : {
      ...p, helpful_count: optimisticCount,
      senpai_votes: isVoted
        ? (p.senpai_votes || []).filter(v => v.user_id !== user.id)
        : [...(p.senpai_votes || []), { user_id: user.id }]
    }
    setPosts(ps => ps.map(patch))
    setViewPost(vp => vp ? patch(vp) : vp)
    // DB write — trigger fn_sync_senpai_helpful_count (SECURITY DEFINER) updates senpai_posts.helpful_count
    if (isVoted) await supabase.from('senpai_votes').delete().eq('user_id', user.id).eq('post_id', post.id)
    else         await supabase.from('senpai_votes').insert({ user_id: user.id, post_id: post.id })
    // fetch true count from senpai_posts to correct optimistic UI
    const { data: freshPost } = await supabase.from('senpai_posts').select('helpful_count').eq('id', post.id).single()
    if (freshPost) {
      const correctPatch = p => p.id !== post.id ? p : { ...p, helpful_count: freshPost.helpful_count }
      setPosts(ps => ps.map(correctPatch))
      setViewPost(vp => vp?.id === post.id ? { ...vp, helpful_count: freshPost.helpful_count } : vp)
    }
    setVoting(s => { const n = new Set(s); n.delete(post.id); return n })
  }

  // ── FOLLOW ────────────────────────────────────────────────────────────────
  const handleFollow = async (authorId, e) => {
    e?.stopPropagation()
    if (!user) { navigate('/login'); return }
    if (!user) { navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    if (authorId === user.id || toggling.has(authorId)) return
    setToggling(s => new Set([...s, authorId]))
    const isF = following.has(authorId)
    if (isF) {
      setFollowing(s => { const n = new Set(s); n.delete(authorId); return n })
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', authorId)
    } else {
      setFollowing(s => new Set([...s, authorId]))
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: authorId })
      supabase.from('notifications').insert({ user_id: authorId, type: 'follow', actor_id: user.id }).then()
    }
    setToggling(s => { const n = new Set(s); n.delete(authorId); return n })
  }

  // ── OPEN THREAD ───────────────────────────────────────────────────────────
  const openThread = async post => {
    setViewPost(post); setLoadingR(true); setReplies([]); setReplyText('')
    const { data } = await supabase.from('senpai_replies')
      .select('*, user_profiles(name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setReplies(data || [])
    setLoadingR(false)
  }

  // ── SEND REPLY ────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!user) { navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    if (replyText.trim().length < 5) return
    setSendingR(true)
    const { data, error } = await supabase.from('senpai_replies').insert({
      post_id: viewPost.id, author_id: user.id,
      content: replyText.trim(), is_anonymous: replyAnon,
    }).select('*, user_profiles(name)').single()
    setSendingR(false)
    if (error) return
    setReplies(r => [...r, data])
    setReplyText('')
    // reply_count is maintained by DB trigger — just update local state optimistically
    setViewPost(vp => vp ? { ...vp, reply_count: (vp.reply_count || 0) + 1 } : vp)
    setPosts(ps => ps.map(p => p.id === viewPost.id ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p))
    if (viewPost.author_id !== user.id) {
      supabase.from('notifications').insert({
        user_id: viewPost.author_id, type: 'reply', actor_id: user.id,
        post_id: viewPost.id, post_title: viewPost.title,
      }).then()
    }
  }

  // ── DELETE POST ───────────────────────────────────────────────────────────
  const handleDelete = async (postId, e) => {
    e?.stopPropagation()
    if (!window.confirm('Supprimer ce post définitivement ?')) return
    setMenuPostId(null)
    const { error } = await supabase.from('senpai_posts').delete().eq('id', postId)
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId))
      if (viewPost?.id === postId) { setViewPost(null); setReplies([]) }
    } else {
      alert(error.message)
    }
  }

  // ── EDIT POST ─────────────────────────────────────────────────────────────
  const handleEditSave = async (post) => {
    const text = editText.trim()
    if (text.length < 20) return
    const lines = text.split('\n')
    const title = lines[0].slice(0, 120) || text.slice(0, 80)
    const { error } = await supabase.from('senpai_posts').update({ title, content: text }).eq('id', post.id)
    if (!error) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, title, content: text } : p))
      setEditingPost(null)
    } else {
      alert(error.message)
    }
  }

  // ── PUBLISH POST ──────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!user) { navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    const text = composeText.trim()
    if (text.length < 20) return
    const lines = text.split('\n')
    const title = lines[0].slice(0, 120) || text.slice(0, 80)
    const content = text
    setSubmitting(true)
    const flagged = isFlagged(text)
    const uniId = parseInt(filterUni) || profile?.university_id || null
    const { data: inserted, error } = await supabase.from('senpai_posts').insert({
      author_id:     user.id,
      post_type:     composeType,
      title:         title,
      content:       content,
      module_id:     composeMod?.id || null,
      university_id: uniId,
      is_anonymous:  composeAnon,
      helpful_count: 0,
      is_approved:   !flagged,
    })
    .select('id, created_at')
    .single()
    setSubmitting(false)
    if (error) { alert('Erreur lors de la publication. Réessaie.'); return }
    setComposeText(''); setComposeFocused(false); setComposeMod(null); setComposeAnon(false); setComposeType('cheat_code')
    if (flagged) {
      alert('Ton post a été soumis et sera visible après vérification.')
    } else if (inserted) {
      const uniName = unis.find(u => u.id === uniId)?.name || null
      const newPost = {
        id: inserted.id,
        created_at: inserted.created_at,
        author_id: user.id,
        post_type: composeType,
        title,
        content,
        module_id: composeMod?.id || null,
        university_id: uniId,
        is_anonymous: composeAnon,
        helpful_count: 0,
        reply_count: 0,
        is_approved: true,
        tags: [],
        parent_id: null,
        senpai_votes: [],
        modules: composeMod ? { id: composeMod.id, name: composeMod.name } : null,
        user_profiles: composeAnon ? null : {
          name: profile?.name || null,
          universities: uniName ? { name: uniName } : null,
        },
      }
      setPosts(prev => [newPost, ...prev])
    }
  }

  // ─── POST CARD ─────────────────────────────────────────────────────────────
  const renderCard = post => {
    const pt      = PT[post.post_type] || PT.cheat_code
    const isVoted = post.senpai_votes?.some(v => v.user_id === user?.id)
    const isF     = following.has(post.author_id)
    const isOwn   = post.author_id === user?.id
    const isAdmin = profile?.is_admin === true
    const anon    = post.is_anonymous
    const name    = anon ? 'Anonyme' : (post.user_profiles?.name || 'Anonyme')
    const uni     = anon ? '' : (post.user_profiles?.universities?.name || '')
    const isExp   = expandedIds.has(post.id)
    const longContent = post.content?.length > 280

    // ── inline edit mode ──
    if (editingPost?.id === post.id) {
      return (
        <div key={post.id} className="sz-post" onClick={e => e.stopPropagation()}>
          <div className="sz-post-row">
            <div className="sz-av" style={{ width:38, height:38, background:aGrad(post.author_id), fontSize:'0.62rem', flexShrink:0 }}>{inits(name)}</div>
            <div className="sz-post-body-wrap">
              <textarea className="sz-compose-ta" value={editText} onChange={e => setEditText(e.target.value)}
                rows={5} autoFocus onClick={e => e.stopPropagation()}
                style={{ border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px' }} />
              <div style={{ display:'flex', gap:8, marginTop:8, justifyContent:'flex-end' }}>
                <button onClick={e => { e.stopPropagation(); setEditingPost(null) }}
                  style={{ background:'none', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:8, padding:'6px 14px', fontSize:'0.8rem', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
                  Annuler
                </button>
                <button className="sz-publish-btn" style={{ padding:'6px 16px', fontSize:'0.8rem' }}
                  disabled={editText.trim().length < 20}
                  onClick={e => { e.stopPropagation(); handleEditSave(post) }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={post.id} className="sz-post" onClick={() => openThread(post)}>
        <div className="sz-post-row">
          <div className="sz-av" style={{ width: 38, height: 38, background: anon ? '#1C2A45' : aGrad(post.author_id), fontSize: '0.62rem', flexShrink: 0 }}>
            {anon ? <Ico n="user" size={14} color="#4A5568" /> : inits(name)}
          </div>
          <div className="sz-post-body-wrap">
            <div className="sz-post-header">
              <div className="sz-post-author-line">
                <span className="sz-post-name" onClick={!anon ? e => { e.stopPropagation(); navigate(`/user/${post.author_id}`) } : undefined}>
                  {name}
                </span>
                {uni && <><span className="sz-post-sep">·</span><span className="sz-post-sub">{uni}</span></>}
                {anon && <span className="sz-anon-badge">Anonyme</span>}
                <span className="sz-post-sep">·</span>
                <span className="sz-post-ago">{fmtAgo(post.created_at)}</span>
                {!isOwn && user && (
                  <button className={`sz-follow-inline ${isF ? 'on' : ''}`}
                    onClick={e => handleFollow(post.author_id, e)} disabled={toggling.has(post.author_id)}>
                    {isF ? <><Ico n="check" size={10} sw={2.5} />Abonné</> : <>+ Suivre</>}
                  </button>
                )}
              </div>
              <div className="sz-type-badge" style={{ color: pt.color, background: pt.bg, borderColor: pt.border }}>
                <Ico n={pt.icon} size={10} sw={2.2} color={pt.color} />{pt.label}
              </div>
            </div>

            <div className="sz-post-title">{post.title}</div>
            <div className={`sz-post-content ${isExp ? 'expanded' : ''}`}>{post.content}</div>
            {longContent && !isExp && (
              <button className="sz-see-more" onClick={e => { e.stopPropagation(); setExpandedIds(s => new Set([...s, post.id])) }}>
                Voir plus
              </button>
            )}

            {(post.modules?.name || (post.tags || []).length > 0 || uni) && (
              <div className="sz-post-chips">
                {post.modules?.name && <span className="sz-post-chip">{post.modules.name}</span>}
                {(post.tags || []).map((t, i) => <span key={i} className="sz-post-chip">{t}</span>)}
                {uni && <span className="sz-post-chip uni">{uni}</span>}
              </div>
            )}

            <div className="sz-post-actions" onClick={e => e.stopPropagation()}>
              <button className={`sz-act ${isVoted ? 'liked' : ''}`}
                onClick={e => handleVote(post, e)} disabled={voting.has(post.id)}>
                <Ico n="heart" size={13} sw={2} color={isVoted ? '#F87171' : 'currentColor'} fill={isVoted ? '#F87171' : 'none'} />
                {post.helpful_count || 0}
              </button>
              <button className="sz-act replied" onClick={() => openThread(post)}>
                <Ico n="reply" size={13} sw={2} />
                {post.reply_count || 0}
              </button>
              <div className="sz-act-spacer" />
              <button className="sz-act" onClick={e => {
                e.stopPropagation()
                navigator.clipboard.writeText(window.location.origin + '/senpai?post=' + post.id)
                setCopyId(post.id); setTimeout(() => setCopyId(null), 1800)
              }}>
                <Ico n={copyId === post.id ? 'check' : 'link'} size={13} sw={2} />
              </button>
              {(isOwn || isAdmin) && (
                <div style={{ position:'relative' }} data-post-menu>
                  <button className="sz-act" onClick={e => { e.stopPropagation(); setMenuPostId(menuPostId === post.id ? null : post.id) }}>
                    <Ico n="more" size={13} sw={2.5} />
                  </button>
                  {menuPostId === post.id && (
                    <div data-post-menu style={{ position:'absolute', bottom:'calc(100% + 4px)', right:0, background:'#0C1222', border:'1px solid #1C2A45', borderRadius:10, minWidth:140, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:300, overflow:'hidden' }}>
                      {isOwn && (
                        <button
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', fontSize:'0.8rem', color:'#94A3B8', background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'Outfit,sans-serif', borderBottom:'1px solid #1C2A45' }}
                          onMouseEnter={e => e.currentTarget.style.background='#111827'}
                          onMouseLeave={e => e.currentTarget.style.background='none'}
                          onClick={e => { e.stopPropagation(); setEditingPost(post); setEditText(post.content); setMenuPostId(null) }}>
                          <Ico n="edit" size={13} sw={1.8} /> Modifier
                        </button>
                      )}
                      <button
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', fontSize:'0.8rem', color:'#F87171', background:'none', border:'none', width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background='none'}
                        onClick={e => handleDelete(post.id, e)}>
                        <Ico n="trash" size={13} sw={1.8} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── THREAD MODAL ──────────────────────────────────────────────────────────
  const renderThread = () => {
    if (!viewPost) return null
    const pt   = PT[viewPost.post_type] || PT.cheat_code
    const isV  = viewPost.senpai_votes?.some(v => v.user_id === user?.id)
    const isF  = following.has(viewPost.author_id)
    const anon = viewPost.is_anonymous
    const name = anon ? 'Anonyme' : (viewPost.user_profiles?.name || 'Anonyme')
    const uni  = anon ? '' : (viewPost.user_profiles?.universities?.name || '')
    return (
      <div className="sz-overlay" onClick={() => { setViewPost(null); setReplies([]) }}>
        <div className="sz-thread" onClick={e => e.stopPropagation()}>
          <div className="sz-thread-hd">
            <button className="sz-thread-back" onClick={() => { setViewPost(null); setReplies([]) }}>
              <Ico n="close" size={14} sw={2} />Fermer
            </button>
            <div style={{ flex: 1 }} />
            <div className="sz-type-badge" style={{ color: pt.color, background: pt.bg, borderColor: pt.border }}>
              <Ico n={pt.icon} size={10} sw={2.2} color={pt.color} />{pt.label}
            </div>
          </div>
          <div className="sz-thread-body">
            <div className="sz-thread-post">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className="sz-av" style={{ background: anon ? '#1C2A45' : aGrad(viewPost.author_id), fontSize: '0.62rem', flexShrink: 0 }}>
                  {anon ? <Ico n="user" size={14} color="#4A5568" /> : inits(name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', cursor: !anon ? 'pointer' : 'default' }}
                      onClick={!anon ? () => { navigate(`/user/${viewPost.author_id}`); setViewPost(null) } : undefined}>
                      {name}
                    </span>
                    {!isOwn(viewPost) && user && (
                      <button className={`sz-follow-inline ${isF ? 'on' : ''}`} style={{ marginLeft: 0 }}
                        onClick={e => handleFollow(viewPost.author_id, e)}>
                        {isF ? <><Ico n="check" size={10} sw={2.5} />Abonné</> : <>+ Suivre</>}
                      </button>
                    )}
                  </div>
                  {uni && <div style={{ fontSize: '0.68rem', color: 'var(--text3)', fontFamily: 'DM Mono,monospace', marginTop: 2 }}>{uni}</div>}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text3)', fontFamily: 'DM Mono,monospace' }}>{fmtAgo(viewPost.created_at)}</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 10 }}>{viewPost.title}</div>
              <div className="sz-thread-full-content">{viewPost.content}</div>
              {viewPost.modules?.name && (
                <div className="sz-post-chips" style={{ margin: '10px 0 0' }}>
                  <span className="sz-post-chip">{viewPost.modules.name}</span>
                  {(viewPost.tags || []).map((t, i) => <span key={i} className="sz-post-chip">{t}</span>)}
                </div>
              )}
              <div className="sz-thread-stats">
                <span className="sz-thread-stat"><b>{viewPost.helpful_count || 0}</b> utile{(viewPost.helpful_count || 0) !== 1 ? 's' : ''}</span>
                <span className="sz-thread-stat"><b>{replies.length}</b> réponse{replies.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="sz-post-actions" style={{ marginTop: 0, paddingTop: 4 }}>
                <button className={`sz-act ${isV ? 'liked' : ''}`} onClick={e => handleVote(viewPost, e)}>
                  <Ico n="heart" size={14} sw={2} color={isV ? '#F87171' : 'currentColor'} fill={isV ? '#F87171' : 'none'} />
                  {isV ? 'Utile' : 'Utile'}
                </button>
                <button className="sz-act" onClick={() => { navigator.clipboard.writeText(window.location.origin + '/senpai?post=' + viewPost.id) }}>
                  <Ico n="link" size={14} sw={2} />Partager
                </button>
              </div>
            </div>
            <div className="sz-replies-sep">Réponses — {replies.length}</div>
            {loadingR ? (
              [...Array(2)].map((_, i) => <div key={i} className="sz-reply-item sz-skel" style={{ height: 64 }} />)
            ) : replies.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.82rem' }}>
                Aucune réponse — sois le premier !
              </div>
            ) : replies.map(r => {
              const rn = r.is_anonymous ? 'Anonyme' : (r.user_profiles?.name || 'Anonyme')
              return (
                <div key={r.id} className="sz-reply-item">
                  <div className="sz-av" style={{ width: 30, height: 30, fontSize: '0.55rem', background: r.is_anonymous ? '#1C2A45' : aGrad(r.author_id), flexShrink: 0 }}>
                    {r.is_anonymous ? <Ico n="user" size={12} color="#4A5568" /> : inits(rn)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{rn}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text3)', fontFamily: 'DM Mono,monospace', marginLeft: 'auto' }}>{fmtAgo(r.created_at)}</span>
                    </div>
                    <div className="sz-reply-content">{r.content}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="sz-reply-compose">
            <div className="sz-av" style={{ width: 30, height: 30, fontSize: '0.55rem', background: user ? aGrad(user.id) : '#1C2A45', flexShrink: 0 }}>
              {user ? inits(profile?.name || user.email) : <Ico n="user" size={12} color="#4A5568" />}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <textarea className="sz-reply-ta"
                placeholder={user ? 'Ajouter une réponse... (Ctrl+Enter)' : 'Connecte-toi pour répondre'}
                value={replyText} onChange={e => setReplyText(e.target.value)} disabled={!user}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendReply() }} rows={2} />
              <div className="sz-anon-row">
                <button className={`sz-toggle ${replyAnon ? 'on' : ''}`} onClick={() => setReplyAnon(v => !v)} />
                <span className="sz-toggle-label">{replyAnon ? 'Anonyme' : 'Avec mon nom'}</span>
              </div>
            </div>
            <button className="sz-reply-send" onClick={sendReply} disabled={!user || sendingR || replyText.trim().length < 5}>
              <Ico n="send" size={15} sw={1.8} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isOwn = post => post.author_id === user?.id

  // ─── COMPOSE BOX ───────────────────────────────────────────────────────────
  const canPublish = composeText.trim().length >= 20 && !submitting
  const selectedPT = PT[composeType]

  const renderCompose = () => (
    <div className="sz-compose" ref={composeRef}>
      <div className="sz-compose-row">
        <div className="sz-av" style={{ background: user ? aGrad(user.id) : '#1C2A45', flexShrink: 0 }}>
          {user ? inits(profile?.name || user.email) : <Ico n="user" size={14} color="#4A5568" />}
        </div>
        <div className="sz-compose-right">
          {!user ? (
            <div className="sz-compose-cta">
              <span className="sz-compose-cta-text">Connecte-toi pour partager ton expérience</span>
              <button className="sz-login-btn" onClick={() => navigate('/login')}>Se connecter</button>
            </div>
          ) : !composeFocused ? (
            <div className="sz-compose-ph" onClick={() => setComposeFocused(true)}>
              Partage ton expérience, tes conseils, tes red flags...
            </div>
          ) : (
            <>
              <textarea className="sz-compose-ta" autoFocus
                placeholder="Partage ton expérience — ex: « Les 3 erreurs fatales en Algo S4 »&#10;&#10;Écris autant que tu veux..."
                value={composeText} onChange={e => setComposeText(e.target.value)} rows={4} />
              <div className="sz-compose-divider" />
              <div className="sz-compose-toolbar">
                <div className="sz-compose-chips">
                  {/* Module picker */}
                  <div style={{ position: 'relative' }} ref={modDdRef}>
                    <button className={`sz-chip-btn ${composeMod ? 'selected' : ''}`}
                      onClick={e => { e.stopPropagation(); setShowModDd(v => !v); setShowTypeDd(false) }}>
                      <Ico n="book" size={12} sw={2} />
                      {composeMod ? composeMod.name.slice(0, 18) + (composeMod.name.length > 18 ? '…' : '') : 'Module'}
                      {composeMod && <span style={{ marginLeft: 3, opacity: 0.7 }}
                        onClick={e => { e.stopPropagation(); setComposeMod(null); setModSearch('') }}>×</span>}
                    </button>
                    {showModDd && (
                      <div className="sz-float-dd" style={{ minWidth: 260 }}>
                        <div className="sz-float-search">
                          <input className="sz-float-search-input" autoFocus
                            placeholder="Rechercher un module..."
                            value={modSearch} onChange={e => setModSearch(e.target.value)} />
                        </div>
                        {modResults.length === 0 && modSearch.length < 2 && (
                          <div style={{ padding: '10px 14px', fontSize: '0.76rem', color: 'var(--text3)' }}>Tape 2+ lettres pour chercher</div>
                        )}
                        {modResults.map(m => (
                          <button key={m.id} className="sz-float-dd-item" onClick={() => {
                            setComposeMod(m); setShowModDd(false); setModSearch('')
                          }}>
                            <div>
                              <div>{m.name}</div>
                              <div className="sz-float-dd-sub">{m.semester} · {m.filieres?.name}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Type picker */}
                  <div style={{ position: 'relative' }} ref={typeDdRef}>
                    <button className="sz-chip-btn"
                      style={{ color: selectedPT.color, borderColor: selectedPT.border, background: selectedPT.bg }}
                      onClick={e => { e.stopPropagation(); setShowTypeDd(v => !v); setShowModDd(false) }}>
                      <Ico n={selectedPT.icon} size={11} sw={2.2} color={selectedPT.color} />
                      {selectedPT.label}<Ico n="chevD" size={10} sw={2.5} color={selectedPT.color} />
                    </button>
                    {showTypeDd && (
                      <div className="sz-float-dd">
                        {Object.entries(PT).map(([k, v]) => (
                          <button key={k} className={`sz-float-dd-item ${composeType === k ? 'on' : ''}`}
                            onClick={() => { setComposeType(k); setShowTypeDd(false) }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: v.bg, flexShrink: 0 }}>
                              <Ico n={v.icon} size={11} sw={2.2} color={v.color} />
                            </div>
                            <span style={{ color: composeType === k ? v.color : undefined }}>{v.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anon toggle */}
                  <button className={`sz-chip-btn ${composeAnon ? 'anon-on' : ''}`}
                    onClick={e => { e.stopPropagation(); setComposeAnon(v => !v) }}>
                    <Ico n={composeAnon ? 'eye' : 'user'} size={11} sw={2} />
                    {composeAnon ? 'Anonyme' : 'Public'}
                  </button>
                </div>

                <button className="sz-publish-btn" disabled={!canPublish} onClick={handlePublish}>
                  {submitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
              {composeText.length > 0 && composeText.length < 20 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 6, fontFamily: 'DM Mono,monospace' }}>
                  {20 - composeText.length} caractères manquants
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="sz-page">
      <style>{css}</style>
      <Navbar activePage="senpai" />

      <div className="sz-main">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="sz-left">
          <div className="sz-left-section" style={{ marginTop: 0 }}>Navigation</div>
          {[
            { path: '/',       icon: 'home',    label: 'Accueil' },
            { path: '/browse', icon: 'explore', label: 'Explorer' },
            { path: '/senpai', icon: 'senpai',  label: 'Senpai Zone', active: true },
            { path: '/ai',     icon: 'star',    label: 'IA Coach' },
            { path: '/upload', icon: 'upload',  label: 'Uploader' },
          ].map(l => (
            <button key={l.path} className={`sz-nav ${l.active ? 'on' : ''}`} onClick={() => navigate(l.path)}>
              <div className="sz-nav-icon" style={l.active ? { background: 'rgba(79,142,247,0.12)' } : {}}>
                <Ico n={l.icon} size={15} sw={1.8} color={l.active ? 'var(--accent)' : 'var(--text2)'} />
              </div>
              {l.label}
            </button>
          ))}

          <div className="sz-left-section">Type de post</div>
          {[{ k: '', label: 'Tous les posts', dot: 'var(--text3)' },
            ...Object.entries(PT).map(([k, v]) => ({ k, label: v.label, dot: v.color }))
          ].map(item => (
            <button key={item.k} className={`sz-type-btn ${filterType === item.k ? 'on' : ''}`}
              style={filterType === item.k ? { color: item.dot || 'var(--text)' } : {}}
              onClick={() => setFilterType(item.k === filterType && item.k !== '' ? '' : item.k)}>
              <div className="sz-type-dot" style={{ background: filterType === item.k ? item.dot : 'var(--border)' }} />
              {item.label}
            </button>
          ))}

          <div className="sz-left-section">Université</div>
          <select className="sz-uni-select" value={filterUni} onChange={e => setFilterUni(e.target.value)}>
            <option value="">Toutes les universités</option>
            {unis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </aside>

        {/* ── CENTER FEED ── */}
        <main className="sz-center">
          {/* Mobile filter pills */}
          <div className="sz-mobile-bar">
            {[{ k: '', label: 'Tous' }, ...Object.entries(PT).map(([k, v]) => ({ k, label: v.label }))].map(item => (
              <button key={item.k} className={`sz-mobile-pill ${filterType === item.k ? 'on' : ''}`}
                onClick={() => setFilterType(item.k === filterType && item.k !== '' ? '' : item.k)}>
                {item.label}
              </button>
            ))}
          </div>

          {renderCompose()}

          {/* Feed tabs */}
          <div className="sz-feed-tabs">
            {[
              { k: 'tendances',    l: 'Tendances' },
              { k: 'recent',      l: 'Récent' },
              { k: 'abonnements', l: 'Abonnements' },
            ].map(t => (
              <button key={t.k} className={`sz-feed-tab ${feedTab === t.k ? 'on' : ''}`}
                onClick={() => { if (t.k === 'abonnements' && !user) { navigate('/login'); return } setFeedTab(t.k) }}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Module filter banner */}
          {filterMod && filterModName && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--a2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ico n="book" size={13} sw={2} />Module : <b>{filterModName}</b></span>
              <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }} onClick={() => { setFilterMod(''); setFilterModName(''); setSP({}) }}>
                <Ico n="close" size={13} sw={2} />
              </button>
            </div>
          )}

          {/* Posts */}
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="sz-post sz-skel" style={{ height: 140 }} />
            ))
          ) : filtered.length === 0 ? (
            <div className="sz-empty">
              <div className="sz-empty-icon"><Ico n="senpai" size={36} color="var(--text3)" sw={1.5} /></div>
              <div className="sz-empty-title">
                {feedTab === 'abonnements' ? 'Abonnez-vous à des senpais' : 'Aucun post trouvé'}
              </div>
              <div className="sz-empty-sub">
                {feedTab === 'abonnements'
                  ? 'Suivez des auteurs pour voir leurs posts ici.'
                  : 'Sois le premier à partager ton expérience !'}
              </div>
              {user && (
                <button style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}
                  onClick={() => setComposeFocused(true)}>
                  Écrire un tip
                </button>
              )}
            </div>
          ) : (
            filtered.map(renderCard)
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="sz-right">
          {trendingMods.length > 0 && (
            <div className="sz-widget">
              <div className="sz-widget-head">Modules tendances</div>
              {trendingMods.map((m, i) => (
                <div key={m.id} className="sz-widget-item"
                  onClick={() => { setFilterMod(m.id); setFilterModName(m.name) }}>
                  <span className="sz-wi-rank">#{i + 1}</span>
                  <div className="sz-wi-info">
                    <div className="sz-wi-name">{m.name}</div>
                    <div className="sz-wi-sub">{m.count} post{m.count > 1 ? 's' : ''}</div>
                  </div>
                  <Ico n="trend" size={13} sw={2} color="var(--teal)" />
                </div>
              ))}
            </div>
          )}

          {topSenpais.length > 0 && (
            <div className="sz-widget">
              <div className="sz-widget-head">Top Senpais</div>
              {topSenpais.map((s, i) => (
                <div key={s.id} className="sz-widget-item" onClick={() => navigate(`/user/${s.id}`)}>
                  <span className="sz-wi-rank">#{i + 1}</span>
                  <div className="sz-av" style={{ width: 30, height: 30, fontSize: '0.55rem', background: aGrad(s.id), flexShrink: 0 }}>
                    {inits(s.name)}
                  </div>
                  <div className="sz-wi-info">
                    <div className="sz-wi-name">{s.name}</div>
                    <div className="sz-wi-sub">{s.votes} vote{s.votes > 1 ? 's' : ''} · {s.count} post{s.count > 1 ? 's' : ''}</div>
                  </div>
                  {user && s.id !== user.id && (
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: following.has(s.id) ? 'var(--green)' : 'var(--text3)', display: 'flex', padding: 4 }}
                      onClick={e => handleFollow(s.id, e)}>
                      <Ico n={following.has(s.id) ? 'check' : 'userPlus'} size={13} sw={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!user && (
            <div className="sz-cta-widget">
              <div className="sz-cta-title">Rejoins la communauté</div>
              <div className="sz-cta-sub">Partage ton expérience, aide les autres étudiants, accumule des points.</div>
              <button className="sz-cta-btn" onClick={() => navigate('/register')}>Créer un compte</button>
            </div>
          )}
        </aside>
      </div>

      {renderThread()}
    </div>
  )
}
