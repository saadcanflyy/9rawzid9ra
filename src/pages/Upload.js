import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import ConfirmModal from '../components/ConfirmModal'
import {
  Card, Button, Input, Select, Chip, Dropzone, Badge, ProgressBar, Icon, Skeleton, Banner,
} from '../design-system/ui'
import { notify } from '../design-system/toast'
import { sha256Files } from '../lib/fileHash'

// pdfjs-dist + pdf-lib are ~300KB gzipped combined — loaded on demand (dynamic
// import) so every other page's bundle stays untouched. Only Upload pays for it.
let _pdfjsLib = null
const getPdfjs = async () => {
  if (_pdfjsLib) return _pdfjsLib
  const mod = await import('pdfjs-dist')
  mod.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdfjs/pdf.worker.min.mjs`
  _pdfjsLib = mod
  return mod
}

const css = `
  .up-layout { max-width: 1040px; margin: 0 auto; padding: var(--space-8) var(--space-6); display: grid; grid-template-columns: 1fr 280px; gap: var(--space-8); align-items: start; }
  .up-layout--full { grid-template-columns: 1fr; max-width: 860px; }
  @media (max-width: 1000px) { .up-layout { grid-template-columns: 1fr; max-width: 860px; } }
  .up-side { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: var(--space-6); }
  @media (max-width: 1000px) { .up-side { position: static; } }
  .up-stepper { display: flex; align-items: center; gap: 0; margin-bottom: var(--space-8); }
  .up-stepper__item { display: flex; align-items: center; gap: var(--space-2); flex: 1; }
  .up-stepper__item:last-child { flex: 0; }
  .up-stepper__line { flex: 1; height: 1px; background: var(--border); margin: 0 var(--space-2); }
  .up-stepper__line--done { background: var(--brand); }
  .up-stepper__num { width: 28px; height: 28px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font: 500 12px/1 var(--font-mono); flex-shrink: 0; border: 1px solid var(--border); color: var(--text-subtle); }
  .up-stepper__num--active, .up-stepper__num--done { border-color: var(--brand); color: var(--brand-text); background: var(--brand-soft); }
  .up-stepper__info { display: flex; flex-direction: column; }
  @media (max-width: 768px) { .up-stepper__info { display: none; } }
  .up-field { margin-bottom: var(--space-5); }
  .up-field:last-child { margin-bottom: 0; }
  .up-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
  @media (max-width: 768px) { .up-field-grid { grid-template-columns: 1fr; } }
  .up-uni-wrap { position: relative; }
  .up-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-3); }
  @media (max-width: 640px) { .up-mode-grid { grid-template-columns: 1fr; } }
  .up-mode-card { text-align: left; padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--surface-2); cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
  .up-mode-card--on { border-color: var(--brand); background: var(--brand-soft); }
  .up-fac-row { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-2); }
  .up-radio-row { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer; text-align: left; background: none; width: 100%; margin-bottom: var(--space-2); }
  .up-radio-row--on { border-color: var(--brand); background: var(--brand-soft); }
  .up-radio-dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--border-control); flex-shrink: 0; margin-top: 2px; position: relative; }
  .up-radio-dot--on { border-color: var(--brand); }
  .up-radio-dot--on::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: var(--brand); }
  .up-type-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .up-summary-row { display: flex; justify-content: space-between; gap: var(--space-4); padding: 10px 0; border-bottom: 1px solid var(--border); }
  .up-summary-row:last-child { border-bottom: 0; }
  .up-submit-row { display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-6); }
  @media (max-width: 768px) { .up-submit-row { flex-direction: column-reverse; } .up-submit-row > * { width: 100%; } }
  .up-success { text-align: center; padding: var(--space-12) var(--space-6); }
  .up-rank-card { text-align: left; margin-bottom: var(--space-6); }
  .up-checklist-row { display: flex; align-items: center; gap: var(--space-2); padding: 5px 0; }
  .up-checklist-row svg { color: var(--success); flex-shrink: 0; }
  .up-recent-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 6px 0; border-top: 1px solid var(--border); }
  .up-recent-row:first-child { border-top: 0; }
  .up-module-result { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
`

const DOC_TYPES = [
  { k: 'examen', l: 'Examen final' }, { k: 'cc', l: 'Contrôle continu' }, { k: 'td', l: 'TD' },
  { k: 'tp', l: 'TP' }, { k: 'cours', l: 'Cours' }, { k: 'corrige_examen', l: 'Corrigé examen' },
  { k: 'corrige_td', l: 'Corrigé TD' }, { k: 'corrige_tp', l: 'Corrigé TP' },
  { k: 'quiz', l: 'Quiz' }, { k: 'projet_final', l: 'Projet final' },
]
const YEARS = ['2027/2028', '2026/2027', '2025/2026', '2024/2025', '2023/2024', '2022/2023', '2021/2022', '2020/2021', '2019/2020', '2018/2019']
const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
const fmt = (b) => b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' KB' : (b / (1024 * 1024)).toFixed(1) + ' MB'
const stripHtml = (str) => str.replace(/<[^>]*>/g, '').trim()
const fileKey = f => `${f.name}_${f.size}`

// Free, client-side content check — extracts text from the PDF (no OCR on
// images, no server call) and scans for a moderation-keyword blocklist.
// Best-effort: any parsing error fails OPEN (doesn't block the upload) since
// this is meant as a first pass, not a guarantee.
const FLAG_TERMS = [
  'pornograph', 'nsfw', 'nude', 'naked', 'xxx', 'escort',
  'putain', 'pute', 'salope', 'enculé', 'enculer', 'connasse',
  'nigger', 'nigga', 'faggot', 'chink',
  'kahba', 'zebi', 'zob',
  'fabriquer une bombe', 'fabriquer une arme', 'comment tuer',
]
const scanPdfForFlags = async (file) => {
  try {
    const pdfjsLib = await getPdfjs()
    const buf = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise
    const maxPages = Math.min(pdf.numPages, 15)
    let text = ''
    for (let i = 1; i <= maxPages && text.length < 50000; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += ' ' + content.items.map(it => it.str).join(' ')
    }
    const lower = text.toLowerCase()
    const hit = FLAG_TERMS.find(t => lower.includes(t))
    return hit ? { flagged: true, reason: `Analyse automatique : terme signalé détecté dans le document.` } : { flagged: false, reason: null }
  } catch (e) {
    console.error('scanPdfForFlags:', e)
    return { flagged: false, reason: null }
  }
}

// Free, client-side PDF compression — rasterizes pages via pdf.js and rebuilds
// a lighter PDF from recompressed JPEGs (same idea as the existing image
// compression below, extended to PDFs). Skipped for small/short files, and
// only kept if it actually comes out smaller — never makes a file bigger.
const compressPdf = async (file) => {
  if (file.size < 2 * 1024 * 1024) return file
  try {
    const pdfjsLib = await getPdfjs()
    const { PDFDocument } = await import('pdf-lib')
    const buf = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise
    if (pdf.numPages > 40) return file // too many pages to rasterize client-side safely
    const scale = file.size > 20 * 1024 * 1024 ? 1.1 : 1.4
    const quality = file.size > 20 * 1024 * 1024 ? 0.62 : 0.72
    const newPdf = await PDFDocument.create()
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality)
      const jpegBytes = await (await fetch(jpegDataUrl)).arrayBuffer()
      const jpgImage = await newPdf.embedJpg(jpegBytes)
      const newPage = newPdf.addPage([canvas.width, canvas.height])
      newPage.drawImage(jpgImage, { x: 0, y: 0, width: canvas.width, height: canvas.height })
    }
    const newBytes = await newPdf.save()
    if (newBytes.length < file.size * 0.9) {
      return new File([newBytes], file.name, { type: 'application/pdf' })
    }
    return file
  } catch (e) {
    console.error('compressPdf failed, uploading original:', e)
    return file
  }
}

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/x-ipynb+json',
])
const ALLOWED_EXTS = new Set(['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'ipynb', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'])
const getExt = f => f.name.split('.').pop().toLowerCase()
const isAllowed = f => f.type.startsWith('image/') || ALLOWED_TYPES.has(f.type) || ALLOWED_EXTS.has(getExt(f))

export default function Upload() {
  const navigate = useNavigate()
  const prefetchedForUniRef = useRef(null)
  const isSubmittingRef = useRef(false)
  const isSubmittingFacRef = useRef(false)
  const fileFlagsRef = useRef({})
  const pendingScansRef = useRef([])
  const fileHashesRef = useRef({})

  const [user, setUser] = useState(null)
  const [hashingKeys, setHashingKeys] = useState(() => new Set())
  const [dupWarning, setDupWarning] = useState(null)
  const [authLoad, setAuthLoad] = useState(true)
  const [profile, setProfile] = useState(null)
  const [recentUploads, setRecentUploads] = useState([])
  const [detected, setDetected] = useState([])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [modal, setModal] = useState(null)
  const [success, setSuccess] = useState(false)
  const [heldForReview, setHeldForReview] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('published')
  const [uploadedModuleId, setUploadedModuleId] = useState(null)

  // Cascading selects
  const [unis, setUnis] = useState([])
  const [facs, setFacs] = useState([])
  const [fils, setFils] = useState([])
  const [facsFetched, setFacsFetched] = useState(false)
  const [uniMode, setUniMode] = useState('') // '' | 'independent' | 'multi_faculty'
  const [showAddFacForm, setShowAddFacForm] = useState(false)
  const [addFacName, setAddFacName] = useState('')
  const [addFacType, setAddFacType] = useState('Faculté')
  const [addFacBusy, setAddFacBusy] = useState(false)
  const [selUni, setSelUni] = useState('')
  const [selFac, setSelFac] = useState('')
  const [selFil, setSelFil] = useState('')
  const [selSem, setSelSem] = useState('')
  const [selMod, setSelMod] = useState(null)

  const [modSearch, setModSearch] = useState('')
  const [modResults, setModResults] = useState([])
  const [uniSearch, setUniSearch] = useState('')
  const [showUniDd, setShowUniDd] = useState(false)

  // School request form
  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [schoolSent, setSchoolSent] = useState(false)
  const [schoolCase, setSchoolCase] = useState('')
  const [schoolSubmitting, setSchoolSubmitting] = useState(false)
  // Case A — independent school
  const [schAName, setSchAName] = useState('')
  const [schACity, setSchACity] = useState('')
  const [schAType, setSchAType] = useState('public')
  // Case B — faculty of existing university
  const [schBParentUni, setSchBParentUni] = useState('')
  const [schBFaculties, setSchBFaculties] = useState([{ name: '', type: 'Faculté' }])
  // Case C — new university with its faculties
  const [schCUniName, setSchCUniName] = useState('')
  const [schCCity, setSchCCity] = useState('')
  const [schCType, setSchCType] = useState('public')
  const [schCFaculties, setSchCFaculties] = useState([{ name: '', type: 'Faculté' }])

  // Filière suggestion form
  const [showFiliereForm, setShowFiliereForm] = useState(false)
  const [filiereName, setFiliereName] = useState('')
  const [filiereNbSem, setFiliereNbSem] = useState('')
  const [filiereSent, setFiliereSent] = useState(false)

  // Points state for success screen
  const [earnedPoints, setEarnedPoints] = useState(null)

  // Doc info
  const [docType, setDocType] = useState('')
  const [year, setYear] = useState('')
  const [professor, setProfessor] = useState('')
  const [profSuggestions, setProfSuggestions] = useState([])
  const [showProfDD, setShowProfDD] = useState(false)
  const [docNumber, setDocNumber] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])

  // Auth check — redirect to login if not logged in
  useEffect(() => {
    document.title = 'Uploader un document — 9rawZid9ra'
    let done = false
    const loginRedirect = () => {
      if (!done) { done = true; sessionStorage.setItem('redirectAfterLogin', '/upload'); navigate('/login', { state: { from: '/upload', message: 'Connecte-toi pour continuer' } }) }
    }
    const timeout = setTimeout(loginRedirect, 3000)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        if (done) return
        done = true
        if (!session?.user) {
          sessionStorage.setItem('redirectAfterLogin', '/upload')
          navigate('/login', { state: { from: '/upload', message: 'Connecte-toi pour continuer' } })
        } else {
          setUser(session.user)
          setAuthLoad(false)
          supabase.from('user_profiles').select('points, uploads_count').eq('id', session.user.id).single()
            .then(({ data }) => setProfile(data))
          supabase.from('documents')
            .select('id, doc_type, is_verified, created_at, modules(name)')
            .eq('uploader_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(3)
            .then(({ data }) => setRecentUploads(data || []))
        }
      })
      .catch(() => { clearTimeout(timeout); loginRedirect() })
  }, [])

  useEffect(() => {
    supabase.from('universities').select('*').order('name')
      .then(({ data }) => setUnis(data || []))
  }, [])

  useEffect(() => {
    if (!selUni) { setFacs([]); setSelFac(''); setFacsFetched(false); setUniMode(''); setShowAddFacForm(false); setAddFacName(''); setAddFacType('Faculté'); return }
    if (prefetchedForUniRef.current === selUni) {
      prefetchedForUniRef.current = null
      setSelFac(''); setSelFil(''); setSelSem(''); setSelMod(null); setUniMode(''); setShowAddFacForm(false); setAddFacName(''); setAddFacType('Faculté')
      return
    }
    setFacsFetched(false); setUniMode(''); setShowAddFacForm(false); setAddFacName(''); setAddFacType('Faculté')
    supabase.from('faculties').select('*').eq('university_id', selUni).neq('type', 'root').order('name')
      .then(({ data }) => {
        setFacs(data || [])
        setFacsFetched(true)
      })
    setSelFac(''); setSelFil(''); setSelSem(''); setSelMod(null)
  }, [selUni]) // eslint-disable-line

  useEffect(() => {
    if (!selFac) { setFils([]); setSelFil(''); return }
    supabase.from('filieres').select('*').eq('faculty_id', selFac).order('name')
      .then(({ data }) => setFils(data || []))
    setSelFil(''); setSelSem(''); setSelMod(null)
  }, [selFac])

  useEffect(() => {
    if (!selFil || !selSem || modSearch.trim().length < 2) { setModResults([]); return }
    supabase.from('modules')
      .select('*')
      .eq('filiere_id', selFil)
      .eq('semester', selSem)
      .ilike('name', `%${modSearch.trim()}%`)
      .limit(8)
      .then(({ data }) => setModResults(data || []))
  }, [modSearch, selFil, selSem])

  useEffect(() => {
    if (!selMod?.id || selMod.custom) { setProfSuggestions([]); return }
    supabase.from('documents')
      .select('professor')
      .eq('module_id', selMod.id)
      .not('professor', 'is', null)
      .then(({ data }) => {
        const names = [...new Set((data || []).map(d => d.professor).filter(Boolean))]
        setProfSuggestions(names)
      })
  }, [selMod])

  // Real filename-based detection (no OCR/AI — just parsing the filename text)
  // for the two fields that live on this step: document type and academic year.
  const detectFromFilename = (filename) => {
    const chips = []
    const yearMatch = filename.match(/20\d{2}[/-]20\d{2}/) || filename.match(/20\d{2}/)
    if (yearMatch) {
      let y = yearMatch[0].replace('-', '/')
      if (/^\d{4}$/.test(y)) y = `${y}/${parseInt(y, 10) + 1}`
      if (YEARS.includes(y)) {
        setYear(prev => prev || y)
        chips.push({ label: y })
      }
    }
    const TYPE_HINTS = [
      [/CORRIG.{0,3}EXAM|EXAM.{0,3}CORRIG/i, 'corrige_examen', 'Corrigé Examen'],
      [/CORRIG.{0,3}TD|TD.{0,3}CORRIG/i, 'corrige_td', 'Corrigé TD'],
      [/CORRIG.{0,3}TP|TP.{0,3}CORRIG/i, 'corrige_tp', 'Corrigé TP'],
      [/FINAL|EXAMEN|EXAM\b/i, 'examen', 'Examen Final'],
      [/\bCC\b|CONTROLE.?CONTINU/i, 'cc', 'Contrôle Continu'],
      [/QUIZ|INTERRO/i, 'quiz', 'Quiz / Interro'],
      [/PROJET/i, 'projet_final', 'Projet Final'],
      [/\bTD\b/i, 'td', 'Travail Dirigé'],
      [/\bTP\b/i, 'tp', 'Travail Pratique'],
      [/COURS|CHAPITRE/i, 'cours', 'Cours'],
    ]
    for (const [re, key, label] of TYPE_HINTS) {
      if (re.test(filename)) {
        setDocType(prev => prev || key)
        chips.push({ label })
        break
      }
    }
    setDetected(chips)
  }

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    const valid = arr.filter(isAllowed)
    if (valid.length !== arr.length) setError('Format non supporté. Acceptés : PDF, images, PPT, Word, Excel, Notebook (.ipynb)')
    else setError('')

    const tooLarge = valid.filter(f => f.size > 50 * 1024 * 1024)
    if (tooLarge.length) { setError(`Fichier trop grand (max 50MB): ${tooLarge[0].name}`); return }

    if (files.length === 0 && valid.length > 0) detectFromFilename(valid[0].name)

    // Kick off the free content scan for any PDF as soon as it's added —
    // resolves in the background, awaited later at submit time.
    valid.filter(f => f.type === 'application/pdf').forEach(f => {
      const key = fileKey(f)
      const p = scanPdfForFlags(f).then(res => { fileFlagsRef.current[key] = res })
      pendingScansRef.current.push(p)
    })

    // Fingerprint the newly added files and check for existing duplicates.
    if (valid.length > 0) {
      const keys = valid.map(fileKey)
      setHashingKeys(prev => new Set([...prev, ...keys]))
      sha256Files(valid).then(async (hashes) => {
        valid.forEach((f, i) => { fileHashesRef.current[fileKey(f)] = hashes[i] })
        setHashingKeys(prev => { const n = new Set(prev); keys.forEach(k => n.delete(k)); return n })
        const results = await Promise.all(hashes.map(h => supabase.rpc('find_duplicate_documents', { p_hashes: [h] })))
        const dupIndex = results.findIndex(r => r.data && r.data.length > 0)
        if (dupIndex !== -1) setDupWarning({ key: keys[dupIndex], fileName: valid[dupIndex].name, match: results[dupIndex].data[0] })
      })
    }

    const combined = [...files, ...valid].slice(0, 20)
    setFiles(combined)

    combined.forEach((f, i) => {
      if (f.type.startsWith('image/') && !previews[i]) {
        const reader = new FileReader()
        reader.onload = (e) => setPreviews(prev => {
          const n = [...prev]; n[i] = e.target.result; return n
        })
        reader.readAsDataURL(f)
      }
    })
  }

  const removeFile = (i) => {
    setFiles(f => f.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  const handleFiliereRequest = async () => {
    if (!filiereName.trim()) return
    if (!user) { sessionStorage.setItem('redirectAfterLogin', '/upload'); navigate('/login', { state: { from: '/upload' } }); return }
    try {
      await supabase.from('filiere_suggestions').insert({
        suggested_by: user.id,
        faculty_id: selFac ? parseInt(selFac) : null,
        name: filiereName.trim(),
        total_semesters: filiereNbSem ? parseInt(filiereNbSem) : null,
        status: 'approved',
      })
      if (selFac) {
        const payload = { faculty_id: parseInt(selFac), name: filiereName.trim(), total_semesters: filiereNbSem ? parseInt(filiereNbSem) : 6 }
        const { data: newFil, error: filErr } = await supabase.from('filieres').insert(payload).select().single()
        if (filErr) { console.error('[Filière] insert error:', filErr); setError('Erreur ajout filière : ' + filErr.message); return }
        const { data: updatedFils } = await supabase.from('filieres').select('*').eq('faculty_id', parseInt(selFac)).order('name')
        if (updatedFils) setFils(updatedFils)
        if (newFil) setSelFil(String(newFil.id))
      }
      notify.success('Filière ajoutée', 'Disponible immédiatement.')
      setFiliereSent(true)
      setTimeout(() => { setFiliereSent(false); setShowFiliereForm(false); setFiliereName(''); setFiliereNbSem('') }, 3000)
    } catch (e) {
      setError('Erreur inattendue : ' + e.message)
    }
  }

  // Option A: independent school — find or create a hidden root faculty, then use it directly
  const handleSelectIndependent = async () => {
    setUniMode('independent')
    const { data: existing } = await supabase
      .from('faculties')
      .select('id')
      .eq('university_id', parseInt(selUni))
      .eq('type', 'root')
      .maybeSingle()
    if (existing) {
      setSelFac(String(existing.id))
    } else {
      const { data: newFac } = await supabase
        .from('faculties')
        .insert({ university_id: parseInt(selUni), name: '__root__', type: 'root' })
        .select('id').single()
      if (newFac) setSelFac(String(newFac.id))
    }
  }

  // Option B: inline add faculty under the selected university
  const handleAddFacultyInline = async () => {
    if (!addFacName.trim() || !selUni) return
    setAddFacBusy(true)
    const { data: newFac, error } = await supabase
      .from('faculties')
      .insert({ university_id: parseInt(selUni), name: addFacName.trim().slice(0, 120), type: addFacType })
      .select().single()
    if (error) { setError('Erreur : ' + error.message); setAddFacBusy(false); return }
    const { data: updatedFacs } = await supabase
      .from('faculties').select('*').eq('university_id', parseInt(selUni)).neq('type', 'root').order('name')
    if (updatedFacs) setFacs(updatedFacs)
    if (newFac) setSelFac(String(newFac.id))
    setAddFacBusy(false)
    setAddFacName('')
    setAddFacType('Faculté')
    setShowAddFacForm(false)
  }

  // School request submit (3 cases)
  const handleSchoolRequest = async () => {
    if (isSubmittingRef.current) return
    if (!user) { sessionStorage.setItem('redirectAfterLogin', '/upload'); navigate('/login', { state: { from: '/upload' } }); return }
    isSubmittingRef.current = true
    setSchoolSubmitting(true)
    try {
      if (schoolCase === 'independent') {
        if (!schAName.trim()) return
        const safeNameA = stripHtml(schAName).slice(0, 120)
        const safeCityA = stripHtml(schACity).slice(0, 80)
        await supabase.from('school_requests').insert({
          requested_by: user.id, school_name: safeNameA, city: safeCityA || null,
          school_type: schAType, request_type: 'independent', status: 'approved',
        })
        const payload = { name: safeNameA, city: safeCityA || null, type: schAType }
        const { data: newUni, error: uniErr } = await supabase.from('universities').insert(payload).select().single()
        if (uniErr) { console.error('[Case A] error:', uniErr); setError('Erreur ajout université : ' + uniErr.message); return }
        const { data: allUnis } = await supabase.from('universities').select('*').order('name')
        if (allUnis) setUnis(allUnis.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i))
        setSchoolCase(''); setSchAName(''); setSchACity(''); setSchAType('public')
        setShowSchoolForm(false)
        if (newUni) setSelUni(String(newUni.id))
        notify.success('Établissement ajouté', 'Disponible immédiatement.')
        return
      } else if (schoolCase === 'faculty') {
        if (!schBParentUni) return
        const validFacs = schBFaculties.filter(f => f.name.trim())
        if (validFacs.length === 0) { setError('Ajoute au moins une composante.'); return }
        const parentUniId = parseInt(schBParentUni)
        if (isSubmittingFacRef.current) return
        isSubmittingFacRef.current = true
        try {
          for (const fac of validFacs) {
            const safeFacName = stripHtml(fac.name).slice(0, 120)
            await supabase.from('school_requests').insert({
              requested_by: user.id, school_name: safeFacName, school_type: fac.type,
              request_type: 'faculty', parent_university_id: parentUniId, status: 'approved',
            })
            const payload = { university_id: parentUniId, name: safeFacName, type: fac.type }
            const { error: facErr } = await supabase.from('faculties').insert(payload).select().single()
            if (facErr) { console.error('[Case B] error:', facErr); setError(`Erreur ajout "${fac.name}" : ${facErr.message}`); return }
          }
        } finally {
          isSubmittingFacRef.current = false
        }
        const { data: updatedFacs, error: fetchErr } = await supabase.from('faculties').select('*').eq('university_id', parentUniId).neq('type', 'root').order('name')
        if (fetchErr) console.error('[Case B] re-fetch error:', fetchErr)
        if (updatedFacs) setFacs(updatedFacs)
        setFacsFetched(true)
        prefetchedForUniRef.current = String(parentUniId)
        setSelFac(''); setSelFil(''); setSelSem(''); setSelMod(null)
        setSchoolCase(''); setSchBParentUni(''); setSchBFaculties([{ name: '', type: 'Faculté' }])
        setShowSchoolForm(false)
        setSelUni(String(parentUniId))
        notify.success('Composantes ajoutées')
        return
      } else if (schoolCase === 'university_with_faculties') {
        if (!schCUniName.trim()) return
        const validFacs = schCFaculties.filter(f => f.name.trim())
        const safeNameC = stripHtml(schCUniName).slice(0, 120)
        const safeCityC = stripHtml(schCCity).slice(0, 80)
        await supabase.from('school_requests').insert({
          requested_by: user.id, school_name: safeNameC, city: safeCityC || null,
          school_type: schCType, request_type: 'university_with_faculties',
          details: validFacs.length > 0 ? validFacs : null, status: 'approved',
        })
        const uniPayload = { name: safeNameC, city: safeCityC || null, type: schCType }
        const { data: newUni, error: uniErr } = await supabase.from('universities').insert(uniPayload).select().single()
        if (uniErr) { console.error('[Case C] university error:', uniErr); setError('Erreur ajout université : ' + uniErr.message); return }
        if (isSubmittingFacRef.current) return
        isSubmittingFacRef.current = true
        try {
          for (const fac of validFacs) {
            const facPayload = { university_id: newUni.id, name: fac.name, type: fac.type }
            const { error: facErr } = await supabase.from('faculties').insert(facPayload)
            if (facErr) console.error('[Case C] faculty error:', facErr, facPayload)
          }
        } finally {
          isSubmittingFacRef.current = false
        }
        const { data: allUnis } = await supabase.from('universities').select('*').order('name')
        if (allUnis) setUnis(allUnis.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i))
        const { data: newFacs } = await supabase.from('faculties').select('*').eq('university_id', newUni.id).order('name')
        if (newFacs) setFacs(newFacs)
        setFacsFetched(true)
        prefetchedForUniRef.current = String(newUni.id)
        setSelUni(String(newUni.id))
      } else {
        return
      }
      notify.success('Établissement ajouté', 'Disponible immédiatement.')
      setSchoolSent(true)
    } catch (e) {
      console.error('[handleSchoolRequest] unexpected error:', e)
      setError('Erreur inattendue : ' + e.message)
    } finally {
      isSubmittingRef.current = false
      setSchoolSubmitting(false)
    }
  }

  const validateStep1 = () => {
    if (!selUni) return setError('Sélectionne une université.')
    if (!selFac) return setError('Sélectionne une faculté.')
    if (!selFil) return setError('Sélectionne une filière.')
    if (!selSem) return setError('Sélectionne un semestre.')
    if (!selMod) return setError('Sélectionne un module.')
    setError(''); setStep(2)
  }

  const validateStep2 = () => {
    if (!docType) return setError('Sélectionne le type de document.')
    if (['examen', 'cc', 'corrige_examen'].includes(docType) && !year) {
      return setError("L'année académique est obligatoire pour ce type de document.")
    }
    if (files.length === 0) return setError('Ajoute au moins un fichier.')
    setError(''); setStep(3)
  }

  const compressImage = (file) => new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const isLarge = file.size > 5 * 1024 * 1024
        const MAX = isLarge ? 1200 : 1600
        const QUALITY = isLarge ? 0.75 : 0.82
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          if (blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        }, 'image/jpeg', QUALITY)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

  const compressFile = (file) => {
    if (file.type.startsWith('image/')) return compressImage(file)
    if (file.type === 'application/pdf') return compressPdf(file)
    return Promise.resolve(file)
  }

  const handleSubmit = async (skipDupCheck = false) => {
    setLoading(true); setError(''); setProgress(5)
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: recentUploadsCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('uploader_id', user.id)
        .gte('created_at', since)
      if (recentUploadsCount >= 7) {
        setError('Limite de 7 uploads par heure atteinte. Réessaie dans une heure.')
        setLoading(false); setProgress(0); return
      }

      let moduleId = selMod.id
      if (selMod.custom) {
        const { data: newMod, error: modErr } = await supabase.from('modules').insert({
          filiere_id: parseInt(selFil),
          semester: selSem,
          name: stripHtml(selMod.name).slice(0, 120),
          type: 'cours',
          verified: true,
        }).select().single()
        if (modErr) throw new Error('Erreur création module: ' + modErr.message)
        moduleId = newMod.id
      }

      if (!skipDupCheck && !selMod?.custom && moduleId) {
        let dupQ = supabase.from('documents').select('id').eq('module_id', moduleId).eq('doc_type', docType)
        if (year) dupQ = dupQ.eq('academic_year', year)
        const { data: dupDocs } = await dupQ.limit(1)
        if (dupDocs?.length > 0) {
          setLoading(false); setProgress(0)
          setModal({
            title: 'Document similaire détecté',
            message: 'Un document similaire existe déjà pour ce module et cette année. Veux-tu quand même uploader ?',
            confirmText: 'Uploader quand même',
            confirmColor: '#4F8EF7',
            onConfirm: () => { setModal(null); handleSubmit(true) },
            onCancel: () => setModal(null),
          })
          return
        }
      }

      const uploadedFiles = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const compressed = await compressFile(file)
        const ext = file.name.split('.').pop()
        const path = `documents/${user.id}/${Date.now()}_${i}.${ext}`
        const fileBase = Math.round(10 + (i / files.length) * 80)
        const fileChunk = Math.round(80 / files.length)
        const { error: upErr } = await supabase.storage
          .from('documents').upload(path, compressed, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (ev) => {
              const pct = Math.round((ev.loaded / (ev.total || 1)) * fileChunk)
              setProgress(fileBase + pct)
            },
          })
        if (upErr) throw new Error(`Upload échoué: ${upErr.message}`)
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        uploadedFiles.push({ url: publicUrl, name: file.name })
        setProgress(Math.round(10 + ((i + 1) / files.length) * 80))
      }

      const isPdf = files.every(f => f.type === 'application/pdf')
      const isImages = files.every(f => f.type.startsWith('image/'))
      const firstExt = getExt(files[0])
      const allSameExt = files.every(f => getExt(f) === firstExt)
      const fileType = isPdf ? 'pdf' : isImages ? 'images' : allSameExt ? firstExt : 'mixed'

      await Promise.all(pendingScansRef.current)
      const flaggedResult = files.map(f => fileFlagsRef.current[fileKey(f)]).find(r => r?.flagged)
      const isFlagged = !!flaggedResult

      const fileHashes = files.map(f => fileHashesRef.current[fileKey(f)]).filter(Boolean)

      const { data: inserted, error: dbErr } = await supabase.from('documents').insert({
        module_id: moduleId,
        uploader_id: user.id,
        doc_type: docType,
        doc_number: docNumber.trim() || null,
        academic_year: year,
        professor: professor.trim() || null,
        file_type: fileType,
        files: uploadedFiles.map(f => f.url),
        file_names: uploadedFiles.map(f => f.name),
        pages_count: files.length,
        is_flagged: isFlagged,
        flag_reason: flaggedResult?.reason || null,
        is_verified: !isFlagged,
        file_hashes: fileHashes,
        downloads: 0,
        likes: 0,
      }).select('id, status').single()
      if (dbErr) throw new Error(dbErr.message)
      // status exists once the quality migration is applied; fall back to the content-scan flag otherwise.
      const finalStatus = inserted?.status || (isFlagged ? 'pending_review' : 'published')
      setUploadStatus(finalStatus)
      setHeldForReview(finalStatus !== 'published' && finalStatus !== 'verified')

      // Points and uploads_count are awarded server-side (DB trigger) on insert —
      // read the fresh total rather than computing it here.
      if (finalStatus === 'published' || finalStatus === 'verified') {
        const { data: prof } = await supabase.from('user_profiles').select('points').eq('id', user.id).single()
        setEarnedPoints(prof?.points ?? profile?.points ?? 0)
      } else {
        setEarnedPoints(profile?.points || 0)
      }

      setProgress(100)
      setUploadedModuleId(moduleId)
      setSuccess(true)
    } catch (e) {
      setError('Erreur: ' + e.message)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setStep(1); setSuccess(false); setFiles([]); setPreviews([])
    setSelMod(null); setDocType(''); setYear(''); setDocNumber('')
    setProfessor(''); setProfSuggestions([]); setShowProfDD(false)
    setProgress(0); setEarnedPoints(null); setHeldForReview(false)
    setModSearch(''); setError('')
    fileFlagsRef.current = {}; pendingScansRef.current = []; setDetected([])
    fileHashesRef.current = {}; setHashingKeys(new Set()); setDupWarning(null); setUploadStatus('published')
    setShowSchoolForm(false); setSchoolSent(false); setSchoolCase('')
    setSchAName(''); setSchACity(''); setSchAType('public')
    setSchBParentUni(''); setSchBFaculties([{ name: '', type: 'Faculté' }])
    setSchCUniName(''); setSchCCity(''); setSchCType('public'); setSchCFaculties([{ name: '', type: 'Faculté' }])
    setShowFiliereForm(false); setFiliereName(''); setFiliereNbSem(''); setFiliereSent(false)
  }

  if (authLoad) return (
    <div><style>{css}</style><Navbar activePage="upload" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}><Skeleton height={300} /></div>
    </div>
  )

  const STEPS = [
    { n: '1', label: 'Localisation', sub: 'École · Filière · Module' },
    { n: '2', label: 'Document', sub: 'Type · Année · Fichier' },
    { n: '3', label: 'Confirmation', sub: 'Vérifier et envoyer' },
  ]
  const RANKS = [
    { min: 0, max: 99, label: 'Étudiant', next: 'Contributeur' },
    { min: 100, max: 299, label: 'Contributeur', next: 'Senpai' },
    { min: 300, max: 599, label: 'Senpai', next: 'Légende' },
    { min: 600, max: Infinity, label: 'Légende', next: null },
  ]

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="upload" />

      <div className={`up-layout${success ? ' up-layout--full' : ''}`}>
        <div>
          {success ? (
            <Card>
              <div className="up-success">
                <span className="qz-icon-tile qz-icon-tile--lg" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)', margin: '0 auto var(--space-4)' }}>
                  <Icon name={heldForReview ? 'info' : 'check'} />
                </span>
                <h2 className="t-h2">{heldForReview ? 'Document reçu — en cours de vérification' : 'Document publié'}</h2>
                <p className="t-body qz-muted" style={{ margin: 'var(--space-3) auto var(--space-6)', maxWidth: 440 }}>
                  {uploadStatus === 'pending_review'
                    ? <>Ton document est en vérification (contenu ou doublon possible). Tu gagneras tes points dès qu'il sera publié.</>
                    : <>Ton document est en ligne. <b style={{ color: 'var(--success)' }}>+10 points</b>. Il passera Vérifié (+40) après 5 avis positifs ou une vérification de l'équipe.</>}
                </p>

                {earnedPoints !== null && (() => {
                  const pts = earnedPoints
                  const r = RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0]
                  const pct = r.max === Infinity ? 100 : Math.round(((pts - r.min) / (r.max - r.min + 1)) * 100)
                  return (
                    <Card className="up-rank-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="t-eyebrow qz-subtle">Ton niveau</span>
                        <span className="t-mono" style={{ color: 'var(--brand-text)' }}>{pts} pts</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span className="t-label">{r.label}</span>
                        {r.next && <span className="t-caption qz-subtle">→ {r.next} à {r.max + 1} pts</span>}
                      </div>
                      <ProgressBar value={pct} />
                      {r.next && <div className="t-caption qz-subtle" style={{ marginTop: 6 }}>{r.max + 1 - pts} pts jusqu'au rang {r.next}</div>}
                    </Card>
                  )
                })()}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button variant="primary" onClick={() => navigate(`/module/${uploadedModuleId}`)}>Voir le module</Button>
                  <Button variant="secondary" onClick={resetForm}>Partager un autre</Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <span className="t-eyebrow qz-subtle">Partager</span>
              <h1 className="t-h1" style={{ margin: '4px 0 8px' }}>Partage un document</h1>
              <p className="t-body qz-muted" style={{ marginBottom: 'var(--space-8)' }}>Il sera visible immédiatement par toute ta filière. Merci pour ta promo.</p>

              <div className="up-stepper">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="up-stepper__item">
                    <span className={`up-stepper__num${step > i + 1 ? ' up-stepper__num--done' : step === i + 1 ? ' up-stepper__num--active' : ''}`}>
                      {step > i + 1 ? <Icon name="check" size={13} /> : s.n}
                    </span>
                    <span className="up-stepper__info">
                      <span className="t-label">{s.label}</span>
                      <span className="t-caption qz-subtle">{s.sub}</span>
                    </span>
                    {i < STEPS.length - 1 && <span className={`up-stepper__line${step > i + 1 ? ' up-stepper__line--done' : ''}`} />}
                  </div>
                ))}
              </div>

              {error && <div className="qz-banner qz-banner--danger" style={{ marginBottom: 'var(--space-4)' }}><Icon name="alert" /><span>{error}</span></div>}

              {step === 1 && (
                <Card>
                  <span className="t-eyebrow qz-subtle">Étape 1 — Localisation du document</span>
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <div className="up-field-grid" style={selUni && facsFetched && facs.length === 0 ? { gridTemplateColumns: '1fr' } : undefined}>
                      <div className="up-uni-wrap">
                        <Input
                          label="Université / École"
                          placeholder="Cherche une université…"
                          value={selUni ? (unis.find(u => String(u.id) === selUni)?.name ?? uniSearch) : uniSearch}
                          onChange={e => { setUniSearch(e.target.value); setSelUni(''); setShowUniDd(true) }}
                          onFocus={() => setShowUniDd(true)}
                          onBlur={() => setTimeout(() => setShowUniDd(false), 150)}
                        />
                        {showUniDd && (
                          <div className="qz-dropdown" style={{ position: 'absolute', left: 0, right: 0, width: 'auto' }}>
                            {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).map(u => (
                              <button type="button" key={u.id} className="qz-dropdown__item" onMouseDown={() => { setSelUni(String(u.id)); setUniSearch(u.name); setShowUniDd(false) }}>{u.name}</button>
                            ))}
                            {unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase())).length === 0 && (
                              <div style={{ padding: '8px 12px' }}><span className="t-body-sm qz-subtle">Aucun résultat</span></div>
                            )}
                          </div>
                        )}
                        {!selUni && <p className="t-caption qz-subtle" style={{ marginTop: 6 }}>Cherche ton école directement (ex : ENSA, ENCG, SUPMTI) ou sélectionne l'université parente si ton école en fait partie.</p>}
                      </div>
                      {(!selUni || !facsFetched || facs.length > 0) && (
                        <Select label="Faculté / École" value={selFac} onChange={e => setSelFac(e.target.value)} disabled={!selUni || !facsFetched}
                          options={[{ value: '', label: !facsFetched ? 'Chargement…' : 'Sélectionner…' }, ...facs.map(f => ({ value: f.id, label: f.name }))]} />
                      )}
                    </div>

                    {selUni && facsFetched && facs.length === 0 && (
                      <div className="up-field">
                        <span className="t-eyebrow qz-subtle">Comment est organisé ton établissement ?</span>
                        <div className="up-mode-grid" style={{ marginTop: 8 }}>
                          <button type="button" className={`up-mode-card${uniMode === 'independent' ? ' up-mode-card--on' : ''}`} onClick={handleSelectIndependent}>
                            <span className="t-label">École / Institut indépendant</span>
                            <span className="t-body-sm qz-muted">Ton école n'a pas de facultés — les filières sont directes.</span>
                            <span className="t-caption qz-subtle">EMSI · ISPITS · IAV · ISGA · HEM · SUPMTI · ESITH · ENCG · ENSA</span>
                          </button>
                          <button type="button" className={`up-mode-card${uniMode === 'multi_faculty' ? ' up-mode-card--on' : ''}`}
                            onClick={() => { setUniMode('multi_faculty'); setSelFac(''); setFils([]); setSelFil(''); setShowAddFacForm(false) }}>
                            <span className="t-label">Université avec facultés / composantes</span>
                            <span className="t-body-sm qz-muted">Ton université contient plusieurs facultés — choisis la tienne.</span>
                            <span className="t-caption qz-subtle">UM5 → FSR · FEG · FSJES — UIR → ESIN · ESG — UH2C → FST · FLSH</span>
                          </button>
                        </div>
                        <p className="t-caption qz-subtle" style={{ textAlign: 'center' }}>Pas sûr ? Choisis l'option qui ressemble le plus à ton établissement.</p>
                      </div>
                    )}

                    {selUni && facsFetched && facs.length === 0 && uniMode === 'multi_faculty' && (
                      <div className="up-field">
                        <Select label="Faculté / École" value={selFac} onChange={e => setSelFac(e.target.value)}
                          options={[{ value: '', label: 'Aucune composante enregistrée — en ajouter une ci-dessous' }]} />
                        {!showAddFacForm ? (
                          <Button variant="link" size="sm" onClick={() => setShowAddFacForm(true)}>Faculté introuvable ? Ajouter</Button>
                        ) : (
                          <div className="qz-card" style={{ marginTop: 8, background: 'var(--brand-soft)' }}>
                            <span className="t-eyebrow qz-subtle">Ajouter une composante</span>
                            <div className="up-field-grid" style={{ marginTop: 8 }}>
                              <Input label="Nom" placeholder="Ex : FST, FEG, École d'ingénieurs…" value={addFacName} onChange={e => setAddFacName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddFacultyInline()} />
                              <Select label="Type" value={addFacType} onChange={e => setAddFacType(e.target.value)} options={['Faculté', 'École', 'Institut', 'Centre', 'Département']} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button variant="primary" size="sm" loading={addFacBusy} disabled={!addFacName.trim()} onClick={handleAddFacultyInline}>Ajouter</Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowAddFacForm(false)}>Annuler</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="up-field-grid">
                      <Select label="Filière" value={selFil} onChange={e => setSelFil(e.target.value)} disabled={!selFac}
                        options={[{ value: '', label: 'Sélectionner…' }, ...fils.map(f => ({ value: f.id, label: f.name }))]} />
                      <Select label="Semestre" value={selSem} onChange={e => { setSelSem(e.target.value); setSelMod(null); setModSearch('') }} disabled={!selFil}
                        options={[{ value: '', label: 'Sélectionner…' }, ...SEMESTERS.map(s => ({ value: s, label: s }))]} />
                    </div>

                    {selFac && (
                      <div className="up-field">
                        {!showFiliereForm ? (
                          <Button variant="link" size="sm" onClick={() => setShowFiliereForm(true)}>Filière introuvable ? Ajouter</Button>
                        ) : filiereSent ? (
                          <Badge tone="success" icon="check">Filière ajoutée</Badge>
                        ) : (
                          <div className="qz-card" style={{ background: 'var(--brand-soft)' }}>
                            <span className="t-eyebrow qz-subtle">Signaler une filière manquante</span>
                            <div className="up-field-grid" style={{ marginTop: 8 }}>
                              <Input label="Nom de la filière" placeholder="Ex : Génie Informatique, MIAGE…" value={filiereName} onChange={e => setFiliereName(e.target.value)} />
                              <Input label="Nombre de semestres" type="number" min="1" max="10" placeholder="Ex : 6, 8, 10…" value={filiereNbSem} onChange={e => setFiliereNbSem(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button variant="primary" size="sm" onClick={handleFiliereRequest}>Signaler la filière</Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowFiliereForm(false)}>Annuler</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="up-field">
                      <label className="qz-label">Module</label>
                      {selMod ? (
                        <div className="qz-dropdown__item up-module-result" style={{ position: 'static', background: 'var(--brand-soft)' }}>
                          <span className="t-label">{selMod.name}</span>
                          <Button variant="link" size="sm" onClick={() => { setSelMod(null); setModSearch('') }}>Changer</Button>
                        </div>
                      ) : (
                        <div className="up-uni-wrap">
                          <Input
                            placeholder={selFil && selSem ? 'Tape le nom du module…' : "Sélectionne filière et semestre d'abord"}
                            value={modSearch}
                            onChange={e => setModSearch(e.target.value)}
                            disabled={!selFil || !selSem}
                          />
                          {modResults.length > 0 && (
                            <div className="qz-dropdown" style={{ position: 'absolute', left: 0, right: 0, width: 'auto' }}>
                              {modResults.map(m => (
                                <button type="button" key={m.id} className="qz-dropdown__item up-module-result" onClick={() => { setSelMod(m); setModSearch(m.name); setModResults([]) }}>
                                  <span>{m.name}</span><span className="t-mono qz-subtle">{m.semester}</span>
                                </button>
                              ))}
                              <div className="qz-dropdown__sep" />
                              <button type="button" className="qz-dropdown__item" onClick={() => { setSelMod({ id: null, name: modSearch.trim(), custom: true }); setModResults([]) }}>
                                <Icon name="plus" /> Créer "{modSearch.trim()}" comme nouveau module
                              </button>
                            </div>
                          )}
                          {modResults.length === 0 && modSearch.trim().length >= 2 && selFil && selSem && (
                            <div style={{ marginTop: 6 }}>
                              <Button variant="secondary" block onClick={() => { setSelMod({ id: null, name: modSearch.trim(), custom: true }); setModResults([]) }}>
                                Créer le module "{modSearch.trim()}" et continuer
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      <span className="qz-hint">Tape au moins 2 lettres pour rechercher</span>
                    </div>

                    <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                      {!showSchoolForm ? (
                        <Button variant="link" size="sm" onClick={() => setShowSchoolForm(true)}>Mon établissement n'est pas dans la liste</Button>
                      ) : schoolSent ? (
                        <Badge tone="success" icon="check">Établissement ajouté</Badge>
                      ) : (
                        <div className="qz-card" style={{ background: 'var(--brand-soft)' }}>
                          <span className="t-eyebrow qz-subtle">Demande d'ajout d'établissement</span>
                          <p className="t-label" style={{ margin: 'var(--space-3) 0 var(--space-2)' }}>Quel type d'établissement veux-tu ajouter ?</p>
                          {[
                            { v: 'independent', l: 'Une école / université indépendante', s: 'ENSA, ENCG, IAV, FST…' },
                            { v: 'faculty', l: "Une faculté d'une université déjà listée", s: 'Ex : Faculté des Sciences → Univ. Mohammed V' },
                            { v: 'university_with_faculties', l: 'Une nouvelle université + ses facultés', s: "Ajouter l'université et ses composantes en même temps" },
                          ].map(opt => (
                            <button type="button" key={opt.v} className={`up-radio-row${schoolCase === opt.v ? ' up-radio-row--on' : ''}`} onClick={() => setSchoolCase(opt.v)}>
                              <span className={`up-radio-dot${schoolCase === opt.v ? ' up-radio-dot--on' : ''}`} />
                              <span>
                                <span className="t-body-sm" style={{ display: 'block' }}>{opt.l}</span>
                                <span className="t-caption qz-subtle">{opt.s}</span>
                              </span>
                            </button>
                          ))}

                          {schoolCase === 'independent' && (
                            <>
                              <div className="up-field-grid">
                                <Input label="Nom de l'école" placeholder="Ex : ENSA Kénitra, ENCG Casablanca…" value={schAName} onChange={e => setSchAName(e.target.value)} />
                                <Input label="Ville" placeholder="Ex : Rabat, Casablanca…" value={schACity} onChange={e => setSchACity(e.target.value)} />
                              </div>
                              <Select label="Type" value={schAType} onChange={e => setSchAType(e.target.value)} options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Privé' }]} />
                            </>
                          )}

                          {schoolCase === 'faculty' && (
                            <>
                              <Select label="Université parente" value={schBParentUni} onChange={e => setSchBParentUni(e.target.value)}
                                options={[{ value: '', label: 'Sélectionner une université…' }, ...unis.map(u => ({ value: u.id, label: u.name }))]} />
                              <label className="qz-label" style={{ marginTop: 'var(--space-3)', display: 'block' }}>Composantes à ajouter</label>
                              {schBFaculties.map((f, i) => (
                                <div key={i} className="up-fac-row">
                                  <span style={{ flex: 1 }}><Input placeholder="Nom de la faculté…" value={f.name} onChange={e => { const a = [...schBFaculties]; a[i] = { ...a[i], name: e.target.value }; setSchBFaculties(a) }} /></span>
                                  <Select value={f.type} onChange={e => { const a = [...schBFaculties]; a[i] = { ...a[i], type: e.target.value }; setSchBFaculties(a) }} options={['Faculté', 'École', 'Institut', 'Centre', 'Département', 'Autre']} />
                                  {schBFaculties.length > 1 && <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Retirer" onClick={() => setSchBFaculties(a => a.filter((_, j) => j !== i))} />}
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" icon="plus" onClick={() => setSchBFaculties(a => [...a, { name: '', type: 'Faculté' }])}>Ajouter une composante</Button>
                            </>
                          )}

                          {schoolCase === 'university_with_faculties' && (
                            <>
                              <div className="up-field-grid">
                                <Input label="Nom de l'université" placeholder="Ex : Université Ibn Tofail…" value={schCUniName} onChange={e => setSchCUniName(e.target.value)} />
                                <Input label="Ville" placeholder="Ex : Kénitra, Marrakech…" value={schCCity} onChange={e => setSchCCity(e.target.value)} />
                              </div>
                              <Select label="Type" value={schCType} onChange={e => setSchCType(e.target.value)} options={[{ value: 'public', label: 'Publique' }, { value: 'private', label: 'Privée' }]} />
                              <label className="qz-label" style={{ marginTop: 'var(--space-3)', display: 'block' }}>Facultés / Composantes</label>
                              {schCFaculties.map((f, i) => (
                                <div key={i} className="up-fac-row">
                                  <span style={{ flex: 1 }}><Input placeholder="Nom de la faculté…" value={f.name} onChange={e => { const a = [...schCFaculties]; a[i] = { ...a[i], name: e.target.value }; setSchCFaculties(a) }} /></span>
                                  <Select value={f.type} onChange={e => { const a = [...schCFaculties]; a[i] = { ...a[i], type: e.target.value }; setSchCFaculties(a) }} options={['Faculté', 'École', 'Institut', 'Centre', 'Département', 'Autre']} />
                                  {schCFaculties.length > 1 && <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Retirer" onClick={() => setSchCFaculties(a => a.filter((_, j) => j !== i))} />}
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" icon="plus" onClick={() => setSchCFaculties(a => [...a, { name: '', type: 'Faculté' }])}>Ajouter une faculté</Button>
                            </>
                          )}

                          {schoolCase && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-3)' }}>
                              <Button variant="primary" size="sm" loading={schoolSubmitting} onClick={handleSchoolRequest}>Envoyer la demande</Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowSchoolForm(false)}>Annuler</Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="up-submit-row">
                    <Button variant="ghost" onClick={() => { setShowSchoolForm(false); setShowFiliereForm(false) }}>Annuler</Button>
                    <Button variant="primary" onClick={validateStep1} disabled={!selUni || !selFac || !selFil || !selSem || !selMod}>Continuer</Button>
                  </div>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <span className="t-eyebrow qz-subtle">Étape 2 — Informations du document</span>
                  <div className="up-field" style={{ marginTop: 'var(--space-4)' }}>
                    <label className="qz-label">Type de document</label>
                    <div className="up-type-grid">
                      {DOC_TYPES.map(t => <Chip key={t.k} selected={docType === t.k} onClick={() => setDocType(t.k)}>{t.l}</Chip>)}
                    </div>
                  </div>
                  <div className="up-field-grid">
                    <div>
                      <Select label="Année académique" value={year} onChange={e => setYear(e.target.value)} options={[{ value: '', label: 'Sélectionner…' }, ...YEARS.map(y => ({ value: y, label: y }))]} />
                      <span className="qz-hint" style={{ color: 'var(--danger)' }}>Obligatoire pour examens, CCs et corrigés</span>
                    </div>
                    <div className="up-uni-wrap">
                      <Input label="Professeur (optionnel)" placeholder="Ex : Dr. Alaoui, Pr. Benali…" value={professor}
                        onChange={e => setProfessor(e.target.value)} onFocus={() => setShowProfDD(true)} onBlur={() => setTimeout(() => setShowProfDD(false), 150)} />
                      {showProfDD && profSuggestions.length > 0 && (() => {
                        const q = professor.trim().toLowerCase()
                        const filtered = q ? profSuggestions.filter(n => n.toLowerCase().includes(q)) : profSuggestions
                        return filtered.length > 0 ? (
                          <div className="qz-dropdown" style={{ position: 'absolute', left: 0, right: 0, width: 'auto', padding: 8, flexDirection: 'row', flexWrap: 'wrap', display: 'flex', gap: 6 }}>
                            {filtered.map(name => <Chip key={name} onMouseDown={e => { e.preventDefault(); setProfessor(name); setShowProfDD(false) }}>{name}</Chip>)}
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>

                  {['td', 'tp', 'cours', 'corrige_td', 'corrige_tp'].includes(docType) && (
                    <div className="up-field">
                      <Input
                        label={docType === 'cours' ? 'Chapitre(s)' : 'Numéro'}
                        placeholder={docType === 'cours' ? 'Ex : Chapitre 1, Ch. 1-3' : docType === 'td' ? 'Ex : TD1, TD2, TD3…' : docType === 'tp' ? 'Ex : TP1, TP2…' : 'Ex : TD1, TP2…'}
                        value={docNumber} onChange={e => setDocNumber(e.target.value)}
                        hint={docType === 'cours' ? 'Précise les chapitres couverts dans ce fichier' : 'Aide les étudiants à identifier le bon fichier'}
                      />
                    </div>
                  )}

                  <div className="up-field">
                    <label className="qz-label">Fichier(s)</label>
                    <Dropzone
                      hint="PDF, images, PPT, Word, Excel, Notebook · jusqu'à 20 fichiers · 50 Mo max"
                      accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.ipynb"
                      onFiles={handleFiles}
                      onRemove={removeFile}
                      files={files.map((f, i) => ({
                        ext: getExt(f).toUpperCase().slice(0, 4),
                        name: f.name,
                        size: fmt(f.size),
                        preview: previews[i],
                        note: hashingKeys.has(fileKey(f))
                          ? ' · Analyse…'
                          : f.type.startsWith('image/')
                          ? (f.size > 5 * 1024 * 1024 ? ' · compression agressive' : ' · compression auto')
                          : (f.size > 20 * 1024 * 1024 ? ' · fichier volumineux, upload direct' : ' · upload direct'),
                      }))}
                    />
                    {detected.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {detected.map((d, i) => <Badge key={i} tone="brand" icon="check">Détecté et appliqué : {d.label}</Badge>)}
                      </div>
                    )}
                    {dupWarning && (
                      <div style={{ marginTop: 8 }}>
                        <Banner tone="warning">
                          Ce fichier existe déjà : {dupWarning.match.title || `${dupWarning.match.doc_type} ${dupWarning.match.academic_year || ''}`} dans <Link to={`/module/${dupWarning.match.module_slug || dupWarning.match.module_id}`} style={{ color: 'var(--brand-text)' }}>{dupWarning.match.module_name}</Link>
                        </Banner>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          <Button variant="ghost" size="sm" onClick={() => { const idx = files.findIndex(f => fileKey(f) === dupWarning.key); if (idx !== -1) removeFile(idx); setDupWarning(null) }}>Annuler ce fichier</Button>
                          <Button variant="secondary" size="sm" onClick={() => setDupWarning(null)}>Continuer quand même</Button>
                        </div>
                      </div>
                    )}
                    {files.length > 0 && <div className="t-caption qz-subtle" style={{ marginTop: 6, textAlign: 'center' }}>{files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}</div>}
                  </div>

                  <div className="up-submit-row">
                    <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                    <Button variant="primary" onClick={validateStep2} disabled={!docType || files.length === 0 || (['examen', 'cc', 'corrige_examen'].includes(docType) && !year)}>Continuer</Button>
                  </div>
                </Card>
              )}

              {step === 3 && (
                <Card>
                  <span className="t-eyebrow qz-subtle">Étape 3 — Confirmation</span>
                  <div className="qz-banner qz-banner--warning" style={{ margin: 'var(--space-4) 0' }}><Icon name="alert" /><span>Vérifie que tout est correct avant d'envoyer.</span></div>

                  {[
                    ['Module', selMod?.name],
                    ['Semestre', selSem],
                    ['Type', DOC_TYPES.find(t => t.k === docType)?.l],
                    ['Année', year || '—'],
                    ['Professeur', professor || '—'],
                    ...(docNumber ? [['Numéro / Chapitre', docNumber]] : []),
                    ['Fichiers', `${files.length} fichier${files.length > 1 ? 's' : ''} (${files.map(f => fmt(f.size)).join(', ')})`],
                  ].map(([k, v]) => (
                    <div key={k} className="up-summary-row">
                      <span className="t-eyebrow qz-subtle">{k}</span>
                      <span className="t-body-sm">{v}</span>
                    </div>
                  ))}

                  {loading && progress > 0 && progress < 100 && (
                    <div style={{ marginTop: 'var(--space-5)' }}>
                      <div className="t-caption qz-subtle" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span>Envoi en cours…</span><span>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>
                  )}

                  <div className="up-submit-row">
                    <Button variant="ghost" onClick={() => setStep(2)} disabled={loading}>Retour</Button>
                    <Button variant="primary" loading={loading} onClick={() => handleSubmit()}>{loading ? `Publication… ${progress}%` : 'Publier'}</Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {!success && (
          <aside className="up-side">
            {(() => {
              const pts = profile?.points || 0
              const r = RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0]
              const pct = r.max === Infinity ? 100 : Math.round(((pts - r.min) / (r.max - r.min + 1)) * 100)
              return (
                <Card>
                  <span className="t-eyebrow qz-subtle">Tes points</span>
                  <div className="t-stat" style={{ margin: '6px 0' }}>+50 points</div>
                  {r.next ? (
                    <p className="t-body-sm qz-muted">{r.max + 1 - pts} points de plus pour débloquer le rang <b>{r.next}</b>.</p>
                  ) : (
                    <p className="t-body-sm qz-muted">Tu es au rang maximum — <b>Légende</b>.</p>
                  )}
                  <div style={{ marginTop: 8 }}><ProgressBar value={pct} /></div>
                  <div className="t-caption qz-subtle" style={{ marginTop: 4 }}>{pts} / {r.max === Infinity ? pts : r.max + 1} pts</div>
                </Card>
              )
            })()}

            <Card>
              <span className="t-eyebrow qz-subtle">Checklist qualité</span>
              <div style={{ marginTop: 8 }}>
                {['Pages lisibles, pas floues', 'PDF, JPG ou PNG · max 50 Mo', "Aucun nom d'étudiant visible", 'Année universitaire indiquée'].map(c => (
                  <div key={c} className="up-checklist-row"><Icon name="check" size={14} /><span className="t-body-sm qz-muted">{c}</span></div>
                ))}
              </div>
            </Card>

            {recentUploads.length > 0 && (
              <Card>
                <span className="t-eyebrow qz-subtle">Tes derniers partages</span>
                <div style={{ marginTop: 8 }}>
                  {recentUploads.map(d => (
                    <div key={d.id} className="up-recent-row">
                      <span className="t-body-sm qz-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.modules?.name || 'Module'}</span>
                      <Badge tone={d.is_verified ? 'success' : 'warning'}>{d.is_verified ? 'publié' : 'en revue'}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </aside>
        )}
      </div>
      {modal && <ConfirmModal {...modal} onCancel={modal.onCancel} />}
    </div>
  )
}
