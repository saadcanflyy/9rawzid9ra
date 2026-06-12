import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  .mobile-banner {
    background: linear-gradient(135deg,rgba(79,142,247,0.15),rgba(45,212,191,0.1));
    border-bottom: 1px solid rgba(79,142,247,0.2);
    padding: 8px 1rem;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.72rem;
  }
  @media (min-width: 769px) { .mobile-banner { display: none; } }

  .navbar {
    position: sticky; top: 0; z-index: 500; height: 58px;
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 2rem;
    background: rgba(2,4,10,0.94);
    backdrop-filter: blur(32px) saturate(180%);
    -webkit-backdrop-filter: blur(32px) saturate(180%);
    border-bottom: 1px solid #1C2A45;
    font-family: 'Outfit', sans-serif;
  }
  .nb-left { display: flex; align-items: center; gap: 10px; }
  .nb-logo { display: flex; align-items: center; gap: 9px; cursor: pointer; flex-shrink: 0; }
  .nb-logo-box {
    width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0;
    background: linear-gradient(135deg, #4F8EF7, #2DD4BF);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 10px rgba(79,142,247,0.35);
  }
  .nb-logo-text { font-family: 'DM Mono', monospace; font-size: 0.88rem; font-weight: 500; color: #FFFFFF; letter-spacing: -0.3px; }
  .nb-logo-text b { color: #7BB3FF; font-weight: 700; }
  .nb-divider { display: none; }
  .nb-links { display: flex; align-items: center; gap: 2px; justify-content: center; }
  .nb-link { background: none; border: none; padding: 6px 12px; font-size: 0.82rem; color: #64748B; cursor: pointer; border-radius: 7px; font-family: 'Outfit', sans-serif; transition: all 0.15s; white-space: nowrap; }
  .nb-link:hover { color: #E2E8F0; background: rgba(255,255,255,0.05); }
  .nb-link.active { color: #E2E8F0; background: rgba(255,255,255,0.06); }
  .nb-right { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .nb-ghost { background: none; border: 1px solid #1C2A45; color: #94A3B8; padding: 5px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: 'Outfit', sans-serif; }
  .nb-ghost:hover { border-color: #2D4A7A; color: #E2E8F0; }
  .nb-accent { background: #4F8EF7; color: #fff; border: none; padding: 5px 16px; border-radius: 7px; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.15s; }
  .nb-accent:hover { background: #3A7BEF; }
  .nb-user { display: flex; align-items: center; gap: 10px; }
  .nb-upload-btn { background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.2); color: #7BB3FF; padding: 5px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.15s; white-space: nowrap; }
  .nb-upload-btn:hover { background: rgba(79,142,247,0.18); }
  .nb-avatar-wrap { position: relative; }
  .nb-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #4F8EF7, #2DD4BF); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 0.72rem; font-weight: 700; color: white; cursor: pointer; border: 2px solid rgba(79,142,247,0.3); transition: border-color 0.15s; flex-shrink: 0; }
  .nb-avatar:hover { border-color: #4F8EF7; }
  .nb-dropdown { position: absolute; top: calc(100% + 10px); right: 0; background: #0C1222; border: 1px solid #1C2A45; border-radius: 12px; padding: 6px; min-width: 200px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 600; }
  .nb-dd-header { padding: 8px 10px 10px; border-bottom: 1px solid #1C2A45; margin-bottom: 4px; }
  .nb-dd-name { font-size: 0.85rem; font-weight: 600; color: #E2E8F0; display: flex; align-items: center; gap: 6px; }
  .nb-dd-email { font-size: 0.68rem; color: #4A5568; font-family: 'DM Mono', monospace; margin-top: 3px; }
  .nb-dd-points { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: #4F8EF7; background: rgba(79,142,247,0.1); padding: 2px 8px; border-radius: 4px; margin-top: 4px; display: inline-block; }
  .nb-dd-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; font-size: 0.82rem; color: #94A3B8; width: 100%; background: none; border: none; font-family: 'Outfit', sans-serif; text-align: left; }
  .nb-dd-item:hover { background: rgba(255,255,255,0.05); color: #E2E8F0; }
  .nb-dd-item.admin { color: #F87171; }
  .nb-dd-item.admin:hover { background: rgba(248,113,113,0.08); }
  .nb-dd-item.danger:hover { background: rgba(248,113,113,0.08); color: #F87171; }
  .nb-dd-sep { height: 1px; background: #1C2A45; margin: 4px 0; }
  .nb-admin-tag { font-family: 'DM Mono', monospace; font-size: 0.55rem; background: rgba(248,113,113,0.1); color: #F87171; border: 1px solid rgba(248,113,113,0.2); padding: 1px 5px; border-radius: 3px; }

  /* ── NOTIFICATIONS ── */
  .nb-bell-wrap { position: relative; }
  .nb-bell { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: none; border: none; cursor: pointer; color: #64748B; transition: all 0.15s; flex-shrink: 0; }
  .nb-bell:hover { background: rgba(255,255,255,0.05); color: #E2E8F0; }
  .nb-bell-badge { position: absolute; top: 2px; right: 2px; min-width: 15px; height: 15px; border-radius: 8px; background: #F87171; color: #fff; font-size: 0.58rem; font-weight: 700; font-family: 'DM Mono', monospace; display: flex; align-items: center; justify-content: center; padding: 0 3px; pointer-events: none; border: 2px solid rgba(2,4,10,0.94); }
  .nb-notifs-dd { position: absolute; top: calc(100% + 10px); right: -60px; background: #0C1222; border: 1px solid #1C2A45; border-radius: 12px; width: 320px; max-height: 420px; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 600; scrollbar-width: thin; scrollbar-color: #1C2A45 transparent; }
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
    display: none; background: none; border: none; cursor: pointer;
    padding: 6px; border-radius: 7px; transition: background 0.15s; flex-shrink: 0;
  }
  .nb-burger:hover { background: rgba(255,255,255,0.05); }
  .nb-burger-bar { display: block; width: 20px; height: 2px; background: #94A3B8; border-radius: 1px; transition: all 0.25s; }
  .nb-burger-bar + .nb-burger-bar { margin-top: 4px; }
  .nb-burger.open .nb-burger-bar:nth-child(1) { transform: translateY(6px) rotate(45deg); }
  .nb-burger.open .nb-burger-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .nb-burger.open .nb-burger-bar:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

  /* ── MOBILE MENU DRAWER ── */
  .nb-drawer {
    display: none; position: fixed; top: 58px; left: 0; right: 0; bottom: 0; z-index: 490;
    background: rgba(2,4,10,0.98); backdrop-filter: blur(24px);
    flex-direction: column; padding: 1.25rem;
    border-top: 1px solid #1C2A45; overflow-y: auto;
  }
  .nb-drawer.open { display: flex; }
  .nb-drawer-link {
    display: flex; align-items: center; padding: 12px 14px; border-radius: 10px;
    font-size: 0.92rem; color: #94A3B8; cursor: pointer; transition: all 0.15s;
    background: none; border: none; font-family: 'Outfit', sans-serif; text-align: left; width: 100%;
  }
  .nb-drawer-link:hover { color: #E2E8F0; background: rgba(255,255,255,0.04); }
  .nb-drawer-link.active { color: #E2E8F0; background: rgba(255,255,255,0.06); font-weight: 600; }
  .nb-drawer-sep { height: 1px; background: #1C2A45; margin: 8px 0; }
  .nb-drawer-auth { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .nb-drawer-btn-full { width: 100%; padding: 11px; border-radius: 9px; font-size: 0.88rem; font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.15s; }

  /* ── RESPONSIVE ── */
  @media(max-width: 768px) {
    .navbar { padding: 0 1rem; display: flex; justify-content: space-between; align-items: center; }
    .nb-divider { display: none; }
    .nb-links { display: none; }
    .nb-upload-btn { display: none; }
    .nb-ghost { display: none; }
    .nb-accent { display: none; }
    .nb-burger { display: block; }
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
  follow:      actor => <><b>{actor}</b> vous a suivi</>,
  reply:       actor => <><b>{actor}</b> a répondu à votre post</>,
  like:        actor => <><b>{actor}</b> a trouvé votre post utile</>,
  doc_request: ()    => <>📩 Demande de document</>,
}

export default function Navbar({ activePage = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const [notifs,     setNotifs]     = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) { loadProfile(session.user.id); loadNotifs(session.user.id) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) { loadProfile(session.user.id); loadNotifs(session.user.id) }
      else { setProfile(null); setNotifs([]) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) loadProfile(user.id)
    setMenuOpen(false)
  }, [location.pathname])

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('user_profiles').select('name, email, is_admin, points, uploads_count').eq('id', uid).single()
    if (data) setProfile(data)
  }

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
    setUser(null)
    setProfile(null)
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

  // Click-outside for notif dropdown
  useEffect(() => {
    if (!showNotifs) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  // Real-time: new notifications
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`nb-notifs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async payload => {
          const { data } = await supabase.from('notifications')
            .select('*, actor:user_profiles!actor_id(name)')
            .eq('id', payload.new.id).single()
          if (data) setNotifs(prev => [data, ...prev])
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

  const navigate_ = (path) => { navigate(path); setMenuOpen(false) }

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
            <div className="nb-logo-box">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="9" y="13.5" textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="13" fill="#ffffff">9</text>
              </svg>
            </div>
            <span className="nb-logo-text">9raw<b>Zid</b>9ra</span>
          </div>
        </div>

        {/* col 2 — centered nav links */}
        <div className="nb-links">
          {NAV_LINKS.map(l => (
            <button key={l.k} className={`nb-link ${page === (l.k || 'home') ? 'active' : ''}`} onClick={() => navigate(l.path)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* col 3 — auth / avatar */}
        <div className="nb-right">
          {user ? (
            <div className="nb-user">
              <button className="nb-upload-btn" onClick={() => navigate('/upload')}>+ Uploader</button>

              {/* Bell */}
              <div className="nb-bell-wrap" ref={notifRef}>
                <button className="nb-bell" onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markAllRead() }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                  {notifs.filter(n => !n.read).length > 0 && (
                    <span className="nb-bell-badge">{notifs.filter(n => !n.read).length}</span>
                  )}
                </button>
                {showNotifs && (
                  <div className="nb-notifs-dd">
                    <div className="nb-notifs-head">
                      <span className="nb-notifs-title">Notifications</span>
                      {notifs.some(n => !n.read) && (
                        <button className="nb-mark-read" onClick={markAllRead}>Tout marquer lu</button>
                      )}
                    </div>
                    {notifs.length === 0 ? (
                      <div className="nb-notifs-empty">Aucune notification pour l'instant</div>
                    ) : notifs.map(n => {
                      const actorName = n.actor?.name || 'Quelqu\'un'
                      const renderText = NOTIF_TEXT[n.type]
                      const handleClick = () => {
                        setShowNotifs(false)
                        if (n.type === 'follow') navigate(`/user/${n.actor_id}`)
                        else if (n.type === 'doc_request') navigate('/browse')
                        else if (n.post_id) navigate(`/senpai?post=${n.post_id}`)
                      }
                      return (
                        <div key={n.id} className={`nb-notif-item ${n.read ? '' : 'unread'}`} onClick={handleClick}>
                          <div className="nb-notif-dot" style={{ background: n.read ? 'transparent' : '#4F8EF7', border: n.read ? '1px solid #1C2A45' : 'none' }} />
                          <div className="nb-notif-body">
                            <div className="nb-notif-text">{renderText ? renderText(actorName) : actorName}</div>
                            {n.post_title && <div className="nb-notif-sub">"{n.post_title}"</div>}
                            <div className="nb-notif-meta">{fmtAgo(n.created_at)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="nb-avatar-wrap" ref={dropdownRef}>
                <div className="nb-avatar" onClick={() => setShowDropdown(d => !d)}>{initials}</div>
                {showDropdown && (
                  <div className="nb-dropdown">
                    <div className="nb-dd-header">
                      <div className="nb-dd-name">
                        {profile?.name || 'Étudiant'}
                        {profile?.is_admin && <span className="nb-admin-tag">ADMIN</span>}
                      </div>
                      <div className="nb-dd-email">{user.email}</div>
                      <div className="nb-dd-points">{profile?.points || 0} points · {profile?.uploads_count || 0} uploads</div>
                    </div>
                    <button className="nb-dd-item" onClick={() => { navigate('/profile'); setShowDropdown(false) }}>Mon profil</button>
                    <button className="nb-dd-item" onClick={() => { navigate('/my-modules'); setShowDropdown(false) }}>Mes modules</button>
                    {profile?.is_admin && (
                      <button className="nb-dd-item admin" onClick={() => { navigate('/admin'); setShowDropdown(false) }}>Panneau Admin</button>
                    )}
                    <div className="nb-dd-sep" />
                    <a className="nb-dd-item" href="https://paypal.me/saadga2003" target="_blank" rel="noopener noreferrer" onClick={() => setShowDropdown(false)} style={{ color:'#FBD34D', textDecoration:'none' }}>☕ Soutenir 9rawZid9ra</a>
                    <div className="nb-dd-sep" />
                    <button className="nb-dd-item danger" onClick={handleLogout}>Se déconnecter</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <button className="nb-ghost" onClick={() => navigate('/login')}>Connexion</button>
              <button className="nb-accent" onClick={() => navigate('/register')}>S'inscrire</button>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button className={`nb-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            <span className="nb-burger-bar"/>
            <span className="nb-burger-bar"/>
            <span className="nb-burger-bar"/>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nb-drawer ${menuOpen ? 'open' : ''}`}>
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
            <button className="nb-drawer-link" onClick={() => navigate_('/profile')}>Mon profil</button>
            <button className="nb-drawer-link" onClick={() => navigate_('/my-modules')}>Mes modules</button>
            <button className="nb-drawer-link" onClick={() => navigate_('/upload')} style={{ color:'#7BB3FF' }}>+ Uploader un doc</button>
            {profile?.is_admin && (
              <button className="nb-drawer-link" onClick={() => navigate_('/admin')} style={{ color:'#F87171' }}>Panneau Admin</button>
            )}
            <div className="nb-drawer-sep"/>
            <button className="nb-drawer-link" onClick={handleLogout} style={{ color:'#F87171' }}>Se déconnecter</button>
          </>
        ) : (
          <div className="nb-drawer-auth">
            <button className="nb-drawer-btn-full" style={{ background:'none', border:'1px solid #1C2A45', color:'#94A3B8' }} onClick={() => navigate_('/login')}>Connexion</button>
            <button className="nb-drawer-btn-full" style={{ background:'#4F8EF7', border:'none', color:'#fff' }} onClick={() => navigate_('/register')}>S'inscrire</button>
          </div>
        )}
      </div>
    </>
  )
}
