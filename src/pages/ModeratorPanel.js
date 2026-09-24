import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ConfirmModal from '../components/ConfirmModal'
import PanelLayout from '../components/PanelLayout'
import { Button, Input, Select, Badge, DocType, Card, EmptyState, Skeleton, StatStrip, Avatar, Banner } from '../design-system/ui'

const css = `
  .mp-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-4); }
  .mp-add-form { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: flex-end; margin-bottom: var(--space-5); }
  .mp-field { width: 200px; }
  .mp-search { max-width: 320px; margin-bottom: var(--space-4); }
  .mp-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .mp-post { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
  .mp-post-body { flex: 1; min-width: 0; }
  .mp-post-actions { display: flex; flex-direction: column; gap: var(--space-2); flex-shrink: 0; }
  .mp-user-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); }
  .mp-user-meta { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .mp-ban-form { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-top: var(--space-3); padding: var(--space-3); background: var(--surface-2); border-radius: var(--radius-md); }
  .mp-ban-reason { flex: 1; min-width: 160px; }
  .mp-msg-layout { display: flex; border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; height: calc(100vh - 260px); min-height: 420px; }
  .mp-msg-left { width: 280px; flex-shrink: 0; border-right: 1px solid var(--border); overflow-y: auto; background: var(--surface); }
  .mp-msg-right { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--surface); }
  .mp-msg-empty { margin: auto; }
  .mp-msg-head { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border); background: var(--surface-2); }
  .mp-msg-thread { flex: 1; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
  .mp-msg-compose { display: flex; gap: var(--space-2); padding: var(--space-3); border-top: 1px solid var(--border); flex-shrink: 0; }
  .mp-msg-compose .qz-field { flex: 1; }
  @media (max-width: 700px) {
    .mp-msg-layout { flex-direction: column; height: auto; }
    .mp-msg-left { width: 100%; max-height: 220px; border-bottom: 1px solid var(--border); }
    .mp-msg-right { min-height: 320px; }
  }
`

const TYPE_TONES = { survival_guide: 'brand', cheat_code: 'warning', timeline: 'success', red_flag: 'danger', path_review: 'accent' }
const TYPE_LABELS = { survival_guide: 'Guide de survie', cheat_code: 'Cheat Code', timeline: 'Timeline', red_flag: 'Red Flag', path_review: 'Bilan de parcours' }
const LEVEL_TONE = { Légende: 'founder', Senpai: 'accent', Contributeur: 'brand', Étudiant: 'neutral' }
const RT_LABEL = { independent: 'École indép.', faculty: 'Faculté', university_with_faculties: 'Université' }
const RT_TONE = { independent: 'brand', faculty: 'accent', university_with_faculties: 'warning' }
const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' }

