import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'

const css = `
  @keyframes mw-slide { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes mw-spin  { to { transform:rotate(360deg); } }
  @keyframes mw-pulse { 0%,100% { box-shadow:0 8px 28px rgba(79,142,247,0.45); } 50% { box-shadow:0 8px 36px rgba(79,142,247,0.75), 0 0 0 6px rgba(79,142,247,0.12); } }
  .mw-panel {
    position:fixed; bottom:88px; right:24px; z-index:9998;
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
  .mw-textarea {
    flex:1; background:#0C1222; border:1px solid #1C2A45; border-radius:8px;
    padding:9px 12px; color:#E2E8F0; font-size:0.82rem; font-family:'Outfit',sans-serif;
    outline:none; resize:none; line-height:1.45; max-height:80px; overflow-y:auto;
    transition:border-color 0.15s;
  }
  .mw-textarea:focus { border-color:rgba(79,142,247,0.4); }
  .mw-textarea::placeholder { color:#4A5568; }
  @media(max-width:480px) {
    .mw-panel { width:calc(100vw - 32px); right:16px; bottom:84px; }
  }
`

export default function MessengerWidget() {
  const [user,          setUser]          = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [isOpen,        setIsOpen]        = useState(false)
  const [thread,        setThread]        = useState([])
  const [text,          setText]          = useState('')
  const [sending,       setSending]       = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [unread,        setUnread]        = useState(0)

  const threadEndRef = useRef(null)
  const inputRef     = useRef(null)
  const isOpenRef    = useRef(false)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) init(session.user)
      else setProfileLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) init(session.user)
      else {
        setUser(null); setProfile(null); setProfileLoaded(false)
        setThread([]); setUnread(0); setIsOpen(false)
        // small delay so the guard re-evaluates after state settles
        setTimeout(() => setProfileLoaded(true), 50)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  const init = async (u) => {
    setUser(u)
    const { data } = await supabase
      .from('user_profiles')
      .select('name, is_admin, is_moderator')
      .eq('id', u.id)
      .single()
    setProfile(data)
    setProfileLoaded(true)
    if (!data?.is_admin && !data?.is_moderator) checkUnread(u.id)
  }

  // ── Open from notification or profile button ──────────────────────────────
  useEffect(() => {
    const handler = () => {
      setIsOpen(true)
      setTimeout(() => inputRef.current?.focus(), 250)
    }
    window.addEventListener('open-messenger', handler)
    return () => window.removeEventListener('open-messenger', handler)
  }, [])

  // ── Unread badge ─────────────────────────────────────────────────────────
  const checkUnread = async (uid) => {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', ADMIN_ID)
      .eq('receiver_id', uid)
      .eq('is_read', false)
    setUnread(count || 0)
  }

  // ── Load thread when opened ───────────────────────────────────────────────
  const loadThread = async (uid) => {
    setLoading(true)
    const [{ data: sent }, { data: received }] = await Promise.all([
      supabase.from('messages').select('*').eq('sender_id', uid).eq('receiver_id', ADMIN_ID).order('created_at'),
      supabase.from('messages').select('*').eq('sender_id', ADMIN_ID).eq('receiver_id', uid).order('created_at'),
    ])
    const all = [...(sent || []), ...(received || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )
    setThread(all)
    setLoading(false)
    setUnread(0)
    // Mark admin → user messages as read
    supabase.from('messages')
      .update({ is_read: true })
      .eq('sender_id', ADMIN_ID).eq('receiver_id', uid).eq('is_read', false)
      .then()
  }

  useEffect(() => {
    if (isOpen && user && !profile?.is_admin && !profile?.is_moderator) {
      loadThread(user.id)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen]) // eslint-disable-line

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, isOpen])

  // ── Real-time: new replies from admin ────────────────────────────────────
  useEffect(() => {
    if (!user || profile?.is_admin || profile?.is_moderator) return
    const channel = supabase
      .channel(`mw-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        if (payload.new.sender_id === ADMIN_ID) {
          if (isOpenRef.current) {
            setThread(prev => [...prev, payload.new])
            supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then()
          } else {
            setUnread(prev => prev + 1)
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, profile]) // eslint-disable-line

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || sending || !user) return
    setSending(true)
    const content = text.trim()
    setText('')
    const { data: newMsg } = await supabase.from('messages').insert({
      sender_id:   user.id,
      receiver_id: ADMIN_ID,
      content,
    }).select().single()
    if (newMsg) setThread(prev => [...prev, newMsg])
    await supabase.from('notifications').insert({
      user_id: ADMIN_ID,
      type:    'new_message',
      content: `${profile?.name || 'Utilisateur'} : ${content.slice(0, 80)}`,
      read:    false,
    })
    setSending(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Render guard ─────────────────────────────────────────────────────────
  if (!user || !profileLoaded) return null
  if (profile?.is_admin === true || profile?.is_moderator === true) return null

  const fmtDate = d => new Date(d).toLocaleDateString('fr-MA', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const hasPulse = !isOpen && unread > 0

  return (
    <>
      <style>{css}</style>

      {/* ── Chat panel ── */}
      {isOpen && (
        <div className="mw-panel">
          {/* Header */}
          <div style={{
            padding:'12px 16px', borderBottom:'1px solid #1C2A45',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0, background:'#070C18',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:'50%',
                background:'linear-gradient(135deg,#4F8EF7,#2DD4BF)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'DM Mono,monospace', fontSize:'0.68rem', fontWeight:700,
                color:'#fff', flexShrink:0,
              }}>SG</div>
              <div>
                <div style={{ fontSize:'0.86rem', fontWeight:700, color:'#E2E8F0', letterSpacing:'-0.3px' }}>
                  Support 9rawZid9ra
                </div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'#2DD4BF', marginTop:1 }}>
                  // Saad GENIUS répond généralement en quelques heures
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', padding:6, borderRadius:7, transition:'background 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Thread */}
          <div className="mw-thread">
            {loading && (
              <div style={{ textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', padding:'2rem 0' }}>
                chargement...
              </div>
            )}
            {!loading && thread.length === 0 && (
              <div style={{ margin:'auto', textAlign:'center', padding:'1.5rem 1rem' }}>
                <div style={{ fontSize:'2rem', marginBottom:10 }}>👋</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568' }}>// Bonjour !</div>
                <div style={{ fontSize:'0.76rem', color:'#4A5568', marginTop:8, lineHeight:1.55 }}>
                  Tu peux poser toutes tes questions à l'admin ici.<br/>
                  Il répond généralement en quelques heures.
                </div>
              </div>
            )}
            {thread.map(m => {
              const isAdmin = m.sender_id === ADMIN_ID
              return (
                <div key={m.id} style={{ display:'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth:'80%', padding:'8px 12px',
                    borderRadius: isAdmin ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    background: isAdmin ? '#0C1222' : 'rgba(79,142,247,0.18)',
                    border: `1px solid ${isAdmin ? '#1C2A45' : 'rgba(79,142,247,0.35)'}`,
                  }}>
                    {isAdmin && (
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.56rem', color:'#2DD4BF', marginBottom:4 }}>
                        Saad GENIUS
                      </div>
                    )}
                    <div style={{ fontSize:'0.82rem', color:'#E2E8F0', lineHeight:1.52, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                      {m.content}
                    </div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.55rem', color:'#4A5568', marginTop:4, textAlign: isAdmin ? 'left' : 'right' }}>
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
              style={{
                background: text.trim() && !sending ? 'linear-gradient(135deg,#4F8EF7,#3A6ED4)' : '#1C2A45',
                color: text.trim() ? '#fff' : '#4A5568',
                border: 'none', borderRadius:8, padding:'9px 13px',
                cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
                flexShrink:0, transition:'all 0.15s',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
            >
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
        </div>
      )}

      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="Contacter l'admin"
        style={{
          position:'fixed', bottom:24, right:24, zIndex:9999,
          width:56, height:56, borderRadius:'50%',
          background: isOpen ? '#0C1222' : 'linear-gradient(135deg,#4F8EF7,#2DD4BF)',
          border: isOpen ? '1px solid #2D4A7A' : 'none',
          color:'#fff', cursor:'pointer',
          boxShadow: isOpen ? 'none' : '0 8px 28px rgba(79,142,247,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s',
          animation: hasPulse ? 'mw-pulse 2s ease-in-out infinite' : 'none',
        }}
      >
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
          <span style={{
            position:'absolute', top:-3, right:-3,
            background:'#F87171', color:'#fff',
            borderRadius:'50%', width:20, height:20,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.6rem', fontWeight:700, fontFamily:'DM Mono,monospace',
            border:'2px solid #02040A',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  )
}
