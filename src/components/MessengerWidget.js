import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'

const css = `
  @keyframes mw-slide { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes mw-spin  { to { transform:rotate(360deg); } }
  .mw-panel {
    position:fixed; bottom:80px; right:28px; z-index:8999;
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
  @media(max-width:480px) {
    .mw-panel { width:calc(100vw - 32px); right:16px; bottom:76px; }
  }
`

export default function MessengerWidget() {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [isOpen,  setIsOpen]  = useState(false)
  const [thread,  setThread]  = useState([])
  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unread,  setUnread]  = useState(0)

  const threadEndRef = useRef(null)
  const inputRef     = useRef(null)
  const isOpenRef    = useRef(false)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) init(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) init(session.user)
      else { setUser(null); setProfile(null); setThread([]); setUnread(0); setIsOpen(false) }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  const init = async (u) => {
    setUser(u)
    const { data } = await supabase.from('user_profiles').select('name, is_admin').eq('id', u.id).single()
    setProfile(data)
    if (!data?.is_admin) checkUnread(u.id)
  }

  // ── Open from notification click ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 250) }
    window.addEventListener('open-messenger', handler)
    return () => window.removeEventListener('open-messenger', handler)
  }, [])

  // ── Unread badge ──────────────────────────────────────────────────────────
  const checkUnread = async (uid) => {
    const { count } = await supabase.from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_from_admin', true).eq('target_user_id', uid).eq('read', false)
    setUnread(count || 0)
  }

  // ── Load thread when opened ───────────────────────────────────────────────
  const loadThread = async (uid) => {
    setLoading(true)
    const [{ data: mine }, { data: replies }] = await Promise.all([
      supabase.from('messages').select('*').eq('sender_id', uid).eq('is_from_admin', false),
      supabase.from('messages').select('*').eq('is_from_admin', true).eq('target_user_id', uid),
    ])
    const all = [...(mine || []), ...(replies || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    setThread(all)
    setLoading(false)
    setUnread(0)
    supabase.from('messages').update({ read: true })
      .eq('is_from_admin', true).eq('target_user_id', uid).eq('read', false).then()
  }

  useEffect(() => {
    if (isOpen && user && !profile?.is_admin) {
      loadThread(user.id)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen]) // eslint-disable-line

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, isOpen])

  // ── Real-time: new admin replies ──────────────────────────────────────────
  useEffect(() => {
    if (!user || profile?.is_admin) return
    const channel = supabase
      .channel(`mw-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `target_user_id=eq.${user.id}`,
      }, payload => {
        if (payload.new.is_from_admin) {
          if (isOpenRef.current) {
            setThread(prev => [...prev, payload.new])
            supabase.from('messages').update({ read: true }).eq('id', payload.new.id).then()
          } else {
            setUnread(prev => prev + 1)
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, profile]) // eslint-disable-line

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || sending || !user) return
    setSending(true)
    const content = text.trim()
    setText('')
    const { data: newMsg } = await supabase.from('messages').insert({
      sender_id: user.id,
      is_from_admin: false,
      content,
    }).select().single()
    if (newMsg) setThread(prev => [...prev, newMsg])
    // Notify admin
    await supabase.from('notifications').insert({
      user_id: ADMIN_ID,
      type: 'new_message',
      content: `Nouveau message de ${profile?.name || 'utilisateur'} : ${content.slice(0, 80)}`,
      read: false,
    })
    setSending(false)
  }

  // Don't render for admin users or unauthenticated
  if (!user || profile === null) return null
  if (profile?.is_admin) return null

  const fmtDate = d => new Date(d).toLocaleDateString('fr-MA', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <style>{css}</style>

      {/* ── Chat panel ── */}
      {isOpen && (
        <div className="mw-panel">
          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #1C2A45', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'#070C18' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#4F8EF7,#2DD4BF)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono,monospace', fontSize:'0.68rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                SG
              </div>
              <div>
                <div style={{ fontSize:'0.86rem', fontWeight:700, color:'#E2E8F0', letterSpacing:'-0.3px' }}>Saad GENIUS</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.58rem', color:'#2DD4BF', marginTop:1 }}>// Admin · 9rawZid9ra</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', padding:6, borderRadius:7, transition:'background 0.15s', display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Thread */}
          <div className="mw-thread">
            {loading && (
              <div style={{ textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568', padding:'2rem 0' }}>chargement...</div>
            )}
            {!loading && thread.length === 0 && (
              <div style={{ margin:'auto', textAlign:'center', padding:'1rem' }}>
                <div style={{ fontSize:'1.8rem', marginBottom:8 }}>👋</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4A5568' }}>// Dis bonjour à Saad GENIUS !</div>
                <div style={{ fontSize:'0.75rem', color:'#4A5568', marginTop:6, lineHeight:1.5 }}>Tu peux lui poser toutes tes questions ici.</div>
              </div>
            )}
            {thread.map(m => (
              <div key={m.id} style={{ display:'flex', justifyContent: m.is_from_admin ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth:'80%', padding:'8px 12px',
                  borderRadius: m.is_from_admin ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  background: m.is_from_admin ? '#0C1222' : 'rgba(79,142,247,0.18)',
                  border: `1px solid ${m.is_from_admin ? '#1C2A45' : 'rgba(79,142,247,0.35)'}`,
                }}>
                  {m.is_from_admin && (
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.56rem', color:'#2DD4BF', marginBottom:4 }}>Saad GENIUS</div>
                  )}
                  <div style={{ fontSize:'0.82rem', color:'#E2E8F0', lineHeight:1.52, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{m.content}</div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.55rem', color:'#4A5568', marginTop:4, textAlign: m.is_from_admin ? 'left' : 'right' }}>{fmtDate(m.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #1C2A45', display:'flex', gap:8, flexShrink:0, background:'#070C18' }}>
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Votre message..."
              maxLength={500}
              style={{ flex:1, background:'#0C1222', border:'1px solid #1C2A45', borderRadius:8, padding:'9px 12px', color:'#E2E8F0', fontSize:'0.82rem', fontFamily:'Outfit,sans-serif', outline:'none', transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor='rgba(79,142,247,0.4)'}
              onBlur={e => e.target.style.borderColor='#1C2A45'}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              style={{
                background: text.trim() && !sending ? 'linear-gradient(135deg,#4F8EF7,#3A6ED4)' : '#1C2A45',
                color: text.trim() ? '#fff' : '#4A5568',
                border: 'none', borderRadius:8, padding:'9px 13px',
                cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
                fontFamily:'Outfit,sans-serif', flexShrink:0, transition:'all 0.15s',
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

      {/* ── Toggle button ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="Contacter l'admin"
        style={{
          position:'fixed', bottom:28, right:28, zIndex:9000,
          width:52, height:52, borderRadius:'50%',
          background: isOpen ? '#0C1222' : 'linear-gradient(135deg,#4F8EF7,#2DD4BF)',
          border: isOpen ? '1px solid #2D4A7A' : 'none',
          color:'#fff', cursor:'pointer',
          boxShadow: isOpen ? 'none' : '0 8px 28px rgba(79,142,247,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s',
        }}
      >
        {isOpen ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!isOpen && unread > 0 && (
          <span style={{
            position:'absolute', top:-3, right:-3,
            background:'#F87171', color:'#fff',
            borderRadius:'50%', width:18, height:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.58rem', fontWeight:700, fontFamily:'DM Mono,monospace',
            border:'2px solid #02040A',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  )
}