export default function ModeratorPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading]     = useState(false)

  const [stats,       setStats]       = useState(null)
  const [flaggedDocs, setFlaggedDocs] = useState([])
  const [flaggedPosts,setFlaggedPosts]= useState([])
  const [schoolReqs,  setSchoolReqs]  = useState([])
  const [filiereReqs, setFiliereReqs] = useState([])
  const [modules,     setModules]     = useState([])
  const [users,       setUsers]       = useState([])

  const [modSearch,    setModSearch]    = useState('')
  const modSearchDebounceRef = useRef(null)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const [newModName,   setNewModName]   = useState('')
  const [newModFilId,  setNewModFilId]  = useState('')
  const [newModSem,    setNewModSem]    = useState('')

  const [modal, setModal] = useState(null)
  const showAlert = (message) => setModal({ message, confirmText: 'OK', confirmColor: '#4F8EF7', onCancel: null, onConfirm: () => setModal(null) })

  // Ban state
  const [banningId,  setBanningId]  = useState(null)
  const [banDuration,setBanDuration]= useState('7d')
  const [banReason,  setBanReason]  = useState('')
  const [banBusy,    setBanBusy]    = useState(false)
  const [filieresList, setFilieresList] = useState([])

  // Messages state
  const [msgConvos,      setMsgConvos]      = useState([])
  const [selectedConvo,  setSelectedConvo]  = useState(null)
  const [msgThread,      setMsgThread]      = useState([])
  const [replyText,      setReplyText]      = useState('')
  const [replySending,   setReplySending]   = useState(false)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'

  const fmt = (d) => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'2-digit' })

  useEffect(() => {
    document.title = 'Panneau Modérateur — 9rawZid9ra'
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user
      if (!u) { setAuthLoading(false); return }
      setUser(u)
      const { data: prof } = await supabase.from('user_profiles')
        .select('name, is_admin, is_moderator').eq('id', u.id).single()
      setProfile(prof)
      setAuthLoading(false)
    }
    check()
  }, [])

  useEffect(() => {
    if (!profile) return
    const allowed = profile.is_moderator || profile.is_admin
    if (!allowed) return
    if (activeTab === 'overview') loadStats()
    if (activeTab === 'documents') loadFlaggedDocs()
    if (activeTab === 'senpai') loadFlaggedPosts()
    if (activeTab === 'schools') loadSchools()
    if (activeTab === 'filieres') loadFilieres()
    if (activeTab === 'modules') loadModules()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'messages') loadMessages()
  }, [activeTab, profile]) // eslint-disable-line

  const loadStats = async () => {
    const [docs, posts, schools, filieres, mods, usrs] = await Promise.all([
      supabase.from('admin_documents').select('*', { count:'exact', head:true }).gt('report_count', 0),
      supabase.from('senpai_posts').select('*', { count:'exact', head:true }).eq('is_flagged', true),
      supabase.from('school_requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('filiere_suggestions').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('modules').select('*', { count:'exact', head:true }),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
    ])
    setStats({
      flaggedDocs:    docs.count     || 0,
      flaggedPosts:   posts.count    || 0,
      pendingSchools: schools.count  || 0,
      pendingFils:    filieres.count || 0,
      totalModules:   mods.count     || 0,
      totalUsers:     usrs.count     || 0,
    })
  }

  const loadFlaggedDocs = async () => {
    setLoading(true)
    const { data } = await supabase.from('admin_documents')
      .select('id, doc_type, module_name, uploader_name, created_at, files, academic_year, pages_count, file_type, report_count, fac_name')
      .or('report_count.gt.0,is_flagged.eq.true')
      .order('report_count', { ascending: false })
      .limit(50)
    setFlaggedDocs(data || [])
    setLoading(false)
  }

  const loadFlaggedPosts = async () => {
    setLoading(true)
    const { data } = await supabase.from('senpai_posts')
      .select('id, title, content, post_type, is_anonymous, created_at, user_profiles(name)')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false })
      .limit(50)
    setFlaggedPosts(data || [])
    setLoading(false)
  }

  const loadSchools = async () => {
    setLoading(true)
    const { data } = await supabase.from('school_requests')
      .select('*, user_profiles(name), universities!school_requests_parent_university_id_fkey(name)')
      .order('created_at', { ascending: false })
    setSchoolReqs(data || [])
    setLoading(false)
  }

  const loadFilieres = async () => {
    setLoading(true)
    const { data } = await supabase.from('filiere_suggestions')
      .select('*, user_profiles(name), faculties(name, universities(name))')
      .order('created_at', { ascending: false })
    setFiliereReqs(data || [])
    setLoading(false)
  }

  const loadModules = async () => {
    setLoading(true)
    const [{ data: mods }, { data: fils }] = await Promise.all([
      supabase.from('modules').select('*, filieres(name, total_semesters)')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('filieres').select('id, name, total_semesters').order('name'),
    ])
    setModules(mods || [])
    setFilieresList(fils || [])
    setLoading(false)
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('user_profiles')
      .select('id, name, uploads_count, points, is_admin, is_banned, banned_until, ban_reason, universities(name)')
      .order('created_at', { ascending: false }).limit(100)
    setUsers(data || [])
    setLoading(false)
  }

  const confirmBan = async (u) => {
    setBanBusy(true)
    const days = { '24h': 1, '7d': 7, '30d': 30, 'perm': null }[banDuration]
    const bannedUntil = days != null ? new Date(Date.now() + days * 86400000).toISOString() : null
    const { data: ok } = await supabase.rpc('mod_ban_user', {
      p_target_id: u.id,
      p_is_banned: true,
      p_banned_until: bannedUntil,
      p_ban_reason: banReason.trim() || null,
    })
    if (!ok) { showAlert('Erreur lors du bannissement.'); setBanBusy(false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: true, banned_until: bannedUntil, ban_reason: banReason.trim() || null } : x))
    setBanningId(null)
    setBanReason('')
    setBanBusy(false)
  }

  const unbanUser = async (id) => {
    const { data: ok } = await supabase.rpc('mod_ban_user', { p_target_id: id, p_is_banned: false, p_banned_until: null, p_ban_reason: null })
    if (!ok) { showAlert('Erreur lors du débannissement.'); return }
    setUsers(prev => prev.map(x => x.id === id ? { ...x, is_banned: false, banned_until: null, ban_reason: null } : x))
  }

  const getLevel = (pts) => pts >= 600 ? 'Légende' : pts >= 300 ? 'Senpai' : pts >= 100 ? 'Contributeur' : 'Étudiant'

  const verifyDoc = async (id) => {
    // Only award points if this was a held-for-review upload that never got
    // published/awarded (is_verified false) — a previously-published doc that
    // got reported later already earned its points at upload time.
    const { data: doc } = await supabase.from('documents').select('is_flagged, is_verified, uploader_id').eq('id', id).single()
    const wasHeldForReview = doc?.is_flagged && !doc?.is_verified
    await supabase.from('documents').update({ is_flagged: false, is_verified: true, report_count: 0 }).eq('id', id)
    if (wasHeldForReview && doc.uploader_id) {
      const { data: prof } = await supabase.from('user_profiles').select('points, uploads_count').eq('id', doc.uploader_id).single()
      await supabase.from('user_profiles').update({
        points: (prof?.points || 0) + 50,
        uploads_count: (prof?.uploads_count || 0) + 1,
      }).eq('id', doc.uploader_id)
      await supabase.from('points_log').insert({ user_id: doc.uploader_id, points: 50, reason: 'Upload approuvé après modération', document_id: id })
    }
    setFlaggedDocs(d => d.filter(x => x.id !== id))
  }

  const deleteDoc = (doc) => {
    setModal({
      title: 'Supprimer ce document ?',
      message: 'Action irréversible.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        if (doc.files?.length > 0) {
          for (const url of doc.files) {
            const path = url.split('/documents/')[1]
            if (path) await supabase.storage.from('documents').remove([path])
          }
        }
        await supabase.from('document_reactions').delete().eq('document_id', doc.id)
        await supabase.from('downloads_log').delete().eq('document_id', doc.id)
        await supabase.from('documents').delete().eq('id', doc.id)
        setFlaggedDocs(d => d.filter(x => x.id !== doc.id))
      },
    })
  }

  const approvePost = async (id) => {
    await supabase.from('senpai_posts').update({ is_flagged: false, is_approved: true }).eq('id', id)
    setFlaggedPosts(p => p.filter(x => x.id !== id))
  }

  const deletePost = (post) => {
    setModal({
      title: 'Supprimer ce post ?',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        await supabase.from('senpai_posts').delete().eq('id', post.id)
        setFlaggedPosts(p => p.filter(x => x.id !== post.id))
      },
    })
  }

  const renameMod = async (mod) => {
    if (!renameVal.trim()) return
    await supabase.from('modules').update({ name: renameVal.trim() }).eq('id', mod.id)
    setModules(m => m.map(x => x.id === mod.id ? { ...x, name: renameVal.trim() } : x))
    setRenamingId(null)
    setRenameVal('')
  }

  const addModule = async () => {
    if (!newModName.trim() || !newModFilId) return
    const { data } = await supabase.from('modules').insert({
      name: newModName.trim(),
      filiere_id: parseInt(newModFilId),
      semester: newModSem ? parseInt(newModSem) : null,
      verified: true,
    }).select('*, filieres(name, total_semesters)').single()
    if (data) {
      setModules(m => [data, ...m])
      setNewModName('')
      setNewModFilId('')
      setNewModSem('')
    }
  }

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_get_inbox')
    if (!data?.length) { setMsgConvos([]); setUnreadMsgCount(0); setLoading(false); return }
    const convos = data.map(row => ({
      id:       row.user_id,
      name:     row.username || 'Anonyme',
      unread:   Number(row.unread_count) || 0,
      lastMsg:  row.last_message,
      lastDate: row.last_message_time,
    }))
    setMsgConvos(convos)
    setUnreadMsgCount(convos.reduce((s, c) => s + c.unread, 0))
    setLoading(false)
  }

  const loadThread = async (conv) => {
    setSelectedConvo(conv)
    setMsgThread([])
    const { data } = await supabase.rpc('admin_get_thread', { p_user_id: conv.id })
    setMsgThread(data || [])
    await supabase.rpc('admin_get_inbox').then()
    setMsgConvos(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))
    setUnreadMsgCount(prev => Math.max(0, prev - (conv.unread || 0)))
  }

  const sendReply = async () => {
    if (!replyText.trim() || replySending || !selectedConvo) return
    setReplySending(true)
    const content = replyText.trim()
    setReplyText('')
    await supabase.rpc('mod_send_message', { p_receiver_id: selectedConvo.id, p_content: content })
    const { data } = await supabase.rpc('admin_get_thread', { p_user_id: selectedConvo.id })
    setMsgThread(data || [])
    await supabase.from('notifications').insert({
      user_id: selectedConvo.id,
      type:    'message_reply',
      content: `Support 9rawZid9ra : ${content.slice(0, 80)}`,
      read:    false,
    })
    setReplySending(false)
  }

  const searchMods = async (q) => {
    if (q.length < 2) { loadModules(); return }
    const { data } = await supabase.from('modules')
      .select('*, filieres(name, total_semesters)')
      .ilike('name', `%${q}%`).limit(50)
    setModules(data || [])
  }

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="t-mono qz-subtle">Chargement…</span></div>
  }

  if (!user || !profile || (!profile.is_moderator && !profile.is_admin)) {
    return <div><style>{css}</style><PanelLayout denied /></div>
  }

  const TABS = [
    { id: 'overview',  label: "Vue d'ensemble", icon: 'monitor' },
    { id: 'documents', label: 'Documents signalés', icon: 'flag', count: stats?.flaggedDocs },
    { id: 'senpai',    label: 'Senpai Zone', icon: 'message', count: stats?.flaggedPosts },
    { id: 'schools',   label: 'Écoles', icon: 'shield', count: stats?.pendingSchools },
    { id: 'filieres',  label: 'Filières', icon: 'file', count: stats?.pendingFils },
    { id: 'modules',   label: 'Modules', icon: 'bookmark' },
    { id: 'users',     label: 'Utilisateurs', icon: 'user' },
    { id: 'messages',  label: 'Messages', icon: 'inbox', count: unreadMsgCount },
  ]

  const TITLES = {
    overview: ["Vue d'ensemble", 'Ce qui a besoin de ton attention.'],
    documents: ['Documents signalés', 'Vérifie ou supprime les documents signalés par la communauté.'],
    senpai: ['Senpai Zone', 'Posts signalés en attente de modération.'],
    schools: ['Écoles', "Demandes d'ajout — lecture seule."],
    filieres: ['Filières', "Demandes d'ajout — lecture seule."],
    modules: ['Modules', 'Ajoute, renomme ou recherche un module.'],
    users: ['Utilisateurs', 'Gère les bannissements.'],
    messages: ['Messages', 'Réponds aux utilisateurs.'],
  }

  return (
    <div>
      <style>{css}</style>
      <PanelLayout
        role="moderator"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={profile?.name}
        title={TITLES[activeTab]?.[0]}
        subtitle={TITLES[activeTab]?.[1]}
      >
        {activeTab === 'overview' && (
          <>
            <StatStrip items={[
              { value: stats?.flaggedDocs ?? '—', label: 'Docs signalés' },
              { value: stats?.flaggedPosts ?? '—', label: 'Posts signalés' },
              { value: stats?.pendingSchools ?? '—', label: 'Écoles en attente' },
              { value: stats?.pendingFils ?? '—', label: 'Filières en attente' },
              { value: stats?.totalModules ?? '—', label: 'Modules total' },
              { value: stats?.totalUsers ?? '—', label: 'Utilisateurs' },
            ]} />
            {(stats?.flaggedDocs > 0 || stats?.flaggedPosts > 0 || stats?.pendingSchools > 0 || stats?.pendingFils > 0) && (
              <div className="mp-actions">
                {stats?.flaggedDocs > 0 && <Button variant="danger-ghost" icon="flag" onClick={() => setActiveTab('documents')}>{stats.flaggedDocs} doc{stats.flaggedDocs > 1 ? 's' : ''} signalé{stats.flaggedDocs > 1 ? 's' : ''}</Button>}
                {stats?.flaggedPosts > 0 && <Button variant="danger-ghost" icon="flag" onClick={() => setActiveTab('senpai')}>{stats.flaggedPosts} post{stats.flaggedPosts > 1 ? 's' : ''} signalé{stats.flaggedPosts > 1 ? 's' : ''}</Button>}
                {stats?.pendingSchools > 0 && <Button variant="secondary" onClick={() => setActiveTab('schools')}>Voir {stats.pendingSchools} école{stats.pendingSchools > 1 ? 's' : ''}</Button>}
                {stats?.pendingFils > 0 && <Button variant="secondary" onClick={() => setActiveTab('filieres')}>Voir {stats.pendingFils} filière{stats.pendingFils > 1 ? 's' : ''}</Button>}
              </div>
            )}
          </>
        )}

        {activeTab === 'documents' && (
          loading ? <Skeleton height={200} /> :
          flaggedDocs.length === 0 ? <EmptyState icon="flag" title="Aucun document signalé" /> : (
            <div className="qz-table-wrap">
              <table className="qz-table">
                <thead><tr><th>Document</th><th>Module</th><th>Uploadé par</th><th>Signalements</th><th>Actions</th></tr></thead>
                <tbody>
                  {flaggedDocs.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <DocType type={d.doc_type} size="lg" />
                          <div>
                            <div className="qz-table-name">{d.academic_year}</div>
                            <div className="qz-table-mono">{d.pages_count} page{d.pages_count > 1 ? 's' : ''} · {d.file_type}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{d.module_name}</div>
                        <div className="qz-table-mono">{d.fac_name}</div>
                      </td>
                      <td className="qz-table-mono">{d.uploader_name || 'Anonyme'}</td>
                      <td>
                        {d.report_count > 0 ? (
                          <Badge tone="danger" icon="flag">{d.report_count} signalement{d.report_count > 1 ? 's' : ''}</Badge>
                        ) : d.flag_reason ? (
                          <Badge tone="warning" icon="alert">{d.flag_reason}</Badge>
                        ) : null}
                      </td>
                      <td>
                        <div className="qz-table-actions">
                          {d.files?.[0] && <Button as="a" href={d.files[0]} target="_blank" rel="noreferrer" variant="secondary" size="sm" icon="eye">Voir</Button>}
                          <Button variant="secondary" size="sm" icon="check" onClick={() => verifyDoc(d.id)}>Vérifier</Button>
                          <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deleteDoc(d)}>Supprimer</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'senpai' && (
          loading ? <Skeleton height={200} /> :
          flaggedPosts.length === 0 ? <EmptyState icon="message" title="Aucun post signalé" /> : (
            <div className="mp-list">
              {flaggedPosts.map(post => (
                <Card key={post.id} style={{ borderColor: 'var(--danger)' }}>
                  <div className="mp-post">
                    <div className="mp-post-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                        <Badge tone={TYPE_TONES[post.post_type] || 'neutral'}>{TYPE_LABELS[post.post_type] || post.post_type}</Badge>
                        {post.is_anonymous && <Badge>Anonyme</Badge>}
                      </div>
                      <h3 className="t-h3" style={{ marginBottom: 4 }}>{post.title}</h3>
                      <p className="t-body-sm qz-muted" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 'var(--space-2)' }}>{post.content}</p>
                      <span className="t-mono qz-subtle">Par : {post.user_profiles?.name || '—'} · {fmt(post.created_at)}</span>
                    </div>
                    <div className="mp-post-actions">
                      <Button variant="secondary" size="sm" icon="check" onClick={() => approvePost(post.id)}>Approuver</Button>
                      <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deletePost(post)}>Supprimer</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === 'schools' && (
          <>
            <Banner>Lecture seule — les approbations sont réservées à l'admin.</Banner>
            <div style={{ height: 'var(--space-4)' }} />
            {loading ? <Skeleton height={200} /> :
             schoolReqs.length === 0 ? <EmptyState icon="shield" title="Aucune demande d'école" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Établissement</th><th>Type</th><th>Demandé par</th><th>Statut</th></tr></thead>
                  <tbody>
                    {schoolReqs.map(s => {
                      const rt = s.request_type || 'independent'
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="qz-table-name">{s.school_name}</div>
                            {s.city && <div className="qz-table-mono">{s.city}</div>}
                          </td>
                          <td><Badge tone={RT_TONE[rt]}>{RT_LABEL[rt]}</Badge></td>
                          <td>
                            <div className="qz-table-name">{s.user_profiles?.name || '—'}</div>
                            <div className="qz-table-mono">{fmt(s.created_at)}</div>
                          </td>
                          <td><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'filieres' && (
          <>
            <Banner>Lecture seule — les approbations sont réservées à l'admin.</Banner>
            <div style={{ height: 'var(--space-4)' }} />
            {loading ? <Skeleton height={200} /> :
             filiereReqs.length === 0 ? <EmptyState icon="file" title="Aucune demande de filière" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Filière</th><th>Faculté / Université</th><th>Semestres</th><th>Demandé par</th><th>Statut</th></tr></thead>
                  <tbody>
                    {filiereReqs.map(f => (
                      <tr key={f.id}>
                        <td><div className="qz-table-name">{f.name}</div></td>
                        <td>
                          <div>{f.faculties?.name || '—'}</div>
                          <div className="qz-table-mono">{f.faculties?.universities?.name || '—'}</div>
                        </td>
                        <td className="qz-table-mono">{f.total_semesters ?? '—'}</td>
                        <td>
                          <div className="qz-table-name">{f.user_profiles?.name || '—'}</div>
                          <div className="qz-table-mono">{fmt(f.created_at)}</div>
                        </td>
                        <td><Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'modules' && (
          <>
            <div className="mp-add-form">
              <div className="mp-field"><Input label="Nom du module" placeholder="Ex: Analyse 2" value={newModName} onChange={e => setNewModName(e.target.value)} /></div>
              <div className="mp-field">
                <Select label="Filière" value={newModFilId} onChange={e => setNewModFilId(e.target.value)}
                  options={[{ value: '', label: '— Choisir —' }, ...filieresList.map(f => ({ value: f.id, label: f.name + (f.total_semesters ? ` (${f.total_semesters}S)` : '') }))]} />
              </div>
              <div style={{ width: 100 }}><Input label="Semestre" type="number" min="1" max="12" placeholder="S?" value={newModSem} onChange={e => setNewModSem(e.target.value)} /></div>
              <Button variant="primary" icon="plus" onClick={addModule} disabled={!newModName.trim() || !newModFilId}>Ajouter</Button>
            </div>

            <div className="mp-search">
              <Input placeholder="Rechercher un module..." value={modSearch}
                onChange={e => { const v = e.target.value; setModSearch(v); clearTimeout(modSearchDebounceRef.current); modSearchDebounceRef.current = setTimeout(() => searchMods(v), 500) }} />
            </div>

            {loading ? <Skeleton height={200} /> :
             modules.length === 0 ? <EmptyState icon="bookmark" title="Aucun module trouvé" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Module</th><th>Filière</th><th>Semestre</th><th>Actions</th></tr></thead>
                  <tbody>
                    {modules.map(m => (
                      <tr key={m.id}>
                        <td>
                          {renamingId === m.id ? (
                            <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} placeholder="Nouveau nom..." />
                          ) : (
                            <span className="qz-table-name">{m.name}</span>
                          )}
                        </td>
                        <td>
                          <div>{m.filieres?.name || '—'}</div>
                          <div className="qz-table-mono">{m.filieres?.faculties?.universities?.name || '—'}</div>
                        </td>
                        <td className="qz-table-mono">{m.semester ?? '—'}</td>
                        <td>
                          <div className="qz-table-actions">
                            {renamingId === m.id ? (
                              <>
                                <Button variant="secondary" size="sm" icon="check" onClick={() => renameMod(m)}>Sauvegarder</Button>
                                <Button variant="ghost" size="sm" onClick={() => { setRenamingId(null); setRenameVal('') }}>Annuler</Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => { setRenamingId(m.id); setRenameVal(m.name) }}>Renommer</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          loading ? <Skeleton height={200} /> :
          users.length === 0 ? <EmptyState icon="user" title="Aucun utilisateur" /> : (
            <div className="mp-list">
              {users.map(u => {
                const isBanning = banningId === u.id
                const level = getLevel(u.points || 0)
                return (
                  <Card key={u.id} style={u.is_banned ? { borderColor: 'var(--danger)' } : undefined}>
                    <div className="mp-user-row">
                      <div className="mp-user-meta">
                        <span className="t-label">{u.name || 'Sans nom'}</span>
                        <Badge tone={LEVEL_TONE[level]}>{level}</Badge>
                        <span className="t-mono qz-subtle">{u.universities?.name || ''}</span>
                        <span className="t-mono qz-subtle">{u.uploads_count || 0} docs · {u.points || 0} pts</span>
                        {u.is_banned && <Badge tone="danger">Banni</Badge>}
                      </div>
                      <div className="qz-table-actions">
                        {u.is_admin
                          ? <span className="t-mono qz-subtle">admin</span>
                          : u.is_banned
                            ? <Button variant="secondary" size="sm" onClick={() => unbanUser(u.id)}>Débannir</Button>
                            : <Button variant="danger-ghost" size="sm" onClick={() => { setBanningId(isBanning ? null : u.id); setBanReason('') }}>{isBanning ? 'Annuler' : 'Bannir'}</Button>}
                      </div>
                    </div>
                    {u.is_banned && u.ban_reason && (
                      <p className="t-body-sm" style={{ color: 'var(--danger)', marginTop: 'var(--space-2)' }}>
                        Raison : {u.ban_reason} {u.banned_until ? `· jusqu'au ${new Date(u.banned_until).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' })}` : '· permanent'}
                      </p>
                    )}
                    {isBanning && (
                      <div className="mp-ban-form">
                        <Select value={banDuration} onChange={e => setBanDuration(e.target.value)} options={[
                          { value: '24h', label: '24 heures' }, { value: '7d', label: '7 jours' }, { value: '30d', label: '30 jours' }, { value: 'perm', label: 'Permanent' },
                        ]} />
                        <div className="mp-ban-reason"><Input placeholder="Raison (optionnel)" value={banReason} onChange={e => setBanReason(e.target.value)} /></div>
                        <Button variant="danger-ghost" disabled={banBusy} onClick={() => confirmBan(u)}>{banBusy ? '...' : 'Confirmer le bannissement'}</Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )
        )}

        {activeTab === 'messages' && (
          loading ? <Skeleton height={200} /> : (
            <div className="mp-msg-layout">
              <div className="mp-msg-left">
                <div className="t-eyebrow qz-subtle" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>Conversations</div>
                {msgConvos.length === 0 && <div style={{ padding: 'var(--space-8) var(--space-4)' }}><EmptyState icon="inbox" title="Aucun message" /></div>}
                {msgConvos.map(c => (
                  <div key={c.id} className="qz-inbox-row" onClick={() => loadThread(c)} style={{ background: selectedConvo?.id === c.id ? 'var(--surface-2)' : undefined }}>
                    <Avatar name={c.name} size="sm" />
                    <div className="qz-inbox-row__main">
                      <div className="qz-inbox-row__top">
                        <span className="qz-inbox-row__name">{c.name}</span>
                        {c.unread > 0 && <span className="qz-inbox-row__unread">{c.unread}</span>}
                      </div>
                      <p className="qz-inbox-row__preview">{c.lastMsg?.slice(0, 42) || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mp-msg-right">
                {!selectedConvo ? (
                  <div className="mp-msg-empty"><span className="t-mono qz-subtle">Sélectionne une conversation</span></div>
                ) : (
                  <>
                    <div className="mp-msg-head"><span className="t-eyebrow qz-subtle">{selectedConvo.name}</span></div>
                    <div className="qz-chat__body mp-msg-thread">
                      {msgThread.length === 0 && <span className="t-mono qz-subtle" style={{ margin: 'auto' }}>Chargement…</span>}
                      {msgThread.map(m => {
                        const fromSupport = m.sender_id === ADMIN_ID
                        return (
                          <div key={m.id} style={{ display: 'flex', justifyContent: fromSupport ? 'flex-end' : 'flex-start' }}>
                            <div className={`qz-bubble qz-bubble--${fromSupport ? 'out' : 'in'}`}>
                              {fromSupport && <div className="t-caption qz-subtle" style={{ marginBottom: 4 }}>Support 9rawZid9ra</div>}
                              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                              <time>{fmt(m.created_at)}</time>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mp-msg-compose">
                      <Input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                        placeholder="Répondre (envoyé en tant que Support)..."
                      />
                      <Button variant="primary" icon="send" iconOnly aria-label="Envoyer" onClick={sendReply} disabled={!replyText.trim() || replySending} loading={replySending} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </PanelLayout>

      {modal && <ConfirmModal {...modal} onCancel={modal.onCancel !== undefined ? modal.onCancel : () => setModal(null)} />}
    </div>
  )
}
