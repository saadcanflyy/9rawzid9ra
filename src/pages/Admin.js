import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '../supabase'
import ConfirmModal from '../components/ConfirmModal'
import PanelLayout from '../components/PanelLayout'
import { Button, Input, Select, Badge, Chip, DocType, Card, EmptyState, Skeleton, StatStrip, Avatar, ProgressBar, Icon, QualityBadge } from '../design-system/ui'
import { notify } from '../design-system/toast'
import { STATUS, qualityLevel, REPORT_REASONS } from '../lib/quality'
import { formatPoints } from '../lib/reputation'
import { professorNameParts } from '../lib/professorName'

const css = `
  .ad-announce { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-6); }
  .ad-announce-row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .ad-section { margin-bottom: var(--space-8); }
  .ad-section-title { margin-bottom: var(--space-4); }
  .ad-cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
  .ad-feed { display: flex; flex-direction: column; gap: var(--space-2); }
  .ad-feed-item { display: flex; align-items: center; gap: var(--space-3); background: var(--surface-2); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); }
  .ad-feed-main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ad-filters { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); flex-wrap: wrap; }
  .ad-move-panel { margin-top: var(--space-2); padding: var(--space-3); background: var(--surface-2); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--space-2); }
  .ad-history-row { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
  .ad-move-result { padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; }
  .ad-ban-form { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-top: var(--space-3); padding: var(--space-3); background: var(--surface-2); border-radius: var(--radius-md); }
  .ad-ban-reason { flex: 1; min-width: 160px; }
  .ad-list { display: flex; flex-direction: column; gap: var(--space-3); }
  .ad-post { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
  .ad-post-body { flex: 1; min-width: 0; }
  .ad-charts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-8); }
  .ad-chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-5); }
  .ad-bars { display: flex; align-items: flex-end; gap: 3px; height: 60px; }
  .ad-bar { flex: 1; background: var(--brand); border-radius: 2px 2px 0 0; opacity: .75; min-height: 2px; }
  .ad-rank-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
  .ad-rank-num { font-family: var(--font-mono); font-size: 12px; color: var(--text-subtle); width: 22px; text-align: right; flex-shrink: 0; }
  .ad-rank-body { flex: 1; min-width: 0; }
  .ad-rank-top { display: flex; justify-content: space-between; gap: var(--space-2); margin-bottom: 4px; }
  .ad-rank-name { font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ad-rank-val { font-family: var(--font-mono); font-size: 12px; color: var(--brand-text); flex-shrink: 0; }
  .ad-user-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .ad-msg-layout { display: flex; border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; height: calc(100vh - 260px); min-height: 420px; }
  .ad-msg-left { width: 280px; flex-shrink: 0; border-right: 1px solid var(--border); overflow-y: auto; background: var(--surface); }
  .ad-msg-right { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--surface); }
  .ad-msg-empty { margin: auto; }
  .ad-msg-head { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border); background: var(--surface-2); }
  .ad-msg-thread { flex: 1; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
  .ad-msg-compose { display: flex; gap: var(--space-2); padding: var(--space-3); border-top: 1px solid var(--border); flex-shrink: 0; }
  .ad-msg-compose .qz-field { flex: 1; }
  @media (max-width: 900px) {
    .ad-cols, .ad-charts { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .ad-msg-layout { flex-direction: column; height: auto; }
    .ad-msg-left { width: 100%; max-height: 220px; border-bottom: 1px solid var(--border); }
    .ad-msg-right { min-height: 320px; }
  }
`

const TYPE_TONES = { survival_guide: 'brand', cheat_code: 'warning', timeline: 'success', red_flag: 'danger', path_review: 'accent' }
const TYPE_LABELS = { survival_guide: 'Guide de survie', cheat_code: 'Cheat Code', timeline: 'Timeline', red_flag: 'Red Flag', path_review: 'Bilan de parcours' }
const LEVEL_TONE = { Légende: 'founder', Senpai: 'accent', Contributeur: 'brand', Étudiant: 'neutral' }
const DOC_LABELS = { cours: 'Cours', td: 'TD', tp: 'TP', exam: 'Exam', résumé: 'Résumé', autre: 'Autre' }
const FEED_LABEL = { document: 'Doc', school: 'École', filiere: 'Filière', module: 'Module' }
const FEED_TONE = { document: 'success', school: 'brand', filiere: 'accent', module: 'warning' }

