import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import {
  Avatar, Badge, Button, Input, Chip, Tabs, Select, Switch, PostCard, Sheet,
  EmptyState, Skeleton, Icon, Dropdown, Card,
} from '../design-system/ui'
import { notify } from '../design-system/toast'
import SenpaiSection from '../components/SenpaiSection'
import { HELP_WITH_OPTIONS, RESPONSE_ESTIMATES, semesterAtLeast } from '../lib/senpai'

const PT = {
  survival_guide: { label: 'Guide de survie', icon: 'file', tone: 'accent' },
  cheat_code: { label: 'Cheat Code', icon: 'sparkle', tone: 'brand' },
  timeline: { label: 'Timeline', icon: 'right', tone: 'warning' },
  red_flag: { label: 'Red Flag', icon: 'flag', tone: 'danger' },
  path_review: { label: 'Bilan', icon: 'star', tone: 'neutral' },
}

const stripHtml = (str) => str.replace(/<[^>]*>/g, '').trim()
const inits = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'maintenant'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}j`
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' })
}

const css = `
  .sn-layout { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 220px minmax(0, 1fr) 300px; align-items: start; }
  @media (max-width: 1100px) { .sn-layout { grid-template-columns: 220px minmax(0, 1fr); } .sn-right { display: none; } }
  @media (max-width: 768px) { .sn-layout { grid-template-columns: 1fr; } .sn-left { display: none; } }
  .sn-left { position: sticky; top: 56px; height: calc(100vh - 56px); overflow-y: auto; padding: var(--space-5) var(--space-3); border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 2px; }
  .sn-left-section { padding: var(--space-3) var(--space-3) 4px; margin-top: var(--space-2); }
  .sn-left-type-wrap { display: flex; flex-direction: column; gap: 4px; padding: 0 var(--space-2); }
  .sn-center { border-right: 1px solid var(--border); min-height: calc(100vh - 56px); min-width: 0; }
  @media (max-width: 1100px) { .sn-center { border-right: 0; } }
  .sn-right { position: sticky; top: 56px; height: calc(100vh - 56px); overflow-y: auto; padding: var(--space-5) var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
  .sn-header { padding: var(--space-5) var(--space-5) var(--space-4); }
  .sn-feed-tabs-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-5); flex-wrap: wrap; border-bottom: 1px solid var(--border); }
  .sn-mobile-bar { display: none; gap: var(--space-2); padding: var(--space-3); overflow-x: auto; border-bottom: 1px solid var(--border); }
  @media (max-width: 768px) { .sn-mobile-bar { display: flex; } }
  .sn-compose { padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--border); }
  .sn-compose__row { display: flex; gap: var(--space-3); align-items: flex-start; }
  .sn-compose__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-3); }
  .sn-compose__chips { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  .sn-post-list > .qz-card { border-radius: 0; border-left: 0; border-right: 0; border-top: 0; cursor: pointer; }
  .sn-widget-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border); cursor: pointer; }
  .sn-widget-row:last-child { border-bottom: 0; }
  .sn-widget-row:hover { background: var(--surface-2); }
  .sn-week-bars { display: flex; align-items: flex-end; gap: 4px; height: 44px; margin-bottom: var(--space-2); }
  .sn-week-bar { flex: 1; background: var(--brand-soft); border-radius: 2px 2px 0 0; min-height: 2px; }
  .sn-week-bar--today { background: var(--brand); }
  .sn-thread-reply { display: flex; gap: var(--space-3); padding: var(--space-3) var(--space-5); border-bottom: 1px solid var(--border); }
  .sn-thread-compose { display: flex; gap: var(--space-3); align-items: flex-end; padding: var(--space-4) var(--space-5); border-top: 1px solid var(--border); }
  .sn-uni-wrap { position: relative; }
