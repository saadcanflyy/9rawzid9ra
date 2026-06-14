import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'

const css = `
  @keyframes mw-slide { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes mw-spin  { to { transform:rotate(360deg); } }
  @keyframes mw-pulse { 0%,100% { box-shadow:0 8px 28px rgba(79,142,247,0.45); } 50% { box-shadow:0 8px 36px rgba(79,142,247,0.75), 0 0 0 6px rgba(79,142,247,0.12); } }
  .mw-panel {
    position:fixed; bottom:152px; right:24px; z-index:9998;
    width:360px; height:500px;
    background:#070C18; border:1px solid #1C2A45; border-radius:16px;
    box-shadow:0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(79,142,247,0.06);
    display:flex; flex-direction:column; overflow:hidden;
    animation:mw-slide 0.2s cubic-bezier(.34,1.2,.64,1);
    font-family:'Outfit',sans-serif;
  }
  .mw-thread { flex:1; overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:8px; }
  .mw-thread::-webkit-scrollbar { width:3px; }
  .mw-thread::-webkit-scrollbar-thumb { background:#1C2A45; border-radius:2px; }
  .mw-inbox { flex:1; overflow-y:auto; }
  .mw-inbox::-webkit-scrollbar { width:3px; }
  .mw-inbox::-webkit-scrollbar-thumb { background:#1C2A45; border-radius:2px; }
  .mw-contact-row {
    padding:12px 16px; display:flex; align-items:center; gap:12px;
    cursor:pointer; border-bottom:1px solid rgba(28,42,69,0.5);
    transition:background 0.12s;
  }
  .mw-contact-row:hover { background:rgba(255,255,255,0.03); }
  .mw-textarea {
    flex:1; background:#0C1222; border:1px solid #1C2A45; border-radius:8px;
    padding:9px 12px; color:#E2E8F0; font-size:0.82rem; font-family:'Outfit',sans-serif;
    outline:none; resize:none; line-height:1.45; max-height:80px; overflow-y:auto;
    transition:border-color 0.15s;
  }
  .mw-textarea:focus { border-color:rgba(79,142,247,0.4); }
  .mw-textarea::placeholder { color:#4A5568; }
  @media(max-width:480px) {
    .mw-panel { width:calc(100vw - 32px); right:16px; bottom:148px; }
  }
`

