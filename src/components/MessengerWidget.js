import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { Avatar, Icon, EmptyState } from '../design-system/ui'

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'
const EXPIRY_MS = 48 * 60 * 60 * 1000 // 48 hours
const isExpired = (ts) => Date.now() - new Date(ts).getTime() > EXPIRY_MS

const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'maintenant'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}j`
}

export default function MessengerWidget() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState('inbox') // 'inbox' | 'chat'
  const [activeContact, setActiveContact] = useState(null) // { id, name }
  const [contacts, setContacts] = useState([])
  const [thread, setThread] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [rateErr, setRateErr] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)

  const navigate = useNavigate()
  const threadEndRef = useRef(null)
  const inputRef = useRef(null)
  const isOpenRef = useRef(false)
  const userRef = useRef(null)
  const activeContactRef = useRef(null)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  useEffect(() => { activeContactRef.current = activeContact }, [activeContact])
  useEffect(() => { userRef.current = user }, [user])

  // ── First-time tooltip ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const key = '9rz_msg_tooltip'
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 5000)
    }
  }, [user?.id]) // eslint-disable-line

  // ── Auth — driven by AuthContext, no local listeners ─────────────────────
  useEffect(() => {
    if (!user) {
      setProfile(null); setProfileLoaded(false)
      setThread([]); setContacts([]); setUnread(0); setIsOpen(false)
      setActiveContact(null); setView('inbox')
      setTimeout(() => setProfileLoaded(true), 50)
      return
    }
    init(user)
  }, [user?.id]) // eslint-disable-line

  const init = async (u) => {
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
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, is_read, created_at')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      const msgs = data || []
      const partnerIds = [...new Set(msgs.map(m => m.sender_id === uid ? m.receiver_id : m.sender_id))]

      const nameMap = new Map()
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles').select('id, name').in('id', partnerIds)
        for (const p of (profiles || [])) nameMap.set(p.id, p.name)
      }

      const unreadPerPartner = new Map()
      for (const m of msgs) {
        if (m.receiver_id === uid && !m.is_read) {
          unreadPerPartner.set(m.sender_id, (unreadPerPartner.get(m.sender_id) || 0) + 1)
        }
      }

      const seen = new Map()
      for (const m of msgs) {
        const partnerId = m.sender_id === uid ? m.receiver_id : m.sender_id
        if (!seen.has(partnerId)) {
          const expired = isExpired(m.created_at)
          seen.set(partnerId, {
            id: partnerId,
            name: partnerId === ADMIN_ID ? 'Support 9rawZid9ra' : (nameMap.get(partnerId) || 'Étudiant'),
            lastMsg: expired ? null : m.content,
            lastAt: m.created_at,
            unread: unreadPerPartner.get(partnerId) || 0,
            allExpired: expired,
          })
        }
      }

      if (!seen.has(ADMIN_ID)) {
        seen.set(ADMIN_ID, { id: ADMIN_ID, name: 'Support 9rawZid9ra', lastMsg: null, lastAt: null, unread: 0, allExpired: false })
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
    const since = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: recentMsgs } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('created_at', since)
    if (recentMsgs >= 20) {
      setRateErr(true)
      setTimeout(() => setRateErr(false), 4000)
      return
    }
    setSending(true)
    const content = text.trim()
    setText('')
    const { data: newMsg } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeContact.id,
      content,
    }).select().single()
    if (newMsg) setThread(prev => [...prev, newMsg])
    await supabase.from('notifications').insert({
      user_id: activeContact.id,
      actor_id: user.id,
      type: 'new_message',
      content: `${profile?.name || 'Utilisateur'} : ${content.slice(0, 80)}`,
      read: false,
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

  return (
    <>
      {isOpen && (
        <div className="qz-messenger-panel">
          <div className="qz-chat">
            <div className="qz-chat__head">
              {view === 'chat' && (
                <button type="button" className="qz-messenger-back" onClick={backToInbox} aria-label="Retour">
                  <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="right" /></span>
                </button>
              )}
              {view === 'chat' && activeContact
                ? <Avatar name={activeContact.name} size="sm" />
                : <span className="qz-icon-tile" style={{ width: 32, height: 32, background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="message" size={16} /></span>}
              <div>
                <strong>{view === 'chat' && activeContact ? activeContact.name : 'Messages'}</strong>
                {view === 'inbox' && <small className="qz-subtle" style={{ color: 'var(--text-subtle)' }}>{contacts.length} conversation{contacts.length !== 1 ? 's' : ''}</small>}
              </div>
              <button type="button" className="qz-iconbtn" style={{ marginLeft: 'auto' }} onClick={() => setIsOpen(false)} aria-label="Fermer"><Icon name="x" /></button>
            </div>

            {view === 'inbox' && (
              <div className="qz-chat__body" style={{ padding: 0 }}>
                {loading && <div style={{ textAlign: 'center', padding: '2rem 0' }}><span className="t-caption qz-subtle">Chargement…</span></div>}
                {!loading && contacts.map(c => (
                  <div key={c.id} className="qz-inbox-row" onClick={() => openContact(c)}>
                    <Avatar name={c.name} size="sm" />
                    <div className="qz-inbox-row__main">
                      <div className="qz-inbox-row__top">
                        <button
                          type="button"
                          className="qz-inbox-row__name"
                          onClick={c.id !== ADMIN_ID ? (e => { e.stopPropagation(); setIsOpen(false); navigate(`/user/${c.id}`) }) : (e => e.stopPropagation())}
                        >{c.name}</button>
                        {c.lastAt && <span className="t-mono qz-subtle" style={{ fontSize: 11 }}>{fmtAgo(c.lastAt)}</span>}
                      </div>
                      <div className={`qz-inbox-row__preview${c.allExpired ? ' qz-inbox-row__preview--expired' : ''}`}>
                        {c.allExpired ? 'Messages supprimés' : (c.lastMsg || 'Démarrer une conversation')}
                      </div>
                    </div>
                    {c.unread > 0 && <span className="qz-inbox-row__unread">{c.unread > 9 ? '9+' : c.unread}</span>}
                  </div>
                ))}
                {!loading && contacts.length <= 1 && (
                  <div style={{ padding: 'var(--space-4)' }}>
                    <EmptyState icon="message" title="Pas encore de conversation">
                      Pour envoyer un message, visite le profil d'un étudiant ou un post Senpai et clique sur Message.
                    </EmptyState>
                  </div>
                )}
              </div>
            )}

            {view === 'chat' && (
              <>
                <div className="qz-chat__body">
                  {loading && <div style={{ textAlign: 'center', padding: '2rem 0', margin: 'auto' }}><span className="t-caption qz-subtle">Chargement…</span></div>}
                  {(() => {
                    if (loading) return null
                    const visible = thread.filter(m => !isExpired(m.created_at))
                    const hasExpiredOnly = thread.length > 0 && visible.length === 0
                    if (hasExpiredOnly) {
                      return (
                        <div style={{ margin: 'auto', textAlign: 'center', padding: '1.5rem 1rem' }}>
                          <Icon name="info" />
                          <p className="t-caption qz-subtle" style={{ marginTop: 8 }}>Messages supprimés</p>
                          <p className="t-body-sm qz-muted">Les messages sont supprimés après 48 h.</p>
                        </div>
                      )
                    }
                    if (visible.length === 0) {
                      return (
                        <div style={{ margin: 'auto', textAlign: 'center', padding: '1.5rem 1rem' }}>
                          <p className="t-body-sm qz-muted">Envoie ton premier message à {activeContact?.name}</p>
                        </div>
                      )
                    }
                    return visible.map(m => (
                      <div key={m.id} className={`qz-bubble qz-bubble--${m.sender_id === user.id ? 'out' : 'in'}`}>
                        {m.content}
                        <time>{fmtDate(m.created_at)}</time>
                      </div>
                    ))
                  })()}
                  <div ref={threadEndRef} />
                </div>

                <div className="qz-chat__compose">
                  <textarea
                    ref={inputRef}
                    className="qz-input"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Écris un message…"
                    maxLength={500}
                    rows={1}
                    aria-label="Message"
                  />
                  <button type="button" className="qz-btn qz-btn--primary qz-btn--icon" onClick={sendMessage} disabled={!text.trim() || sending} aria-label="Envoyer">
                    <Icon name="send" />
                  </button>
                </div>
                {rateErr && (
                  <div style={{ margin: '0 var(--space-3) var(--space-3)' }}>
                    <span className="t-caption" style={{ color: 'var(--danger)' }}>20 messages par minute maximum. Attends un peu.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showTooltip && !isOpen && (
        <div className="qz-messenger-tooltip">
          <span className="t-body-sm qz-muted">Tu peux contacter l'admin ou tes camarades ici.</span>
        </div>
      )}

      <button
        type="button"
        className={`qz-messenger-launcher${isOpen ? ' qz-messenger-launcher--open' : ''}${hasPulse ? ' qz-pulse' : ''}`}
        onClick={() => { if (!isOpen) { setView('inbox'); loadInbox(user.id) } setIsOpen(o => !o) }}
        aria-label="Messages"
      >
        <Icon name={isOpen ? 'x' : 'message'} />
        {!isOpen && unread > 0 && <span className="qz-pip">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </>
  )
}