`

export default function SenpaiZone() {
  const navigate = useNavigate()
  const [sp, setSP] = useSearchParams()
  const modSearchDebounceRef = useRef(null)

  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [modal, setModal] = useState(null)
  const showAlert = (message) => setModal({ message, confirmText: 'OK', confirmColor: '#4F8EF7', onCancel: null, onConfirm: () => setModal(null) })

  const [posts, setPosts] = useState([])
  const [unis, setUnis] = useState([])
  const [loading, setLoading] = useState(true)

  // Senpai de filière
  const [viewMode, setViewMode] = useState(sp.get('devenir') ? 'apply' : 'feed')
  const [applyHelpWith, setApplyHelpWith] = useState([])
  const [applyResponse, setApplyResponse] = useState('days')
  const [applyWeeklyLimit, setApplyWeeklyLimit] = useState('5')
  const [applyIsGraduate, setApplyIsGraduate] = useState(false)
  const [applying, setApplying] = useState(false)
  const [myMentorProfile, setMyMentorProfile] = useState(null)

  const [feedTab, setFeedTab] = useState('recent')
  const [filterType, setFilterType] = useState(sp.get('type') || '')
  const [filterUni, setFilterUni] = useState(sp.get('university') || '')
  const [filterMod, setFilterMod] = useState(sp.get('module') || '')
  const [filterModName, setFilterModName] = useState('')

  const [composeFocused, setComposeFocused] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [composeType, setComposeType] = useState('cheat_code')
  const [composeAnon, setComposeAnon] = useState(false)
  const [composeMod, setComposeMod] = useState(null)
  const [showModDd, setShowModDd] = useState(false)
  const [modSearch, setModSearch] = useState('')
  const [modResults, setModResults] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [rateLimitMsg, setRateLimitMsg] = useState('')

  const [viewPost, setViewPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [replyText, setReplyText] = useState('')
  const [replyAnon, setReplyAnon] = useState(false)
  const [sendingR, setSendingR] = useState(false)
  const [loadingR, setLoadingR] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())

  const [voting, setVoting] = useState(new Set())
  const [following, setFollowing] = useState(new Set())
  const [toggling, setToggling] = useState(new Set())

  const [menuPostId, setMenuPostId] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')

  const [menuReplyId, setMenuReplyId] = useState(null)
  const [editingReply, setEditingReply] = useState(null)
  const [editReplyText, setEditReplyText] = useState('')

  const [weekStats, setWeekStats] = useState({ days: [], total: 0, deltaPct: null })

  useEffect(() => {
    document.title = 'Senpai Zone — 9rawZid9ra'
    supabase.from('universities').select('id,name').order('name').then(({ data }) => setUnis(data || []))
    loadPosts()
    loadWeekStats()
    if (sp.get('module')) {
      supabase.from('modules').select('name').eq('id', sp.get('module')).single()
        .then(({ data }) => setFilterModName(data?.name || ''))
    }
    if (sp.get('compose') === '1') {
      setComposeFocused(true)
      if (sp.get('module')) {
        supabase.from('modules').select('id,name,semester').eq('id', sp.get('module')).single()
          .then(({ data }) => data && setComposeMod(data))
      }
    }
  }, []) // eslint-disable-line

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('senpai_posts')
        .select('*, user_profiles(name, is_fondateur), senpai_votes(user_id), modules(id, name)')
        .is('parent_id', null)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(100)
      if (!error) setPosts(data || [])
    } catch (e) {
      console.error('loadPosts error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Real weekly trend — counts from senpai_posts.created_at, no fabricated numbers
  const loadWeekStats = useCallback(async () => {
    const since14d = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data } = await supabase
      .from('senpai_posts')
      .select('created_at')
      .is('parent_id', null)
      .eq('is_approved', true)
      .gte('created_at', since14d)
    const rows = data || []
    const dayKey = d => new Date(d).toISOString().slice(0, 10)
    const counts = {}
    for (const r of rows) counts[dayKey(r.created_at)] = (counts[dayKey(r.created_at)] || 0) + 1
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000)
      return counts[dayKey(d)] || 0
    })
    const thisWeek = days.reduce((s, n) => s + n, 0)
    const prevWeek = rows.length - thisWeek
    const deltaPct = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null
    setWeekStats({ days, total: thisWeek, deltaPct })
  }, [])

  useEffect(() => {
    clearTimeout(modSearchDebounceRef.current)
    if (modSearch.trim().length < 2) { setModResults([]); return }
    modSearchDebounceRef.current = setTimeout(() => {
      supabase.from('modules').select('id,name,semester,filieres(name)').ilike('name', `%${modSearch.trim()}%`).limit(5)
        .then(({ data }) => setModResults(data || []))
    }, 500)
  }, [modSearch])

  useEffect(() => {
    if (!menuPostId) return
    const handler = e => { if (!e.target.closest('[data-post-menu]')) setMenuPostId(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuPostId])

  useEffect(() => {
    if (!menuReplyId) return
    const handler = e => { if (!e.target.closest('[data-reply-menu]')) setMenuReplyId(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuReplyId])

  useEffect(() => {
    const channel = supabase
      .channel('senpai-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'senpai_posts' }, async payload => {
        const { data } = await supabase
          .from('senpai_posts')
          .select('*, user_profiles(name, is_fondateur, universities(name)), senpai_votes(user_id), modules(id, name)')
          .eq('id', payload.new.id)
          .single()
        if (data && data.is_approved) {
          setPosts(prev => prev.some(p => p.id === data.id) ? prev : [data, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'senpai_posts' }, payload => {
        const n = payload.new
        setPosts(prev => prev.map(p =>
          p.id === n.id ? { ...p, helpful_count: n.helpful_count ?? p.helpful_count, reply_count: n.reply_count ?? p.reply_count } : p
        ))
        setViewPost(vp => vp?.id === n.id ? { ...vp, helpful_count: n.helpful_count ?? vp.helpful_count, reply_count: n.reply_count ?? vp.reply_count } : vp)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (!user) { setProfile(null); setFollowing(new Set()); return }
    Promise.all([
      supabase.from('user_profiles').select('name,university_id,is_admin,filiere_id,current_semester,points').eq('id', user.id).single(),
      supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
    ]).then(([{ data: prof }, { data: fols }]) => {
      setProfile(prof)
      setFollowing(new Set((fols || []).map(f => f.following_id)))
    })
    supabase.rpc('get_my_senpai_profile').then(({ data, error }) => { if (!error) setMyMentorProfile(data) })
  }, [user?.id]) // eslint-disable-line

  const submitApplication = async () => {
    setApplying(true)
    const { error } = await supabase.rpc('apply_to_be_senpai', {
      p_help_with: applyHelpWith, p_response_estimate: applyResponse,
      p_weekly_limit: parseInt(applyWeeklyLimit, 10) || 5, p_is_graduate: applyIsGraduate,
    })
    setApplying(false)
    if (error) { notify.error(error.message); return }
    const { data } = await supabase.rpc('get_my_senpai_profile')
    setMyMentorProfile(data)
    notify.success(data?.status === 'active' ? 'Tu es maintenant senpai de ta filière !' : 'Candidature envoyée, elle sera vérifiée par l\'équipe.')
    setViewMode('mentors')
  }

  const filtered = useMemo(() => {
    let f = posts
    if (feedTab === 'abonnements') f = f.filter(p => following.has(p.author_id))
    if (feedTab === 'tendances') f = [...f].sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0))
    if (filterType) f = f.filter(p => p.post_type === filterType)
    if (filterUni) f = f.filter(p => String(p.university_id) === String(filterUni))
    if (filterMod) f = f.filter(p => String(p.module_id) === String(filterMod))
    return f
  }, [posts, feedTab, following, filterType, filterUni, filterMod])

  const topSenpais = useMemo(() => {
    const map = {}
    posts.forEach(p => {
      if (!map[p.author_id]) map[p.author_id] = { id: p.author_id, name: p.user_profiles?.name || 'Anonyme', count: 0, votes: 0 }
      map[p.author_id].count++
      map[p.author_id].votes += (p.helpful_count || 0)
    })
    return Object.values(map).sort((a, b) => b.votes - a.votes).slice(0, 5)
  }, [posts])

  const trendingMods = useMemo(() => {
    const map = {}
    posts.forEach(p => {
      if (p.module_id && p.modules?.name) {
        if (!map[p.module_id]) map[p.module_id] = { id: p.module_id, name: p.modules.name, count: 0 }
        map[p.module_id].count++
      }
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [posts])

  const isOwn = post => post.author_id === user?.id

  const handleVote = async (post) => {
    if (!user) { sessionStorage.setItem('redirectAfterLogin', '/senpai'); navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    if (voting.has(post.id)) return
    setVoting(s => new Set([...s, post.id]))
    const isVoted = post.senpai_votes?.some(v => v.user_id === user.id)
    const optimisticCount = Math.max(0, (post.helpful_count || 0) + (isVoted ? -1 : 1))
    const patch = p => p.id !== post.id ? p : {
      ...p, helpful_count: optimisticCount,
      senpai_votes: isVoted ? (p.senpai_votes || []).filter(v => v.user_id !== user.id) : [...(p.senpai_votes || []), { user_id: user.id }],
    }
    setPosts(ps => ps.map(patch))
    setViewPost(vp => vp ? patch(vp) : vp)
    if (isVoted) await supabase.from('senpai_votes').delete().eq('user_id', user.id).eq('post_id', post.id)
    else await supabase.from('senpai_votes').insert({ user_id: user.id, post_id: post.id })
    const { data: freshPost } = await supabase.from('senpai_posts').select('helpful_count').eq('id', post.id).single()
    if (freshPost) {
      const correctPatch = p => p.id !== post.id ? p : { ...p, helpful_count: freshPost.helpful_count }
      setPosts(ps => ps.map(correctPatch))
      setViewPost(vp => vp?.id === post.id ? { ...vp, helpful_count: freshPost.helpful_count } : vp)
    }
    setVoting(s => { const n = new Set(s); n.delete(post.id); return n })
  }

  const handleFollow = async (authorId, e) => {
    e?.stopPropagation()
    if (!user) { sessionStorage.setItem('redirectAfterLogin', '/senpai'); navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    if (authorId === user.id || toggling.has(authorId)) return
    setToggling(s => new Set([...s, authorId]))
    const isF = following.has(authorId)
    if (isF) {
      setFollowing(s => { const n = new Set(s); n.delete(authorId); return n })
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', authorId)
    } else {
      setFollowing(s => new Set([...s, authorId]))
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: authorId })
      supabase.from('notifications').insert({ user_id: authorId, type: 'follow', actor_id: user.id }).then()
    }
    setToggling(s => { const n = new Set(s); n.delete(authorId); return n })
  }

  const openThread = async post => {
    setViewPost(post); setLoadingR(true); setReplies([]); setReplyText('')
    const { data } = await supabase.from('senpai_replies')
      .select('*, user_profiles(name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setReplies(data || [])
    setLoadingR(false)
    const newViews = (post.views || 0) + 1
    setViewPost(vp => vp ? { ...vp, views: newViews } : vp)
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, views: newViews } : p))
    supabase.rpc('increment_post_views', { p_post_id: post.id }).then()
  }

  const sendReply = async () => {
    if (!user) { sessionStorage.setItem('redirectAfterLogin', '/senpai'); navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    const cleanReply = stripHtml(replyText).slice(0, 500)
    if (cleanReply.length < 1) return
    setSendingR(true)
    const { data, error } = await supabase.from('senpai_replies').insert({
      post_id: viewPost.id, author_id: user.id, content: cleanReply, is_anonymous: replyAnon,
    }).select('*, user_profiles(name)').single()
    setSendingR(false)
    if (error) return
    setReplies(r => [...r, data])
    setReplyText('')
    setViewPost(vp => vp ? { ...vp, reply_count: (vp.reply_count || 0) + 1 } : vp)
    setPosts(ps => ps.map(p => p.id === viewPost.id ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p))
    if (viewPost.author_id !== user.id) {
      supabase.from('notifications').insert({
        user_id: viewPost.author_id, type: 'reply', actor_id: user.id, post_id: viewPost.id, post_title: viewPost.title,
      }).then()
    }
  }

  const handleDelete = (postId, e) => {
    e?.stopPropagation()
    setMenuPostId(null)
    setModal({
      title: 'Supprimer ce post ?', message: 'Cette action est irréversible.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.from('senpai_posts').delete().eq('id', postId)
        if (!error) {
          setPosts(prev => prev.filter(p => p.id !== postId))
          if (viewPost?.id === postId) { setViewPost(null); setReplies([]) }
        } else {
          showAlert(error.message)
        }
      },
    })
  }

  const handleDeleteReply = (reply, e) => {
    e?.stopPropagation()
    setMenuReplyId(null)
    const postId = reply.post_id
    setModal({
      title: 'Supprimer cette réponse ?', message: 'Cette action est irréversible.',
      confirmText: 'Supprimer', confirmColor: '#F87171',
      onConfirm: async () => {
        setModal(null)
        const { error } = await supabase.from('senpai_replies').delete().eq('id', reply.id)
        if (!error) {
          setReplies(prev => prev.filter(r => r.id !== reply.id))
          setViewPost(vp => vp ? { ...vp, reply_count: Math.max(0, (vp.reply_count || 0) - 1) } : vp)
          setPosts(ps => ps.map(p => p.id === postId ? { ...p, reply_count: Math.max(0, (p.reply_count || 0) - 1) } : p))
        } else {
          showAlert(error.message)
        }
      },
    })
  }

  const handleMarkBest = async (reply) => {
    const { error } = await supabase.rpc('mark_best_reply', { p_reply_id: reply.id })
    if (error) { showAlert(error.message); return }
    setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, is_best: true } : (r.is_best ? { ...r, is_best: false } : r)))
  }

  const handleEditReplySave = async (reply) => {
    const text = editReplyText.trim().slice(0, 500)
    if (text.length < 1) return
    const { error } = await supabase.from('senpai_replies').update({ content: text }).eq('id', reply.id)
    if (!error) {
      setReplies(prev => prev.map(r => r.id === reply.id ? { ...r, content: text } : r))
      setEditingReply(null)
    } else {
      showAlert(error.message)
    }
  }

  const handleEditSave = async (post) => {
    const text = editText.trim()
    if (text.length < 1) return
    const lines = text.split('\n')
    const title = lines[0].slice(0, 120) || text.slice(0, 80)
    const { error } = await supabase.from('senpai_posts').update({ title, content: text }).eq('id', post.id)
    if (!error) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, title, content: text } : p))
      setEditingPost(null)
    } else {
      showAlert(error.message)
    }
  }

  const handlePublish = async () => {
    if (!user) { sessionStorage.setItem('redirectAfterLogin', '/senpai'); navigate('/login', { state: { from: '/senpai', message: 'Connecte-toi pour continuer' } }); return }
    const text = stripHtml(composeText).slice(0, 1000)
    if (text.length < 1) return
    setRateLimitMsg('')
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentPosts } = await supabase
      .from('senpai_posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .gte('created_at', since)
    if (recentPosts >= 10) {
      setRateLimitMsg('Limite de 10 posts par heure atteinte. Réessaie dans une heure.')
      return
    }
    const lines = text.split('\n')
    const title = lines[0].slice(0, 120) || text.slice(0, 80)
    const content = text
    setSubmitting(true)
    const uniId = parseInt(filterUni) || profile?.university_id || null
    const { data: inserted, error } = await supabase.from('senpai_posts').insert({
      author_id: user.id, post_type: composeType, title, content,
      module_id: composeMod?.id || null, university_id: uniId, is_anonymous: composeAnon,
      helpful_count: 0, is_approved: true,
    }).select('id, created_at').single()
    setSubmitting(false)
    if (error) { showAlert('Erreur lors de la publication. Réessaie.'); return }
    setComposeText(''); setComposeFocused(false); setComposeMod(null); setComposeAnon(false); setComposeType('cheat_code')
    if (inserted) {
      const uniName = unis.find(u => u.id === uniId)?.name || null
      setPosts(prev => [{
        id: inserted.id, created_at: inserted.created_at, author_id: user.id, post_type: composeType,
        title, content, module_id: composeMod?.id || null, university_id: uniId, is_anonymous: composeAnon,
        helpful_count: 0, reply_count: 0, is_approved: true, tags: [], parent_id: null, senpai_votes: [],
        modules: composeMod ? { id: composeMod.id, name: composeMod.name } : null,
        user_profiles: composeAnon ? null : { name: profile?.name || null, universities: uniName ? { name: uniName } : null },
      }, ...prev])
    }
  }

  const canPublish = composeText.trim().length >= 1 && composeText.length <= 1000 && !submitting
  const NAV_LINKS = [
    { path: '/', icon: 'monitor', label: 'Accueil' },
    { path: '/browse', icon: 'search', label: 'Explorer' },
    { path: '/senpai', icon: 'message', label: 'Senpai Zone', active: true },
    { path: '/ai', icon: 'sparkle', label: 'AI Coach' },
    { path: '/upload', icon: 'upload', label: 'Partager' },
  ]

  const renderPostMenu = (post) => (isOwn(post) || profile?.is_admin) ? (
    <div className="qz-dropdown-anchor" data-post-menu>
      <Button variant="ghost" size="sm" iconOnly icon="down" aria-label="Options" onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)} />
      {menuPostId === post.id && (
        <Dropdown items={[
          ...(isOwn(post) ? [{ label: 'Modifier', icon: 'file', onClick: () => { setEditingPost(post); setEditText(post.content); setMenuPostId(null) } }] : []),
          { label: 'Supprimer', icon: 'trash', danger: true, onClick: (e) => handleDelete(post.id, e) },
        ]} />
      )}
    </div>
  ) : null

  const renderCard = (post) => {
    const isVoted = post.senpai_votes?.some(v => v.user_id === user?.id)
    const isF = following.has(post.author_id)
    const anon = post.is_anonymous
    const name = anon ? 'Anonyme' : (post.user_profiles?.name || 'Anonyme')
    const isExp = expandedIds.has(post.id)

    if (editingPost?.id === post.id) {
      return (
        <Card key={post.id} onClick={e => e.stopPropagation()}>
          <Input multiline value={editText} onChange={e => setEditText(e.target.value)} autoFocus counter maxLength={1000} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setEditingPost(null)}>Annuler</Button>
            <Button variant="primary" size="sm" disabled={!editText.trim()} onClick={() => handleEditSave(post)}>Sauvegarder</Button>
          </div>
        </Card>
      )
    }

    return (
      <PostCard
        key={post.id}
        anonymous={anon}
        author={name}
        founder={post.user_profiles?.is_fondateur}
        ago={fmtAgo(post.created_at)}
        onAuthorClick={!anon ? (e) => { e.stopPropagation(); navigate(`/user/${post.author_id}`) } : undefined}
        title={post.title}
        moduleLabel={post.modules?.name}
        onModuleClick={(e) => { e.stopPropagation(); setFilterMod(post.module_id); setFilterModName(post.modules?.name || '') }}
        tags={post.tags || []}
        voted={isVoted}
        score={post.helpful_count || 0}
        onVote={() => handleVote(post)}
        replies={post.reply_count || 0}
        onReply={(e) => { e.stopPropagation(); openThread(post) }}
        onOpen={() => openThread(post)}
        menu={renderPostMenu(post)}
        extraActions={
          <>
            {!isOwn(post) && !anon && user && (
              <Button variant={isF ? 'secondary' : 'ghost'} size="sm" onClick={(e) => handleFollow(post.author_id, e)} disabled={toggling.has(post.author_id)}>
                {isF ? 'Abonné' : 'Suivre'}
              </Button>
            )}
            {!isOwn(post) && !anon && user && (
              <Button variant="ghost" size="sm" iconOnly icon="message" aria-label="Message"
                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-dm', { detail: { userId: post.author_id, name } })) }} />
            )}
            <Button variant="ghost" size="sm" iconOnly icon="send" aria-label="Partager le lien"
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(window.location.origin + '/senpai?post=' + post.id); notify.info('Lien copié') }} />
          </>
        }
      >
        <span className={isExp ? '' : 'qz-post__body--clamp'}>{post.content}</span>
        {!isExp && post.content?.length > 280 && (
          <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedIds(s => new Set([...s, post.id])) }}>Voir plus</Button>
        )}
        {post.views > 0 && <div className="t-caption qz-subtle" style={{ marginTop: 4 }}>{post.views} vue{post.views !== 1 ? 's' : ''}</div>}
      </PostCard>
    )
  }

  const renderThread = () => {
    if (!viewPost) return null
    const pt = PT[viewPost.post_type] || PT.cheat_code
    const isV = viewPost.senpai_votes?.some(v => v.user_id === user?.id)
    const isF = following.has(viewPost.author_id)
    const anon = viewPost.is_anonymous
    const name = anon ? 'Anonyme' : (viewPost.user_profiles?.name || 'Anonyme')
    const uni = anon ? '' : (viewPost.user_profiles?.universities?.name || '')

    return (
      <Sheet wide title="Discussion" onClose={() => { setViewPost(null); setReplies([]) }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {anon ? <Avatar name="?" size="sm" /> : <Avatar name={name} size="sm" onClick={() => { navigate(`/user/${viewPost.author_id}`); setViewPost(null) }} style={{ cursor: 'pointer' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="t-label">{name}</span>
                {!isOwn(viewPost) && user && !anon && (
                  <Button variant={isF ? 'secondary' : 'ghost'} size="sm" onClick={(e) => handleFollow(viewPost.author_id, e)}>{isF ? 'Abonné' : 'Suivre'}</Button>
                )}
              </div>
              {uni && <span className="t-caption qz-subtle">{uni}</span>}
            </div>
            <Badge tone={pt.tone} icon={pt.icon}>{pt.label}</Badge>
          </div>
          <h2 className="t-h3" style={{ marginBottom: 8 }}>{viewPost.title}</h2>
          <p className="t-body qz-muted" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{viewPost.content}</p>
          {viewPost.modules?.name && <div style={{ marginTop: 8 }}><Badge tone="brand">{viewPost.modules.name}</Badge></div>}
          <div className="qz-meta" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <span><b>{viewPost.helpful_count || 0}</b> utile{(viewPost.helpful_count || 0) !== 1 ? 's' : ''}</span>
            <span><b>{replies.length}</b> réponse{replies.length !== 1 ? 's' : ''}</span>
            <span><b>{viewPost.views || 0}</b> vue{(viewPost.views || 0) !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button variant={isV ? 'secondary' : 'ghost'} size="sm" icon="up" onClick={(e) => handleVote(viewPost, e)}>Utile</Button>
            <Button variant="ghost" size="sm" icon="send" onClick={() => navigator.clipboard.writeText(window.location.origin + '/senpai?post=' + viewPost.id)}>Partager</Button>
          </div>
        </div>

        <div>
          <div style={{ padding: '8px var(--space-5)', background: 'var(--surface-2)' }}><span className="t-eyebrow qz-subtle">Réponses — {replies.length}</span></div>
          {loadingR ? (
            <div style={{ padding: 'var(--space-4)' }}><Skeleton height={48} /></div>
          ) : replies.length === 0 ? (
            <EmptyState icon="reply" title="Aucune réponse — sois le premier" />
          ) : replies.map(r => {
            const rn = r.is_anonymous ? 'Anonyme' : (r.user_profiles?.name || 'Anonyme')
            const isReplyOwn = r.author_id === user?.id
            const canActOnReply = isReplyOwn || profile?.is_admin
            const isPostAuthor = user && viewPost.author_id === user.id

            if (editingReply?.id === r.id) {
              return (
                <div key={r.id} className="sn-thread-reply">
                  <Avatar name={r.is_anonymous ? '?' : rn} size="sm" />
                  <div style={{ flex: 1 }}>
                    <Input multiline value={editReplyText} onChange={e => setEditReplyText(e.target.value.slice(0, 500))} autoFocus counter maxLength={500} />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => setEditingReply(null)}>Annuler</Button>
                      <Button variant="primary" size="sm" disabled={!editReplyText.trim()} onClick={() => handleEditReplySave(r)}>Sauvegarder</Button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div key={r.id} className="sn-thread-reply">
                <Avatar name={r.is_anonymous ? '?' : rn} size="sm" onClick={!r.is_anonymous ? () => { navigate(`/user/${r.author_id}`); setViewPost(null) } : undefined} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="t-label" style={{ cursor: r.is_anonymous ? 'default' : 'pointer' }} onClick={!r.is_anonymous ? () => { navigate(`/user/${r.author_id}`); setViewPost(null) } : undefined}>{rn}</span>
                    {r.is_best && <Badge tone="success" icon="sparkle">Meilleure réponse</Badge>}
                    {isPostAuthor && !isReplyOwn && !r.is_best && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkBest(r)}>Marquer comme meilleure</Button>
                    )}
                    <span className="t-caption qz-subtle" style={{ marginLeft: 'auto' }}>{fmtAgo(r.created_at)}</span>
                    {canActOnReply && (
                      <div className="qz-dropdown-anchor" data-reply-menu>
                        <Button variant="ghost" size="sm" iconOnly icon="down" aria-label="Options" onClick={() => setMenuReplyId(menuReplyId === r.id ? null : r.id)} />
                        {menuReplyId === r.id && (
                          <Dropdown items={[
                            ...(isReplyOwn ? [{ label: 'Modifier', icon: 'file', onClick: () => { setEditingReply(r); setEditReplyText(r.content); setMenuReplyId(null) } }] : []),
                            { label: 'Supprimer', icon: 'trash', danger: true, onClick: (e) => handleDeleteReply(r, e) },
                          ]} />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="t-body-sm" style={{ marginTop: 2 }}>{r.content}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="sn-thread-compose">
          <Avatar name={user ? (profile?.name || user.email) : '?'} size="sm" />
          <div style={{ flex: 1 }}>
            <Input multiline placeholder={user ? 'Ajouter une réponse… (Ctrl+Entrée)' : 'Connecte-toi pour répondre'}
              value={replyText} onChange={e => setReplyText(e.target.value.slice(0, 500))} disabled={!user}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendReply() }} counter maxLength={500} />
            <div style={{ marginTop: 6 }}><Switch label={replyAnon ? 'Anonyme' : 'Avec mon nom'} checked={replyAnon} onChange={() => setReplyAnon(v => !v)} /></div>
          </div>
          <Button variant="primary" iconOnly icon="send" aria-label="Envoyer" onClick={sendReply} disabled={!user || sendingR || replyText.trim().length < 1} />
        </div>
      </Sheet>
    )
  }

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="senpai" />

      <div className="sn-layout">
        <aside className="sn-left">
          <span className="sn-left-section t-eyebrow qz-subtle">Navigation</span>
          {NAV_LINKS.map(l => (
            <button key={l.path} type="button" className="qz-dropdown__item" style={l.active ? { background: 'var(--surface-2)', color: 'var(--text)' } : undefined} onClick={() => navigate(l.path)}>
              <Icon name={l.icon} /> {l.label}
            </button>
          ))}
          <span className="sn-left-section t-eyebrow qz-subtle">Senpai de filière</span>
          <button type="button" className="qz-dropdown__item" style={viewMode === 'mentors' ? { background: 'var(--surface-2)', color: 'var(--text)' } : undefined} onClick={() => setViewMode('mentors')}>
            <Icon name="heart" /> Senpais de ta filière
          </button>
          <button type="button" className="qz-dropdown__item" style={viewMode === 'apply' ? { background: 'var(--surface-2)', color: 'var(--text)' } : undefined} onClick={() => setViewMode('apply')}>
            <Icon name="plus" /> Devenir senpai
          </button>
          <span className="sn-left-section t-eyebrow qz-subtle">Type de post</span>
          <div className="sn-left-type-wrap">
            <Chip selected={!filterType} onClick={() => setFilterType('')}>Tous</Chip>
            {Object.entries(PT).map(([k, v]) => (
              <Chip key={k} selected={filterType === k} onClick={() => setFilterType(filterType === k ? '' : k)}>{v.label}</Chip>
            ))}
          </div>
          <span className="sn-left-section t-eyebrow qz-subtle">Université</span>
          <div style={{ padding: '0 var(--space-2)' }}>
            <Select value={filterUni} onChange={e => setFilterUni(e.target.value)} options={[{ value: '', label: 'Toutes les universités' }, ...unis.map(u => ({ value: u.id, label: u.name }))]} />
          </div>
        </aside>

        <main className="sn-center">
          <div className="sn-header">
            <span className="t-eyebrow" style={{ color: 'var(--accent)' }}>Senpai Zone</span>
            <h1 className="t-h1" style={{ margin: '4px 0 4px' }}>Les conseils de ceux qui sont passés avant toi.</h1>
            <p className="t-body-sm qz-muted">Partage ton expérience, tes conseils et tes astuces avec la communauté.</p>
          </div>

          <div className="sn-feed-tabs-row">
            <Tabs label="Section" variant="pill" value={viewMode} onChange={setViewMode}
              items={[{ id: 'feed', label: 'Fil' }, { id: 'mentors', label: 'Senpais de filière' }]} />
          </div>

          {viewMode === 'apply' && (
            <div style={{ padding: 'var(--space-5)' }}>
              <span className="t-eyebrow qz-subtle">Devenir senpai</span>
              <h2 className="t-h2" style={{ margin: '4px 0 var(--space-2)' }}>Aide les étudiants de ta filière</h2>
              {!user ? (
                <p className="t-body qz-muted">Connecte-toi pour devenir senpai de ta filière.</p>
              ) : !profile?.filiere_id ? (
                <p className="t-body qz-muted">Ajoute ta filière dans ton profil avant de devenir senpai.</p>
              ) : myMentorProfile ? (
                <p className="t-body qz-muted">
                  {myMentorProfile.status === 'active' ? 'Tu es déjà senpai de ta filière.'
                    : myMentorProfile.status === 'pending' ? 'Ta candidature est en cours de vérification.'
                    : 'Ta candidature précédente a été refusée. Tu peux réessayer ci-dessous.'}
                </p>
              ) : null}
              {user && profile?.filiere_id && (!myMentorProfile || myMentorProfile.status === 'rejected') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 460, marginTop: 'var(--space-4)' }}>
                  <div>
                    <span className="t-label" style={{ display: 'block', marginBottom: 8 }}>Tu peux aider sur…</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {HELP_WITH_OPTIONS.map(o => (
                        <Chip key={o.id} selected={applyHelpWith.includes(o.id)}
                          onClick={() => setApplyHelpWith(p => p.includes(o.id) ? p.filter(x => x !== o.id) : [...p, o.id])}>
                          {o.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="t-label" style={{ display: 'block', marginBottom: 8 }}>Tu réponds généralement en…</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {RESPONSE_ESTIMATES.map(o => (
                        <Chip key={o.id} selected={applyResponse === o.id} onClick={() => setApplyResponse(o.id)}>{o.label}</Chip>
                      ))}
                    </div>
                  </div>
                  <Input label="Messages max par semaine" type="number" min="1" max="50" value={applyWeeklyLimit} onChange={e => setApplyWeeklyLimit(e.target.value)} style={{ maxWidth: 200 }} />
                  <Switch label="Je suis diplômé(e) de cette filière" checked={applyIsGraduate} onChange={e => setApplyIsGraduate(e.target.checked)} />
                  <div>
                    <Button variant="primary" loading={applying} disabled={applyHelpWith.length === 0} onClick={submitApplication}>Envoyer ma candidature</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'mentors' && (
            <div style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                <span className="t-eyebrow qz-subtle">Senpais de ta filière</span>
                <Button variant="secondary" size="sm" onClick={() => setViewMode('apply')}>Devenir senpai</Button>
              </div>
              {!user ? (
                <EmptyState icon="message" title="Connecte-toi pour voir les senpais de ta filière" />
              ) : !profile?.filiere_id ? (
                <EmptyState icon="message" title="Ajoute ta filière dans ton profil" />
              ) : (
                <SenpaiSection filiereId={profile.filiere_id}
                  recruitEligible={semesterAtLeast(profile.current_semester, 3) || profile.is_admin} />
              )}
            </div>
          )}

          {viewMode === 'feed' && <>
          <div className="sn-mobile-bar">
            <Chip selected={!filterType} onClick={() => setFilterType('')}>Tous</Chip>
            {Object.entries(PT).map(([k, v]) => (
              <Chip key={k} selected={filterType === k} onClick={() => setFilterType(filterType === k ? '' : k)}>{v.label}</Chip>
            ))}
          </div>

          <div className="sn-compose">
            <div className="sn-compose__row">
              <Avatar name={user ? (profile?.name || user.email) : '?'} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                {!user ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="t-body qz-subtle">Connecte-toi pour partager ton expérience</span>
                    <Button variant="primary" size="sm" onClick={() => { sessionStorage.setItem('redirectAfterLogin', '/senpai'); navigate('/login') }}>Se connecter</Button>
                  </div>
                ) : !composeFocused ? (
                  <button type="button" onClick={() => setComposeFocused(true)} style={{ background: 'none', border: 0, textAlign: 'left', width: '100%', cursor: 'text' }}>
                    <span className="t-body qz-subtle">Partage un conseil, un bilan, un red flag…</span>
                  </button>
                ) : (
                  <>
                    <Input multiline autoFocus placeholder="Partage ton expérience — ex. « Les 3 erreurs fatales en Algo S4 »"
                      value={composeText} onChange={e => setComposeText(e.target.value.slice(0, 1000))} counter maxLength={1000} aria-label="Contenu du post" />
                    {rateLimitMsg && <div className="qz-banner qz-banner--warning" style={{ marginTop: 8 }}><Icon name="alert" /><span>{rateLimitMsg}</span></div>}
                    <div className="sn-compose__toolbar">
                      <div className="sn-compose__chips">
                        {Object.entries(PT).map(([k, v]) => (
                          <Chip key={k} selected={composeType === k} onClick={() => setComposeType(k)}>{v.label}</Chip>
                        ))}
                      </div>
                      <Switch label="Publier en anonyme" checked={composeAnon} onChange={() => setComposeAnon(v => !v)} />
                    </div>
                    <div className="sn-uni-wrap" style={{ marginTop: 8 }}>
                      <Button variant="secondary" size="sm" icon="file" onClick={() => setShowModDd(v => !v)}>
                        {composeMod ? composeMod.name.slice(0, 24) : 'Lier un module (optionnel)'}
                      </Button>
                      {composeMod && <Button variant="link" size="sm" onClick={() => { setComposeMod(null); setModSearch('') }}>Retirer</Button>}
                      {showModDd && (
                        <div className="qz-dropdown" style={{ position: 'absolute', width: 280 }}>
                          <div style={{ padding: 8 }}><Input placeholder="Rechercher un module…" value={modSearch} onChange={e => setModSearch(e.target.value)} autoFocus /></div>
                          {modResults.map(m => (
                            <button type="button" key={m.id} className="qz-dropdown__item" onClick={() => { setComposeMod(m); setShowModDd(false); setModSearch('') }}>
                              {m.name} <span className="t-caption qz-subtle">{m.semester}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <Button variant="ghost" onClick={() => { setComposeFocused(false); setComposeText('') }}>Annuler</Button>
                      <Button variant="primary" loading={submitting} disabled={!canPublish} onClick={handlePublish}>Publier</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="sn-feed-tabs-row">
            <Tabs label="Filtrer le fil" variant="pill" value={feedTab} onChange={(k) => { if (k === 'abonnements' && !user) { sessionStorage.setItem('redirectAfterLogin', '/senpai'); navigate('/login'); return } setFeedTab(k) }}
              items={[{ id: 'all', label: 'Tous' }, { id: 'recent', label: 'Récent' }, { id: 'tendances', label: 'Tendances' }, { id: 'abonnements', label: 'Abonnements' }]} />
          </div>

          {filterMod && filterModName && (
            <div className="qz-banner" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
              <Icon name="file" /><span>Module : <b>{filterModName}</b></span>
              <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Retirer le filtre" onClick={() => { setFilterMod(''); setFilterModName(''); setSP({}) }} />
            </div>
          )}

          <div className="sn-post-list">
            {loading ? (
              [...Array(5)].map((_, i) => <div key={i} style={{ padding: 'var(--space-5)' }}><Skeleton height={90} /></div>)
            ) : filtered.length === 0 ? (
              <EmptyState icon="message" title={feedTab === 'abonnements' ? 'Abonne-toi à des senpais' : 'Rien ici pour l’instant'}>
                {feedTab === 'abonnements' ? 'Suis des auteurs pour voir leurs posts ici.' : 'Sois le premier à partager ton expérience.'}
                {user && <div style={{ marginTop: 'var(--space-3)' }}><Button variant="primary" onClick={() => setComposeFocused(true)}>Écrire le premier post</Button></div>}
              </EmptyState>
            ) : (
              filtered.map(renderCard)
            )}
          </div>
          </>}
        </main>

        <aside className="sn-right">
          {trendingMods.length > 0 && (
            <Card flush>
              <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}><span className="t-eyebrow qz-subtle">Modules tendances</span></div>
              {trendingMods.map((m, i) => (
                <div key={m.id} className="sn-widget-row" onClick={() => { setFilterMod(m.id); setFilterModName(m.name) }}>
                  <span className="t-mono qz-subtle">#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-body-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div className="t-caption qz-subtle">{m.count} post{m.count > 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {topSenpais.length > 0 && (
            <Card flush>
              <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}><span className="t-eyebrow qz-subtle">Top senpais du mois</span></div>
              {topSenpais.map((s, i) => (
                <div key={s.id} className="sn-widget-row" onClick={() => navigate(`/user/${s.id}`)}>
                  <span className="t-mono qz-subtle">#{i + 1}</span>
                  <Avatar name={s.name} size="sm" founder={i === 0} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-body-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div className="t-caption qz-subtle">{s.votes} vote{s.votes > 1 ? 's' : ''} · {s.count} post{s.count > 1 ? 's' : ''}</div>
                  </div>
                  {user && s.id !== user.id && (
                    <Button variant="ghost" size="sm" iconOnly icon={following.has(s.id) ? 'check' : 'plus'} aria-label={following.has(s.id) ? 'Abonné' : 'Suivre'} onClick={e => handleFollow(s.id, e)} />
                  )}
                </div>
              ))}
            </Card>
          )}

          {weekStats.total > 0 && (
            <Card>
              <span className="t-eyebrow qz-subtle">Cette semaine</span>
              <div className="sn-week-bars" style={{ marginTop: 'var(--space-3)' }}>
                {weekStats.days.map((n, i) => {
                  const max = Math.max(...weekStats.days, 1)
                  return <div key={i} className={`sn-week-bar${i === 6 ? ' sn-week-bar--today' : ''}`} style={{ height: `${Math.round((n / max) * 44)}px` }} title={`${n} post${n !== 1 ? 's' : ''}`} />
                })}
              </div>
              <span className="t-mono qz-subtle">
                {weekStats.total} nouveau{weekStats.total !== 1 ? 'x' : ''} post{weekStats.total !== 1 ? 's' : ''}
                {weekStats.deltaPct !== null && <span style={{ color: weekStats.deltaPct >= 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 6 }}>{weekStats.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(weekStats.deltaPct)}%</span>}
              </span>
            </Card>
          )}

          {!user && (
            <Card style={{ textAlign: 'center' }}>
              <h3 className="t-h3">Rejoins la discussion</h3>
              <p className="t-body-sm qz-muted" style={{ margin: '6px 0 var(--space-4)' }}>Partage ton expérience, aide les autres étudiants, accumule des points.</p>
              <Button variant="primary" block as={Link} to="/register">Créer un compte</Button>
            </Card>
          )}
        </aside>
      </div>

      {renderThread()}
      {modal && <ConfirmModal {...modal} onCancel={modal.onCancel !== undefined ? modal.onCancel : () => setModal(null)} />}
    </div>
  )
}