const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'maintenant'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}j`
}

export default function MessengerWidget() {
  const [user,          setUser]          = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [isOpen,        setIsOpen]        = useState(false)
  const [view,          setView]          = useState('inbox') // 'inbox' | 'chat'
  const [activeContact, setActiveContact] = useState(null)   // { id, name }
  const [contacts,      setContacts]      = useState([])
  const [thread,        setThread]        = useState([])
  const [text,          setText]          = useState('')
  const [sending,       setSending]       = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [unread,        setUnread]        = useState(0)

  const threadEndRef      = useRef(null)
  const inputRef          = useRef(null)
  const isOpenRef         = useRef(false)
  const userRef           = useRef(null)
  const activeContactRef  = useRef(null)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  useEffect(() => { activeContactRef.current = activeContact }, [activeContact])
  useEffect(() => { userRef.current = user }, [user])

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) init(session.user)
      else setProfileLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) init(session.user)
      else if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null); setProfileLoaded(false)
        setThread([]); setContacts([]); setUnread(0); setIsOpen(false)
        setActiveContact(null); setView('inbox')
        setTimeout(() => setProfileLoaded(true), 50)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  const init = async (u) => {
    setUser(u)
    userRef.current = u
    const { data } = await supabase
      .from('user_profiles')
      .select('name, is_admin, is_moderator')
      .eq('id', u.id)
      .single()
    setProfile(data)
    setProfileLoaded(true)
    if (!data?.is_admin && !data?.is_moderator) checkUnread(u.id)
  }

  // ── Open from event (notification bell, profile DM button, senpai DM) ───
  useEffect(() => {
    const handler = (e) => {
      const uid = userRef.current?.id
      if (!uid) return
      const detail = e?.detail
      if (detail?.userId) {
        const contact = { id: detail.userId, name: detail.name || 'Utilisateur' }
        setActiveContact(contact)
        activeContactRef.current = contact
        setView('chat')
        setThread([])
        loadThread(uid, detail.userId)
        setTimeout(() => inputRef.current?.focus(), 300)
      } else {
        setView('inbox')
        loadInbox(uid)
      }
      setIsOpen(true)
    }
    window.addEventListener('open-messenger', handler)
    window.addEventListener('open-dm', handler)
    return () => {
      window.removeEventListener('open-messenger', handler)
      window.removeEventListener('open-dm', handler)
    }
  }, []) // eslint-disable-line

  // ── Load inbox (conversation list) ───────────────────────────────────────
  const loadInbox = useCallback(async (uid) => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, is_read, created_at, sender:user_profiles!sender_id(name), receiver:user_profiles!receiver_id(name)')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false })

      const msgs = data || []
      const unreadPerPartner = new Map()
      for (const m of msgs) {
        if (m.receiver_id === uid && !m.is_read) {
          unreadPerPartner.set(m.sender_id, (unreadPerPartner.get(m.sender_id) || 0) + 1)
        }
      }
      const seen = new Map()
      for (const m of msgs) {
        const partnerId = m.sender_id === uid ? m.receiver_id : m.sender_id
        const pName = m.sender_id === uid ? (m.receiver?.name || 'Utilisateur') : (m.sender?.name || 'Utilisateur')
        if (!seen.has(partnerId)) {
          seen.set(partnerId, {
            id: partnerId,
            name: partnerId === ADMIN_ID ? 'Support 9rawZid9ra' : pName,
            lastMsg: m.content,
            lastAt: m.created_at,
            unread: unreadPerPartner.get(partnerId) || 0,
          })
        }
      }
      if (!seen.has(ADMIN_ID)) {
        seen.set(ADMIN_ID, { id: ADMIN_ID, name: 'Support 9rawZid9ra', lastMsg: null, lastAt: null, unread: 0 })
      }
      const convos = [seen.get(ADMIN_ID)]
      for (const [id, c] of seen) { if (id !== ADMIN_ID) convos.push(c) }
      setContacts(convos)
    } catch (e) {
      console.error('loadInbox:', e)
    }
    setLoading(false)
  }, [])

  // ── Load thread with a specific contact ───────────────────────────────────
  const loadThread = useCallback(async (uid, contactId) => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true })
      setThread(data || [])
      supabase.from('messages')
        .update({ is_read: true })
        .eq('sender_id', contactId).eq('receiver_id', uid).eq('is_read', false)
        .then()
    } catch (e) {
      console.error('loadThread:', e)
    }
    setLoading(false)
  }, [])

  // ── Load on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !user || profile?.is_admin || profile?.is_moderator) return
    if (view === 'inbox') loadInbox(user.id)
    else if (view === 'chat' && activeContact) {
      loadThread(user.id, activeContact.id)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen]) // eslint-disable-line

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && view === 'chat') threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, isOpen, view])

  // ── Unread badge ─────────────────────────────────────────────────────────
  const checkUnread = async (uid) => {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('is_read', false)
    setUnread(count || 0)
  }

  // ── Real-time: new messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || profile?.is_admin || profile?.is_moderator) return
    const channel = supabase
      .channel(`mw-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        const msg = payload.new
        const contact = activeContactRef.current
        if (isOpenRef.current && contact && msg.sender_id === contact.id) {
          setThread(prev => [...prev, msg])
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then()
        } else {
          setUnread(prev => prev + 1)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, profile]) // eslint-disable-line

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || sending || !user || !activeContact) return
    setSending(true)
    const content = text.trim()
    setText('')
    const { data: newMsg } = await supabase.from('messages').insert({
      sender_id:   user.id,
      receiver_id: activeContact.id,
      content,
    }).select().single()
    if (newMsg) setThread(prev => [...prev, newMsg])
    await supabase.from('notifications').insert({
      user_id: activeContact.id,
      type:    'new_message',
      content: `${profile?.name || 'Utilisateur'} : ${content.slice(0, 80)}`,
      read:    false,
    })
    setSending(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const openContact = (c) => {
    setActiveContact(c)
    activeContactRef.current = c
    setView('chat')
    setThread([])
    loadThread(user.id, c.id)
    if (c.unread > 0) setUnread(prev => Math.max(0, prev - c.unread))
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const backToInbox = () => {
    setView('inbox')
    setActiveContact(null)
    setThread([])
    loadInbox(user.id)
  }

  // ── Render guard ─────────────────────────────────────────────────────────
  if (!user || !profileLoaded) return null
  if (profile?.is_admin === true || profile?.is_moderator === true) return null

  const fmtDate = d => new Date(d).toLocaleDateString('fr-MA', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const hasPulse = !isOpen && unread > 0
  const avatarInitials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{css}</style>

      {/* ── Chat panel ── */}
      {isOpen && (
        <div className="mw-panel">
          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #1C2A45', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'#070C18' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {view === 'chat' && (
                <button onClick={backToInbox}
                  style={{ background:'none', border:'none', color:'#94A3B8', cursor:'pointer', padding:'2px 6px 2px 0', display:'flex', alignItems:'center' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
              )}
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#4F8EF7,#2DD4BF)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontSize:'0.68rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                {view === 'chat' && activeContact ? avatarInitials(activeContact.name) : '💬'}
              </div>
              <div>
                <div style={{ fontSize:'0.86rem', fontWeight:700, color:'#E2E8F0', letterSpacing:'-0.3px' }}>
                  {view === 'chat' && activeContact ? activeContact.name : 'Messages'}
                </div>
                {view === 'inbox' && (
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'#4A5568', marginTop:1 }}>
                    // {contacts.length} conversation{contacts.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setIsOpen(false)}
              style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', padding:6, borderRadius:7, transition:'background 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ── Inbox view ── */}
          {view === 'inbox' && (
            <div className="mw-inbox">
              {loading && (
                <div style={{ textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', padding:'2rem 0' }}>
                  chargement...
                </div>
              )}
              {!loading && contacts.map(c => (
                <div key={c.id} className="mw-contact-row" onClick={() => openContact(c)}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background: c.id === ADMIN_ID ? 'linear-gradient(135deg,#4F8EF7,#2DD4BF)' : 'linear-gradient(135deg,#2DD4BF,#7BB3FF)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontSize:'0.7rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {avatarInitials(c.name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'0.85rem', fontWeight:600, color:'#E2E8F0' }}>{c.name}</span>
                      {c.lastAt && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'#4A5568' }}>{fmtAgo(c.lastAt)}</span>}
                    </div>
                    <div style={{ fontSize:'0.76rem', color:'#4A5568', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {c.lastMsg || 'Démarrer une conversation'}
                    </div>
                  </div>
                  {c.unread > 0 && (
                    <span style={{ background:'#4F8EF7', color:'#fff', borderRadius:'50%', minWidth:20, height:20, padding:'0 4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:700, fontFamily:'DM Mono,monospace', flexShrink:0 }}>
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </div>
              ))}
              {!loading && contacts.length <= 1 && (
                <div style={{ padding:'16px', margin:'8px 12px', background:'rgba(79,142,247,0.04)', border:'1px dashed rgba(79,142,247,0.2)', borderRadius:10, textAlign:'center' }}>
                  <div style={{ fontSize:'0.75rem', color:'#4A5568', lineHeight:1.6 }}>
                    Pour envoyer un message à un étudiant,<br/>
                    visite son <span style={{ color:'#7BB3FF' }}>profil</span> ou un post <span style={{ color:'#7BB3FF' }}>Senpai</span><br/>
                    et clique sur <b style={{ color:'#94A3B8' }}>✉ Message</b>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Chat view ── */}
          {view === 'chat' && (
            <>
              <div className="mw-thread">
                {loading && (
                  <div style={{ textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', padding:'2rem 0' }}>
                    chargement...
                  </div>
                )}
                {!loading && thread.length === 0 && (
                  <div style={{ margin:'auto', textAlign:'center', padding:'1.5rem 1rem' }}>
                    <div style={{ fontSize:'2rem', marginBottom:10 }}>👋</div>
                    <div style={{ fontSize:'0.76rem', color:'#4A5568', marginTop:8, lineHeight:1.55 }}>
                      Envoie ton premier message à {activeContact?.name}
                    </div>
                  </div>
                )}
                {thread.map(m => {
                  const isMe = m.sender_id === user.id
                  return (
                    <div key={m.id} style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth:'80%', padding:'8px 12px', borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px', background: isMe ? 'rgba(79,142,247,0.18)' : '#0C1222', border: `1px solid ${isMe ? 'rgba(79,142,247,0.35)' : '#1C2A45'}` }}>
                        <div style={{ fontSize:'0.82rem', color:'#E2E8F0', lineHeight:1.52, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                          {m.content}
                        </div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.55rem', color:'#4A5568', marginTop:4, textAlign: isMe ? 'right' : 'left' }}>
                          {fmtDate(m.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={threadEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding:'10px 12px', borderTop:'1px solid #1C2A45', display:'flex', gap:8, flexShrink:0, background:'#070C18' }}>
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Votre message..."
                  maxLength={500}
                  rows={1}
                  className="mw-textarea"
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || sending}
                  style={{ background: text.trim() && !sending ? 'linear-gradient(135deg,#4F8EF7,#3A6ED4)' : '#1C2A45', color: text.trim() ? '#fff' : '#4A5568', border:'none', borderRadius:8, padding:'9px 13px', cursor: text.trim() && !sending ? 'pointer' : 'not-allowed', flexShrink:0, transition:'all 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sending ? (
                    <svg style={{ animation:'mw-spin 0.8s linear infinite' }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  ) : (
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m22 2-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Floating toggle button ── */}
      <button
        onClick={() => {
          if (!isOpen) { setView('inbox'); loadInbox(user.id) }
          setIsOpen(o => !o)
        }}
        title="Messages"
        style={{ position:'fixed', bottom:88, right:24, zIndex:9999, width:56, height:56, borderRadius:'50%', background: isOpen ? '#0C1222' : 'linear-gradient(135deg,#4F8EF7,#2DD4BF)', border: isOpen ? '1px solid #2D4A7A' : 'none', color:'#fff', cursor:'pointer', boxShadow: isOpen ? 'none' : '0 8px 28px rgba(79,142,247,0.45)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', animation: hasPulse ? 'mw-pulse 2s ease-in-out infinite' : 'none' }}>
        {isOpen ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!isOpen && unread > 0 && (
          <span style={{ position:'absolute', top:-3, right:-3, background:'#F87171', color:'#fff', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:700, fontFamily:'DM Mono,monospace', border:'2px solid #02040A' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  )
}
