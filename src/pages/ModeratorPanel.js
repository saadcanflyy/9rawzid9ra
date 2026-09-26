import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ConfirmModal from '../components/ConfirmModal'
import PanelLayout from '../components/PanelLayout'
import { Button, Input, Select, Badge, DocType, Card, EmptyState, Skeleton, StatStrip, Avatar, Banner, QualityBadge, Chip, Icon, StatusBadge } from '../design-system/ui'
import { notify } from '../design-system/toast'
import { qualityLevel, qualityChecklist, displayStatus, REPORT_REASONS } from '../lib/quality'
import { professorNameParts } from '../lib/professorName'

const css = `
  .ad-section-title { margin-bottom: var(--space-4); }
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
  .mp-mod-panel { margin-top: var(--space-2); padding: var(--space-3); background: var(--surface-2); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--space-2); max-width: 360px; }
  .mp-history-row { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
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

  // Institution aliases (staff can insert/delete directly, RLS "Staff manage institution aliases")
  const [aliasList, setAliasList] = useState([])
  const [aliasUniOptions, setAliasUniOptions] = useState([])
  const [showAddAlias, setShowAddAlias] = useState(false)
  const [newAliasText, setNewAliasText] = useState('')
  const [newAliasUni, setNewAliasUni] = useState('')
  const [newAliasFac, setNewAliasFac] = useState('')
  const [aliasFacOptions, setAliasFacOptions] = useState([])
  const [addAliasBusy, setAddAliasBusy] = useState(false)
  const [filiereReqs, setFiliereReqs] = useState([])
  const [modules,     setModules]     = useState([])
  const [users,       setUsers]       = useState([])

  // Professors
  const [professors, setProfessors] = useState([])
  const [mentorApplications, setMentorApplications] = useState([])
  const [activeMentors, setActiveMentors] = useState([])
  const [mentorReports, setMentorReports] = useState([])
  const [profUniOptions, setProfUniOptions] = useState([])
  const [verifyingProfId, setVerifyingProfId] = useState(null)
  const [verifyFirst, setVerifyFirst] = useState('')
  const [verifyLast, setVerifyLast] = useState('')
  const [verifyUni, setVerifyUni] = useState('')
  const [verifyFac, setVerifyFac] = useState('')
  const [verifyFacOptions, setVerifyFacOptions] = useState([])
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [mergingProfId, setMergingProfId] = useState(null)
  const [mergeQuery, setMergeQuery] = useState('')
  const [mergeResults, setMergeResults] = useState([])
  const [mergeTargetId, setMergeTargetId] = useState(null)
  const [mergeBusy, setMergeBusy] = useState(false)

  const [modSearch,    setModSearch]    = useState('')
  const modSearchDebounceRef = useRef(null)
  const [renamingId,   setRenamingId]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const [newModName,   setNewModName]   = useState('')
  const [newModFilId,  setNewModFilId]  = useState('')
  const [newModSem,    setNewModSem]    = useState('')

  const [modal, setModal] = useState(null)
  const showAlert = (message) => setModal({ message, confirmText: 'OK', confirmColor: '#4F8EF7', onCancel: null, onConfirm: () => setModal(null) })

  // Document moderation actions (reject / needs_review) + history
  const [modActionDocId, setModActionDocId] = useState(null)
  const [modAction, setModAction] = useState('reject')
  const [modNote, setModNote] = useState('')
  const [modBusy, setModBusy] = useState(false)
  const [showModHistory, setShowModHistory] = useState(false)
  const [modHistory, setModHistory] = useState([])
  const [modHistoryLoading, setModHistoryLoading] = useState(false)

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
    if (activeTab === 'professors') loadProfessors()
    if (activeTab === 'mentors') loadMentors()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'messages') loadMessages()
  }, [activeTab, profile]) // eslint-disable-line

  const loadStats = async () => {
    const [docs, posts, schools, filieres, mods, usrs, profsPending, mentorsPending] = await Promise.all([
      supabase.from('admin_documents').select('*', { count:'exact', head:true }).gt('report_count', 0),
      supabase.from('senpai_posts').select('*', { count:'exact', head:true }).eq('is_flagged', true),
      supabase.from('school_requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('filiere_suggestions').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('modules').select('*', { count:'exact', head:true }),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
      supabase.from('professors').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('senpai_profiles').select('*', { count:'exact', head:true }).eq('status', 'pending'),
    ])
    setStats({
      flaggedDocs:    docs.count     || 0,
      flaggedPosts:   posts.count    || 0,
      pendingSchools: schools.count  || 0,
      pendingFils:    filieres.count || 0,
      totalModules:   mods.count     || 0,
      totalUsers:     usrs.count     || 0,
      pendingProfessors: profsPending.count || 0,
      pendingMentors: mentorsPending.count || 0,
    })
  }

  const loadFlaggedDocs = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_moderation_queue', { p_limit: 50 })
    if (!error && data) {
      const ids = data.map(d => d.document_id)
      const { data: extra } = ids.length
        ? await supabase.from('documents').select('id, files, academic_year, pages_count, file_type, doc_number, professor').in('id', ids)
        : { data: [] }
      const extraMap = Object.fromEntries((extra || []).map(e => [e.id, e]))
      setFlaggedDocs(data.map(d => ({
        id: d.document_id, doc_type: d.doc_type, module_name: d.module_name, uploader_name: d.uploader_name,
        created_at: d.created_at, status: d.status, display_status: d.display_status, verification_source: d.verification_source,
        flag_reason: d.flag_reason, report_count: d.report_count,
        quality_score: d.quality_score, quality_signals: d.quality_signals, reasons: d.reasons,
        ...extraMap[d.document_id],
      })))
    } else {
      const { data: fallback } = await supabase.from('admin_documents')
        .select('id, doc_type, module_name, uploader_name, created_at, files, academic_year, pages_count, file_type, report_count, fac_name')
        .or('report_count.gt.0,is_flagged.eq.true')
        .order('report_count', { ascending: false })
        .limit(50)
      setFlaggedDocs(fallback || [])
    }
    setLoading(false)
  }

  const handleModAction = async (docId) => {
    setModBusy(true)
    const action = modAction === 'review' ? 'review' : 'reject'
    const { error } = await supabase.rpc('moderate_document', { p_document_id: docId, p_action: action, p_note: modNote.trim() || null })
    setModBusy(false)
    if (error) { notify.error(error.message); return }
    setModActionDocId(null); setModNote('')
    if (action === 'reject') setFlaggedDocs(d => d.filter(x => x.id !== docId))
    else setFlaggedDocs(d => d.map(x => x.id === docId ? { ...x, status: 'needs_review', flag_reason: modNote.trim() || x.flag_reason } : x))
    notify.success(action === 'reject' ? 'Document refusé' : 'Document marqué à revoir')
  }

  const loadModHistory = async () => {
    setModHistoryLoading(true)
    const { data: logs } = await supabase.from('moderation_log')
      .select('id, document_id, staff_id, action, note, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!logs?.length) { setModHistory([]); setModHistoryLoading(false); return }
    const docIds = [...new Set(logs.map(l => l.document_id).filter(Boolean))]
    const staffIds = [...new Set(logs.map(l => l.staff_id).filter(Boolean))]
    const [{ data: docs }, { data: staffs }] = await Promise.all([
      docIds.length ? supabase.from('documents').select('id, title, doc_number, doc_type').in('id', docIds) : Promise.resolve({ data: [] }),
      staffIds.length ? supabase.from('user_profiles').select('id, name').in('id', staffIds) : Promise.resolve({ data: [] }),
    ])
    const docMap = Object.fromEntries((docs || []).map(d => [d.id, d]))
    const staffMap = Object.fromEntries((staffs || []).map(s => [s.id, s]))
    setModHistory(logs.map(l => ({ ...l, doc: docMap[l.document_id], staffName: staffMap[l.staff_id]?.name })))
    setModHistoryLoading(false)
  }

  const toggleModHistory = () => {
    const next = !showModHistory
    setShowModHistory(next)
    if (next && modHistory.length === 0) loadModHistory()
  }

  const MOD_ACTION_LABEL = { verify: 'Vérifié', publish: 'Publié', review: 'Mis à revoir', hide: 'Mis à revoir', reject: 'Refusé', reset_reports: 'Signalements réinitialisés', move: 'Déplacé', delete: 'Supprimé' }

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
    const [{ data }, { data: aliases }, { data: unis }] = await Promise.all([
      supabase.from('school_requests')
        .select('*, user_profiles(name), universities!school_requests_parent_university_id_fkey(name)')
        .order('created_at', { ascending: false }),
      supabase.from('institution_aliases').select('*, universities(name), faculties(name)').order('id', { ascending: false }),
      aliasUniOptions.length ? Promise.resolve({ data: aliasUniOptions }) : supabase.from('universities').select('id, name').order('name'),
    ])
    setSchoolReqs(data || [])
    setAliasList(aliases || [])
    if (!aliasUniOptions.length) setAliasUniOptions(unis || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!newAliasUni) { setAliasFacOptions([]); return }
    supabase.from('faculties').select('id, name').eq('university_id', newAliasUni).neq('name', '__root__').order('name')
      .then(({ data }) => setAliasFacOptions(data || []))
  }, [newAliasUni])

  const addAlias = async () => {
    const text = newAliasText.trim()
    if (!text || !newAliasUni) { notify.error('Alias et université requis'); return }
    setAddAliasBusy(true)
    const { data: norm } = await supabase.rpc('search_norm', { p: text })
    const { error } = await supabase.from('institution_aliases').insert({
      alias_norm: norm || text.toLowerCase(),
      university_id: parseInt(newAliasUni),
      faculty_id: newAliasFac ? parseInt(newAliasFac) : null,
    })
    setAddAliasBusy(false)
    if (error) { notify.error(error.message); return }
    notify.success('Alias ajouté')
    setShowAddAlias(false); setNewAliasText(''); setNewAliasUni(''); setNewAliasFac('')
    loadSchools()
  }

  const deleteAlias = async (a) => {
    const { error } = await supabase.from('institution_aliases').delete().eq('id', a.id)
    if (error) { notify.error(error.message); return }
    setAliasList(list => list.filter(x => x.id !== a.id))
    notify.success('Alias supprimé')
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

  const loadProfessors = async () => {
    setLoading(true)
    const [{ data }, uniRes] = await Promise.all([
      supabase.rpc('get_professor_queue', { p_limit: 100 }),
      profUniOptions.length ? Promise.resolve({ data: profUniOptions }) : supabase.from('universities').select('id, name').order('name'),
    ])
    setProfessors(data || [])
    if (!profUniOptions.length) setProfUniOptions(uniRes.data || [])
    setLoading(false)
  }

  const loadMentors = async () => {
    setLoading(true)
    const [{ data: pending }, { data: active }, { data: reports }] = await Promise.all([
      supabase.rpc('get_senpai_applications', { p_status: 'pending' }),
      supabase.rpc('get_senpai_applications', { p_status: 'active' }),
      supabase.rpc('get_senpai_reports', { p_resolved: false }),
    ])
    setMentorApplications(pending || [])
    setActiveMentors(active || [])
    setMentorReports(reports || [])
    setLoading(false)
  }

  const approveMentor = async (id) => {
    const { error } = await supabase.rpc('approve_senpai', { p_id: id })
    if (error) { notify.error(error.message); return }
    notify.success('Senpai approuvé')
    loadMentors()
  }

  const rejectMentor = async (id) => {
    const { error } = await supabase.rpc('reject_senpai', { p_id: id })
    if (error) { notify.error(error.message); return }
    notify.success('Candidature refusée')
    loadMentors()
  }

  const resolveMentorReport = async (id) => {
    const { error } = await supabase.rpc('resolve_senpai_report', { p_id: id })
    if (error) { notify.error(error.message); return }
    setMentorReports(list => list.filter(r => r.id !== id))
  }

  useEffect(() => {
    if (!verifyUni) { setVerifyFacOptions([]); return }
    supabase.from('faculties').select('id, name').eq('university_id', verifyUni).neq('name', '__root__').order('name')
      .then(({ data }) => setVerifyFacOptions(data || []))
  }, [verifyUni])

  const startVerify = (p) => {
    setMergingProfId(null)
    if (verifyingProfId === p.id) { setVerifyingProfId(null); return }
    setVerifyingProfId(p.id)
    const parts = professorNameParts(p.display_name)
    setVerifyFirst(parts.firstName || '')
    setVerifyLast(parts.lastName || '')
    setVerifyUni('')
    setVerifyFac('')
  }

  const confirmVerify = async (p) => {
    setVerifyBusy(true)
    const { error } = await supabase.rpc('verify_professor', {
      p_id: p.id, p_first_name: verifyFirst.trim() || null, p_last_name: verifyLast.trim() || null,
      p_university_id: verifyUni ? parseInt(verifyUni, 10) : null, p_faculty_id: verifyFac ? parseInt(verifyFac, 10) : null,
    })
    setVerifyBusy(false)
    if (error) { notify.error(error.message); return }
    notify.success('Professeur vérifié')
    setVerifyingProfId(null)
    loadProfessors()
  }

  const startMerge = (p) => {
    setVerifyingProfId(null)
    if (mergingProfId === p.id) { setMergingProfId(null); return }
    setMergingProfId(p.id)
    setMergeQuery(''); setMergeResults([]); setMergeTargetId(null)
  }

  const searchMergeTargets = async (q, fromId) => {
    setMergeQuery(q)
    if (q.trim().length < 2) { setMergeResults([]); return }
    const { data } = await supabase.rpc('search_professors', { p_query: q.trim(), p_limit: 6 })
    setMergeResults((data || []).filter(r => r.id !== fromId))
  }

  const confirmMerge = async (p) => {
    if (!mergeTargetId) return
    setMergeBusy(true)
    const { error } = await supabase.rpc('merge_professors', { p_from: p.id, p_into: mergeTargetId })
    setMergeBusy(false)
    if (error) { notify.error(error.message); return }
    notify.success('Profils fusionnés')
    setMergingProfId(null)
    loadProfessors()
  }

  const handleRejectProfessor = (p) => {
    setModal({
      title: 'Refuser ce profil ?',
      message: `"${p.display_name}" sera refusé. Les documents garderont le nom tapé mais perdront le lien.`,
      confirmText: 'Refuser', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.rpc('reject_professor', { p_id: p.id })
        if (error) { notify.error(error.message); return }
        notify.success('Profil refusé')
        loadProfessors()
      },
    })
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_users', { p_limit: 100 })
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
    // Verification and the points it awards are now handled server-side.
    const { error } = await supabase.rpc('moderate_document', { p_document_id: id, p_action: 'verify' })
    if (error) { notify.error(error.message); return }
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
        const { error } = await supabase.rpc('moderate_document', { p_document_id: doc.id, p_action: 'delete' })
        if (error) { notify.error(error.message); return }
        setFlaggedDocs(d => d.filter(x => x.id !== doc.id))
      },
    })
  }

  const approvePost = async (id) => {
    const { error } = await supabase.rpc('staff_moderate_post', { p_post_id: id, p_action: 'approve' })
    if (error) { notify.error(error.message); return }
    setFlaggedPosts(p => p.filter(x => x.id !== id))
  }

  const deletePost = (post) => {
    setModal({
      title: 'Supprimer ce post ?',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.rpc('staff_moderate_post', { p_post_id: post.id, p_action: 'delete' })
        if (error) { notify.error(error.message); return }
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
    await supabase.rpc('staff_notify', {
      p_user: selectedConvo.id,
      p_type: 'message_reply',
      p_content: `Support 9rawZid9ra : ${content.slice(0, 80)}`,
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
    { id: 'professors', label: 'Professeurs', icon: 'user', count: stats?.pendingProfessors },
    { id: 'mentors',   label: 'Senpais de filière', icon: 'heart', count: stats?.pendingMentors },
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
    professors: ['Professeurs', 'Profils en attente de vérification.'],
    mentors: ['Senpais de filière', 'Candidatures, senpais actifs et signalements.'],
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
          <>
            {loading ? <Skeleton height={200} /> :
            flaggedDocs.length === 0 ? <EmptyState icon="flag" title="Aucun document signalé" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Document</th><th>Module</th><th>Uploadé par</th><th>Signalements</th><th>Actions</th></tr></thead>
                  <tbody>
                    {flaggedDocs.map(d => {
                      const level = d.quality_score != null ? qualityLevel(d) : null
                      const checklist = d.quality_signals ? qualityChecklist(d) : []
                      const CHECK_ICON = { yes: 'check', no: 'x' }
                      const CHECK_COLOR = { yes: 'var(--success)', no: 'var(--danger)', unknown: 'var(--text-subtle)' }
                      return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <DocType type={d.doc_type} size="lg" />
                            <div>
                              <div className="qz-table-name">{d.academic_year}</div>
                              <div className="qz-table-mono">{d.pages_count} page{d.pages_count > 1 ? 's' : ''} · {d.file_type}</div>
                              {d.status && <div style={{ marginTop: 4 }}><StatusBadge {...displayStatus(d)} /></div>}
                              {checklist.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 6 }} title={checklist.map(c => c.label).join(' · ')}>
                                  {checklist.map(c => (
                                    <span key={c.key} style={{ color: CHECK_COLOR[c.state], display: 'inline-flex' }}>
                                      {CHECK_ICON[c.state] ? <Icon name={CHECK_ICON[c.state]} size={14} /> : <span className="qz-dot" style={{ background: CHECK_COLOR.unknown }} />}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{d.module_name}</div>
                          <div className="qz-table-mono">{d.fac_name}</div>
                        </td>
                        <td className="qz-table-mono">{d.uploader_name || 'Anonyme'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            {d.reasons && Object.keys(d.reasons).length > 0 ? (
                              Object.entries(d.reasons).map(([reason, n]) => (
                                <Badge key={reason} tone="danger" icon="flag">{REPORT_REASONS.find(r => r.id === reason)?.label || reason} · {n}</Badge>
                              ))
                            ) : d.report_count > 0 ? (
                              <Badge tone="danger" icon="flag">{d.report_count} signalement{d.report_count > 1 ? 's' : ''}</Badge>
                            ) : d.flag_reason ? (
                              <Badge tone="warning" icon="alert">{d.flag_reason}</Badge>
                            ) : null}
                            {level && <QualityBadge score={d.quality_score} label={level.label} tone={level.tone} />}
                          </div>
                        </td>
                        <td>
                          <div className="qz-table-actions">
                            {d.files?.[0] && <Button as="a" href={d.files[0]} target="_blank" rel="noreferrer" variant="secondary" size="sm" icon="eye">Voir</Button>}
                            <Button variant="secondary" size="sm" icon="check" onClick={() => verifyDoc(d.id)}>{d.display_status === 'community_approved' ? 'Confirmer (Vérifié)' : 'Vérifier'}</Button>
                            <Button variant="ghost" size="sm" onClick={() => { const open = modActionDocId === d.id && modAction === 'review'; setModActionDocId(open ? null : d.id); setModAction('review'); setModNote(d.flag_reason || '') }}>À revoir</Button>
                            <Button variant="danger-ghost" size="sm" onClick={() => { const open = modActionDocId === d.id && modAction === 'reject'; setModActionDocId(open ? null : d.id); setModAction('reject'); setModNote('') }}>Refuser</Button>
                            <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deleteDoc(d)}>Supprimer</Button>
                          </div>
                          {modActionDocId === d.id && (
                            <div className="mp-mod-panel">
                              <span className="t-eyebrow qz-subtle">{modAction === 'reject' ? "Raison du refus (envoyée à l'auteur)" : 'Raison de la mise à revoir (optionnel)'}</span>
                              <Input value={modNote} onChange={e => setModNote(e.target.value)} placeholder="Ex : mauvais scan, module incorrect…" autoFocus />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button variant={modAction === 'reject' ? 'danger-ghost' : 'secondary'} size="sm" disabled={modBusy || (modAction === 'reject' && !modNote.trim())} onClick={() => handleModAction(d.id)}>{modBusy ? '...' : 'Confirmer'}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setModActionDocId(null)}>Annuler</Button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 'var(--space-6)' }}>
              <Button variant="ghost" size="sm" icon={showModHistory ? 'up' : 'down'} onClick={toggleModHistory}>Historique des actions</Button>
              {showModHistory && (
                modHistoryLoading ? <Skeleton height={100} /> :
                modHistory.length === 0 ? <p className="t-body-sm qz-muted" style={{ marginTop: 'var(--space-2)' }}>Aucune action enregistrée.</p> : (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    {modHistory.map(l => (
                      <div key={l.id} className="mp-history-row">
                        <span className="t-mono qz-subtle">{fmt(l.created_at)}</span>
                        <span className="t-body-sm">{l.staffName || 'Staff'}</span>
                        <Badge tone="neutral">{MOD_ACTION_LABEL[l.action] || l.action}</Badge>
                        <span className="t-body-sm qz-muted">{l.doc ? (l.doc.title || l.doc.doc_number || `Doc #${l.document_id}`) : `Doc #${l.document_id} (supprimé)`}</span>
                        {l.note && <span className="t-caption qz-subtle">— {l.note}</span>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
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

            <div className="ad-section-title" style={{ marginTop: 'var(--space-8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="t-eyebrow qz-subtle">Alias d'établissement</span>
              <Button variant="secondary" size="sm" icon="plus" onClick={() => setShowAddAlias(true)}>Ajouter un alias</Button>
            </div>
            {loading ? <Skeleton height={120} /> :
             aliasList.length === 0 ? <EmptyState icon="search" title="Aucun alias enregistré" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Alias</th><th>Université</th><th>Faculté</th><th>Actions</th></tr></thead>
                  <tbody>
                    {aliasList.map(a => (
                      <tr key={a.id}>
                        <td className="qz-table-mono">{a.alias_norm}</td>
                        <td>{a.universities?.name || '—'}</td>
                        <td>{a.faculties?.name || '—'}</td>
                        <td>
                          <div className="qz-table-actions">
                            <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deleteAlias(a)}>Supprimer</Button>
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

        {activeTab === 'professors' && (
          loading ? <Skeleton height={200} /> :
          professors.length === 0 ? <EmptyState icon="user" title="Aucun profil en attente" /> : (
            <div className="qz-table-wrap">
              <table className="qz-table">
                <thead><tr><th>Professeur</th><th>École</th><th>Documents</th><th>Ajouté le</th><th>Actions</th></tr></thead>
                <tbody>
                  {professors.map(p => (
                    <Fragment key={p.id}>
                      <tr>
                        <td>
                          <span className="qz-table-name">{p.display_name}</span>
                          {p.aliases?.length > 0 && <div className="qz-table-mono">{p.aliases.join(', ')}</div>}
                          {p.possible_duplicates?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {p.possible_duplicates.map(d => (
                                <Chip key={d.id} onClick={() => { startMerge(p); setMergeTargetId(d.id); setMergeQuery(d.display_name) }}>
                                  Doublon : {d.display_name}
                                </Chip>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="qz-table-mono">{p.university_name || '—'}</td>
                        <td className="qz-table-mono">{p.documents_count}</td>
                        <td className="qz-table-mono">{fmt(p.created_at)}</td>
                        <td>
                          <div className="qz-table-actions">
                            <Button variant="secondary" size="sm" icon="check" onClick={() => startVerify(p)}>Vérifier</Button>
                            <Button variant="ghost" size="sm" onClick={() => startMerge(p)}>Fusionner avec…</Button>
                            <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => handleRejectProfessor(p)}>Refuser</Button>
                          </div>
                        </td>
                      </tr>
                      {verifyingProfId === p.id && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0, background: 'var(--surface-2)' }}>
                            <div className="mp-mod-panel" style={{ maxWidth: 480, margin: 'var(--space-3) var(--space-5)' }}>
                              <span className="t-eyebrow qz-subtle">Vérifier {p.display_name}</span>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Input placeholder="Prénom" value={verifyFirst} onChange={e => setVerifyFirst(e.target.value)} style={{ maxWidth: 160 }} />
                                <Input placeholder="Nom" value={verifyLast} onChange={e => setVerifyLast(e.target.value)} style={{ maxWidth: 160 }} />
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Select value={verifyUni} onChange={e => { setVerifyUni(e.target.value); setVerifyFac('') }}
                                  options={[{ value: '', label: 'École…' }, ...profUniOptions.map(u => ({ value: u.id, label: u.name }))]} />
                                <Select value={verifyFac} onChange={e => setVerifyFac(e.target.value)} disabled={!verifyUni}
                                  options={[{ value: '', label: 'Faculté (optionnel)…' }, ...verifyFacOptions.map(f => ({ value: f.id, label: f.name }))]} />
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button variant="secondary" size="sm" disabled={verifyBusy} onClick={() => confirmVerify(p)}>{verifyBusy ? '...' : 'Confirmer (Vérifié)'}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setVerifyingProfId(null)}>Annuler</Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {mergingProfId === p.id && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0, background: 'var(--surface-2)' }}>
                            <div className="mp-mod-panel" style={{ maxWidth: 480, margin: 'var(--space-3) var(--space-5)' }}>
                              <span className="t-eyebrow qz-subtle">Fusionner avec un autre profil</span>
                              <Input placeholder="Rechercher un professeur…" value={mergeQuery} onChange={e => searchMergeTargets(e.target.value, p.id)} />
                              {mergeResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {mergeResults.map(r => (
                                    <div key={r.id} onClick={() => { setMergeTargetId(r.id); setMergeQuery(r.display_name) }}
                                      style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: mergeTargetId === r.id ? 'var(--brand-soft)' : 'var(--surface)', color: mergeTargetId === r.id ? 'var(--brand-text)' : 'var(--text-muted)' }}>
                                      {r.display_name}
                                      {r.university_name && <span className="t-mono qz-subtle" style={{ marginLeft: 6 }}>{r.university_name}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {mergeTargetId && (
                                <p className="t-caption qz-subtle">Les documents et avis de « {p.display_name} » passent sur « {mergeQuery} ».</p>
                              )}
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button variant="secondary" size="sm" disabled={!mergeTargetId || mergeBusy} onClick={() => confirmMerge(p)}>{mergeBusy ? '...' : 'Confirmer la fusion'}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setMergingProfId(null)}>Annuler</Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'mentors' && (
          loading ? <Skeleton height={200} /> : (
            <>
              {mentorReports.length > 0 && (
                <>
                  <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Signalements</span></div>
                  <div className="qz-table-wrap" style={{ marginBottom: 'var(--space-6)' }}>
                    <table className="qz-table">
                      <thead><tr><th>Senpai</th><th>Signalé par</th><th>Raison</th><th>Actions</th></tr></thead>
                      <tbody>
                        {mentorReports.map(r => (
                          <tr key={r.id}>
                            <td className="qz-table-name">{r.senpai_name}</td>
                            <td className="qz-table-mono">{r.reporter_name}</td>
                            <td>{r.reason}{r.details && <div className="t-caption qz-subtle">{r.details}</div>}</td>
                            <td><Button variant="secondary" size="sm" onClick={() => resolveMentorReport(r.id)}>Marquer résolu</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Candidatures en attente</span></div>
              {mentorApplications.length === 0 ? <EmptyState icon="heart" title="Aucune candidature en attente" /> : (
                <div className="qz-table-wrap" style={{ marginBottom: 'var(--space-6)' }}>
                  <table className="qz-table">
                    <thead><tr><th>Étudiant</th><th>Filière</th><th>Aide sur</th><th>Candidature</th><th>Actions</th></tr></thead>
                    <tbody>
                      {mentorApplications.map(m => (
                        <tr key={m.id}>
                          <td className="qz-table-name">{m.name}</td>
                          <td>{m.filiere_name}<div className="qz-table-mono">{m.university_name}</div></td>
                          <td className="qz-table-mono">{(m.help_with || []).join(', ') || '—'}</td>
                          <td className="qz-table-mono">{fmt(m.applied_at)}</td>
                          <td>
                            <div className="qz-table-actions">
                              <Button variant="secondary" size="sm" icon="check" onClick={() => approveMentor(m.id)}>Approuver</Button>
                              <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => rejectMentor(m.id)}>Refuser</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Senpais actifs ({activeMentors.length})</span></div>
              {activeMentors.length === 0 ? <EmptyState icon="heart" title="Aucun senpai actif" /> : (
                <div className="qz-table-wrap">
                  <table className="qz-table">
                    <thead><tr><th>Étudiant</th><th>Filière</th><th>Messages</th><th>« Aidé »</th></tr></thead>
                    <tbody>
                      {activeMentors.map(m => (
                        <tr key={m.id}>
                          <td className="qz-table-name">{m.name}</td>
                          <td>{m.filiere_name}<div className="qz-table-mono">{m.university_name}</div></td>
                          <td className="qz-table-mono">{m.contacts_total}</td>
                          <td className="qz-table-mono">{m.helpful_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
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
                        <span className="t-mono qz-subtle">{u.university_name || ''}</span>
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

      {showAddAlias && (
        <div className="qz-scrim" onClick={() => setShowAddAlias(false)}>
          <div className="qz-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2 className="qz-modal__title">Ajouter un alias</h2>
            <p className="qz-modal__body">Un mot-clé (acronyme, abréviation…) qui doit résoudre vers cette école ou cette faculté dans la recherche.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', margin: 'var(--space-4) 0' }}>
              <Input label="Alias" placeholder="Ex : ensa, fsr, um5…" value={newAliasText} onChange={e => setNewAliasText(e.target.value)} />
              <Select label="Université" value={newAliasUni} onChange={e => { setNewAliasUni(e.target.value); setNewAliasFac('') }}
                options={[{ value: '', label: 'Choisir…' }, ...aliasUniOptions.map(u => ({ value: u.id, label: u.name }))]} />
              <Select label="Faculté (optionnel)" value={newAliasFac} onChange={e => setNewAliasFac(e.target.value)} disabled={!newAliasUni}
                options={[{ value: '', label: 'Toute l\'université' }, ...aliasFacOptions.map(f => ({ value: f.id, label: f.name }))]} />
            </div>
            <div className="qz-modal__actions">
              <Button variant="secondary" onClick={() => setShowAddAlias(false)}>Annuler</Button>
              <Button variant="primary" disabled={!newAliasText.trim() || !newAliasUni} loading={addAliasBusy} onClick={addAlias}>Ajouter</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
