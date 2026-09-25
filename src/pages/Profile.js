import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import ConfirmModal from '../components/ConfirmModal'
import ProfessorPicker from '../components/ProfessorPicker'
import {
  Avatar, Badge, Button, Input, Select, Tabs, StatStrip, EmptyState, Card, Sheet,
  Dropdown, Icon, ThemeToggle, Skeleton, DocType, QualityBadge, ProgressBar, StatusBadge,
} from '../design-system/ui'
import { useTheme } from '../design-system/theme'
import { notify } from '../design-system/toast'
import { qualityLevel, displayStatus } from '../lib/quality'
import { levelFor, formatPoints, POINT_RULES, LEVELS } from '../lib/reputation'

const css = `
  .pf-layout { max-width: 960px; margin: 0 auto; padding: var(--space-8) var(--space-6); }
  .pf-header { display: flex; align-items: flex-start; gap: var(--space-6); flex-wrap: wrap; }
  .pf-header__badges { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: 4px; }
  .pf-header__actions { display: flex; gap: var(--space-2); flex-shrink: 0; margin-left: auto; }
  @media (max-width: 640px) { .pf-header { flex-direction: column; align-items: center; text-align: center; } .pf-header__badges { justify-content: center; } .pf-header__actions { width: 100%; margin-left: 0; } .pf-header__actions > * { flex: 1; } }
  .pf-nudge-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-2); }
  .pf-social-row { display: flex; align-items: center; gap: var(--space-6); margin-top: var(--space-6); flex-wrap: wrap; }
  .pf-social-stat { background: none; border: 0; cursor: pointer; display: flex; align-items: baseline; gap: 6px; }
  .pf-tabs-wrap { margin: var(--space-6) 0 var(--space-4); }
  .pf-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .pf-doc-card { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); overflow: hidden; }
  .pf-doc-card__form { padding: var(--space-4); border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: var(--space-3); }
  .pf-doc-card__form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  @media (max-width: 640px) { .pf-doc-card__form-grid { grid-template-columns: 1fr; } }
  .pf-sp-card { cursor: pointer; }
  .pf-sp-card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-2); }
  .pf-activity-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 6px 0; border-top: 1px solid var(--border); }
  .pf-activity-row:first-child { border-top: 0; }
  .pf-follow-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; width: 100%; text-align: left; background: none; border: 0; cursor: pointer; }
  .pf-theme-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) 0; }
  .pf-settings-list { display: flex; flex-direction: column; gap: var(--space-4); }
  .pf-badges-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: var(--space-3); margin-top: var(--space-3); }
  .pf-badge-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .pf-badge-tile--locked { opacity: 0.35; }
  .pf-badge-tile__icon { width: 48px; height: 48px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pf-badge-tile__label { font: 500 11px/14px var(--font-sans); color: var(--text-muted); }
`

const PT_TONE = {
  survival_guide: 'brand', cheat_code: 'warning', timeline: 'success', red_flag: 'danger', path_review: 'accent',
}
const PT_LABEL = {
  survival_guide: 'Guide de survie', cheat_code: 'Cheat Code', timeline: 'Timeline', red_flag: 'Red Flag', path_review: 'Bilan',
}

const LEVEL_TONES = { 1: 'neutral', 2: 'accent', 3: 'brand', 4: 'warning', 5: 'founder' }
const BADGE_TIER_TONES = { bronze: 'neutral', silver: 'accent', gold: 'warning', special: 'founder' }
const DOC_STATUS_RANK = { verified: 0, community_approved: 1, pending: 2, rejected: 3 }
const sortDocs = (list) => [...list].sort((a, b) => {
  const r = (DOC_STATUS_RANK[displayStatus(a)?.key] ?? 2) - (DOC_STATUS_RANK[displayStatus(b)?.key] ?? 2)
  if (r !== 0) return r
  const q = (b.quality_score || 0) - (a.quality_score || 0)
  if (q !== 0) return q
  return (b.academic_year || '').localeCompare(a.academic_year || '')
})

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' })
}
function fmtAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  return fmtShort(d)
}
const YEARS = ['2026/2027', '2025/2026', '2024/2025', '2023/2024', '2022/2023', '2021/2022', '2020/2021', '2019/2020', '2018/2019']

