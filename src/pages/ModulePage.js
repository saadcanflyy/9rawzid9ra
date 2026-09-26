import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  Breadcrumb, Button, Badge, DocType, Tabs, Chip, EmptyState, Card, Icon, Avatar,
  ProgressBar, Sheet, Skeleton, Select, QualityBadge, QualityCard, FeedbackPrompt, ReportModal, Toast, StatusBadge,
  LevelBadge, ModuleCard, Banner,
} from '../design-system/ui'
import { notify } from '../design-system/toast'
import { qualityLevel, qualityChecklist, isUnrated, REPORT_REASONS, displayStatus } from '../lib/quality'
import { levelFor } from '../lib/reputation'
import { cachedRpc } from '../lib/rpcCache'
import { contactSenpai, senpaiContactErrorMessage } from '../lib/senpai'

const css = `
  .mp-hero { padding: var(--space-8) var(--space-6); border-bottom: 1px solid var(--border); background: var(--surface); }
  .mp-hero__inner { max-width: 1000px; margin: 0 auto; }
  .mp-hero__top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
  .mp-hero__actions { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-4); }
  .mp-layout { max-width: 1300px; margin: 0 auto; padding: var(--space-6); display: grid; grid-template-columns: 1fr 320px; gap: var(--space-8); align-items: start; }
  @media (max-width: 1023px) { .mp-layout { grid-template-columns: 1fr; } }
  .mp-tabs-wrap { position: sticky; top: 56px; z-index: 10; background: var(--bg); padding: var(--space-3) 0; margin-bottom: var(--space-4); }
  .mp-tabs-scroll { overflow-x: auto; scrollbar-width: none; }
  .mp-tabs-scroll::-webkit-scrollbar { display: none; }
  .mp-group { margin-bottom: var(--space-6); }
  .mp-group__head { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
  .mp-doc-card { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: var(--space-2); background: var(--surface); }
  .mp-doc-card__footer { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border); flex-wrap: wrap; }
  .mp-stars { display: flex; align-items: center; gap: 2px; }
  .mp-star { background: none; border: 0; cursor: pointer; padding: 2px; display: flex; }
  .mp-multi-files { display: flex; flex-direction: column; gap: 6px; }
  .mp-aside { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: 72px; }
  @media (max-width: 1023px) { .mp-aside { position: static; } }
  .mp-info-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 8px 0; border-bottom: 1px solid var(--border); }
  .mp-info-row:last-child { border-bottom: 0; }
  .mp-type-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
  .mp-type-row:last-child { margin-bottom: 0; }
  .mp-type-row__bar { flex: 1; }
  .mp-type-row__label { width: 110px; flex-shrink: 0; }
  .mp-related-section { max-width: 1300px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-12); }
  .mp-related-group { margin-bottom: var(--space-6); }
  .mp-related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); margin-top: var(--space-3); }
  .mp-missing-strip { max-width: 1000px; margin: 0 0 var(--space-4); }
  .mp-senpai-list { display: flex; flex-direction: column; gap: var(--space-2); }
  .mp-senpai-card { display: block; padding: var(--space-3); text-decoration: none; color: inherit; cursor: pointer; }
  .mp-senpai-card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-2); }
  .mp-req-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
  .mp-req-row:last-child { border-bottom: 0; }
  .mp-req-form { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); }
  .mp-preview-layout { display: flex; gap: var(--space-6); flex: 1; min-height: 0; }
  .mp-preview-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .mp-preview-side { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: var(--space-4); overflow-y: auto; }
  @media (max-width: 860px) { .mp-preview-layout { flex-direction: column; } .mp-preview-side { width: 100%; } }
`

const TYPE_LABELS = {
  examen: 'Examen final', cc: 'Contrôle continu', td: 'TD', tp: 'TP', cours: 'Cours',
  corrige_examen: 'Corrigé examen', corrige_td: 'Corrigé TD', corrige_tp: 'Corrigé TP',
  quiz: 'Quiz', projet_final: 'Projet final',
}
const GROUP_ORDER = ['examen', 'cc', 'td', 'tp', 'cours', 'corrige_examen', 'corrige_td', 'corrige_tp', 'quiz', 'projet_final']
const TABS = [
  { k: 'all', l: 'Tous' }, { k: 'examen', l: 'Examens' }, { k: 'cc', l: 'CC' }, { k: 'td', l: 'TD' },
  { k: 'tp', l: 'TP' }, { k: 'cours', l: 'Cours' }, { k: 'corrige', l: 'Corrigés' },
  { k: 'quiz', l: 'Quiz' }, { k: 'projet_final', l: 'Projet final' },
]
const matchesTab = (doc, tabKey) => tabKey === 'all' ? true : tabKey === 'corrige' ? doc.doc_type.startsWith('corrige') : doc.doc_type === tabKey

const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'à l\'instant'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

const STATUS_RANK = { verified: 0, community_approved: 1, pending: 2, rejected: 3 }

