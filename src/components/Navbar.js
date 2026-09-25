import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { Wordmark, Button, Avatar, Badge, Icon, Sheet, ThemeToggle, Banner } from '../design-system/ui'
import { useTheme } from '../design-system/theme'
import SearchAutocomplete from './SearchAutocomplete'

const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'maintenant'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}j`
}

const NOTIF_TEXT = {
  follow:       (actor) => <><b>{actor}</b> t'a suivi</>,
  reply:        (actor) => <><b>{actor}</b> a répondu à ton post</>,
  like:         (actor) => <><b>{actor}</b> a trouvé ton post utile</>,
  doc_request:  ()      => <>Demande de document</>,
  new_document: (_, n)  => <>{n?.content || 'Nouveau document'}</>,
}

const NAV_LINKS = [
  { key: 'browse',     label: 'Explorer',    path: '/browse' },
  { key: 'senpai',     label: 'Senpai Zone', path: '/senpai' },
  { key: 'classement', label: 'Classement',  path: '/classement' },
  { key: 'my-modules', label: 'Mes modules', path: '/my-modules' },
  { key: 'ai',         label: 'AI Coach',    path: '/ai' },
]

export default function Navbar({ activePage = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, onlineCount } = useAuth()
  const { mode: themeMode, cycle: cycleTheme } = useTheme()

  const [showDropdown, setShowDropdown] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef(null)

  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)
  const notifBtnRef = useRef(null)
  const accountBtnRef = useRef(null)
  const searchRef = useRef(null)
  const mobileSearchRef = useRef(null)

  useEffect(() => {
    if (user) loadNotifs(user.id)
    else setNotifs([])
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { setMenuOpen(false); setMobileSearchOpen(false) }, [location.pathname])

  useEffect(() => {
    const locked = menuOpen || mobileSearchOpen
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen, mobileSearchOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    const onClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setShowDropdown(false); accountBtnRef.current?.focus() } }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [showDropdown])

  useEffect(() => {
    if (!showNotifs) return
    const onClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setShowNotifs(false); notifBtnRef.current?.focus() } }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [showNotifs])

  // Keyboard shortcuts — ⌘/Ctrl+P profile, ⌘/Ctrl+M my modules, "/" focuses search
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable
      if (e.key === '/' && !typing) {
        e.preventDefault()
        if (window.innerWidth >= 860) searchRef.current?.focus()
        else { setMenuOpen(false); setMobileSearchOpen(true); setTimeout(() => mobileSearchRef.current?.focus(), 50) }
        return
      }
      if (!user || !(e.metaKey || e.ctrlKey)) return
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
        payload => setNotifs(prev => [payload.new, ...prev]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const page = activePage || location.pathname.replace('/', '') || 'home'

  const handleNav = (path) => {
    if (path === '/browse') {
      if (location.pathname === '/browse') return
      const saved = sessionStorage.getItem('lastBrowseUrl')
      if (saved) { navigate(saved); return }
    }
    navigate(path)
  }
  const navigateAndClose = (path) => { handleNav(path); setMenuOpen(false) }

  const handleSearchSubmit = (query) => {
    setMobileSearchOpen(false)
    if (!query || !query.trim()) return
    navigate(`/browse?q=${encodeURIComponent(query.trim())}`)
  }

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

  const handleNotifClick = async (n) => {
    const isGroupedMsg = n.type === 'new_message' || n.type === 'message_reply'
    setShowNotifs(false)
    if (isGroupedMsg) {
      if (n.groupUnread) {
        await supabase.from('notifications').update({ read: true }).in('id', n.groupIds)
        setNotifs(prev => prev.map(x => n.groupIds.includes(x.id) ? { ...x, read: true } : x))
      }
      window.dispatchEvent(new CustomEvent('open-messenger', { detail: { userId: n.actor_id, name: n.groupSender } }))
      return
    }
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    const rid = n.related_id
    if (n.type === 'follow') navigate(`/user/${rid || n.actor_id}`)
    else if (n.type === 'reply') {
      if (rid) localStorage.setItem('senpai_highlight_post', String(rid))
      navigate('/senpai')
    } else if (n.type === 'new_document') navigate(n.link || '/browse')
    else if (['helpful', 'reaction', 'comment', 'download', 'request_fulfilled'].includes(n.type)) navigate(`/module/${rid}`)
    else if (n.type === 'doc_request') navigate('/browse')
    else if (n.type === 'announcement') navigate('/')
    else if (n.post_id) { localStorage.setItem('senpai_highlight_post', String(n.post_id)); navigate('/senpai') }
    else navigate('/profile')
  }

  const founder = !!profile?.is_fondateur

  return (
    <>
      {bannerOpen && (
        <div className="qz-mobile-banner-wrap">
          <Banner action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => window.open("https://wa.me/212677246703?text=Je veux être notifié quand l'app 9rawZid9ra sera disponible", '_blank')}>Me notifier</Button>
              <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Fermer" onClick={() => setBannerOpen(false)} />
            </div>
          }>
            App mobile bientôt disponible.
          </Banner>
        </div>
      )}

      <header className={`qz-navbar${scrolled ? ' qz-navbar--scrolled' : ''}`}>
        <Wordmark linkAs={Link} href="/" />

        <nav className="qz-nav" aria-label="Principal">
          {NAV_LINKS.map(l => (
            <button key={l.key} type="button" aria-current={page === l.key ? 'page' : undefined} onClick={() => handleNav(l.path)}>{l.label}</button>
          ))}
        </nav>

        <div className="qz-navbar__search">
          <SearchAutocomplete variant="compact" placeholder="Rechercher un module" shortcut="/" inputRef={searchRef} onSubmit={handleSearchSubmit} />
        </div>

        <div className="qz-navbar__end">
          <span className="qz-navbar__desktop-only">
            <span className="qz-navbar__online"><span className="qz-navbar__online-dot" />{onlineCount} en ligne</span>
            <ThemeToggle mode={themeMode} onToggle={cycleTheme} />
          </span>

          {user ? (
            <>
              <span className="qz-navbar__desktop-only">
                <Button variant="primary" size="sm" iconRight="upload" as={Link} to="/upload">Partager</Button>
              </span>

              <div className="qz-dropdown-anchor" ref={notifRef}>
                <button type="button" ref={notifBtnRef} className="qz-iconbtn" aria-haspopup="true" aria-expanded={showNotifs} aria-label={`${unreadCount} notifications`} onClick={() => setShowNotifs(v => !v)}>
                  <Icon name="bell" />
                  {unreadCount > 0 && <span className="qz-pip">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div className="qz-dropdown qz-dropdown--wide" role="menu">
                    <div className="qz-notif-head">
                      <span className="qz-h3">Notifications</span>
                      {notifs.some(n => !n.read) && <Button variant="link" size="sm" onClick={markAllRead}>Tout marquer comme lu</Button>}
                    </div>
                    {notifs.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <span className="qz-muted t-body-sm">Aucune notification pour l'instant</span>
                      </div>
                    ) : (
                      <div className="qz-notif-list">
                        {displayNotifs.map(n => {
                          const isGroupedMsg = n.type === 'new_message' || n.type === 'message_reply'
                          const isUnread = isGroupedMsg ? n.groupUnread : !n.read
                          const actorName = n.actor?.name || 'Quelqu\'un'
                          const renderText = NOTIF_TEXT[n.type]
                          let textNode
                          if (isGroupedMsg) {
                            const count = n.groupCount
                            const sender = n.groupSender
                            textNode = count > 0
                              ? <><b>{sender}</b> · <Badge tone="brand">{count} nouveau{count > 1 ? 'x' : ''} message{count > 1 ? 's' : ''}</Badge></>
                              : <><b>{sender}</b> : {(n.content || '').split(' : ').slice(1).join(' : ') || 'message'}</>
                          } else {
                            textNode = renderText ? renderText(actorName, n) : (n.content || actorName)
                          }
                          return (
                            <button key={n.id} type="button" className={`qz-notif-item${isUnread ? ' qz-notif-item--unread' : ''}`} onClick={() => handleNotifClick(n)}>
                              <span className={`qz-notif-dot${isUnread ? '' : ' qz-notif-dot--read'}`} />
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span className="qz-notif-text">{textNode}</span>
                                <span className="qz-notif-time">{fmtAgo(n.created_at)}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="qz-dropdown-anchor" ref={dropdownRef}>
                <button type="button" ref={accountBtnRef} onClick={() => setShowDropdown(d => !d)} aria-haspopup="true" aria-expanded={showDropdown} aria-label="Menu du compte" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                  <Avatar name={profile?.name || user.email} size="sm" founder={founder} />
                </button>
                {showDropdown && (
                  <div className="qz-dropdown" role="menu">
                    <div className="qz-dd-header">
                      <Avatar name={profile?.name || user.email} size="lg" founder={founder} />
                      <span className="qz-dd-name">
                        {profile?.name || 'Étudiant'}
                        {profile?.is_admin && <span className="qz-navbar__admin-tag">ADMIN</span>}
                        {founder && <Badge tone="founder" icon="star">Fondateur</Badge>}
                      </span>
                      <span className="qz-dd-email">{user.email}</span>
                      <div className="qz-dd-pills">
                        <Badge tone="brand">{profile?.points || 0} points</Badge>
                        <Badge>{profile?.uploads_count || 0} uploads</Badge>
                      </div>
                    </div>
                    <button type="button" className="qz-dropdown__item" role="menuitem" onClick={() => { navigate('/profile'); setShowDropdown(false) }}><Icon name="user" /> Mon profil<span className="qz-dropdown__kbd">⌘P</span></button>
                    <button type="button" className="qz-dropdown__item" role="menuitem" onClick={() => { navigate('/my-modules'); setShowDropdown(false) }}><Icon name="bookmark" /> Mes modules<span className="qz-dropdown__kbd">⌘M</span></button>
                    {profile?.is_admin && (
                      <button type="button" className="qz-dropdown__item qz-dropdown__item--danger" role="menuitem" onClick={() => { navigate('/admin'); setShowDropdown(false) }}><Icon name="shield" /> Panneau Admin</button>
                    )}
                    {profile?.is_moderator && !profile?.is_admin && (
                      <button type="button" className="qz-dropdown__item" role="menuitem" onClick={() => { navigate('/moderator'); setShowDropdown(false) }}><Icon name="shield" /> Panneau Modérateur</button>
                    )}
                    <a className="qz-dropdown__item qz-dropdown__item--founder" href="https://paypal.me/saadga2003" target="_blank" rel="noopener noreferrer" onClick={() => setShowDropdown(false)}><Icon name="heart" /> Soutenir 9rawZid9ra</a>
                    <div className="qz-dropdown__sep" />
                    <button type="button" className="qz-dropdown__item qz-dropdown__item--danger" role="menuitem" onClick={handleLogout}><Icon name="log-out" /> Se déconnecter</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="qz-navbar__desktop-only">
              <Button variant="ghost" size="sm" onClick={() => { sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); navigate('/login') }}>Connexion</Button>
              <Button variant="primary" size="sm" as={Link} to="/register">Créer un compte</Button>
            </span>
          )}

          <span className="qz-navbar__mobile">
            <Button variant="ghost" size="sm" iconOnly icon="search" aria-label="Rechercher" onClick={() => { setMenuOpen(false); setMobileSearchOpen(true); setTimeout(() => mobileSearchRef.current?.focus(), 50) }} />
            <Button variant="ghost" size="sm" iconOnly icon="menu" aria-label="Menu" onClick={() => { setMobileSearchOpen(false); setMenuOpen(m => !m) }} />
          </span>
        </div>
      </header>

      {mobileSearchOpen && (
        <Sheet title="Rechercher" onClose={() => setMobileSearchOpen(false)}>
          <SearchAutocomplete embedded placeholder="Module, filière ou école…" inputRef={mobileSearchRef} onSubmit={handleSearchSubmit} />
        </Sheet>
      )}

      {menuOpen && (
        <Sheet title="Menu" onClose={() => setMenuOpen(false)}>
          {NAV_LINKS.map(l => (
            <button key={l.key} type="button" className="qz-drawer-link" aria-current={page === l.key ? 'page' : undefined} onClick={() => navigateAndClose(l.path)}>{l.label}</button>
          ))}
          {user ? (
            <Button variant="primary" block iconRight="upload" onClick={() => navigateAndClose('/upload')}>Partager</Button>
          ) : null}
          <div className="qz-drawer-sep" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-3)' }}>
            <span className="t-body-sm qz-muted">Thème</span>
            <ThemeToggle mode={themeMode} onToggle={cycleTheme} />
          </div>
          {user ? (
            <>
              <div className="qz-drawer-sep" />
              <button type="button" className="qz-drawer-link" onClick={() => navigateAndClose('/profile')}><Icon name="user" /> Mon profil</button>
              <button type="button" className="qz-drawer-link" onClick={() => navigateAndClose('/my-modules')}><Icon name="bookmark" /> Mes modules</button>
              {profile?.is_admin && <button type="button" className="qz-drawer-link qz-drawer-link--danger" onClick={() => navigateAndClose('/admin')}><Icon name="shield" /> Panneau Admin</button>}
              {profile?.is_moderator && !profile?.is_admin && <button type="button" className="qz-drawer-link" onClick={() => navigateAndClose('/moderator')}><Icon name="shield" /> Panneau Modérateur</button>}
              <div className="qz-drawer-sep" />
              <button type="button" className="qz-drawer-link qz-drawer-link--danger" onClick={handleLogout}><Icon name="log-out" /> Se déconnecter</button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" block onClick={() => navigateAndClose('/login')}>Connexion</Button>
              <Button variant="primary" block onClick={() => navigateAndClose('/register')}>Créer un compte</Button>
            </div>
          )}
        </Sheet>
      )}
    </>
  )
}
