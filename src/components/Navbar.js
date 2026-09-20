import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiBell, FiUser, FiBookmark, FiShield, FiLogOut,
  FiUpload, FiHeart, FiMenu, FiX, FiAward
} from 'react-icons/fi'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .mobile-banner {
    background: linear-gradient(135deg,rgba(79,142,247,0.15),rgba(79,142,247,0.1));
    border-bottom: 1px solid rgba(79,142,247,0.2);
    padding: 8px 1rem;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.72rem;
  }
  @media (min-width: 769px) { .mobile-banner { display: none; } }

  .navbar {
    position: sticky; top: 0; z-index: 500; height: 60px;
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 2rem;
    background: rgba(2,4,10,0.82);
    backdrop-filter: blur(32px) saturate(180%);
    -webkit-backdrop-filter: blur(32px) saturate(180%);
    border-bottom: 1px solid #1C2A45;
    font-family: 'Outfit', sans-serif;
  }
  .nb-left { display: flex; align-items: center; gap: 10px; }
  .nb-logo { display: flex; align-items: center; gap: 9px; cursor: pointer; flex-shrink: 0; }
  .nb-logo-mark {
    width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, #4F8EF7, #2DD4BF);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Mono', monospace; font-weight: 700; font-size: 0.72rem; color: #02040A;
    transition: transform 0.2s ease;
  }
  .nb-logo:hover .nb-logo-mark { transform: rotate(-8deg) scale(1.05); }
  .nb-logo-text { font-family: 'DM Mono', monospace; font-size: 0.88rem; font-weight: 500; color: #FFFFFF; letter-spacing: -0.3px; }
  .nb-logo-text b { color: #7BB3FF; font-weight: 700; }
  .nb-links { position: relative; display: flex; align-items: center; gap: 2px; justify-content: center; }
  .nb-link { position: relative; background: none; border: none; padding: 7px 14px; font-size: 0.82rem; color: #64748B; cursor: pointer; border-radius: 7px; font-family: 'Outfit', sans-serif; transition: color 0.15s; white-space: nowrap; z-index: 1; }
  .nb-link:hover { color: #E2E8F0; }
  .nb-link.active { color: #E2E8F0; font-weight: 600; }
  .nb-link:focus-visible, .nb-ghost:focus-visible, .nb-accent:focus-visible, .nb-upload-btn:focus-visible, .nb-bell:focus-visible, .nb-burger:focus-visible {
    outline: 2px solid #4F8EF7; outline-offset: 2px;
  }
  .nb-link-pill { position: absolute; inset: 0; background: rgba(255,255,255,0.06); border-radius: 7px; z-index: 0; }
  .nb-right { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .nb-online { display: flex; align-items: center; gap: 6px; font-family: 'DM Mono', monospace; font-size: 0.72rem; color: #94A3B8; margin-right: 4px; }
  .nb-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.18); flex-shrink: 0; }
  @media(max-width: 1024px) { .nb-online { display: none; } }
  .nb-ghost { background: none; border: 1px solid #1C2A45; color: #94A3B8; padding: 6px 15px; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Outfit', sans-serif; }
  .nb-ghost:hover { border-color: #2D4A7A; color: #E2E8F0; }
  .nb-accent { background: linear-gradient(135deg,#4F8EF7,#3A6ED4); color: #fff; border: none; padding: 6px 17px; border-radius: 7px; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 2px 12px rgba(79,142,247,0.25); }
  .nb-accent:hover { transform: translateY(-1px); box-shadow: 0 4px 18px rgba(79,142,247,0.4); }
  .nb-user { display: flex; align-items: center; gap: 6px; }
  .nb-upload-btn { display: flex; align-items: center; gap: 6px; background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.2); color: #7BB3FF; padding: 6px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.15s; white-space: nowrap; }
  .nb-upload-btn:hover { background: rgba(79,142,247,0.18); }
  .nb-avatar-wrap { position: relative; }
  .nb-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #4F8EF7, #2DD4BF); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 0.72rem; font-weight: 700; color: white; cursor: pointer; border: 2px solid rgba(79,142,247,0.3); transition: border-color 0.15s, transform 0.15s; flex-shrink: 0; }
  .nb-avatar:hover { border-color: #4F8EF7; transform: scale(1.04); }
  .nb-dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: #0C1222; border: 1px solid #1C2A45; border-radius: 16px; padding: 8px; min-width: 240px; box-shadow: 0 16px 40px rgba(0,0,0,0.55); z-index: 600; transform-origin: top right; }
  .nb-dd-header { padding: 14px 10px 14px; border-bottom: 1px solid #1C2A45; margin-bottom: 4px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .nb-dd-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #4F8EF7, #2DD4BF); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .nb-dd-name { font-size: 0.9rem; font-weight: 600; color: #E2E8F0; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .nb-dd-email { font-size: 0.68rem; color: #4A5568; font-family: 'DM Mono', monospace; margin-top: 3px; }
  .nb-dd-pills { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 9px; }
  .nb-dd-pill { font-family: 'DM Mono', monospace; font-size: 0.65rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
  .nb-dd-pill.points { color: #7BB3FF; background: rgba(79,142,247,0.15); }
  .nb-dd-pill.uploads { color: #94A3B8; background: rgba(148,163,184,0.1); }
  .nb-dd-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 9px; cursor: pointer; transition: background 0.15s, color 0.15s; font-size: 0.82rem; color: #94A3B8; width: 100%; background: none; border: none; font-family: 'Outfit', sans-serif; text-align: left; }
  .nb-dd-item svg { flex-shrink: 0; opacity: 0.8; }
  .nb-dd-item:hover { background: rgba(255,255,255,0.05); color: #E2E8F0; }
  .nb-dd-item.admin { color: #F87171; }
  .nb-dd-item.admin:hover { background: rgba(248,113,113,0.08); }
  .nb-dd-item.danger:hover { background: rgba(248,113,113,0.08); color: #F87171; }
  .nb-dd-item.gold { background: rgba(251,211,77,0.08); color: #FBD34D; }
  .nb-dd-item.gold:hover { background: rgba(251,211,77,0.14); }
  .nb-dd-kbd { margin-left: auto; font-family: 'DM Mono', monospace; font-size: 0.62rem; color: #4A5568; background: rgba(255,255,255,0.04); border: 1px solid #1C2A45; border-radius: 4px; padding: 1px 6px; flex-shrink: 0; }
  .nb-dd-sep { height: 1px; background: #1C2A45; margin: 4px 0; }
  .nb-admin-tag { font-family: 'DM Mono', monospace; font-size: 0.55rem; background: rgba(248,113,113,0.1); color: #F87171; border: 1px solid rgba(248,113,113,0.2); padding: 1px 5px; border-radius: 3px; }

  /* ── NOTIFICATIONS ── */
  .nb-bell-wrap { position: relative; }
  .nb-bell { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: none; border: none; cursor: pointer; color: #64748B; transition: all 0.15s; flex-shrink: 0; }
  .nb-bell:hover { background: rgba(255,255,255,0.05); color: #E2E8F0; }
  .nb-bell-badge { position: absolute; top: 2px; right: 2px; min-width: 15px; height: 15px; border-radius: 8px; background: #F87171; color: #fff; font-size: 0.58rem; font-weight: 700; font-family: 'DM Mono', monospace; display: flex; align-items: center; justify-content: center; padding: 0 3px; pointer-events: none; border: 2px solid #02040A; }
  .nb-notifs-dd { position: absolute; top: calc(100% + 10px); right: -60px; background: #0C1222; border: 1px solid #1C2A45; border-radius: 14px; width: 320px; max-height: 420px; overflow-y: auto; box-shadow: 0 16px 40px rgba(0,0,0,0.55); z-index: 600; scrollbar-width: thin; scrollbar-color: #1C2A45 transparent; transform-origin: top right; }
  .nb-notifs-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #1C2A45; position: sticky; top: 0; background: #0C1222; }
  .nb-notifs-title { font-size: 0.85rem; font-weight: 700; color: #E2E8F0; }
  .nb-mark-read { font-size: 0.72rem; color: #4A5568; background: none; border: none; cursor: pointer; font-family: 'Outfit', sans-serif; transition: color 0.15s; }
  .nb-mark-read:hover { color: #94A3B8; }
  .nb-notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #1C2A45; cursor: pointer; transition: background 0.1s; }
  .nb-notif-item:last-child { border-bottom: none; }
  .nb-notif-item:hover { background: rgba(255,255,255,0.03); }
  .nb-notif-item.unread { background: rgba(79,142,247,0.04); }
  .nb-notif-item.unread:hover { background: rgba(79,142,247,0.08); }
  .nb-notif-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .nb-notif-body { flex: 1; min-width: 0; }
  .nb-notif-text { font-size: 0.79rem; color: #94A3B8; line-height: 1.4; }
  .nb-notif-text b { color: #E2E8F0; font-weight: 600; }
  .nb-notif-meta { font-family: 'DM Mono', monospace; font-size: 0.61rem; color: #4A5568; margin-top: 3px; }
  .nb-notif-sub { font-size: 0.72rem; color: #4A5568; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nb-notifs-empty { padding: 2.5rem 1rem; text-align: center; font-size: 0.8rem; color: #4A5568; }
  @media(max-width: 768px) { .nb-notifs-dd { right: -20px; width: 290px; } }

  /* ── HAMBURGER ── */
  .nb-burger {
    display: none; align-items: center; justify-content: center; background: none; border: none; cursor: pointer;
    width: 36px; height: 36px; border-radius: 8px; transition: background 0.15s; flex-shrink: 0; color: #94A3B8;
  }
  .nb-burger:hover { background: rgba(255,255,255,0.05); color: #E2E8F0; }

  /* ── MOBILE MENU DRAWER ── */
  .nb-drawer {
    position: fixed; top: 58px; left: 0; right: 0; bottom: 0; z-index: 490;
    background: rgba(2,4,10,0.98); backdrop-filter: blur(24px);
    display: flex; flex-direction: column; padding: 1.25rem;
    border-top: 1px solid #1C2A45; overflow-y: auto;
  }
  .nb-drawer-link {
    display: flex; align-items: center; padding: 13px 14px; border-radius: 10px;
    font-size: 0.94rem; color: #94A3B8; cursor: pointer; transition: all 0.15s;
    background: none; border: none; font-family: 'Outfit', sans-serif; text-align: left; width: 100%;
  }
  .nb-drawer-link:active { transform: scale(0.98); }
  .nb-drawer-link.active { color: #E2E8F0; background: rgba(79,142,247,0.08); font-weight: 600; }
  .nb-drawer-sep { height: 1px; background: #1C2A45; margin: 8px 0; }
  .nb-drawer-auth { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .nb-drawer-btn-full { width: 100%; padding: 12px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.15s; }

  /* ── RESPONSIVE ── */
  @media(max-width: 768px) {
    .navbar { padding: 0 1rem; display: flex; justify-content: space-between; align-items: center; }
    .nb-links { display: none; }
    .nb-upload-btn { display: none; }
    .nb-ghost { display: none; }
    .nb-accent { display: none; }
    .nb-burger { display: flex; }
    .nb-left { flex: 0; }
    .nb-right { flex: 0; }
  }
  @media(max-width: 480px) {
    .nb-logo-text { font-size: 0.78rem; }
  }
`

const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'maintenant'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}j`
}

const NOTIF_TEXT = {
  follow:       (actor)    => <><b>{actor}</b> vous a suivi</>,
  reply:        (actor)    => <><b>{actor}</b> a répondu à votre post</>,
  like:         (actor)    => <><b>{actor}</b> a trouvé votre post utile</>,
  doc_request:  ()         => <>📩 Demande de document</>,
  new_document: (_, n)     => <><span style={{marginRight:3}}>📄</span>{n?.content || 'Nouveau document'}</>,
}

export default function Navbar({ activePage = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, onlineCount } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const [notifs,     setNotifs]     = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)


  // Load notifs when user becomes available
  useEffect(() => {
    if (user) loadNotifs(user.id)
    else setNotifs([])
  }, [user?.id]) // eslint-disable-line

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const loadNotifs = async (uid) => {
    const { data } = await supabase.from('notifications')
      .select('*, actor:user_profiles!actor_id(name)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
  }

  const markAllRead = async () => {
    if (!user) return
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowDropdown(false)
    setMenuOpen(false)
    navigate('/')
  }

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  // Close menu on outside click (mobile)
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (!e.target.closest('.nb-drawer') && !e.target.closest('.nb-burger')) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close notif dropdown on outside click
  useEffect(() => {
    if (!showNotifs) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  // Keyboard shortcuts — ⌘/Ctrl+P profile, ⌘/Ctrl+M my modules
  useEffect(() => {
    if (!user) return
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); navigate('/profile') }
      else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); navigate('/my-modules') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [user, navigate])

  // Real-time: new notifications
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`nb-notifs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => {
          setNotifs(prev => [payload.new, ...prev])
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  const page = activePage || location.pathname.replace('/', '') || 'home'

  const NAV_LINKS = [
    { k:'',       label:'Accueil',  path:'/' },
    { k:'browse', label:'Explorer', path:'/browse' },
    { k:'senpai', label:'Senpai',   path:'/senpai' },
    { k:'ai',     label:'IA',       path:'/ai' },
    { k:'upload', label:'Uploader', path:'/upload' },
  ]

  const handleNav = (path) => {
    if (path === '/browse') {
      if (location.pathname === '/browse') return  // already here — keep filters intact
      const saved = sessionStorage.getItem('lastBrowseUrl')
      if (saved) { navigate(saved); return }
    }
    navigate(path)
  }
  const navigate_ = (path) => { handleNav(path); setMenuOpen(false) }

  const unreadCount = notifs.filter(n => !n.read).length

  const displayNotifs = (() => {
    const result = []
    const msgMap = new Map()
    for (const n of notifs) {
      const isMsg = n.type === 'new_message' || n.type === 'message_reply'
      if (isMsg) {
        const sep = (n.content || '').indexOf(' : ')
        const sender = sep > 0 ? n.content.slice(0, sep).trim() : (n.content || 'Message')
        if (msgMap.has(sender)) {
          const idx = msgMap.get(sender)
          result[idx] = { ...result[idx], groupCount: result[idx].groupCount + (!n.read ? 1 : 0), groupUnread: result[idx].groupUnread || !n.read, groupIds: [...result[idx].groupIds, n.id] }
        } else {
          msgMap.set(sender, result.length)
          result.push({ ...n, groupCount: !n.read ? 1 : 0, groupSender: sender, groupUnread: !n.read, groupIds: [n.id] })
        }
      } else {
        result.push(n)
      }
    }
    return result
  })()

  return (
    <>
      <style>{css}</style>
      <div className="mobile-banner">
        <span style={{color:'#94A3B8', fontFamily:'Outfit'}}>📱 App mobile bientôt disponible</span>
        <button
          onClick={() => window.open("https://wa.me/212677246703?text=Je veux être notifié quand l'app 9rawZid9ra sera disponible", '_blank')}
          style={{ background:'rgba(79,142,247,0.15)', border:'1px solid rgba(79,142,247,0.3)', color:'#7BB3FF', borderRadius:5, padding:'3px 10px', fontSize:'0.68rem', cursor:'pointer', fontFamily:'Outfit', fontWeight:600 }}
        >Me notifier</button>
      </div>
      <nav className="navbar">
        {/* col 1 — logo */}
        <div className="nb-left">
          <div className="nb-logo" onClick={() => navigate('/')}>
            <span className="nb-logo-mark">9z</span>
            <span className="nb-logo-text">9raw<b>Zid</b>9ra</span>
          </div>
        </div>

        {/* col 2 — centered nav links */}
        <div className="nb-links">
          {NAV_LINKS.map(l => {
            const isActive = page === (l.k || 'home')
            return (
              <button key={l.k} className={`nb-link ${isActive ? 'active' : ''}`} onClick={() => handleNav(l.path)}>
                {isActive && <motion.span layoutId="nb-active-pill" className="nb-link-pill" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                <span style={{ position:'relative', zIndex:1 }}>{l.label}</span>
              </button>
            )
          })}
        </div>

        {/* col 3 — auth / avatar */}
        <div className="nb-right">
          <span className="nb-online"><span className="nb-online-dot" />{onlineCount} en ligne</span>
          {user ? (
            <div className="nb-user">
              <button className="nb-upload-btn" onClick={() => navigate('/upload')}><FiUpload size={14} /> Uploader</button>

              {/* Bell */}
              <div className="nb-bell-wrap" ref={notifRef}>
                <button className="nb-bell" onClick={() => setShowNotifs(v => !v)} aria-label="Notifications">
                  <FiBell size={18} />
                  {unreadCount > 0 && (
                    <motion.span className="nb-bell-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>{unreadCount}</motion.span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifs && (
                    <motion.div
                      className="nb-notifs-dd"
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                    <div className="nb-notifs-head">
                      <span className="nb-notifs-title">Notifications</span>
                      {notifs.some(n => !n.read) && (
                        <button className="nb-mark-read" onClick={markAllRead}>Tout marquer lu</button>
                      )}
                    </div>
                    {notifs.length === 0 ? (
                      <div className="nb-notifs-empty">Aucune notification pour l'instant</div>
                    ) : displayNotifs.map(n => {
                      const isGroupedMsg = n.type === 'new_message' || n.type === 'message_reply'
                      const isUnread = isGroupedMsg ? n.groupUnread : !n.read
                      const actorName = n.actor?.name || 'Quelqu\'un'
                      const renderText = NOTIF_TEXT[n.type]
                      const handleClick = async () => {
                        setShowNotifs(false)
                        if (isGroupedMsg) {
                          if (n.groupUnread) {
                            await supabase.from('notifications').update({ read: true }).in('id', n.groupIds)
                            setNotifs(prev => prev.map(x => n.groupIds.includes(x.id) ? { ...x, read: true } : x))
                          }
                          window.dispatchEvent(new CustomEvent('open-messenger', { detail: { userId: n.actor_id, name: n.groupSender } }))
                        } else {
                          if (!n.read) {
                            await supabase.from('notifications').update({ read: true }).eq('id', n.id)
                            setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                          }
                          const rid = n.related_id
                          if (n.type === 'follow') navigate(`/user/${rid || n.actor_id}`)
                          else if (n.type === 'reply') {
                            if (rid) localStorage.setItem('senpai_highlight_post', String(rid))
                            navigate('/senpai')
                          } else if (n.type === 'new_document') {
                            navigate(n.link || '/browse')
                          } else if (['helpful','reaction','comment','download','request_fulfilled'].includes(n.type)) {
                            navigate(`/module/${rid}`)
                          } else if (n.type === 'doc_request') {
                            navigate('/browse')
                          } else if (n.type === 'announcement') {
                            navigate('/')
                          } else if (n.post_id) {
                            localStorage.setItem('senpai_highlight_post', String(n.post_id))
                            navigate('/senpai')
                          } else {
                            navigate('/profile')
                          }
                        }
                      }
                      let textNode
                      if (isGroupedMsg) {
                        const count = n.groupCount
                        const sender = n.groupSender
                        textNode = count > 0
                          ? <><b>{sender}</b> · <span style={{background:'rgba(79,142,247,0.15)',color:'var(--accent2)',borderRadius:4,padding:'1px 6px',fontSize:'0.72rem',fontWeight:700}}>{count} nouveau{count > 1 ? 'x' : ''} message{count > 1 ? 's' : ''}</span></>
                          : <><b>{sender}</b>: {(n.content || '').split(' : ').slice(1).join(' : ') || 'message'}</>
                      } else {
                        textNode = renderText ? renderText(actorName, n) : (n.content || actorName)
                      }
                      return (
                        <div key={n.id} className={`nb-notif-item ${isUnread ? 'unread' : ''}`} onClick={handleClick} style={{ cursor:'pointer' }}>
                          <div className="nb-notif-dot" style={{ background: isUnread ? '#4F8EF7' : 'transparent', border: isUnread ? 'none' : '1px solid #1C2A45' }} />
                          <div className="nb-notif-body">
                            <div className="nb-notif-text">{textNode}</div>
                            {!isGroupedMsg && n.post_title && <div className="nb-notif-sub">"{n.post_title}"</div>}
                            <div className="nb-notif-meta">{fmtAgo(n.created_at)}</div>
                          </div>
                        </div>
                      )
                    })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="nb-avatar-wrap" ref={dropdownRef}>
                <div className="nb-avatar" onClick={() => setShowDropdown(d => !d)}>{initials}</div>
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      className="nb-dropdown"
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <div className="nb-dd-header">
                        <div className="nb-dd-avatar">{initials}</div>
                        <div className="nb-dd-name">
                          {profile?.name || 'Étudiant'}
                          {profile?.is_admin && <span className="nb-admin-tag">ADMIN</span>}
                          {profile?.is_fondateur && (
                            <span style={{ display:'inline-flex', alignItems:'center', background:'#FBD34D', color:'#02040A', borderRadius:5, padding:'1px 7px', fontFamily:'DM Mono,monospace', fontSize:'0.58rem', fontWeight:700, marginLeft:4 }}>
                              <FiAward size={9} style={{marginRight:3}}/> Fondateur
                            </span>
                          )}
                        </div>
                        <div className="nb-dd-email">{user.email}</div>
                        <div className="nb-dd-pills">
                          <span className="nb-dd-pill points">{profile?.points || 0} points</span>
                          <span className="nb-dd-pill uploads">{profile?.uploads_count || 0} uploads</span>
                        </div>
                      </div>
                      <button className="nb-dd-item" onClick={() => { navigate('/profile'); setShowDropdown(false) }}><FiUser size={15}/> Mon profil<span className="nb-dd-kbd">⌘P</span></button>
                      <button className="nb-dd-item" onClick={() => { navigate('/my-modules'); setShowDropdown(false) }}><FiBookmark size={15}/> Mes modules<span className="nb-dd-kbd">⌘M</span></button>
                      {profile?.is_admin && (
                        <button className="nb-dd-item admin" onClick={() => { navigate('/admin'); setShowDropdown(false) }}><FiShield size={15}/> Panneau Admin</button>
                      )}
                      {profile?.is_moderator && !profile?.is_admin && (
                        <button className="nb-dd-item" style={{color:'var(--teal2)'}} onClick={() => { navigate('/moderator'); setShowDropdown(false) }}><FiShield size={15}/> Panneau Modérateur</button>
                      )}
                      <a className="nb-dd-item gold" href="https://paypal.me/saadga2003" target="_blank" rel="noopener noreferrer" onClick={() => setShowDropdown(false)} style={{ textDecoration:'none' }}><FiHeart size={15}/> Soutenir 9rawZid9ra</a>
                      <div className="nb-dd-sep" />
                      <button className="nb-dd-item danger" onClick={handleLogout}><FiLogOut size={15}/> Se déconnecter</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              <button className="nb-ghost" onClick={() => { sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); navigate('/login') }}>Connexion</button>
              <button className="nb-accent" onClick={() => navigate('/register')}>S'inscrire</button>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button className="nb-burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            {menuOpen ? <FiX size={20}/> : <FiMenu size={20}/>}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="nb-drawer"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {NAV_LINKS.map(l => (
              <button key={l.k} className={`nb-drawer-link ${page === (l.k || 'home') ? 'active' : ''}`} onClick={() => navigate_(l.path)}>
                {l.label}
              </button>
            ))}

            <div className="nb-drawer-sep"/>

            {user ? (
              <>
                <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#4F8EF7,#2DD4BF)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontSize:'0.72rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize:'0.88rem', fontWeight:600, color:'#E2E8F0' }}>{profile?.name || 'Étudiant'}</div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#4A5568' }}>{profile?.points || 0} pts</div>
                  </div>
                </div>
                <button className="nb-drawer-link" onClick={() => navigate_('/profile')}><FiUser size={16} style={{marginRight:10}}/> Mon profil</button>
                <button className="nb-drawer-link" onClick={() => navigate_('/my-modules')}><FiBookmark size={16} style={{marginRight:10}}/> Mes modules</button>
                <button className="nb-drawer-link" onClick={() => navigate_('/upload')} style={{ color:'#7BB3FF' }}><FiUpload size={16} style={{marginRight:10}}/> Uploader un doc</button>
                {profile?.is_admin && (
                  <button className="nb-drawer-link" onClick={() => navigate_('/admin')} style={{ color:'#F87171' }}><FiShield size={16} style={{marginRight:10}}/> Panneau Admin</button>
                )}
                {profile?.is_moderator && !profile?.is_admin && (
                  <button className="nb-drawer-link" onClick={() => navigate_('/moderator')} style={{ color:'var(--teal2,#5EEAD4)' }}><FiShield size={16} style={{marginRight:10}}/> Panneau Modérateur</button>
                )}
                <div className="nb-drawer-sep"/>
                <button className="nb-drawer-link" onClick={handleLogout} style={{ color:'#F87171' }}><FiLogOut size={16} style={{marginRight:10}}/> Se déconnecter</button>
              </>
            ) : (
              <div className="nb-drawer-auth">
                <button className="nb-drawer-btn-full" style={{ background:'none', border:'1px solid #1C2A45', color:'#94A3B8' }} onClick={() => navigate_('/login')}>Connexion</button>
                <button className="nb-drawer-btn-full" style={{ background:'#4F8EF7', border:'none', color:'#fff' }} onClick={() => navigate_('/register')}>S'inscrire</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