const getLevel = (pts) => pts >= 600 ? 'Légende' : pts >= 300 ? 'Senpai' : pts >= 100 ? 'Contributeur' : 'Étudiant'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // Data
  const [stats,        setStats]        = useState(null)
  const [pendingDocs,  setPendingDocs]  = useState([])
  const [pendingMods,  setPendingMods]  = useState([])
  const [uniList,      setUniList]      = useState([])
  const [facList,      setFacList]      = useState([])
  const [filiereList,  setFiliereList]  = useState([])

  // Professors
  const [professors, setProfessors] = useState([])
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
  const [renamingUni,  setRenamingUni]  = useState(null)
  const [renameUniV,   setRenameUniV]   = useState('')
  const [renamingFac,  setRenamingFac]  = useState(null)
  const [renameFacV,   setRenameFacV]   = useState('')
  const [renamingFil,  setRenamingFil]  = useState(null)
  const [renameFilV,   setRenameFilV]   = useState('')
  const [users,        setUsers]        = useState([])
  const [topUsers,     setTopUsers]     = useState([])
  const [activityFeed, setActivityFeed] = useState([])
  const [flaggedPosts, setFlaggedPosts] = useState([])

  // Doc filter
  const [docFilter, setDocFilter] = useState('all')

  // Document moderation actions (reject / needs_review / publish) + history
  const [modActionDocId, setModActionDocId] = useState(null)
  const [modAction, setModAction] = useState('reject')
  const [modNote, setModNote] = useState('')
  const [modBusy, setModBusy] = useState(false)
  const [showModHistory, setShowModHistory] = useState(false)
  const [modHistory, setModHistory] = useState([])
  const [modHistoryLoading, setModHistoryLoading] = useState(false)

  // Move document state
  const [movingDocId,   setMovingDocId]   = useState(null)
  const [moveSearch,    setMoveSearch]    = useState('')
  const moveDebounceRef = useRef(null)
  const [moveResults,   setMoveResults]   = useState([])
  const [moveSelId,     setMoveSelId]     = useState(null)
  const [moveBusy,      setMoveBusy]      = useState(false)

  // Messages tab
  const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'
  const [msgSenders,        setMsgSenders]        = useState([])
  const [selectedMsgUser,   setSelectedMsgUser]   = useState(null)
  const selectedMsgUserRef                        = useRef(null)
  const [msgThread,         setMsgThread]         = useState([])
  const [replyText,         setReplyText]         = useState('')
  const [replySending,      setReplySending]      = useState(false)
  const [unreadMsgCount,    setUnreadMsgCount]    = useState(0)

  // Analytics tab
  const [analytics,       setAnalytics]       = useState(null)
  const [expandedContrib, setExpandedContrib] = useState(null)
  const [contribDocs,     setContribDocs]     = useState({})
  const [contribLoading,  setContribLoading]  = useState(null)

  // Announcement
  const [annText,       setAnnText]       = useState('')
  const [annSending,    setAnnSending]    = useState(false)
  const [annResult,     setAnnResult]     = useState(null)

  // Ban inline form
  const [banningId,     setBanningId]     = useState(null)
  const [banDuration,   setBanDuration]   = useState('7d')
  const [banReason,     setBanReason]     = useState('')
  const [banBusy,       setBanBusy]       = useState(false)

  // Manual reputation adjustment
  const [adjustingId, setAdjustingId] = useState(null)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustBusy, setAdjustBusy] = useState(false)

  const [modal, setModal] = useState(null)
  // Alert = single OK button (onCancel:null). Confirm = with cancel (onCancel omitted → render adds it).
  const showAlert = (message) => setModal({ message, confirmText: 'OK', confirmColor: '#4F8EF7', onCancel: null, onConfirm: () => setModal(null) })

  // Rename state
  const [renamingId,  setRenamingId]  = useState(null)
  const [renameVal,   setRenameVal]   = useState('')

  // Auth check
  useEffect(() => {
    document.title = 'Panneau Admin — 9rawZid9ra'
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setAuthLoading(false); return }
      setUser(user)
      const { data: profile } = await supabase.from('user_profiles').select('is_admin').eq('id', user.id).single()
      setIsAdmin(profile?.is_admin === true)
      setAuthLoading(false)
    }
    check()
  }, [])

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'overview') loadStats()
    if (activeTab === 'documents') loadDocs(docFilter)
    if (activeTab === 'modules') loadMods()
    if (activeTab === 'schools') loadSchools()
    if (activeTab === 'filieres') loadFilieres()
    if (activeTab === 'professors') loadProfessors()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'senpai') loadSenpai()
    if (activeTab === 'messages') loadMessages()
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, isAdmin]) // eslint-disable-line

  // Reload docs when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === 'documents') loadDocs(docFilter)
  }, [docFilter]) // eslint-disable-line

  const loadStats = async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [docs, mods, schools, usrs, docsMonth, docsLastMonth, usrsMonth, top10, flagged, filieres_sug,
           feedDocs, feedSchools, feedFils, feedModSugs, profsPending] = await Promise.all([
      supabase.from('documents').select('*', { count:'exact', head:true }),
      supabase.from('modules').select('*', { count:'exact', head:true }).eq('verified', false),
      supabase.from('school_requests').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
      supabase.from('documents').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
      supabase.from('documents').select('*', { count:'exact', head:true }).gte('created_at', lastMonthStart).lt('created_at', monthStart),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }).gte('created_at', monthStart),
      supabase.from('user_profiles').select('id, name, email, points, uploads_count').order('points', { ascending: false }).limit(10),
      supabase.from('senpai_posts').select('*', { count:'exact', head:true }).eq('is_approved', false),
      supabase.from('filiere_suggestions').select('*', { count:'exact', head:true }).eq('status', 'pending'),
      supabase.from('admin_documents').select('id, doc_type, module_name, uploader_name, created_at, academic_year').order('created_at', { ascending: false }).limit(8),
      supabase.from('school_requests').select('id, school_name, created_at, user_profiles(name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('filiere_suggestions').select('id, filiere_name, created_at, user_profiles(name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('modules').select('id, name, created_at').eq('verified', false).order('created_at', { ascending: false }).limit(6),
      supabase.from('professors').select('*', { count:'exact', head:true }).eq('status', 'pending'),
    ])
    setStats({
      pendingDocs:      docs.count         || 0,
      pendingMods:      mods.count         || 0,
      pendingSchools:   schools.count      || 0,
      totalUsers:       usrs.count         || 0,
      docsThisMonth:    docsMonth.count    || 0,
      docsLastMonth:    docsLastMonth.count|| 0,
      usersThisMonth:   usrsMonth.count    || 0,
      flaggedPosts:     flagged.count      || 0,
      pendingFilieres:  filieres_sug.count || 0,
      pendingProfessors: profsPending.count || 0,
    })
    setTopUsers(top10.data || [])

    const combined = [
      ...(feedDocs.data || []).map(d => ({ type:'document', label: d.module_name || 'Doc', sub: `${d.doc_type?.toUpperCase() || ''}${d.academic_year ? ' · '+d.academic_year : ''} · par ${d.uploader_name || 'Anonyme'}`, created_at: d.created_at })),
      ...(feedSchools.data || []).map(s => ({ type:'school', label: s.school_name || 'École', sub: `par ${s.user_profiles?.name || 'Anonyme'}`, created_at: s.created_at })),
      ...(feedFils.data || []).map(f => ({ type:'filiere', label: f.filiere_name || 'Filière', sub: `par ${f.user_profiles?.name || 'Anonyme'}`, created_at: f.created_at })),
      ...(feedModSugs.data || []).map(m => ({ type:'module', label: m.name || 'Module', sub: 'En attente de vérif', created_at: m.created_at })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)
    setActivityFeed(combined)
  }

  const loadDocs = async (filter) => {
    setLoading(true)
    const f = filter ?? docFilter
    if (f === 'reported') {
      const { data, error } = await supabase.rpc('get_moderation_queue', { p_limit: 100 })
      if (!error && data) {
        const ids = data.map(d => d.document_id)
        const { data: extra } = ids.length
          ? await supabase.from('documents').select('id, files, academic_year, pages_count, file_type, doc_number, professor').in('id', ids)
          : { data: [] }
        const extraMap = Object.fromEntries((extra || []).map(e => [e.id, e]))
        setPendingDocs(data.map(d => ({
          id: d.document_id, doc_type: d.doc_type, module_name: d.module_name, uploader_name: d.uploader_name,
          created_at: d.created_at, status: d.status, flag_reason: d.flag_reason, report_count: d.report_count,
          quality_score: d.quality_score, reasons: d.reasons,
          ...extraMap[d.document_id],
        })))
        setLoading(false)
        return
      }
    }
    let q = supabase.from('admin_documents').select('*')
    if (f === 'reported') q = q.gt('report_count', 0).order('report_count', { ascending: false })
    else if (f === 'recent') q = q.order('created_at', { ascending: false })
    else q = q.order('created_at', { ascending: false })
    const { data } = await q.limit(100)
    setPendingDocs(data || [])
    setLoading(false)
  }

  const loadMods = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('modules')
      .select('*, filieres(name, faculties(name, universities(name)))')
      .order('created_at', { ascending: false })
      .limit(100)
    setPendingMods(data || [])
    setLoading(false)
  }

  const loadSchools = async () => {
    setLoading(true)
    const [{ data: unis }, { data: facs }] = await Promise.all([
      supabase.from('universities').select('*').order('created_at', { ascending: false }),
      supabase.from('faculties').select('*, universities(name)').order('created_at', { ascending: false }),
    ])
    setUniList(unis || [])
    setFacList(facs || [])
    setLoading(false)
  }

  const loadFilieres = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('filieres')
      .select('*, faculties(name, universities(name))')
      .order('created_at', { ascending: false })
    setFiliereList(data || [])
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

  const loadSenpai = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('senpai_posts')
      .select('*, user_profiles(name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setFlaggedPosts(data || [])
    setLoading(false)
  }

  const deletePost = (post) => {
    setModal({
      title: 'Supprimer ce post ?',
      message: `Post de "${post.user_profiles?.name || 'Anonyme'}"`,
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.rpc('staff_moderate_post', { p_post_id: post.id, p_action: 'delete' })
        if (error) { notify.error(error.message); return }
        setFlaggedPosts(ps => ps.filter(p => p.id !== post.id))
      },
    })
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false }).limit(100)
    setUsers(data || [])
    setLoading(false)
  }

  // Actions
  const verifyDoc = async (id) => {
    // Verification and the points it awards are now handled server-side.
    const { error } = await supabase.rpc('moderate_document', { p_document_id: id, p_action: 'verify' })
    if (error) { notify.error(error.message); return }
    setPendingDocs(d => d.filter(x => x.id !== id))
  }

  const handleDeleteDoc = (doc) => {
    setModal({
      title: 'Supprimer définitivement ?',
      message: "Le fichier sera supprimé du stockage et les points de l'uploader seront déduits.",
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
        setPendingDocs(d => d.filter(x => x.id !== doc.id))
      },
    })
  }

  const handleIgnoreReports = async (docId) => {
    const { error } = await supabase.rpc('moderate_document', { p_document_id: docId, p_action: 'reset_reports' })
    if (error) { notify.error(error.message); return }
    setPendingDocs(d => d.map(x => x.id === docId ? { ...x, report_count: 0 } : x))
  }

  const handlePublish = async (docId) => {
    const { error } = await supabase.rpc('moderate_document', { p_document_id: docId, p_action: 'publish' })
    if (error) { notify.error(error.message); return }
    setPendingDocs(d => d.map(x => x.id === docId ? { ...x, status: 'published', flag_reason: null } : x))
    notify.success('Document publié')
  }

  const handleModAction = async (docId) => {
    setModBusy(true)
    const action = modAction === 'review' ? 'review' : 'reject'
    const { error } = await supabase.rpc('moderate_document', { p_document_id: docId, p_action: action, p_note: modNote.trim() || null })
    setModBusy(false)
    if (error) { notify.error(error.message); return }
    setModActionDocId(null); setModNote('')
    if (action === 'reject') setPendingDocs(d => d.filter(x => x.id !== docId))
    else setPendingDocs(d => d.map(x => x.id === docId ? { ...x, status: 'needs_review', flag_reason: modNote.trim() || x.flag_reason } : x))
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

  const searchModules = async (q) => {
    if (q.length < 2) { setMoveResults([]); return }
    const { data } = await supabase.from('modules')
      .select('id, name, filieres(name, semester)')
      .ilike('name', `%${q}%`)
      .limit(8)
    setMoveResults(data || [])
  }

  const moveDoc = async (docId, moduleId) => {
    setMoveBusy(true)
    const { error } = await supabase.rpc('moderate_document', { p_document_id: docId, p_action: 'move', p_module_id: moduleId })
    setMoveBusy(false)
    if (error) { notify.error(error.message); return }
    setMovingDocId(null)
    setMoveSearch('')
    setMoveResults([])
    setMoveSelId(null)
    setPendingDocs(d => d.map(x => x.id === docId ? { ...x, module_id: moduleId } : x))
  }

  const renameMod = async (mod) => {
    if (!renameVal.trim()) return
    await supabase.from('modules').update({ name: renameVal.trim(), verified: true }).eq('id', mod.id)
    setPendingMods(m => m.filter(x => x.id !== mod.id))
    setRenamingId(null); setRenameVal('')
  }

  const rejectMod = async (mod) => {
    const { count } = await supabase.from('documents').select('*', { count:'exact', head:true }).eq('module_id', mod.id)
    if (count > 0) {
      setModal({ title: 'Suppression impossible', message: `Ce module contient ${count} document(s) et ne peut pas être supprimé.`, confirmText: 'OK', confirmColor: '#4F8EF7', onConfirm: () => setModal(null) })
      return
    }
    setModal({
      title: 'Supprimer ce module ?',
      message: `"${mod.name}" sera supprimé définitivement.`,
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        await supabase.from('modules').delete().eq('id', mod.id)
        setPendingMods(m => m.filter(x => x.id !== mod.id))
      },
    })
  }


  const isNew = ts => Date.now() - new Date(ts).getTime() < 86400000

  const renameUni = async (id) => {
    if (!renameUniV.trim()) return
    const { error } = await supabase.from('universities').update({ name: renameUniV.trim() }).eq('id', id)
    if (error) { showAlert('Erreur : ' + error.message); return }
    setUniList(u => u.map(x => x.id === id ? { ...x, name: renameUniV.trim() } : x))
    setRenamingUni(null); setRenameUniV('')
  }

  const deleteUni = (uni) => {
    setModal({
      title: `Supprimer "${uni.name}" ?`,
      message: 'Toutes les facultés et filières liées seront supprimées.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.from('universities').delete().eq('id', uni.id)
        if (error) { showAlert('Erreur : ' + error.message); return }
        setUniList(u => u.filter(x => x.id !== uni.id))
        setFacList(f => f.filter(x => x.university_id !== uni.id))
      },
    })
  }

  const renameFac = async (id) => {
    if (!renameFacV.trim()) return
    const { error } = await supabase.from('faculties').update({ name: renameFacV.trim() }).eq('id', id)
    if (error) { showAlert('Erreur : ' + error.message); return }
    setFacList(f => f.map(x => x.id === id ? { ...x, name: renameFacV.trim() } : x))
    setRenamingFac(null); setRenameFacV('')
  }

  const deleteFac = (fac) => {
    setModal({
      title: `Supprimer "${fac.name}" ?`,
      message: 'Toutes les filières liées seront supprimées.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.from('faculties').delete().eq('id', fac.id)
        if (error) { showAlert('Erreur : ' + error.message); return }
        setFacList(f => f.filter(x => x.id !== fac.id))
      },
    })
  }

  const renameFil = async (id) => {
    if (!renameFilV.trim()) return
    const { error } = await supabase.from('filieres').update({ name: renameFilV.trim() }).eq('id', id)
    if (error) { showAlert('Erreur : ' + error.message); return }
    setFiliereList(f => f.map(x => x.id === id ? { ...x, name: renameFilV.trim() } : x))
    setRenamingFil(null); setRenameFilV('')
  }

  const deleteFil = (fil) => {
    setModal({
      title: `Supprimer "${fil.name}" ?`,
      message: 'Tous les modules de cette filière seront affectés.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.from('filieres').delete().eq('id', fil.id)
        if (error) { showAlert('Erreur : ' + error.message); return }
        setFiliereList(f => f.filter(x => x.id !== fil.id))
      },
    })
  }

  const toggleModerator = (id, currentMod) => {
    setModal({
      title: currentMod ? 'Retirer le rôle Modérateur ?' : 'Donner le rôle Modérateur ?',
      confirmText: currentMod ? 'Retirer' : 'Confirmer',
      confirmColor: currentMod ? '#F87171' : '#4F8EF7',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.rpc('admin_set_moderator', { p_user: id, p_value: !currentMod })
        if (error) { notify.error(error.message); return }
        setUsers(u => u.map(x => x.id === id ? { ...x, is_moderator: !currentMod } : x))
        const notifContent = !currentMod
          ? "Tu as été nommé modérateur de 9rawZid9ra. Bienvenue dans l'équipe !"
          : 'Ton rôle de modérateur a été retiré.'
        const notifType = !currentMod ? 'moderator_assigned' : 'moderator_removed'
        await supabase.rpc('staff_notify', { p_user: id, p_type: notifType, p_content: notifContent })
      },
    })
  }

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_get_inbox')
    if (!data?.length) { setMsgSenders([]); setUnreadMsgCount(0); setLoading(false); return }
    const senders = data.map(row => ({
      id:       row.user_id,
      name:     row.username || 'Anonyme',
      unread:   Number(row.unread_count) || 0,
      lastMsg:  row.last_message,
      lastDate: row.last_message_time,
    }))
    setMsgSenders(senders)
    setUnreadMsgCount(senders.reduce((s, u) => s + u.unread, 0))
    setLoading(false)
  }

  const loadThread = async (sender) => {
    setSelectedMsgUser(sender)
    selectedMsgUserRef.current = sender
    setMsgThread([])
    const { data } = await supabase.rpc('admin_get_thread', { p_user_id: sender.id })
    setMsgThread(data || [])
    await supabase.from('messages').update({ is_read: true })
      .eq('receiver_id', ADMIN_ID).eq('sender_id', sender.id).eq('is_read', false)
    setMsgSenders(prev => prev.map(s => s.id === sender.id ? { ...s, unread: 0 } : s))
    setUnreadMsgCount(prev => {
      const u = msgSenders.find(s => s.id === sender.id)
      return Math.max(0, prev - (u?.unread || 0))
    })
  }

  const sendReply = async () => {
    if (!replyText.trim() || replySending || !selectedMsgUser) return
    setReplySending(true)
    const content = replyText.trim()
    setReplyText('')
    const { data: newMsg } = await supabase.from('messages').insert({
      sender_id:   ADMIN_ID,
      receiver_id: selectedMsgUser.id,
      content,
    }).select().single()
    if (newMsg) setMsgThread(prev => [...prev, newMsg])
    await supabase.rpc('staff_notify', {
      p_user: selectedMsgUser.id,
      p_type: 'message_reply',
      p_content: `Saad GENIUS vous a répondu : ${content.slice(0, 80)}`,
    })
    setReplySending(false)
  }

  // Real-time: live message updates for admin messages tab
  useEffect(() => {
    if (!isAdmin) return
    const channel = supabase
      .channel('admin-messages-rt')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${ADMIN_ID}`,
      }, payload => {
        const msg = payload.new
        // Refresh inbox list (updates unread counts, last message, new conversations)
        loadMessages()
        // If this sender's thread is currently open, append the message live
        if (selectedMsgUserRef.current?.id === msg.sender_id) {
          setMsgThread(prev => [...prev, msg])
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [isAdmin]) // eslint-disable-line

  const loadAnalytics = async () => {
    setLoading(true)
    const [usersDay, docsDay, topMods, extra, uploaders] = await Promise.all([
      supabase.rpc('get_users_per_day'),
      supabase.rpc('get_docs_per_day'),
      supabase.rpc('get_top_modules_by_downloads'),
      supabase.rpc('get_analytics_extra'),
      supabase.rpc('get_top_uploaders'),
    ])
    const ext = extra.data?.[0] || {}
    setAnalytics({
      usersPerDay: usersDay.data || [],
      docsPerDay: docsDay.data || [],
      topModules: (topMods.data || []).map(r => ({ name: r.name, total: Number(r.total) })),
      topUploaders: (uploaders.data || []).map(r => ({ name: r.name, uploads: Number(r.uploads), points: r.points })),
      totalDocs: Number(ext.new_docs_7d || 0) + Number(ext.total_downloads || 0),  // will be overwritten below
      totalUsers: 0,
      flaggedDocs: 0,
      newUsers7d: Number(ext.new_users_7d || 0),
      newDocs7d: Number(ext.new_docs_7d || 0),
      totalDownloads: Number(ext.total_downloads || 0),
      activeUploaders: Number(ext.active_uploaders || 0),
    })
    // Get accurate total counts separately
    const [tdocs, tusers, tflagged] = await Promise.all([
      supabase.from('documents').select('*', { count:'exact', head:true }),
      supabase.from('user_profiles').select('*', { count:'exact', head:true }),
      supabase.from('documents').select('*', { count:'exact', head:true }).eq('is_flagged', true),
    ])
    setAnalytics(a => ({ ...a, totalDocs: tdocs.count || 0, totalUsers: tusers.count || 0, flaggedDocs: tflagged.count || 0 }))

    // Search, quality and moderation insights (migrations 200/300/400)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const STATUS_KEYS = ['pending_review', 'published', 'verified', 'needs_review', 'rejected']
    const [searchInsights, statusCounts, qualityRows, modCount, pointsWeek, badgesWeek] = await Promise.all([
      supabase.rpc('get_search_insights', { p_days: 30 }),
      Promise.all(STATUS_KEYS.map(s => supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', s))),
      supabase.from('documents').select('quality_score').not('quality_score', 'is', null).limit(5000),
      supabase.from('moderation_log').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('reputation_events').select('points').gt('points', 0).gte('created_at', weekAgo).limit(5000),
      supabase.from('user_badges').select('*', { count: 'exact', head: true }).gte('awarded_at', weekAgo),
    ])
    const scores = (qualityRows.data || []).map(r => r.quality_score).filter(n => n != null)
    setAnalytics(a => ({
      ...a,
      searchInsights: searchInsights.data || [],
      statusCounts: Object.fromEntries(STATUS_KEYS.map((s, i) => [s, statusCounts[i].count || 0])),
      avgQuality: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null,
      modActionsWeek: modCount.count || 0,
      pointsAwardedWeek: (pointsWeek.data || []).reduce((s, r) => s + (r.points || 0), 0),
      badgesAwardedWeek: badgesWeek.count || 0,
    }))
    setLoading(false)
  }

  const toggleContrib = async (userId) => {
    if (expandedContrib === userId) { setExpandedContrib(null); return }
    setExpandedContrib(userId)
    if (contribDocs[userId]) return
    setContribLoading(userId)
    const { data } = await supabase
      .from('documents')
      .select('doc_type, created_at, modules(name)')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setContribDocs(d => ({ ...d, [userId]: data || [] }))
    setContribLoading(null)
  }

  const sendAnnouncement = async () => {
    if (!annText.trim() || annSending) return
    setAnnSending(true)
    const { data: count, error } = await supabase.rpc('admin_broadcast', { p_content: `Annonce : ${annText.trim()}` })
    if (error) { notify.error(error.message); setAnnSending(false); return }
    setAnnResult(`Annonce envoyée à ${count || 0} utilisateurs`)
    setAnnText('')
    setAnnSending(false)
    setTimeout(() => setAnnResult(null), 5000)
  }

  const confirmBan = async (u) => {
    setBanBusy(true)
    const durations = { '24h': 1, '7d': 7, '30d': 30, 'perm': null }
    const days = durations[banDuration]
    const bannedUntil = days ? new Date(Date.now() + days * 86400000).toISOString() : null
    const { data: ok, error } = await supabase.rpc('mod_ban_user', {
      p_target_id: u.id,
      p_is_banned: true,
      p_banned_until: bannedUntil,
      p_ban_reason: banReason.trim() || null,
    })
    if (error || !ok) { notify.error(error?.message || 'Erreur lors du bannissement.'); setBanBusy(false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_banned: true, banned_until: bannedUntil, ban_reason: banReason.trim() || null } : x))
    setBanningId(null)
    setBanReason('')
    setBanBusy(false)
  }

  const unbanUser = async (id) => {
    const { data: ok, error } = await supabase.rpc('mod_ban_user', { p_target_id: id, p_is_banned: false, p_banned_until: null, p_ban_reason: null })
    if (error || !ok) { notify.error(error?.message || 'Erreur lors du débannissement.'); return }
    setUsers(prev => prev.map(x => x.id === id ? { ...x, is_banned: false, banned_until: null, ban_reason: null } : x))
  }

  const handleAdjustPoints = async (u) => {
    const delta = parseInt(adjustPoints, 10)
    if (!delta) { notify.error('Entre un nombre de points (positif ou négatif).'); return }
    setAdjustBusy(true)
    const { error } = await supabase.rpc('admin_adjust_reputation', { p_user: u.id, p_points: delta, p_reason: adjustReason.trim() || 'Ajustement manuel' })
    setAdjustBusy(false)
    if (error) { notify.error(error.message); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, points: Math.max(0, (x.points || 0) + delta) } : x))
    setAdjustingId(null); setAdjustPoints(''); setAdjustReason('')
    notify.success('Points ajustés')
  }

  const fmt = (d) => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'2-digit' })

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="t-mono qz-subtle">Chargement…</span></div>
  }

  if (!user || !isAdmin) {
    return <div><style>{css}</style><PanelLayout denied /></div>
  }

  const TABS = [
    { id: 'overview',  label: "Vue d'ensemble", icon: 'monitor' },
    { id: 'documents', label: 'Documents', icon: 'flag' },
    { id: 'modules',   label: 'Modules', icon: 'bookmark', count: stats?.pendingMods },
    { id: 'schools',   label: 'Écoles', icon: 'shield', count: stats?.pendingSchools },
    { id: 'filieres',  label: 'Filières', icon: 'file', count: stats?.pendingFilieres },
    { id: 'professors', label: 'Professeurs', icon: 'user', count: stats?.pendingProfessors },
    { id: 'users',     label: 'Utilisateurs', icon: 'user' },
    { id: 'senpai',    label: 'Senpai Zone', icon: 'message', count: stats?.flaggedPosts },
    { id: 'messages',  label: 'Messages', icon: 'inbox', count: unreadMsgCount },
    { id: 'analytics', label: 'Analytiques', icon: 'up' },
  ]

  const TITLES = {
    overview: ["Vue d'ensemble", 'Annonces, rapport mensuel et activité récente.'],
    documents: ['Documents', 'Tous les documents uploadés sur la plateforme.'],
    modules: ['Modules', "Modules en attente d'approbation."],
    schools: ['Écoles', 'Universités et facultés enregistrées.'],
    filieres: ['Filières', 'Filières enregistrées.'],
    professors: ['Professeurs', 'Profils en attente de vérification.'],
    users: ['Utilisateurs', 'Gère les rôles et les bannissements.'],
    senpai: ['Senpai Zone', '100 derniers posts.'],
    messages: ['Messages', 'Réponds aux utilisateurs.'],
    analytics: ['Analytiques', 'Santé et croissance de la plateforme.'],
  }

  return (
    <div>
      <style>{css}</style>
      <PanelLayout
        role="admin"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={TITLES[activeTab]?.[0]}
        subtitle={TITLES[activeTab]?.[1]}
      >
        {activeTab === 'overview' && (
          <>
            <div className="ad-section">
              <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Annonce</span></div>
              <Card>
                <div className="ad-announce">
                  <Input multiline maxLength={200} counter placeholder="Message de l'annonce..." value={annText} onChange={e => setAnnText(e.target.value)} />
                  <div className="ad-announce-row">
                    <Button variant="primary" icon="send" onClick={sendAnnouncement} disabled={!annText.trim() || annSending} loading={annSending}>Envoyer à tous les utilisateurs</Button>
                    {annResult && <Badge tone="success" icon="check">{annResult}</Badge>}
                  </div>
                </div>
              </Card>
            </div>

            <div className="ad-section">
              <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Rapport — {new Date().toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' })}</span></div>
              <StatStrip items={[
                { value: stats?.docsThisMonth ?? '—', label: 'Documents ce mois', delta: stats ? (stats.docsLastMonth > 0 ? `vs ${stats.docsLastMonth} le mois dernier` : 'premier mois') : undefined },
                { value: stats?.usersThisMonth ?? '—', label: 'Nouveaux utilisateurs' },
                { value: '—', label: 'Revenus publicitaires', delta: 'fonctionnalité à venir' },
                { value: '—', label: 'Abonnements premium', delta: 'fonctionnalité à venir' },
              ]} />
            </div>

            <div className="ad-section">
              <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Totaux plateforme</span></div>
              <StatStrip items={[
                { value: stats?.pendingDocs ?? '—', label: 'Total documents' },
                { value: stats?.totalUsers ?? '—', label: 'Utilisateurs' },
                { value: stats?.pendingMods ?? '—', label: 'Modules en attente' },
                { value: stats?.pendingSchools ?? '—', label: 'Écoles demandées' },
              ]} />
            </div>

            <div className="ad-cols">
              <div>
                <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Top 10 contributeurs</span></div>
                {topUsers.length === 0 ? <EmptyState icon="user" title="Aucun utilisateur" /> : (
                  <div className="qz-table-wrap">
                    <table className="qz-table">
                      <thead><tr><th>#</th><th>Utilisateur</th><th>Points</th><th>Uploads</th><th>Niveau</th></tr></thead>
                      <tbody>
                        {topUsers.map((u, i) => {
                          const level = getLevel(u.points || 0)
                          const isExpanded = expandedContrib === u.id
                          const docs = contribDocs[u.id]
                          const isLoadingDocs = contribLoading === u.id
                          return (
                            <Fragment key={u.id}>
                              <tr style={{ cursor: 'pointer' }} onClick={() => toggleContrib(u.id)}>
                                <td className="qz-table-mono">#{i + 1}</td>
                                <td>
                                  <div className="qz-table-name">{u.name || 'Anonyme'}</div>
                                  <div className="qz-table-mono">{u.email}</div>
                                </td>
                                <td className="qz-table-mono">{u.points || 0}</td>
                                <td className="qz-table-mono">{u.uploads_count || 0}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Badge tone={LEVEL_TONE[level]}>{level}</Badge>
                                    <span style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(180deg)' : 'none', color: 'var(--text-subtle)' }}><Icon name="down" size={14} /></span>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} style={{ padding: 0, background: 'var(--surface-2)' }}>
                                    <div style={{ padding: 'var(--space-3) var(--space-5)' }}>
                                      {isLoadingDocs ? <span className="t-mono qz-subtle">Chargement…</span> :
                                       !docs || docs.length === 0 ? <span className="t-mono qz-subtle">Aucun upload</span> : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                                          {docs.map((d, j) => (
                                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                              <Badge>{DOC_LABELS[d.doc_type] || d.doc_type || '?'}</Badge>
                                              <span className="t-body-sm" style={{ flex: 1 }}>{d.modules?.name || '—'}</span>
                                              <span className="t-mono qz-subtle">{fmt(d.created_at)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Activité récente</span></div>
                {activityFeed.length === 0 ? <EmptyState icon="inbox" title="Aucune activité récente" /> : (
                  <div className="ad-feed">
                    {activityFeed.map((item, i) => (
                      <div key={i} className="ad-feed-item">
                        <Badge tone={FEED_TONE[item.type]}>{FEED_LABEL[item.type]}</Badge>
                        <div className="ad-feed-main">
                          <div className="t-body-sm" style={{ fontWeight: 550 }}>{item.label}</div>
                          <div className="t-mono qz-subtle">{item.sub}</div>
                        </div>
                        <span className="t-mono qz-subtle">{fmt(item.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(stats?.pendingMods > 0 || stats?.pendingSchools > 0) && (
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-6)' }}>
                {stats?.pendingMods > 0 && <Button variant="secondary" onClick={() => setActiveTab('modules')}>Traiter {stats.pendingMods} module{stats.pendingMods > 1 ? 's' : ''}</Button>}
                {stats?.pendingSchools > 0 && <Button variant="secondary" onClick={() => setActiveTab('schools')}>Voir {stats.pendingSchools} école{stats.pendingSchools > 1 ? 's' : ''}</Button>}
              </div>
            )}
          </>
        )}

        {activeTab === 'documents' && (
          <>
            <div className="ad-filters">
              {[{ k: 'all', l: 'Tous' }, { k: 'reported', l: 'Signalés' }, { k: 'recent', l: 'Récents' }].map(f => (
                <Chip key={f.k} selected={docFilter === f.k} onClick={() => setDocFilter(f.k)}>{f.l}</Chip>
              ))}
            </div>
            {loading ? <Skeleton height={200} /> :
             pendingDocs.length === 0 ? <EmptyState icon="flag" title="Aucun document trouvé" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Document</th><th>Module</th><th>Uploadé par</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pendingDocs.map(d => {
                      const level = d.quality_score != null ? qualityLevel({ status: d.status, quality_score: d.quality_score }) : null
                      return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                            <DocType type={d.doc_type} size="lg" />
                            <div>
                              <div className="qz-table-name">{d.academic_year}</div>
                              <div className="qz-table-mono">{d.pages_count} page{d.pages_count > 1 ? 's' : ''} · {d.file_type}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, alignItems: 'flex-start' }}>
                                {d.status && <Badge tone={STATUS[d.status]?.tone || 'neutral'}>{STATUS[d.status]?.label || d.status}</Badge>}
                                {d.reasons && Object.keys(d.reasons).length > 0 ? (
                                  Object.entries(d.reasons).map(([reason, n]) => (
                                    <Badge key={reason} tone="danger" icon="flag">{REPORT_REASONS.find(r => r.id === reason)?.label || reason} · {n}</Badge>
                                  ))
                                ) : d.report_count > 0 ? (
                                  <Badge tone="danger" icon="flag">{d.report_count} signalement{d.report_count > 1 ? 's' : ''}</Badge>
                                ) : d.is_flagged && d.flag_reason ? (
                                  <Badge tone="warning" icon="alert">{d.flag_reason}</Badge>
                                ) : null}
                                {level && <QualityBadge score={d.quality_score} label={level.label} tone={level.tone} />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{d.module_name}</div>
                          <div className="qz-table-mono">{d.fac_name}</div>
                        </td>
                        <td className="qz-table-mono">{d.uploader_name || 'Anonyme'}</td>
                        <td className="qz-table-mono">{fmt(d.created_at)}</td>
                        <td>
                          <div className="qz-table-actions">
                            {d.files?.[0] && <Button as="a" href={d.files[0]} target="_blank" rel="noreferrer" variant="secondary" size="sm" icon="eye">Voir</Button>}
                            <Button variant="secondary" size="sm" icon="check" onClick={() => verifyDoc(d.id)}>Approuver</Button>
                            {d.status === 'pending_review' && <Button variant="ghost" size="sm" onClick={() => handlePublish(d.id)}>Publier</Button>}
                            <Button variant="ghost" size="sm" onClick={() => { const open = modActionDocId === d.id && modAction === 'review'; setModActionDocId(open ? null : d.id); setModAction('review'); setModNote(d.flag_reason || '') }}>À revoir</Button>
                            <Button variant="danger-ghost" size="sm" onClick={() => { const open = modActionDocId === d.id && modAction === 'reject'; setModActionDocId(open ? null : d.id); setModAction('reject'); setModNote('') }}>Refuser</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setMovingDocId(movingDocId === d.id ? null : d.id); setMoveSearch(''); setMoveResults([]); setMoveSelId(null) }}>Déplacer</Button>
                            <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => handleDeleteDoc(d)}>Supprimer</Button>
                            {d.report_count > 0 && <Button variant="ghost" size="sm" onClick={() => handleIgnoreReports(d.id)}>Ignorer</Button>}
                          </div>
                          {modActionDocId === d.id && (
                            <div className="ad-move-panel">
                              <span className="t-eyebrow qz-subtle">{modAction === 'reject' ? "Raison du refus (envoyée à l'auteur)" : 'Raison de la mise à revoir (optionnel)'}</span>
                              <Input value={modNote} onChange={e => setModNote(e.target.value)} placeholder="Ex : mauvais scan, module incorrect…" autoFocus />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button variant={modAction === 'reject' ? 'danger-ghost' : 'secondary'} size="sm" disabled={modBusy || (modAction === 'reject' && !modNote.trim())} onClick={() => handleModAction(d.id)}>{modBusy ? '...' : 'Confirmer'}</Button>
                                <Button variant="ghost" size="sm" onClick={() => setModActionDocId(null)}>Annuler</Button>
                              </div>
                            </div>
                          )}
                          {movingDocId === d.id && (
                            <div className="ad-move-panel">
                              <span className="t-eyebrow qz-subtle">Déplacer vers un autre module</span>
                              <Input placeholder="Recherche module (min 2 chars)..." value={moveSearch}
                                onChange={e => { const v = e.target.value; setMoveSearch(v); setMoveSelId(null); clearTimeout(moveDebounceRef.current); moveDebounceRef.current = setTimeout(() => searchModules(v), 500) }} />
                              {moveResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {moveResults.map(m => (
                                    <div key={m.id} className="ad-move-result" onClick={() => setMoveSelId(m.id)}
                                      style={{ background: moveSelId === m.id ? 'var(--brand-soft)' : 'var(--surface)', color: moveSelId === m.id ? 'var(--brand-text)' : 'var(--text-muted)' }}>
                                      {m.name}
                                      {m.filieres?.name && <span className="t-mono qz-subtle" style={{ marginLeft: 6 }}>{m.filieres.name}{m.filieres.semester ? ` · S${m.filieres.semester}` : ''}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <Button variant="secondary" size="sm" disabled={!moveSelId || moveBusy} onClick={() => moveDoc(d.id, moveSelId)}>{moveBusy ? 'Déplacement…' : 'Confirmer'}</Button>
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
                      <div key={l.id} className="ad-history-row">
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

        {activeTab === 'modules' && (
          loading ? <Skeleton height={200} /> :
          pendingMods.length === 0 ? <EmptyState icon="bookmark" title="Aucun module trouvé" /> : (
            <div className="qz-table-wrap">
              <table className="qz-table">
                <thead><tr><th>Module</th><th>Filière</th><th>Semestre</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingMods.map(m => (
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
                      <td className="qz-table-mono">{m.semester}</td>
                      <td>
                        <div className="qz-table-actions">
                          {renamingId === m.id ? (
                            <>
                              <Button variant="secondary" size="sm" icon="check" onClick={() => renameMod(m)}>Sauvegarder</Button>
                              <Button variant="ghost" size="sm" onClick={() => { setRenamingId(null); setRenameVal('') }}>Annuler</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setRenamingId(m.id); setRenameVal(m.name) }}>Renommer</Button>
                              <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => rejectMod(m)}>Supprimer</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'schools' && (
          <>
            <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Universités</span></div>
            {loading ? <Skeleton height={160} /> :
             uniList.length === 0 ? <EmptyState icon="shield" title="Aucune université enregistrée" /> : (
              <div className="qz-table-wrap" style={{ marginBottom: 'var(--space-6)' }}>
                <table className="qz-table">
                  <thead><tr><th>Nom</th><th>Ville</th><th>Type</th><th>Ajouté le</th><th>Actions</th></tr></thead>
                  <tbody>
                    {uniList.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {isNew(u.created_at) && <Badge tone="success">Nouveau</Badge>}
                            {renamingUni === u.id ? (
                              <Input value={renameUniV} onChange={e => setRenameUniV(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameUni(u.id)} autoFocus />
                            ) : (
                              <span className="qz-table-name">{u.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="qz-table-mono">{u.city || '—'}</td>
                        <td className="qz-table-mono">{u.type || '—'}</td>
                        <td className="qz-table-mono">{fmt(u.created_at)}</td>
                        <td>
                          <div className="qz-table-actions">
                            {renamingUni === u.id ? (
                              <>
                                <Button variant="secondary" size="sm" icon="check" onClick={() => renameUni(u.id)}>Sauvegarder</Button>
                                <Button variant="ghost" size="sm" onClick={() => setRenamingUni(null)}>Annuler</Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => { setRenamingUni(u.id); setRenameUniV(u.name) }}>Renommer</Button>
                                <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deleteUni(u)}>Supprimer</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Facultés / écoles</span></div>
            {loading ? <Skeleton height={160} /> :
             facList.length === 0 ? <EmptyState icon="shield" title="Aucune faculté enregistrée" /> : (
              <div className="qz-table-wrap">
                <table className="qz-table">
                  <thead><tr><th>Nom</th><th>Université</th><th>Ajouté le</th><th>Actions</th></tr></thead>
                  <tbody>
                    {facList.map(f => (
                      <tr key={f.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {isNew(f.created_at) && <Badge tone="success">Nouveau</Badge>}
                            {renamingFac === f.id ? (
                              <Input value={renameFacV} onChange={e => setRenameFacV(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameFac(f.id)} autoFocus />
                            ) : (
                              <span className="qz-table-name">{f.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="qz-table-mono">{f.universities?.name || '—'}</td>
                        <td className="qz-table-mono">{fmt(f.created_at)}</td>
                        <td>
                          <div className="qz-table-actions">
                            {renamingFac === f.id ? (
                              <>
                                <Button variant="secondary" size="sm" icon="check" onClick={() => renameFac(f.id)}>Sauvegarder</Button>
                                <Button variant="ghost" size="sm" onClick={() => setRenamingFac(null)}>Annuler</Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => { setRenamingFac(f.id); setRenameFacV(f.name) }}>Renommer</Button>
                                <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deleteFac(f)}>Supprimer</Button>
                              </>
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
            <div className="qz-table-wrap">
              <table className="qz-table">
                <thead><tr><th>Utilisateur</th><th>Points</th><th>Uploads</th><th>Inscrit le</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <Fragment key={u.id}>
                      <tr>
                        <td style={{ cursor: 'pointer' }} onClick={() => window.open('/user/' + u.id, '_blank')}>
                          <div className="ad-user-row">
                            <span className="qz-table-name">{u.name || 'Sans nom'}</span>
                            {u.is_moderator && !u.is_admin && <Badge tone="accent">Mod</Badge>}
                          </div>
                          <div className="qz-table-mono">{u.email}</div>
                        </td>
                        <td className="qz-table-mono">{u.points || 0}</td>
                        <td className="qz-table-mono">{u.uploads_count || 0}</td>
                        <td className="qz-table-mono">{fmt(u.created_at)}</td>
                        <td><Badge tone={u.is_admin ? 'brand' : u.is_banned ? 'danger' : 'success'}>{u.is_admin ? 'Admin' : u.is_banned ? 'Banni' : 'Actif'}</Badge></td>
                        <td>
                          <div className="qz-table-actions">
                            <Button variant="ghost" size="sm" onClick={() => window.open('/user/' + u.id, '_blank')}>Voir profil</Button>
                            {!u.is_admin && <Button variant={u.is_moderator ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleModerator(u.id, u.is_moderator)}>{u.is_moderator ? 'Retirer mod' : '+ Modérateur'}</Button>}
                            <Button variant="ghost" size="sm" onClick={() => { setAdjustingId(adjustingId === u.id ? null : u.id); setAdjustPoints(''); setAdjustReason('') }}>Ajuster points</Button>
                            {!u.is_admin && u.is_banned && <Button variant="secondary" size="sm" onClick={() => unbanUser(u.id)}>Débannir</Button>}
                            {!u.is_admin && !u.is_banned && <Button variant="danger-ghost" size="sm" onClick={() => setBanningId(banningId === u.id ? null : u.id)}>Bannir</Button>}
                          </div>
                        </td>
                      </tr>
                      {adjustingId === u.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, background: 'var(--surface-2)' }}>
                            <div className="ad-ban-form" style={{ margin: 'var(--space-3) var(--space-5)' }}>
                              <div style={{ width: 120 }}><Input type="number" placeholder="+10 / -20" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} /></div>
                              <div className="ad-ban-reason"><Input placeholder="Raison" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} /></div>
                              <Button variant="secondary" disabled={adjustBusy || !adjustPoints} onClick={() => handleAdjustPoints(u)}>{adjustBusy ? '...' : 'Confirmer'}</Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {banningId === u.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, background: 'var(--surface-2)' }}>
                            <div className="ad-ban-form" style={{ margin: 'var(--space-3) var(--space-5)' }}>
                              <Select value={banDuration} onChange={e => setBanDuration(e.target.value)} options={[
                                { value: '24h', label: '24 heures' }, { value: '7d', label: '7 jours' }, { value: '30d', label: '30 jours' }, { value: 'perm', label: 'Permanent' },
                              ]} />
                              <div className="ad-ban-reason"><Input placeholder="Raison (optionnel)" value={banReason} onChange={e => setBanReason(e.target.value)} /></div>
                              <Button variant="danger-ghost" disabled={banBusy} onClick={() => confirmBan(u)}>{banBusy ? '...' : 'Confirmer le bannissement'}</Button>
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

        {activeTab === 'senpai' && (
          loading ? <Skeleton height={200} /> :
          flaggedPosts.length === 0 ? <EmptyState icon="message" title="Aucun post trouvé" /> : (
            <div className="ad-list">
              {flaggedPosts.map(post => (
                <Card key={post.id}>
                  <div className="ad-post">
                    <div className="ad-post-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                        <Badge tone={TYPE_TONES[post.post_type] || 'neutral'}>{TYPE_LABELS[post.post_type] || post.post_type}</Badge>
                        {post.is_anonymous && <Badge>Anonyme</Badge>}
                        {!post.is_approved && <Badge tone="danger" icon="alert">Signalé</Badge>}
                      </div>
                      <h3 className="t-h3" style={{ marginBottom: 4 }}>{post.title}</h3>
                      <p className="t-body-sm qz-muted" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 'var(--space-2)' }}>{post.content}</p>
                      <span className="t-mono qz-subtle">Par : {post.user_profiles?.name || '—'} · {post.user_profiles?.email || '—'} · {fmt(post.created_at)}</span>
                    </div>
                    <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deletePost(post)}>Supprimer</Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === 'filieres' && (
          loading ? <Skeleton height={200} /> :
          filiereList.length === 0 ? <EmptyState icon="file" title="Aucune filière enregistrée" /> : (
            <div className="qz-table-wrap">
              <table className="qz-table">
                <thead><tr><th>Filière</th><th>Faculté / Université</th><th>Semestres</th><th>Ajouté le</th><th>Actions</th></tr></thead>
                <tbody>
                  {filiereList.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {isNew(f.created_at) && <Badge tone="success">Nouveau</Badge>}
                          {renamingFil === f.id ? (
                            <Input value={renameFilV} onChange={e => setRenameFilV(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameFil(f.id)} autoFocus />
                          ) : (
                            <span className="qz-table-name">{f.name}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>{f.faculties?.name || '—'}</div>
                        <div className="qz-table-mono">{f.faculties?.universities?.name || '—'}</div>
                      </td>
                      <td className="qz-table-mono">{f.total_semesters ?? '—'}</td>
                      <td className="qz-table-mono">{fmt(f.created_at)}</td>
                      <td>
                        <div className="qz-table-actions">
                          {renamingFil === f.id ? (
                            <>
                              <Button variant="secondary" size="sm" icon="check" onClick={() => renameFil(f.id)}>Sauvegarder</Button>
                              <Button variant="ghost" size="sm" onClick={() => setRenamingFil(null)}>Annuler</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setRenamingFil(f.id); setRenameFilV(f.name) }}>Renommer</Button>
                              <Button variant="danger-ghost" size="sm" icon="trash" onClick={() => deleteFil(f)}>Supprimer</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
                            <div className="ad-move-panel" style={{ margin: 'var(--space-3) var(--space-5)' }}>
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
                            <div className="ad-move-panel" style={{ margin: 'var(--space-3) var(--space-5)' }}>
                              <span className="t-eyebrow qz-subtle">Fusionner avec un autre profil</span>
                              <Input placeholder="Rechercher un professeur…" value={mergeQuery} onChange={e => searchMergeTargets(e.target.value, p.id)} />
                              {mergeResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {mergeResults.map(r => (
                                    <div key={r.id} className="ad-move-result" onClick={() => { setMergeTargetId(r.id); setMergeQuery(r.display_name) }}
                                      style={{ background: mergeTargetId === r.id ? 'var(--brand-soft)' : 'var(--surface)', color: mergeTargetId === r.id ? 'var(--brand-text)' : 'var(--text-muted)' }}>
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

        {activeTab === 'messages' && (
          loading ? <Skeleton height={200} /> : (
            <div className="ad-msg-layout">
              <div className="ad-msg-left">
                <div className="t-eyebrow qz-subtle" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>Conversations</div>
                {msgSenders.length === 0 && <div style={{ padding: 'var(--space-8) var(--space-4)' }}><EmptyState icon="inbox" title="Aucun message" /></div>}
                {msgSenders.map(s => (
                  <div key={s.id} className="qz-inbox-row" onClick={() => loadThread(s)} style={{ background: selectedMsgUser?.id === s.id ? 'var(--surface-2)' : undefined }}>
                    <Avatar name={s.name} size="sm" />
                    <div className="qz-inbox-row__main">
                      <div className="qz-inbox-row__top">
                        <span className="qz-inbox-row__name">{s.name}</span>
                        {s.unread > 0 && <span className="qz-inbox-row__unread">{s.unread}</span>}
                      </div>
                      <p className="qz-inbox-row__preview">{s.lastMsg?.slice(0, 42) || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ad-msg-right">
                {!selectedMsgUser ? (
                  <div className="ad-msg-empty"><span className="t-mono qz-subtle">Sélectionne une conversation</span></div>
                ) : (
                  <>
                    <div className="ad-msg-head"><span className="t-eyebrow qz-subtle">{selectedMsgUser.name}</span></div>
                    <div className="qz-chat__body ad-msg-thread">
                      {msgThread.length === 0 && <span className="t-mono qz-subtle" style={{ margin: 'auto' }}>Chargement…</span>}
                      {msgThread.map(m => {
                        const fromAdmin = m.sender_id === ADMIN_ID
                        return (
                          <div key={m.id} style={{ display: 'flex', justifyContent: fromAdmin ? 'flex-end' : 'flex-start' }}>
                            <div className={`qz-bubble qz-bubble--${fromAdmin ? 'out' : 'in'}`}>
                              {fromAdmin && <div className="t-caption qz-subtle" style={{ marginBottom: 4 }}>Vous</div>}
                              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                              <time>{fmt(m.created_at)}</time>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="ad-msg-compose">
                      <Input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                        placeholder="Répondre..."
                      />
                      <Button variant="primary" icon="send" iconOnly aria-label="Envoyer" onClick={sendReply} disabled={!replyText.trim() || replySending} loading={replySending} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'analytics' && (
          loading ? <Skeleton height={300} /> : analytics ? (
            <>
              <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Santé plateforme</span></div>
              <StatStrip items={[
                { value: analytics.totalDocs, label: 'Documents total' },
                { value: analytics.totalUsers, label: 'Utilisateurs' },
                { value: analytics.totalDownloads, label: 'Téléchargements total' },
                { value: analytics.flaggedDocs, label: 'Docs signalés' },
                { value: '+' + analytics.newUsers7d, label: 'Nouveaux users (7j)' },
                { value: '+' + analytics.newDocs7d, label: 'Nouveaux docs (7j)' },
                { value: analytics.activeUploaders, label: 'Uploadeurs actifs' },
              ]} />

              <div className="ad-charts" style={{ marginTop: 'var(--space-6)' }}>
                {[
                  { label: 'Inscriptions (30j)', data: analytics.usersPerDay },
                  { label: 'Uploads (30j)', data: analytics.docsPerDay },
                ].map(({ label, data }) => {
                  const max = Math.max(...(data.map(d => Number(d.count))), 1)
                  return (
                    <div className="ad-chart-card" key={label}>
                      <span className="t-eyebrow qz-subtle">{label}</span>
                      {data.length === 0 ? (
                        <div style={{ padding: 'var(--space-4) 0' }}><span className="t-mono qz-subtle">Pas encore de données</span></div>
                      ) : (
                        <div className="ad-bars" style={{ marginTop: 'var(--space-3)' }}>
                          {data.map((d, i) => (
                            <div key={i} className="ad-bar" title={`${d.date}: ${d.count}`} style={{ height: `${Math.round((Number(d.count) / max) * 60)}px` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="ad-charts">
                <div>
                  <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Top modules téléchargés</span></div>
                  <Card>
                    {analytics.topModules.length === 0 ? <EmptyState icon="bookmark" title="Pas de données" /> : analytics.topModules.map((m, i) => (
                      <div className="ad-rank-row" key={i}>
                        <span className="ad-rank-num">#{i + 1}</span>
                        <div className="ad-rank-body">
                          <div className="ad-rank-top"><span className="ad-rank-name">{m.name}</span><span className="ad-rank-val">{m.total} DL</span></div>
                          <ProgressBar value={Math.round((m.total / (analytics.topModules[0]?.total || 1)) * 100)} />
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
                <div>
                  <div className="ad-section-title"><span className="t-eyebrow qz-subtle">Top uploadeurs</span></div>
                  <Card>
                    {(analytics.topUploaders || []).length === 0 ? <EmptyState icon="user" title="Pas de données" /> : (analytics.topUploaders || []).map((u, i) => (
                      <div className="ad-rank-row" key={i}>
                        <span className="ad-rank-num">#{i + 1}</span>
                        <div className="ad-rank-body">
                          <div className="ad-rank-top"><span className="ad-rank-name">{u.name}</span><span className="ad-rank-val">{u.uploads} docs · {u.points} pts</span></div>
                          <ProgressBar value={Math.round((u.uploads / ((analytics.topUploaders[0]?.uploads) || 1)) * 100)} />
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              </div>

              <div className="ad-section-title" style={{ marginTop: 'var(--space-8)' }}><span className="t-eyebrow qz-subtle">Qualité & modération</span></div>
              <StatStrip items={[
                { value: analytics.avgQuality ?? '—', label: 'Score qualité moyen' },
                { value: analytics.modActionsWeek ?? 0, label: 'Actions modération (7j)' },
                { value: '+' + formatPoints(analytics.pointsAwardedWeek || 0), label: 'Points distribués (7j)' },
                { value: analytics.badgesAwardedWeek ?? 0, label: 'Badges obtenus (7j)' },
              ]} />
              {analytics.statusCounts && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <StatStrip items={Object.entries(analytics.statusCounts).map(([s, n]) => ({ value: n, label: STATUS[s]?.label || s }))} />
                </div>
              )}

              <div className="ad-section-title" style={{ marginTop: 'var(--space-8)' }}><span className="t-eyebrow qz-subtle">Recherches sans résultat (30j)</span></div>
              {(analytics.searchInsights || []).length === 0 ? <EmptyState icon="search" title="Pas encore de données de recherche" /> : (
                <div className="qz-table-wrap">
                  <table className="qz-table">
                    <thead><tr><th>Requête</th><th>Recherches</th><th>Sans résultat</th><th>Dernière fois</th></tr></thead>
                    <tbody>
                      {analytics.searchInsights.slice(0, 30).map((r, i) => (
                        <tr key={i}>
                          <td className="qz-table-name">{r.query || '(vide)'}</td>
                          <td className="qz-table-mono">{r.searches}</td>
                          <td>{r.zero_results > 0 ? <Badge tone="danger">{r.zero_results}</Badge> : <span className="qz-table-mono">0</span>}</td>
                          <td className="qz-table-mono">{fmt(r.last_searched)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : <EmptyState icon="up" title="Données non disponibles" />
        )}
      </PanelLayout>

      {modal && <ConfirmModal {...modal} onCancel={modal.onCancel !== undefined ? modal.onCancel : () => setModal(null)} />}
    </div>
  )
}