export default function ModulePage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const id = slug.split('-').pop()

  const [mod, setMod] = useState(null)
  const [docs, setDocs] = useState([])
  const [relatedModules, setRelatedModules] = useState(null)
  const [moduleOverview, setModuleOverview] = useState(null)
  const [moduleSenpai, setModuleSenpai] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [senpaiPosts, setSenpaiPosts] = useState([])
  const { user } = useAuth()
  const [userReactions, setUserReactions] = useState({})
  const [isBookmarked, setIsBookmarked] = useState(false)
  const docsRef = useRef([])
  const [requests, setRequests] = useState({})
  const [userRequested, setUserRequested] = useState({})
  const [previewDoc, setPreviewDoc] = useState(null)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)
  const [showReqModal, setShowReqModal] = useState(false)
  const [reqModalType, setReqModalType] = useState('')
  const [docFeedback, setDocFeedback] = useState({})
  const [viewedDocs, setViewedDocs] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('9rz_viewed_docs') || '[]')) } catch { return new Set() }
  })

  const markViewed = (docId) => {
    setViewedDocs(prev => {
      if (prev.has(docId)) return prev
      const next = new Set(prev); next.add(docId)
      try { sessionStorage.setItem('9rz_viewed_docs', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: m } = await supabase
          .from('modules')
          .select(`*, filieres(name, total_semesters, faculty_id, faculties(name, universities(name, id)))`)
          .eq('id', parseInt(id))
          .single()

        setMod(m)
        if (m) {
          const uniName = m.filieres?.faculties?.universities?.name
          const filName = m.filieres?.name
          document.title = uniName ? `${m.name} — ${uniName} — 9rawZid9ra` : `${m.name} — 9rawZid9ra`
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) {
            const parts = [m.name, 'Examens, TD, TP et cours', filName, uniName].filter(Boolean)
            metaDesc.setAttribute('content', parts.join(' — ') + ' — 9rawZid9ra')
          }
          // Run in parallel, never block the rest of the page.
          cachedRpc(supabase, 'get_module_overview', { p_module_id: parseInt(id) })
            .then(({ data, error }) => { if (!error) setModuleOverview(data) })
          cachedRpc(supabase, 'get_related_modules', { p_module_id: parseInt(id), p_limit: 6 })
            .then(({ data, error }) => setRelatedModules(error ? [] : (data || [])))
          if (user && m.filiere_id) {
            cachedRpc(supabase, 'get_filiere_senpais', { p_filiere_id: m.filiere_id }, 60000)
              .then(({ data, error }) => setModuleSenpai(error || !data?.length ? null : data[0]))
          }
        }

        // Visible: published/verified to everyone, plus your own regardless of status
        // (pending_review/needs_review show with a badge; rejected shows greyed with the reason).
        const docSelect = user ? '*, user_profiles!uploader_id(name, is_fondateur, points)' : '*'
        let docQuery = supabase.from('documents').select(docSelect).eq('module_id', parseInt(id))
        docQuery = user
          ? docQuery.or(`status.in.(published,verified),uploader_id.eq.${user.id}`)
          : docQuery.in('status', ['published', 'verified'])
        let { data: d, error: docErr } = await docQuery.order('created_at', { ascending: false })
        if (docErr) {
          // Migration not applied yet (no documents.status column) — fall back to the old visibility rule.
          const fallback = await supabase.from('documents').select(docSelect).eq('module_id', parseInt(id)).eq('is_flagged', false).order('created_at', { ascending: false })
          d = fallback.data
        }
        setDocs(d || [])
        docsRef.current = d || []

        if (user && m) {
          const { data: bm } = await supabase.from('module_bookmarks')
            .select('id').eq('user_id', user.id).eq('module_id', parseInt(id)).maybeSingle()
          setIsBookmarked(!!bm)
        }

        if (user && (d || []).length > 0) {
          const { data: rxns } = await supabase.from('document_reactions')
            .select('*').eq('user_id', user.id).in('document_id', d.map(doc => doc.id))
          const rxnMap = {}
          rxns?.forEach(r => {
            if (!rxnMap[r.document_id]) rxnMap[r.document_id] = {}
            if (r.reaction_type === 'helpful') rxnMap[r.document_id].helpful = true
            if (r.reaction_type === 'rating') rxnMap[r.document_id].rating = r.rating
            if (r.reaction_type === 'report') rxnMap[r.document_id].reported = true
          })
          try {
            JSON.parse(localStorage.getItem('signaled_docs') || '[]').forEach(id => {
              if (!rxnMap[id]) rxnMap[id] = {}
              rxnMap[id].reported = true
            })
          } catch {}
          setUserReactions(rxnMap)

          const { data: fb } = await supabase.from('document_feedback')
            .select('document_id, correct_module, readable, complete').eq('user_id', user.id).in('document_id', d.map(doc => doc.id))
          const fbMap = {}
          fb?.forEach(f => { fbMap[f.document_id] = { correct_module: f.correct_module, readable: f.readable, complete: f.complete } })
          setDocFeedback(fbMap)
        }

        const { data: reqs } = await supabase.from('document_requests')
          .select('*, document_request_votes(user_id)')
          .eq('module_id', parseInt(id)).eq('status', 'open')
        const reqMap = {}; const userReqMap = {}
        reqs?.forEach(r => {
          reqMap[r.doc_type] = r
          userReqMap[r.doc_type] = r.document_request_votes?.some(v => v.user_id === user?.id) || false
        })
        setRequests(reqMap)
        setUserRequested(userReqMap)

        supabase.from('senpai_posts')
          .select('*, user_profiles(name, universities(name)), senpai_votes(user_id)')
          .eq('module_id', parseInt(id))
          .eq('is_approved', true)
          .order('helpful_count', { ascending: false })
          .limit(3)
          .then(({ data }) => setSenpaiPosts(data || []))
      } catch (err) {
        console.error('ModulePage load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // real-time: new docs uploaded to this module appear instantly
  useEffect(() => {
    const channel = supabase
      .channel(`module-docs-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, async payload => {
        if (String(payload.new.module_id) !== String(id) || payload.new.is_flagged) return
        const { data } = await supabase
          .from('documents').select('*, user_profiles!uploader_id(name, is_fondateur, points)').eq('id', payload.new.id).single()
        if (data) setDocs(prev => prev.some(d => d.id === data.id) ? prev : [data, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documents' }, async payload => {
        if (String(payload.new.module_id) !== String(id)) return
        if (payload.new.is_flagged) { setDocs(prev => prev.filter(d => d.id !== payload.new.id)); return }
        setDocs(prev => {
          if (prev.some(d => d.id === payload.new.id)) return prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d)
          return prev
        })
        const alreadyPresent = docsRef.current.some(d => d.id === payload.new.id)
        if (!alreadyPresent && !payload.new.is_flagged) {
          const { data } = await supabase
            .from('documents').select('*, user_profiles!uploader_id(name, is_fondateur, points)').eq('id', payload.new.id).single()
          if (data) setDocs(prev => prev.some(d => d.id === data.id) ? prev : [data, ...prev])
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  const tabDocs = docs.filter(d => matchesTab(d, activeTab))
    .filter(d => !verifiedOnly || ['verified', 'community_approved'].includes(displayStatus(d)?.key))
  const grouped = GROUP_ORDER.reduce((acc, type) => {
    const group = tabDocs.filter(d => d.doc_type === type)
    if (group.length > 0) {
      acc[type] = [...group].sort((a, b) => {
        const r = (STATUS_RANK[displayStatus(a)?.key] ?? 2) - (STATUS_RANK[displayStatus(b)?.key] ?? 2)
        if (r !== 0) return r
        const q = (b.quality_score || 0) - (a.quality_score || 0)
        if (q !== 0) return q
        return (b.academic_year || '').localeCompare(a.academic_year || '')
      })
    }
    return acc
  }, {})

  const typeCounts = GROUP_ORDER.reduce((acc, k) => { acc[k] = docs.filter(d => d.doc_type === k).length; return acc }, {})
  const maxCount = Math.max(...Object.values(typeCounts), 1)
  const tabCount = (k) => docs.filter(d => matchesTab(d, k)).length

  const handleDownload = (doc) => {
    if (!user) { setShowAuthGate(true); return }
    if (doc.files && doc.files.length > 0) window.open(doc.files[0], '_blank')
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, downloads: (d.downloads || 0) + 1 } : d))
    supabase.rpc('record_download', { p_document_id: doc.id }).then()
    markViewed(doc.id)
    if (doc.uploader_id !== user.id) {
      toast.custom((t) => (
        <div style={{ opacity: t.visible ? 1 : 0, transition: 'opacity .15s ease' }}>
          <Toast tone="success" title="Téléchargé">
            <Button variant="link" size="sm" onClick={() => { toast.dismiss(t.id); setPreviewDoc(doc) }}>Donner mon avis</Button>
          </Toast>
        </div>
      ), { duration: 6000 })
    }
  }

  const handleHelpful = async (doc) => {
    if (!user) { setShowAuthGate(true); return }
    const isH = userReactions[doc.id]?.helpful
    setUserReactions(p => ({ ...p, [doc.id]: { ...p[doc.id], helpful: !isH } }))
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, helpful_count: Math.max(0, (d.helpful_count || 0) + (isH ? -1 : 1)) } : d))
    if (isH) {
      await supabase.from('document_reactions').delete().eq('user_id', user.id).eq('document_id', doc.id).eq('reaction_type', 'helpful')
    } else {
      await supabase.from('document_reactions').insert({ user_id: user.id, document_id: doc.id, reaction_type: 'helpful' })
    }
    const { data: freshDoc } = await supabase.from('documents').select('helpful_count').eq('id', doc.id).single()
    if (freshDoc) setDocs(p => p.map(d => d.id === doc.id ? { ...d, helpful_count: freshDoc.helpful_count } : d))
  }

  const handleRating = async (doc, star) => {
    if (!user) { setShowAuthGate(true); return }
    const prev = userReactions[doc.id]?.rating || 0
    await supabase.from('document_reactions')
      .upsert({ user_id: user.id, document_id: doc.id, reaction_type: 'rating', rating: star },
        { onConflict: 'user_id,document_id,reaction_type' })
    const newSum = (doc.rating_sum || 0) - prev + star
    const newCount = prev === 0 ? (doc.rating_count || 0) + 1 : (doc.rating_count || 0)
    setUserReactions(p => ({ ...p, [doc.id]: { ...p[doc.id], rating: star } }))
    setDocs(p => p.map(d => d.id === doc.id ? { ...d, rating_sum: newSum, rating_count: newCount } : d))
  }

  const handleReport = async (doc, reason, details) => {
    if (!user) { setShowAuthGate(true); return }
    setReportTarget(null)
    if (userReactions[doc.id]?.reported) return
    setUserReactions(p => ({ ...p, [doc.id]: { ...p[doc.id], reported: true } }))
    try {
      const stored = JSON.parse(localStorage.getItem('signaled_docs') || '[]')
      if (!stored.includes(doc.id)) localStorage.setItem('signaled_docs', JSON.stringify([...stored, doc.id]))
    } catch {}
    const { error } = await supabase.rpc('report_document', { p_document_id: doc.id, p_reason: reason, p_details: details || null })
    if (error) { notify.error(error.message); return }
    notify.success('Document signalé', 'Notre équipe va vérifier.')
  }

  const handleFeedbackAnswer = async (doc, key, value) => {
    if (!user) { setShowAuthGate(true); return }
    if (doc.uploader_id === user.id) return // the database refuses self-reviews anyway
    const payload = { document_id: doc.id, user_id: user.id, ...docFeedback[doc.id], [key]: value }
    setDocFeedback(p => ({ ...p, [doc.id]: { ...p[doc.id], [key]: value } }))
    const { error } = await supabase.from('document_feedback').upsert(payload, { onConflict: 'document_id,user_id' })
    if (error) { notify.error(error.message); return }
    notify.success('Merci ! +1 point')
  }

  const handleBookmark = async () => {
    if (!user) { setShowAuthGate(true); return }
    if (isBookmarked) {
      await supabase.from('module_bookmarks').delete().eq('user_id', user.id).eq('module_id', parseInt(id))
      setIsBookmarked(false)
    } else {
      await supabase.from('module_bookmarks').insert({ user_id: user.id, module_id: parseInt(id) })
      setIsBookmarked(true)
    }
  }

  const handleRequest = async (docType) => {
    if (!user) { setShowAuthGate(true); return }
    const existing = requests[docType]
    if (existing) {
      if (userRequested[docType]) return
      await supabase.from('document_request_votes').insert({ user_id: user.id, request_id: existing.id })
      const { data: freshReq } = await supabase.from('document_requests').select('*').eq('id', existing.id).single()
      const newVotes = freshReq?.votes ?? (existing.votes || 0) + 1
      if (newVotes >= 5 && mod?.filiere_id) {
        const { data: filUploaders } = await supabase.rpc('get_top_uploaders_in_filiere',
          { filiere_id_param: mod.filiere_id, limit_param: 3 })
        const uids = (filUploaders || []).map(u => u.user_id).filter(uid => uid !== user.id)
        for (const uid of uids) {
          await supabase.from('notifications').insert({
            user_id: uid, type: 'doc_request', actor_id: user.id,
            post_title: `${newVotes} étudiants demandent un(e) ${TYPE_LABELS[docType] || docType} pour ${mod?.name}`,
          })
        }
      }
      setRequests(p => ({ ...p, [docType]: freshReq || { ...existing, votes: newVotes } }))
      setUserRequested(p => ({ ...p, [docType]: true }))
    } else {
      const { data: newReq } = await supabase.from('document_requests')
        .insert({ user_id: user.id, module_id: parseInt(id), doc_type: docType, votes: 1, status: 'open' })
        .select().single()
      if (newReq) {
        await supabase.from('document_request_votes').insert({ user_id: user.id, request_id: newReq.id })
        setRequests(p => ({ ...p, [docType]: newReq }))
        setUserRequested(p => ({ ...p, [docType]: true }))
      }
    }
    notify.success('Demande envoyée')
    setShowReqModal(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`https://9rawzid9ra.space/module/${slug}`)
    notify.info('Lien copié')
  }

  if (loading) return (
    <div>
      <style>{css}</style>
      <Navbar />
      <div className="mp-hero"><div className="mp-hero__inner"><Skeleton height={20} width={200} /><Skeleton height={38} width="55%" style={{ marginTop: 12 }} /><Skeleton height={16} width={320} style={{ marginTop: 12 }} /></div></div>
      <div className="mp-layout">
        <div>{[...Array(4)].map((_, i) => <Card key={i} style={{ marginBottom: 8 }}><Skeleton height={56} /></Card>)}</div>
        <div className="mp-aside"><Card><Skeleton height={140} /></Card><Card><Skeleton height={100} /></Card></div>
      </div>
    </div>
  )

  if (!mod) return (
    <div>
      <style>{css}</style>
      <Navbar />
      <div style={{ padding: 'var(--space-16) var(--space-6)' }}>
        <EmptyState icon="alert" title="Module introuvable">
          Ce module n'existe pas ou a été déplacé.
          <div style={{ marginTop: 'var(--space-4)' }}><Button variant="primary" as={Link} to="/browse">Retour à l'explorateur</Button></div>
        </EmptyState>
      </div>
    </div>
  )

  const uniName = mod.filieres?.faculties?.universities?.name
  const uniId = mod.filieres?.faculties?.universities?.id
  const facName = mod.filieres?.faculties?.name
  const filName = mod.filieres?.name
  const totalDownloads = docs.reduce((s, d) => s + (d.downloads || 0), 0)
  const totalTypes = GROUP_ORDER.length
  const distinctTypes = new Set(docs.map(d => d.doc_type)).size
  const coverageTone = distinctTypes >= 7 ? 'success' : distinctTypes >= 4 ? 'warning' : 'danger'
  const openRequests = Object.values(requests)

  const breadcrumbItems = [
    { label: 'Explorer', href: '/browse' },
    uniName && { label: uniName, href: `/browse?uni=${uniId}` },
    facName && { label: facName },
    filName && { label: filName },
    { label: mod.name },
  ].filter(Boolean)

  return (
    <div>
      <style>{css}</style>
      <Navbar />

      <div className="mp-hero">
        <div className="mp-hero__inner">
          <Breadcrumb items={breadcrumbItems} linkAs={Link} />
          <div className="mp-hero__top" style={{ marginTop: 'var(--space-3)' }}>
            <div>
              <span className="t-eyebrow qz-subtle">S{mod.semester}{filName ? ` · ${filName}` : ''}{facName ? ` · ${facName}` : ''}</span>
              <h1 className="t-h1" style={{ marginTop: 4 }}>{mod.name}</h1>
              {moduleOverview?.professors?.length > 0 && (
                <div className="qz-meta" style={{ marginTop: 6 }}>
                  <span>Enseigné par</span>
                  {moduleOverview.professors.map((p, i) => (
                    <span key={p.id}>
                      <Link to={`/professeur/${p.id}`}>{p.name}</Link>{i < moduleOverview.professors.length - 1 ? ' ·' : ''}
                    </span>
                  ))}
                </div>
              )}
              {moduleSenpai && (
                <p className="t-caption qz-subtle" style={{ marginTop: 6 }}>
                  Une question sur ce module ?{' '}
                  <button type="button" className="qz-btn qz-btn--link" style={{ fontSize: 13 }}
                    onClick={async () => {
                      try { await contactSenpai(supabase, moduleSenpai) }
                      catch (error) { notify.error(senpaiContactErrorMessage(error)) }
                    }}>
                    Demande à {moduleSenpai.name} (senpai {filName || ''})
                  </button>
                </p>
              )}
            </div>
          </div>
          {docs.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)' }}><Badge tone={coverageTone}>{distinctTypes}/{totalTypes} types de documents disponibles</Badge></div>
          )}
          <div className="qz-meta" style={{ marginTop: 'var(--space-3)' }}>
            <span><b>{docs.length}</b> document{docs.length !== 1 ? 's' : ''}</span>
            <span><b>{totalDownloads}</b> téléchargement{totalDownloads !== 1 ? 's' : ''}</span>
            {docs[0] && <span>mis à jour {fmtAgo(docs[0].created_at)}</span>}
          </div>
          <div className="mp-hero__actions">
            <Button variant="primary" icon="upload" as={Link} to="/upload">Partager un document</Button>
            <Button variant="secondary" icon="bookmark" aria-pressed={isBookmarked} onClick={handleBookmark}>{isBookmarked ? 'Suivi' : 'Suivre'}</Button>
            <Button variant="ghost" iconOnly icon="send" aria-label="Partager le lien" onClick={copyLink} />
          </div>
        </div>
      </div>

      <div className="mp-layout">
        <div>
          <div className="mp-tabs-wrap">
            <div className="mp-tabs-scroll">
              <Tabs label="Types de documents" value={activeTab} onChange={setActiveTab}
                items={TABS.map(t => ({ id: t.k, label: t.l, count: t.k === 'all' ? undefined : (tabCount(t.k) || undefined) }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-2)' }}>
              <Chip selected={!verifiedOnly} onClick={() => setVerifiedOnly(false)}>Tous</Chip>
              <Chip selected={verifiedOnly} onClick={() => setVerifiedOnly(true)}>Validés</Chip>
            </div>
          </div>

          {moduleOverview?.missing_types?.length > 0 && (
            <div className="mp-missing-strip">
              <Banner action={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" disabled={userRequested[moduleOverview.missing_types[0]]}
                    onClick={() => handleRequest(moduleOverview.missing_types[0])}>
                    {userRequested[moduleOverview.missing_types[0]] ? 'Demande envoyée' : 'Demander'}
                  </Button>
                  <Button variant="ghost" size="sm" as={Link} to={`/upload?module=${mod.id}&type=${moduleOverview.missing_types[0]}`}>Je l'ai, je partage</Button>
                </div>
              }>
                Pas encore de : {moduleOverview.missing_types.map(t => TYPE_LABELS[t] || t).join(' · ')}
              </Banner>
            </div>
          )}

          {tabDocs.length === 0 ? (
            activeTab !== 'all' ? (
              <EmptyState icon="inbox" title={`Pas encore de ${TABS.find(t => t.k === activeTab)?.l.toLowerCase()}`}>
                {requests[activeTab === 'corrige' ? 'corrige_examen' : activeTab]
                  ? `${requests[activeTab]?.votes || 0} étudiant(s) ont déjà demandé ce document.`
                  : 'Sois le premier à demander ce document à la communauté.'}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button variant="secondary" disabled={userRequested[activeTab]} onClick={() => handleRequest(activeTab === 'corrige' ? 'corrige_examen' : activeTab)}>
                    {userRequested[activeTab] ? 'Demande envoyée' : 'Demander ce document'}
                  </Button>
                  <Button variant="ghost" as={Link} to="/upload">Partager moi-même</Button>
                </div>
              </EmptyState>
            ) : (
              <EmptyState icon="file" title="Aucun document disponible">
                Sois le premier à partager un document pour ce module. Les 100 premiers contributeurs gagnent le badge Fondateur.
                <div style={{ marginTop: 'var(--space-2)' }}><Button variant="primary" as={Link} to="/upload">Partager le premier document</Button></div>
              </EmptyState>
            )
          ) : (
            GROUP_ORDER.filter(type => grouped[type]).map(type => {
              const groupDocs = grouped[type]
              return (
                <div key={type} className="mp-group">
                  {activeTab === 'all' && (
                    <div className="mp-group__head">
                      <span className="t-eyebrow qz-subtle">{TYPE_LABELS[type]}</span>
                      <Badge tone="brand">{groupDocs.length}</Badge>
                    </div>
                  )}
                  {groupDocs.map(doc => {
                    const isRejected = doc.status === 'rejected'
                    const isOwn = user && doc.uploader_id === user.id
                    const level = qualityLevel(doc)
                    return (
                    <div key={doc.id} id={`doc-${doc.id}`} className="mp-doc-card" style={isRejected ? { opacity: 0.55 } : undefined}>
                      <div className="qz-row" style={{ cursor: doc.files?.length === 1 && !isRejected ? 'pointer' : 'default' }}
                        onClick={() => { if (doc.files?.length === 1 && !isRejected) handleDownload(doc) }}>
                        <DocType type={doc.doc_type} size="lg" />
                        <div className="qz-row__main">
                          <p className="qz-row__title">{doc.doc_number || TYPE_LABELS[doc.doc_type] || doc.doc_type}</p>
                          <div className="qz-meta">
                            {doc.academic_year && <span>{doc.academic_year}</span>}
                            {doc.professor && (doc.professor_id ? (
                              <Link to={`/professeur/${doc.professor_id}`} onClick={e => e.stopPropagation()}>Prof. {doc.professor}</Link>
                            ) : <span>Prof. {doc.professor}</span>)}
                            <span>{doc.files?.length > 1 ? `${doc.files.length} fichiers` : `${doc.pages_count || 1} p.`}</span>
                            <span>{doc.downloads || 0} ↓</span>
                            <span>
                              Partagé par{' '}
                              <button type="button" className="qz-btn qz-btn--link" style={{ fontSize: 13 }} onClick={e => { e.stopPropagation(); navigate(`/user/${doc.uploader_id}`) }}>
                                {doc.user_profiles?.name || 'Anonyme'}
                              </button>
                            </span>
                            {doc.user_profiles?.is_fondateur && <Badge tone="founder" icon="star">Fondateur</Badge>}
                            {(() => { const upLvl = levelFor(doc.user_profiles?.points || 0); return <LevelBadge tone={upLvl.tone} icon={upLvl.icon} name={upLvl.name} /> })()}
                            <StatusBadge {...displayStatus(doc)} />
                            {level && <QualityBadge score={doc.quality_score ?? 0} label={level.label} tone={level.tone} />}
                          </div>
                          {isOwn && isRejected && doc.flag_reason && (
                            <p className="t-caption" style={{ color: 'var(--danger)', marginTop: 4 }}>Raison : {doc.flag_reason}</p>
                          )}
                        </div>
                        {doc.files?.length > 1 ? (
                          <div className="mp-multi-files" onClick={e => e.stopPropagation()}>
                            {doc.files.map((fileUrl, i) => (
                              <Button key={i} variant="secondary" size="sm" onClick={() => {
                                if (!user) { setShowAuthGate(true); return }
                                window.open(fileUrl, '_blank')
                                if (i === 0) {
                                  setDocs(p => p.map(d => d.id === doc.id ? { ...d, downloads: (d.downloads || 0) + 1 } : d))
                                  supabase.rpc('record_download', { p_document_id: doc.id }).then()
                                }
                              }}>
                                {doc.file_names?.[i] ? doc.file_names[i].replace(/\.[^/.]+$/, '').replace(/_/g, ' ') : `Fichier ${i + 1}`}
                              </Button>
                            ))}
                          </div>
                        ) : doc.files?.length === 1 ? (
                          <div className="qz-row__actions" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" iconOnly icon="eye" aria-label="Aperçu" onClick={() => {
                              if (!user) { setShowAuthGate(true); return }
                              markViewed(doc.id)
                              if (window.innerWidth <= 768) window.open(doc.files[0], '_blank')
                              else setPreviewDoc(doc)
                            }} />
                            <Button variant="secondary" size="sm" icon="download" onClick={() => handleDownload(doc)}>Télécharger</Button>
                          </div>
                        ) : null}
                      </div>
                      <div className="mp-doc-card__footer">
                        <Button variant="ghost" size="sm" icon="up" onClick={() => handleHelpful(doc)} style={userReactions[doc.id]?.helpful ? { color: 'var(--brand-text)' } : undefined}>
                          Utile{doc.helpful_count > 0 ? ` · ${doc.helpful_count}` : ''}
                        </Button>
                        <div className="mp-stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} type="button" className="mp-star" aria-label={`Noter ${star} étoiles`} onClick={() => handleRating(doc, star)}>
                              <span style={{ display: 'inline-flex', color: (userReactions[doc.id]?.rating || 0) >= star ? 'var(--warning)' : 'var(--border-strong)' }}><Icon name="star" size={14} /></span>
                            </button>
                          ))}
                          {doc.rating_count > 0 && <span className="t-mono qz-subtle" style={{ fontSize: 11, marginLeft: 4 }}>{(doc.rating_sum / doc.rating_count).toFixed(1)} ({doc.rating_count})</span>}
                        </div>
                        <span style={{ flex: 1 }} />
                        {userReactions[doc.id]?.reported ? (
                          <Badge tone="danger" icon="flag">Signalé</Badge>
                        ) : (
                          <Button variant="ghost" size="sm" icon="flag" iconOnly aria-label="Signaler" onClick={() => setReportTarget(doc)} />
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )
            })
          )}

          {openRequests.length > 0 && (
            <Card style={{ marginTop: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <h3 className="t-h3">Demandes de la promo</h3>
                <Button variant="link" size="sm" onClick={() => { setReqModalType(''); setShowReqModal(true) }}>Demander un document</Button>
              </div>
              {openRequests.map(r => (
                <div key={r.doc_type} className="mp-req-row">
                  <DocType type={r.doc_type} />
                  <span className="t-body-sm qz-muted" style={{ flex: 1 }}>{TYPE_LABELS[r.doc_type] || r.doc_type}</span>
                  <Button variant="ghost" size="sm" icon="up" aria-pressed={userRequested[r.doc_type]} disabled={userRequested[r.doc_type]} onClick={() => handleRequest(r.doc_type)}>{r.votes || 0}</Button>
                </div>
              ))}
            </Card>
          )}

          <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="t-eyebrow qz-subtle">Discussion</span>
                <h2 className="t-h2">Expériences sur ce module</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/senpai?compose=1&module=${id}`)}>Partager</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/senpai?module=${id}`)}>Voir sur Senpai Zone</Button>
              </div>
            </div>

            {senpaiPosts.length === 0 ? (
              <EmptyState icon="message" title="Aucun tip pour ce module">
                Sois le premier à partager ton expérience.
                <div style={{ marginTop: 'var(--space-2)' }}><Button variant="secondary" onClick={() => navigate(`/senpai?compose=1&module=${id}`)}>Partager ton expérience</Button></div>
              </EmptyState>
            ) : (
              <div className="mp-senpai-list">
                {senpaiPosts.map(post => {
                  const authorName = post.user_profiles?.name || 'Anonyme'
                  return (
                    <Card key={post.id} className="mp-senpai-card" onClick={() => navigate(`/senpai?post=${post.id}`)}>
                      <div className="mp-senpai-card__head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={authorName} size="sm" />
                          <span className="t-label">{authorName}</span>
                        </div>
                        <Badge tone="accent">{post.post_type === 'red_flag' ? 'Red Flag' : post.post_type === 'cheat_code' ? 'Cheat Code' : post.post_type === 'timeline' ? 'Timeline' : post.post_type === 'path_review' ? 'Bilan' : 'Guide de survie'}</Badge>
                      </div>
                      <p className="t-h3" style={{ marginBottom: 4 }}>{post.title}</p>
                      <p className="t-body-sm qz-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                      <div style={{ textAlign: 'right', marginTop: 8 }}>
                        <span className="t-mono qz-subtle">{post.helpful_count || 0} utile{(post.helpful_count || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </Card>
                  )
                })}
                <Button variant="ghost" block onClick={() => navigate(`/senpai?module=${id}`)}>Voir tous les tips pour ce module</Button>
              </div>
            )}
          </div>
        </div>

        <aside className="mp-aside">
          <Card>
            <h3 className="t-h3">Tu as un document ?</h3>
            <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>+10 points par document validé.</p>
            <Button variant="secondary" block as={Link} to="/upload">Partager</Button>
          </Card>

          {docs.length > 0 && (
            <Card>
              <span className="t-eyebrow qz-subtle">Contenu du module</span>
              <div style={{ marginTop: 'var(--space-3)' }}>
                {GROUP_ORDER.filter(k => typeCounts[k] > 0).map(k => (
                  <div key={k} className="mp-type-row">
                    <span className="t-body-sm qz-muted mp-type-row__label">{TYPE_LABELS[k]}</span>
                    <span className="mp-type-row__bar"><ProgressBar value={(typeCounts[k] / maxCount) * 100} /></span>
                    <span className="t-mono qz-subtle">{typeCounts[k]}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <span className="t-eyebrow qz-subtle">Infos</span>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="mp-info-row"><span className="t-body-sm qz-muted">Établissement</span><span className="t-body-sm">{uniName || '—'}</span></div>
              <div className="mp-info-row"><span className="t-body-sm qz-muted">Filière</span><span className="t-body-sm">{filName || '—'}</span></div>
              <div className="mp-info-row"><span className="t-body-sm qz-muted">Semestre</span><span className="t-body-sm">S{mod.semester}</span></div>
              {docs[0] && <div className="mp-info-row"><span className="t-body-sm qz-muted">Dernier ajout</span><span className="t-body-sm">{fmtAgo(docs[0].created_at)}</span></div>}
            </div>
          </Card>

          <Card>
            <span className="t-eyebrow qz-subtle">Soutenir le projet</span>
            <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>9rawZid9ra est 100% gratuit. Un pourboire nous aide à grandir.</p>
            <Button variant="secondary" block as="a" href="https://paypal.me/saadga2003" target="_blank" rel="noreferrer">Envoyer un pourboire</Button>
          </Card>
        </aside>
      </div>

      {relatedModules?.length > 0 && (
        <section className="mp-related-section">
          <h2 className="t-h2" style={{ marginBottom: 'var(--space-2)' }}>Modules liés</h2>
          {['Même filière', 'Même matière, autre école', 'Aussi téléchargé'].map(rel => {
            const items = relatedModules.filter(r => r.relation === rel)
            if (items.length === 0) return null
            return (
              <div key={rel} className="mp-related-group">
                <span className="t-eyebrow qz-subtle">{rel}</span>
                <div className="mp-related-grid">
                  {items.map(m => (
                    <ModuleCard key={m.module_id} linkAs={Link} href={`/module/${m.slug || m.module_id}`}
                      name={m.name} semester={m.semester} filiere={`${m.filiere} · ${m.university}`} docs={m.docs_count} />
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {showAuthGate && (
        <div className="qz-scrim" onClick={() => setShowAuthGate(false)}>
          <div className="qz-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2 className="qz-modal__title">Crée un compte gratuit pour télécharger</h2>
            <p className="qz-modal__body">Accès illimité aux examens, CC et TD de ta filière. 30 secondes.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--space-5)' }}>
              <Button variant="primary" block onClick={() => { sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); navigate('/register', { state: { from: `/module/${slug}` } }) }}>Créer un compte</Button>
              <Button variant="link" onClick={() => { sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); navigate('/login', { state: { from: `/module/${slug}` } }) }}>J'ai déjà un compte</Button>
              <Button variant="ghost" onClick={() => setShowAuthGate(false)}>Continuer sans compte</Button>
            </div>
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          reasons={REPORT_REASONS}
          onClose={() => setReportTarget(null)}
          onSubmit={(reason, details) => handleReport(reportTarget, reason, details)}
        />
      )}

      {showReqModal && (
        <div className="qz-scrim" onClick={() => setShowReqModal(false)}>
          <div className="qz-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2 className="qz-modal__title">Demander un document</h2>
            <div className="mp-req-form">
              <Select label="Type de document" value={reqModalType} onChange={e => setReqModalType(e.target.value)} options={[{ value: '', label: 'Choisis un type' }, ...GROUP_ORDER.map(k => ({ value: k, label: TYPE_LABELS[k] }))]} />
            </div>
            <div className="qz-modal__actions">
              <Button variant="secondary" onClick={() => setShowReqModal(false)}>Annuler</Button>
              <Button variant="primary" disabled={!reqModalType} onClick={() => handleRequest(reqModalType)}>Envoyer</Button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (() => {
        const level = qualityLevel(previewDoc)
        const canGiveFeedback = user && previewDoc.uploader_id !== user.id && viewedDocs.has(previewDoc.id)
        return (
        <Sheet wide title={previewDoc.doc_number || TYPE_LABELS[previewDoc.doc_type] || previewDoc.doc_type} onClose={() => setPreviewDoc(null)}>
          <div className="mp-preview-layout">
            <div className="mp-preview-main">
              <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-2)' }}>
                <StatusBadge {...displayStatus(previewDoc)} />
                {level && <QualityBadge score={previewDoc.quality_score ?? 0} label={level.label} tone={level.tone} />}
              </div>
              <iframe
                style={{ flex: 1, width: '100%', border: 0, minHeight: '60vh' }}
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc?.files?.[0] || '')}&embedded=true`}
                title="Aperçu du document"
                allow="fullscreen"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                <Button variant="danger-ghost" size="sm" icon="flag" onClick={() => setReportTarget(previewDoc)}>Signaler</Button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" as="a" href={previewDoc?.files?.[0]} target="_blank" rel="noreferrer">Ouvrir dans un onglet</Button>
                  <Button variant="primary" icon="download" onClick={() => handleDownload(previewDoc)}>Télécharger</Button>
                </div>
              </div>
            </div>
            <div className="mp-preview-side">
              <QualityCard
                unrated={isUnrated(previewDoc)}
                score={previewDoc.quality_score}
                label={level?.label}
                tone={level?.tone}
                rows={qualityChecklist(previewDoc)}
                feedbackCount={previewDoc.quality_signals?.feedback_count}
                ratingCount={previewDoc.rating_count}
              />
              {canGiveFeedback && (
                <FeedbackPrompt
                  correctModule={docFeedback[previewDoc.id]?.correct_module ?? null}
                  correctUniversity={docFeedback[previewDoc.id]?.correct_university ?? null}
                  readable={docFeedback[previewDoc.id]?.readable ?? null}
                  complete={docFeedback[previewDoc.id]?.complete ?? null}
                  onAnswer={(key, value) => handleFeedbackAnswer(previewDoc, key, value)}
                  rating={userReactions[previewDoc.id]?.rating || 0}
                  onRate={(star) => handleRating(previewDoc, star)}
                  helpful={!!userReactions[previewDoc.id]?.helpful}
                  onHelpful={() => handleHelpful(previewDoc)}
                />
              )}
            </div>
          </div>
        </Sheet>
      )})()}
    </div>
  )
}