// Works as own profile (/profile) and public profile (/user/:id)
export default function Profile() {
  const navigate = useNavigate()
  const params = useParams()
  const targetId = params.id || null // null = own profile
  const { mode: themeMode, cycle: cycleTheme } = useTheme()

  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [unis, setUnis] = useState([])
  const [uploads, setUploads] = useState([])
  const [dlogs, setDlogs] = useState([])
  const [ptsLog, setPtsLog] = useState([])
  const [senpaiPosts, setSenpaiPosts] = useState([])
  const [userReplies, setUserReplies] = useState([])
  const [badgeCatalogue, setBadgeCatalogue] = useState([])
  const [earnedBadges, setEarnedBadges] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')

  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showFollowSheet, setShowFollowSheet] = useState(false)
  const [followSheetTab, setFollowSheetTab] = useState('followers')
  const [followersList, setFollowersList] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [listLoading, setListLoading] = useState(false)

  const [showPointsInfo, setShowPointsInfo] = useState(false)
  const [uploadNudgeDismissed, setUploadNudgeDismissed] = useState(
    () => localStorage.getItem('9rz_upload_nudge') === '1'
  )
  const [showUniModal, setShowUniModal] = useState(false)
  const [uniModalSel, setUniModalSel] = useState('')
  const [uniModalSaving, setUniModalSaving] = useState(false)

  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null)
  const [deleteDocBusy, setDeleteDocBusy] = useState(false)

  const [menuDocId, setMenuDocId] = useState(null)
  const [editingDocId, setEditingDocId] = useState(null)
  const [editDocNumber, setEditDocNumber] = useState('')
  const [editDocYear, setEditDocYear] = useState('')
  const [editDocProf, setEditDocProf] = useState(null)
  const [editDocProfUni, setEditDocProfUni] = useState(null)
  const [editDocProfFac, setEditDocProfFac] = useState(null)
  const [editDocSaving, setEditDocSaving] = useState(false)

  const [moveReqDocId, setMoveReqDocId] = useState(null)
  const [moveReqSearch, setMoveReqSearch] = useState('')
  const [moveReqMods, setMoveReqMods] = useState([])
  const [moveReqSelMod, setMoveReqSelMod] = useState(null)
  const [moveReqBusy, setMoveReqBusy] = useState(false)
  const [moveReqSent, setMoveReqSent] = useState({})

  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editUni, setEditUni] = useState('')
  const [saving, setSaving] = useState(false)

  const [editFacId, setEditFacId] = useState('')
  const [editFilId, setEditFilId] = useState('')
  const [editSemester, setEditSemester] = useState('')
  const [studyFacs, setStudyFacs] = useState([])
  const [studyFils, setStudyFils] = useState([])
  const [savingStudies, setSavingStudies] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const cu = session?.user
      setCurrentUser(cu)

      const uid = targetId || cu?.id
      if (!uid) { sessionStorage.setItem('redirectAfterLogin', '/profile'); navigate('/login', { state: { from: '/profile' } }); return }

      const [
        { data: prof },
        { count: frs },
        { count: fng },
        { data: docs },
        { data: posts },
        { data: uniData },
        { data: badgeCatalogue },
        { data: userBadgeRows },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*, universities(name)').eq('id', uid).single(),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
        supabase.from('documents')
          .select('id, doc_type, doc_number, academic_year, professor, professor_id, pages_count, downloads, is_verified, is_flagged, created_at, files, status, quality_score, quality_signals, verification_source, flag_reason, modules(id, name, semester, filieres(faculty_id, faculties(university_id)))')
          .eq('uploader_id', uid)
          .order('created_at', { ascending: false })
          .then(res => res.error ? supabase.from('documents')
            .select('id, doc_type, doc_number, academic_year, professor, pages_count, downloads, is_verified, is_flagged, created_at, files, modules(id, name, semester)')
            .eq('uploader_id', uid)
            .order('created_at', { ascending: false }) : res),
        supabase.from('senpai_posts')
          .select('*, senpai_votes(user_id)')
          .eq('author_id', uid)
          .eq('is_approved', true)
          .order('helpful_count', { ascending: false }),
        supabase.from('universities').select('id, name').order('name'),
        supabase.from('badges').select('code, name, description, icon, tier, sort_order').order('sort_order'),
        supabase.from('user_badges').select('badge_code, awarded_at').eq('user_id', uid),
      ])

      setProfile(prof || {})
      document.title = prof?.name ? `${prof.name} — 9rawZid9ra` : 'Profil — 9rawZid9ra'
      setEditName(prof?.name || '')
      setEditBio(prof?.bio || '')
      setEditUni(prof?.university_id ? String(prof.university_id) : '')
      setEditFacId(prof?.faculty_id ? String(prof.faculty_id) : '')
      setEditFilId(prof?.filiere_id ? String(prof.filiere_id) : '')
      setEditSemester(prof?.current_semester || '')
      setBadgeCatalogue(badgeCatalogue || [])
      setEarnedBadges(Object.fromEntries((userBadgeRows || []).map(b => [b.badge_code, b.awarded_at])))
      setFollowersCount(frs || 0)
      setFollowingCount(fng || 0)
      setUploads(docs || [])
      setSenpaiPosts(posts || [])
      setUnis(uniData || [])

      if (cu && targetId && cu.id !== targetId) {
        const { count } = await supabase.from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', cu.id)
          .eq('following_id', targetId)
        setIsFollowing((count || 0) > 0)
      }

      const { data: repliesData } = await supabase
        .from('senpai_replies')
        .select('*, senpai_posts(id, title, post_type)')
        .eq('author_id', uid)
        .order('created_at', { ascending: false })
        .limit(30)
      setUserReplies(repliesData || [])

      if (!targetId || cu?.id === targetId) {
        const [{ data: downloadLogs }, { data: pts }] = await Promise.all([
          supabase.from('downloads_log')
            .select('created_at, documents(doc_type, academic_year, modules(id, name))')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(15),
          supabase.from('points_log')
            .select('points, reason, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20),
        ])
        setDlogs(downloadLogs || [])
        setPtsLog(pts || [])
      }

      setLoading(false)
    }
    load()
  }, [targetId]) // eslint-disable-line

  // Cascading École → Faculté → Filière pickers for the settings tab.
  useEffect(() => {
    if (!editUni) { setStudyFacs([]); return }
    supabase.from('faculties').select('id, name, type').eq('university_id', parseInt(editUni)).order('name')
      .then(({ data }) => {
        const facs = data || []
        setStudyFacs(facs)
        // Independent school: only the hidden root faculty exists — skip straight to filières.
        if (facs.length === 1 && facs[0].type === 'root') {
          setEditFacId(String(facs[0].id))
        } else if (!facs.some(f => String(f.id) === editFacId)) {
          setEditFacId('')
        }
      })
  }, [editUni]) // eslint-disable-line

  useEffect(() => {
    if (!editFacId) { setStudyFils([]); return }
    supabase.from('filieres').select('id, name, abbreviation, total_semesters').eq('faculty_id', parseInt(editFacId)).order('name')
      .then(({ data }) => {
        setStudyFils(data || [])
        if (!(data || []).some(f => String(f.id) === editFilId)) setEditFilId('')
      })
  }, [editFacId]) // eslint-disable-line

  const saveStudies = async () => {
    setSavingStudies(true)
    const { error } = await supabase.rpc('complete_onboarding', {
      p_university_id: editUni ? parseInt(editUni) : null,
      p_faculty_id: editFacId ? parseInt(editFacId) : null,
      p_filiere_id: editFilId ? parseInt(editFilId) : null,
      p_semester: editSemester || null,
      p_follow_modules: false,
    })
    setSavingStudies(false)
    if (error) { notify.error(error.message); return }
    notify.success('Études mises à jour')
    setProfile(p => ({
      ...p,
      university_id: editUni ? parseInt(editUni) : null,
      faculty_id: editFacId ? parseInt(editFacId) : null,
      filiere_id: editFilId ? parseInt(editFilId) : null,
      current_semester: editSemester || null,
    }))
  }

  const isOwnProfile = !targetId || (currentUser && currentUser.id === targetId)
  const totalDLReceived = uploads.reduce((s, d) => s + (d.downloads || 0), 0)
  const points = profile?.points || 0
  const level = levelFor(points)

  const handleFollow = async () => {
    if (!currentUser || currentUser.id === targetId) return
    setFollowBusy(true)
    if (isFollowing) {
      setIsFollowing(false)
      setFollowersCount(c => Math.max(0, c - 1))
      await supabase.from('user_follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId)
    } else {
      setIsFollowing(true)
      setFollowersCount(c => c + 1)
      await supabase.from('user_follows').insert({ follower_id: currentUser.id, following_id: targetId })
      supabase.from('notifications').insert({ user_id: targetId, type: 'follow', actor_id: currentUser.id }).then()
    }
    setFollowBusy(false)
  }

  const canSendMessage = currentUser && !isOwnProfile

  const startEditDoc = (doc) => {
    setMenuDocId(null)
    setEditingDocId(doc.id)
    setEditDocNumber(doc.doc_number || '')
    setEditDocYear(doc.academic_year || '')
    setEditDocProf(doc.professor_id || doc.professor ? { id: doc.professor_id, display_name: doc.professor } : null)
    setEditDocProfFac(doc.modules?.filieres?.faculty_id || null)
    setEditDocProfUni(doc.modules?.filieres?.faculties?.university_id || null)
  }

  const handleSaveDoc = async (docId) => {
    setEditDocSaving(true)
    await supabase.from('documents').update({
      doc_number: editDocNumber.trim() || null,
      academic_year: editDocYear || null,
      professor: editDocProf?.display_name || null,
      professor_id: editDocProf?.id || null,
    }).eq('id', docId)
    setUploads(u => u.map(d => d.id === docId ? {
      ...d, doc_number: editDocNumber.trim() || null, academic_year: editDocYear || null,
      professor: editDocProf?.display_name || null, professor_id: editDocProf?.id || null,
    } : d))
    setEditDocSaving(false)
    setEditingDocId(null)
  }

  const executeDeleteDoc = async () => {
    const doc = confirmDeleteDoc
    if (!doc) return
    setDeleteDocBusy(true)
    if (doc.files?.length > 0) {
      for (const url of doc.files) {
        const path = url.split('/documents/')[1]
        if (path) await supabase.storage.from('documents').remove([path])
      }
    }
    await Promise.all([
      supabase.from('document_reactions').delete().eq('document_id', doc.id),
      supabase.from('documents').delete().eq('id', doc.id),
    ])
    setUploads(u => u.filter(d => d.id !== doc.id))
    setDeleteDocBusy(false)
    setConfirmDeleteDoc(null)
  }

  const searchModules = async (q) => {
    setMoveReqSearch(q)
    setMoveReqSelMod(null)
    if (q.trim().length < 2) { setMoveReqMods([]); return }
    const { data } = await supabase.from('modules').select('id, name').ilike('name', `%${q.trim()}%`).limit(8)
    setMoveReqMods(data || [])
  }

  const submitMoveReq = async (doc) => {
    if (!moveReqSelMod || !currentUser) return
    setMoveReqBusy(true)
    await supabase.from('document_move_requests').insert({
      document_id: doc.id,
      requester_id: currentUser.id,
      requested_module_id: moveReqSelMod.id,
      requested_module_name: moveReqSelMod.name,
      status: 'open',
    })
    setMoveReqSent(p => ({ ...p, [doc.id]: true }))
    setMoveReqBusy(false)
    setMoveReqDocId(null)
    setMoveReqSearch('')
    setMoveReqSelMod(null)
    setMoveReqMods([])
    notify.success('Demande envoyée')
  }

  const handleSave = async () => {
    if (!editName.trim()) { notify.error('Le nom ne peut pas être vide.'); return }
    setSaving(true)
    const stripHtml = (s) => s.replace(/<[^>]*>/g, '').trim()
    const cleanBio = stripHtml(editBio).slice(0, 300)
    const cleanName = stripHtml(editName).slice(0, 60)
    const { error } = await supabase.from('user_profiles').update({
      name: cleanName, bio: cleanBio,
    }).eq('id', currentUser.id)
    if (!error) await supabase.auth.updateUser({ data: { name: editName.trim() } })
    setSaving(false)
    if (error) {
      notify.error('Erreur lors de la sauvegarde.')
    } else {
      notify.success('Profil mis à jour')
      setProfile(p => ({ ...p, name: cleanName, bio: cleanBio }))
    }
  }

  const saveUniFromModal = async () => {
    if (!uniModalSel || !currentUser) return
    setUniModalSaving(true)
    await supabase.from('user_profiles').update({ university_id: parseInt(uniModalSel) }).eq('id', currentUser.id)
    const uniObj = unis.find(u => String(u.id) === uniModalSel)
    setProfile(p => ({ ...p, university_id: parseInt(uniModalSel), universities: { name: uniObj?.name || '' } }))
    setUniModalSaving(false)
    setShowUniModal(false)
  }

  async function openFollowers() {
    setListLoading(true)
    const { data: follows } = await supabase.from('user_follows').select('follower_id').eq('following_id', profile.id)
    if (follows?.length) {
      const ids = follows.map(f => f.follower_id)
      const { data: users } = await supabase.from('user_profiles').select('id, name, universities(name)').in('id', ids)
      setFollowersList(users || [])
    } else { setFollowersList([]) }
    setListLoading(false)
  }

  async function openFollowing() {
    setListLoading(true)
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', profile.id)
    if (follows?.length) {
      const ids = follows.map(f => f.following_id)
      const { data: users } = await supabase.from('user_profiles').select('id, name, universities(name)').in('id', ids)
      setFollowingList(users || [])
    } else { setFollowingList([]) }
    setListLoading(false)
  }

  const openFollowSheet = (tab) => {
    setFollowSheetTab(tab)
    setShowFollowSheet(true)
    if (tab === 'followers') openFollowers(); else openFollowing()
  }

  if (loading) return (
    <div><style>{css}</style><Navbar />
      <div className="pf-layout">
        <Skeleton height={140} />
        <div style={{ marginTop: 'var(--space-4)' }}><Skeleton height={40} /></div>
        <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={64} />)}
        </div>
      </div>
    </div>
  )

  const tabList = isOwnProfile
    ? [
        { id: 'posts', label: 'Posts', count: senpaiPosts.length },
        { id: 'replies', label: 'Réponses', count: userReplies.length },
        { id: 'uploads', label: 'Uploadés', count: uploads.length },
        { id: 'settings', label: 'Paramètres' },
      ]
    : [
        { id: 'posts', label: 'Posts', count: senpaiPosts.length },
        { id: 'replies', label: 'Réponses', count: userReplies.length },
        { id: 'uploads', label: 'Uploadés', count: uploads.length },
      ]

  const recentActivity = [
    ...ptsLog.map(p => ({ key: 'p' + p.created_at, desc: p.reason || 'Points gagnés', delta: `+${p.points}`, time: p.created_at })),
    ...dlogs.map((d, i) => ({ key: 'd' + i + d.created_at, desc: `Téléchargé ${d.documents?.modules?.name || 'un document'}`, time: d.created_at })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6)

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="profile" />

      <div className="pf-layout">
        <div className="pf-header">
          <Avatar name={profile?.name || currentUser?.email} size="xl" founder={!!profile?.is_fondateur} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="pf-header__badges">
              <h1 className="t-h1" style={{ marginRight: 4 }}>{profile?.name || 'Étudiant'}</h1>
              {profile?.is_admin && <Badge tone="danger" icon="shield">Admin</Badge>}
              {profile?.is_fondateur && <Badge tone="founder" icon="star">Fondateur</Badge>}
              {profile?.is_moderator && !profile?.is_admin && <Badge tone="brand" icon="shield">Modérateur</Badge>}
            </div>
            {profile?.universities?.name && <p className="t-body-sm qz-muted">{profile.universities.name}</p>}
            {profile?.bio && <p className="t-body" style={{ marginTop: 6, maxWidth: 520 }}>{profile.bio}</p>}
            <p className="t-caption qz-subtle" style={{ marginTop: 6 }}>Membre depuis {fmtDate(profile?.created_at || currentUser?.created_at)}</p>
            {isOwnProfile && !profile?.university_id && (
              <div className="pf-nudge-row">
                <span className="t-caption qz-subtle">Ajoute ton université pour personnaliser ton expérience.</span>
                <Button variant="link" size="sm" onClick={() => { setUniModalSel(''); setShowUniModal(true) }}>Ajouter</Button>
              </div>
            )}
          </div>
          <div className="pf-header__actions">
            {isOwnProfile ? (
              <Button variant="secondary" onClick={() => setActiveTab('settings')}>Modifier le profil</Button>
            ) : currentUser && (
              <>
                <Button variant={isFollowing ? 'secondary' : 'primary'} disabled={followBusy} onClick={handleFollow}>{isFollowing ? 'Suivi' : 'Suivre'}</Button>
                {canSendMessage && (
                  <Button variant="secondary" iconOnly icon="message" aria-label="Message"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-dm', { detail: { userId: targetId, name: profile?.name || 'Étudiant' } }))} />
                )}
              </>
            )}
          </div>
        </div>

        <div className="pf-social-row">
          <button type="button" className="pf-social-stat" onClick={() => openFollowSheet('followers')}>
            <span className="t-label">{followersCount}</span><span className="t-body-sm qz-muted">Abonnés</span>
          </button>
          <button type="button" className="pf-social-stat" onClick={() => openFollowSheet('following')}>
            <span className="t-label">{followingCount}</span><span className="t-body-sm qz-muted">Abonnements</span>
          </button>
          <span className="pf-social-stat" style={{ cursor: 'default' }}>
            <span className="t-label">{senpaiPosts.length}</span><span className="t-body-sm qz-muted">Tips Senpai</span>
          </span>
        </div>

        <div className="pf-stats-wrap" style={{ marginTop: 'var(--space-4)' }}>
          <StatStrip items={[
            { value: uploads.length, label: 'Documents' },
            { value: totalDLReceived, label: 'Téléchargements' },
            { value: formatPoints(points), label: 'Points' },
          ]} />
        </div>

        <div style={{ marginTop: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Badge tone={LEVEL_TONES[level.level]}>{level.name}</Badge>
            <Button variant="ghost" size="sm" iconOnly icon="info" aria-label="Comment fonctionnent les points ?" onClick={() => setShowPointsInfo(true)} />
          </div>
          {level.next != null && (
            <div style={{ maxWidth: 280, marginTop: 8 }}>
              <ProgressBar value={level.progress * 100} />
              <p className="t-caption qz-subtle" style={{ marginTop: 4 }}>{formatPoints(level.toNext)} points avant {level.nextName}</p>
            </div>
          )}
        </div>

        {isOwnProfile && uploads.length === 0 && !uploadNudgeDismissed && (
          <div className="qz-banner" style={{ marginTop: 'var(--space-4)' }}>
            <Icon name="upload" />
            <span>Partage ton premier document et gagne <b>10 points</b> (+40 une fois vérifié).</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" size="sm" as={Link} to="/upload">Partager</Button>
              <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Fermer" onClick={() => { setUploadNudgeDismissed(true); localStorage.setItem('9rz_upload_nudge', '1') }} />
            </div>
          </div>
        )}

        {isOwnProfile && recentActivity.length > 0 && (
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <span className="t-eyebrow qz-subtle">Activité récente</span>
            <div style={{ marginTop: 8 }}>
              {recentActivity.map(a => (
                <div key={a.key} className="pf-activity-row">
                  <span className="t-body-sm qz-muted">{a.desc}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {a.delta && <span className="t-mono" style={{ color: 'var(--success)' }}>{a.delta}</span>}
                    <span className="t-caption qz-subtle">{fmtShort(a.time)}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {badgeCatalogue.length > 0 && (
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <span className="t-eyebrow qz-subtle">Badges ({Object.keys(earnedBadges).length}/{badgeCatalogue.length})</span>
            <div className="pf-badges-grid">
              {badgeCatalogue.map(b => {
                const earned = !!earnedBadges[b.code]
                const tone = BADGE_TIER_TONES[b.tier] || 'neutral'
                return (
                  <div key={b.code} className={`pf-badge-tile${earned ? '' : ' pf-badge-tile--locked'}`}
                    title={`${b.name} — ${b.description}${earned ? ` (obtenu le ${fmtShort(earnedBadges[b.code])})` : ' (à débloquer)'}`}>
                    <span className="pf-badge-tile__icon" style={{
                      background: tone === 'neutral' ? 'var(--surface-2)' : `var(--${tone}-soft)`,
                      color: tone === 'neutral' ? 'var(--text-subtle)' : `var(--${tone})`,
                    }}>
                      <Icon name={b.icon} size={20} />
                    </span>
                    <span className="pf-badge-tile__label">{b.name}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <div className="pf-tabs-wrap">
          <Tabs label="Sections du profil" value={activeTab} onChange={setActiveTab} items={tabList} />
        </div>

        {activeTab === 'uploads' && (
          uploads.length === 0 ? (
            <EmptyState icon="file" title={isOwnProfile ? "Tu n'as rien partagé encore" : 'Aucun document partagé'}>
              {isOwnProfile && <>Partage tes annales et gagne +50 points par document.</>}
              {isOwnProfile && <div style={{ marginTop: 'var(--space-3)' }}><Button variant="primary" as={Link} to="/upload">Partager un document</Button></div>}
            </EmptyState>
          ) : (
            <div className="pf-list">
              {sortDocs(uploads).map(doc => {
                const isEditing = editingDocId === doc.id
                const isMoving = moveReqDocId === doc.id
                const level = qualityLevel(doc)
                return (
                  <div key={doc.id} className="pf-doc-card">
                    <div className="qz-row" style={{ cursor: 'pointer' }} onClick={() => doc.modules?.id && navigate(`/module/${doc.modules.id}`)}>
                      <DocType type={doc.doc_type} size="lg" />
                      <div className="qz-row__main">
                        <p className="qz-row__title">{doc.modules?.name || 'Module inconnu'}</p>
                        <div className="qz-meta">
                          {doc.doc_number && <span>{doc.doc_number}</span>}
                          {doc.academic_year && <span>{doc.academic_year}</span>}
                          <span>{doc.modules?.semester || '—'}</span>
                          <span>{doc.pages_count} p.</span>
                          {doc.professor && (doc.professor_id ? (
                            <Link to={`/professeur/${doc.professor_id}`} onClick={e => e.stopPropagation()}>Prof. {doc.professor}</Link>
                          ) : <span>Prof. {doc.professor}</span>)}
                          <span>{doc.downloads || 0} ↓</span>
                          <StatusBadge {...displayStatus(doc)} />
                          {level && <QualityBadge score={doc.quality_score ?? 0} label={level.label} tone={level.tone} />}
                        </div>
                        {doc.status === 'rejected' && doc.flag_reason && (
                          <p className="t-caption" style={{ color: 'var(--danger-text, var(--danger))', marginTop: 4 }}>{doc.flag_reason}</p>
                        )}
                        {doc.status === 'needs_review' && doc.flag_reason && (
                          <p className="t-caption qz-muted" style={{ marginTop: 4 }}>{doc.flag_reason}</p>
                        )}
                      </div>
                      <span className="t-caption qz-subtle" style={{ flexShrink: 0 }}>{fmtShort(doc.created_at)}</span>
                      {isOwnProfile && (
                        <div className="qz-dropdown-anchor" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" iconOnly icon="down" aria-label="Options" onClick={() => setMenuDocId(menuDocId === doc.id ? null : doc.id)} />
                          {menuDocId === doc.id && (
                            <Dropdown items={[
                              { label: 'Modifier', icon: 'file', onClick: () => startEditDoc(doc) },
                              { label: 'Déplacer vers un autre module', icon: 'right', onClick: () => { setMenuDocId(null); setMoveReqDocId(isMoving ? null : doc.id); setMoveReqSearch(''); setMoveReqSelMod(null); setMoveReqMods([]) } },
                              { divider: true },
                              { label: 'Supprimer', icon: 'trash', danger: true, onClick: () => { setMenuDocId(null); setConfirmDeleteDoc(doc) } },
                            ]} />
                          )}
                        </div>
                      )}
                    </div>

                    {isOwnProfile && isEditing && (
                      <div className="pf-doc-card__form">
                        <span className="t-eyebrow qz-subtle">Modifier le document</span>
                        <div className="pf-doc-card__form-grid">
                          <Input label="Label / Numéro" placeholder="Ex : Examen 1, TD n°3…" value={editDocNumber} onChange={e => setEditDocNumber(e.target.value)} />
                          <Select label="Année académique" value={editDocYear} onChange={e => setEditDocYear(e.target.value)} options={[{ value: '', label: '—' }, ...YEARS.map(y => ({ value: y, label: y }))]} />
                        </div>
                        <ProfessorPicker value={editDocProf} onChange={setEditDocProf} universityId={editDocProfUni} facultyId={editDocProfFac} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="primary" size="sm" loading={editDocSaving} onClick={() => handleSaveDoc(doc.id)}>Sauvegarder</Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingDocId(null)}>Annuler</Button>
                        </div>
                      </div>
                    )}

                    {isOwnProfile && isMoving && !moveReqSent[doc.id] && (
                      <div className="pf-doc-card__form">
                        <span className="t-eyebrow qz-subtle">Quel est le bon module ?</span>
                        <div style={{ position: 'relative' }}>
                          <Input placeholder="Cherche le bon module…" value={moveReqSearch} onChange={e => searchModules(e.target.value)} autoFocus />
                          {moveReqMods.length > 0 && (
                            <div className="qz-dropdown" style={{ position: 'absolute', left: 0, right: 0, width: 'auto' }}>
                              {moveReqMods.map(m => (
                                <button type="button" key={m.id} className="qz-dropdown__item" onMouseDown={() => { setMoveReqSelMod(m); setMoveReqSearch(m.name); setMoveReqMods([]) }}>{m.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="primary" size="sm" disabled={!moveReqSelMod} loading={moveReqBusy} onClick={() => submitMoveReq(doc)}>Envoyer la demande</Button>
                          <Button variant="ghost" size="sm" onClick={() => setMoveReqDocId(null)}>Annuler</Button>
                        </div>
                      </div>
                    )}
                    {isOwnProfile && moveReqSent[doc.id] && (
                      <div className="pf-doc-card__form"><Badge tone="success" icon="check">Demande envoyée</Badge></div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {activeTab === 'posts' && (
          senpaiPosts.length === 0 ? (
            <EmptyState icon="message" title={isOwnProfile ? "Tu n'as pas encore posté" : 'Aucun post Senpai'}>
              {isOwnProfile && <>Partage ton expérience dans la Senpai Zone.</>}
              {isOwnProfile && <div style={{ marginTop: 'var(--space-3)' }}><Button variant="primary" onClick={() => navigate('/senpai')}>Aller dans la Senpai Zone</Button></div>}
            </EmptyState>
          ) : (
            <div className="pf-list">
              {senpaiPosts.map(post => {
                const votes = post.senpai_votes?.length || 0
                return (
                  <Card key={post.id} className="pf-sp-card" onClick={() => navigate('/senpai')}>
                    <div className="pf-sp-card__head">
                      <Badge tone={PT_TONE[post.post_type] || 'brand'}>{PT_LABEL[post.post_type] || 'Guide de survie'}</Badge>
                      <span className="t-caption qz-subtle">{fmtAgo(post.created_at)}</span>
                    </div>
                    <p className="t-h3" style={{ marginBottom: 4 }}>{post.title}</p>
                    <p className="t-body-sm qz-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                    <div className="qz-meta" style={{ marginTop: 8 }}>
                      <span>{votes} utile{votes !== 1 ? 's' : ''}</span>
                      <span>{post.reply_count || 0} réponse{(post.reply_count || 0) !== 1 ? 's' : ''}</span>
                      {post.is_anonymous && <span>anonyme</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        )}

        {activeTab === 'replies' && (
          userReplies.length === 0 ? (
            <EmptyState icon="reply" title={isOwnProfile ? 'Aucune réponse encore' : 'Aucune réponse'}>
              {isOwnProfile && <>Tes réponses aux posts Senpai apparaîtront ici.</>}
            </EmptyState>
          ) : (
            <div className="pf-list">
              {userReplies.map(r => (
                <Card key={r.id} className="pf-sp-card" onClick={() => navigate('/senpai')}>
                  <div className="pf-sp-card__head">
                    <span className="t-caption qz-subtle">En réponse à</span>
                    <Badge tone={PT_TONE[r.senpai_posts?.post_type] || 'brand'}>{PT_LABEL[r.senpai_posts?.post_type] || 'Guide de survie'}</Badge>
                    <span className="t-caption qz-subtle" style={{ marginLeft: 'auto' }}>{fmtAgo(r.created_at)}</span>
                  </div>
                  {r.senpai_posts?.title && <p className="t-body-sm qz-subtle" style={{ fontStyle: 'italic', marginBottom: 6 }}>« {r.senpai_posts.title} »</p>}
                  <p className="t-body">{r.content}</p>
                  {r.is_anonymous && <div className="qz-meta" style={{ marginTop: 8 }}><span>anonyme</span></div>}
                </Card>
              ))}
            </div>
          )
        )}

        {activeTab === 'settings' && isOwnProfile && (
          <div className="pf-settings-list">
            <Card>
              <span className="t-eyebrow qz-subtle">Informations personnelles</span>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Input label="Nom d'affichage" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ton nom complet" />
                <Input label="Bio" multiline maxLength={300} counter value={editBio} onChange={e => setEditBio(e.target.value.slice(0, 300))}
                  placeholder="Décris-toi en quelques mots — filière, objectifs…" />
                <div className="pf-theme-row">
                  <span className="t-label">Thème</span>
                  <ThemeToggle mode={themeMode} onToggle={cycleTheme} />
                </div>
                <div><Button variant="primary" loading={saving} onClick={handleSave}>Enregistrer</Button></div>
              </div>
            </Card>

            <Card>
              <span className="t-eyebrow qz-subtle">École, filière, semestre</span>
              <p className="t-body-sm qz-muted" style={{ margin: '4px 0 var(--space-4)' }}>Utilisé pour personnaliser ta page d'accueil et tes modules suivis.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Select label="Université" value={editUni} onChange={e => setEditUni(e.target.value)}
                  options={[{ value: '', label: 'Sélectionner une université' }, ...unis.map(u => ({ value: String(u.id), label: u.name }))]} />
                {studyFacs.length > 1 || (studyFacs.length === 1 && studyFacs[0].type !== 'root') ? (
                  <Select label="Faculté" value={editFacId} onChange={e => setEditFacId(e.target.value)}
                    options={[{ value: '', label: 'Sélectionner une faculté' }, ...studyFacs.map(f => ({ value: String(f.id), label: f.name }))]} />
                ) : null}
                <Select label="Filière" value={editFilId} onChange={e => setEditFilId(e.target.value)} disabled={!editFacId}
                  options={[{ value: '', label: 'Sélectionner une filière' }, ...studyFils.map(f => ({ value: String(f.id), label: f.abbreviation ? `${f.name} (${f.abbreviation})` : f.name }))]} />
                <Select label="Semestre" value={editSemester} onChange={e => setEditSemester(e.target.value)} disabled={!editFilId}
                  options={[{ value: '', label: 'Sélectionner un semestre' }, ...Array.from({ length: studyFils.find(f => String(f.id) === editFilId)?.total_semesters || 10 }, (_, i) => `S${i + 1}`).map(s => ({ value: s, label: s }))]} />
                <div><Button variant="secondary" loading={savingStudies} onClick={saveStudies}>Enregistrer</Button></div>
              </div>
            </Card>

            <Card>
              <span className="t-eyebrow qz-subtle">Sécurité du compte</span>
              <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-3) 0' }}>Pour changer ton mot de passe, tu recevras un email à <b style={{ color: 'var(--text)' }}>{currentUser?.email}</b>.</p>
              <Button variant="secondary" onClick={() => navigate('/forgot-password')}>Changer le mot de passe</Button>
            </Card>

            <Card>
              <span className="t-eyebrow qz-subtle">Soutenir 9rawZid9ra</span>
              <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-3) 0' }}>9rawZid9ra est 100% gratuit. Un pourboire nous aide à grandir.</p>
              <Button variant="secondary" as="a" href="https://paypal.me/saadga2003" target="_blank" rel="noreferrer">Envoyer un pourboire</Button>
            </Card>

            <Card>
              <span className="t-eyebrow qz-subtle">Zone de danger</span>
              <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-3) 0' }}>Se déconnecter de cet appareil.</p>
              <Button variant="danger-ghost" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Se déconnecter</Button>
            </Card>
          </div>
        )}
      </div>

      {showFollowSheet && (
        <Sheet title={followSheetTab === 'followers' ? `Abonnés · ${followersCount}` : `Abonnements · ${followingCount}`} onClose={() => setShowFollowSheet(false)}>
          <Tabs label="Type" variant="pill" value={followSheetTab} onChange={openFollowSheet} items={[{ id: 'followers', label: 'Abonnés' }, { id: 'following', label: 'Abonnements' }]} />
          <div style={{ marginTop: 'var(--space-4)' }}>
            {listLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[...Array(4)].map((_, i) => <Skeleton key={i} height={44} />)}</div>
            ) : (followSheetTab === 'followers' ? followersList : followingList).length === 0 ? (
              <EmptyState icon="user" title={followSheetTab === 'followers' ? 'Aucun abonné pour l’instant' : 'Aucun abonnement pour l’instant'} />
            ) : (followSheetTab === 'followers' ? followersList : followingList).map(u => (
              <button type="button" key={u.id} className="pf-follow-row" onClick={() => { setShowFollowSheet(false); navigate(`/user/${u.id}`) }}>
                <Avatar name={u.name} size="sm" />
                <span>
                  <span className="t-label" style={{ display: 'block' }}>{u.name}</span>
                  {u.universities?.name && <span className="t-caption qz-subtle">{u.universities.name}</span>}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {showPointsInfo && (
        <Sheet title="Système de points" onClose={() => setShowPointsInfo(false)}>
          <span className="t-eyebrow qz-subtle">Comment gagner des points</span>
          <div style={{ marginTop: 8, marginBottom: 'var(--space-5)' }}>
            {POINT_RULES.filter(r => r.key !== 'admin_adjustment').map(r => (
              <div key={r.key} className="pf-activity-row">
                <span className="t-body-sm qz-muted">{r.label}</span>
                <span className="t-mono" style={{ color: r.points > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {r.points > 0 ? `+${r.points}` : r.points} pts
                </span>
              </div>
            ))}
          </div>
          <span className="t-eyebrow qz-subtle">Niveaux</span>
          <div style={{ marginTop: 8 }}>
            {LEVELS.map(l => (
              <div key={l.level} className="pf-activity-row">
                <Badge tone={LEVEL_TONES[l.level]}>{l.name}</Badge>
                <span className="t-caption qz-subtle">{formatPoints(l.min)}+ pts</span>
              </div>
            ))}
          </div>
          <p className="t-body-sm qz-muted" style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>Plus tu contribues, plus tu montes en grade.</p>
        </Sheet>
      )}

      {confirmDeleteDoc && (
        <ConfirmModal
          title="Supprimer ce document ?"
          message={`${confirmDeleteDoc.modules?.name || 'Document'} sera supprimé définitivement. -50 points, action irréversible.`}
          confirmText={deleteDocBusy ? 'Suppression…' : 'Supprimer'}
          confirmColor="#F87171"
          onConfirm={executeDeleteDoc}
          onCancel={() => !deleteDocBusy && setConfirmDeleteDoc(null)}
        />
      )}

      {showUniModal && (
        <div className="qz-scrim" onClick={() => setShowUniModal(false)}>
          <div className="qz-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2 className="qz-modal__title">Quelle est ton université ?</h2>
            <p className="qz-modal__body">Personnalise ton expérience pour voir directement les modules de ton université.</p>
            <div style={{ margin: 'var(--space-4) 0' }}>
              <Select value={uniModalSel} onChange={e => setUniModalSel(e.target.value)}
                options={[{ value: '', label: 'Sélectionner ton université…' }, ...unis.map(u => ({ value: String(u.id), label: u.name }))]} />
            </div>
            <div className="qz-modal__actions">
              <Button variant="secondary" onClick={() => setShowUniModal(false)}>Annuler</Button>
              <Button variant="primary" disabled={!uniModalSel} loading={uniModalSaving} onClick={saveUniFromModal}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
