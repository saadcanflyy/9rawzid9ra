import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222; --s3:#111827;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --red:#F87171; --yellow:#FBD34D; --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  html,body { background:var(--bg); font-family:'Outfit',sans-serif; min-height:100vh; }
  .page { min-height:100vh; display:flex; flex-direction:column; }
  .layout { max-width:860px; margin:0 auto; padding:2.5rem 2rem; width:100%; flex:1; }
  .page-tag { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:0.75rem; }
  .page-title { font-size:1.75rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; margin-bottom:0.5rem; }
  .page-desc { font-size:0.875rem; color:var(--text2); margin-bottom:2.5rem; line-height:1.6; }

  /* STEPPER */
  .stepper { display:flex; align-items:center; gap:0; margin-bottom:2.5rem; }
  .stepper-item { display:flex; align-items:center; gap:10px; flex:1; }
  .stepper-item:last-child { flex:0; }
  .s-num { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'DM Mono',monospace; font-size:0.75rem; font-weight:500; flex-shrink:0; transition:all 0.3s; }
  .s-num.pending { background:var(--s2); border:1px solid var(--border); color:var(--text3); }
  .s-num.active  { background:rgba(79,142,247,0.15); border:1px solid var(--accent); color:var(--accent2); }
  .s-num.done    { background:rgba(45,212,191,0.12); border:1px solid var(--teal); color:var(--teal2); }
  .s-info { display:flex; flex-direction:column; }
  .s-label { font-size:0.78rem; font-weight:600; color:var(--text2); }
  .s-sub { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); }
  .s-line { flex:1; height:1px; background:var(--border); margin:0 12px; transition:background 0.3s; }
  .s-line.done { background:linear-gradient(90deg,var(--teal),var(--accent)); }

  .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:1.75rem; margin-bottom:1.5rem; }
  .card-title { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:1.25rem; }

  .field { margin-bottom:1.25rem; }
  .field:last-child { margin-bottom:0; }
  .field-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.25rem; }
  .label { display:block; font-family:'DM Mono',monospace; font-size:0.63rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.5rem; }
  .select { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font-size:0.875rem; font-family:'Outfit',sans-serif; outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5568' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; transition:border-color 0.15s; }
  .select:focus { border-color:var(--accent); outline:none; }
  .select:disabled { opacity:0.4; cursor:not-allowed; }
  .select option { background:var(--s2); }
  .input { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font-size:0.875rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s; }
  .input:focus { border-color:var(--accent); }
  .input::placeholder { color:var(--text3); }
  .input:disabled { opacity:0.4; cursor:not-allowed; }
  .hint { font-size:0.7rem; color:var(--text3); margin-top:5px; font-family:'DM Mono',monospace; }

  /* MODULE SEARCH */
  .module-search-wrap { position:relative; }
  .module-results { position:absolute; top:100%; left:0; right:0; z-index:50; background:var(--s2); border:1px solid var(--borderhi); border-radius:9px; margin-top:4px; overflow:hidden; max-height:220px; overflow-y:auto; }
  .module-result { padding:10px 12px; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
  .module-result:last-child { border-bottom:none; }
  .module-result:hover { background:var(--s3); }
  .module-result-name { font-size:0.85rem; color:var(--text); }
  .module-result-sem { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--accent2); }
  .module-selected { background:rgba(79,142,247,0.06); border:1px solid rgba(79,142,247,0.2); border-radius:9px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; }
  .module-selected-name { font-size:0.875rem; color:var(--white); font-weight:500; }
  .module-selected-clear { background:none; border:none; color:var(--text3); cursor:pointer; font-size:0.75rem; font-family:'DM Mono',monospace; transition:color 0.15s; }
  .module-selected-clear:hover { color:var(--red); }

  /* PROFESSOR AUTOCOMPLETE */
  .prof-wrap { position:relative; }
  .prof-dd { position:absolute; top:100%; left:0; right:0; z-index:50; background:var(--s2); border:1px solid var(--borderhi); border-radius:9px; margin-top:4px; box-shadow:0 8px 24px rgba(0,0,0,0.4); }
  .prof-chips { display:flex; flex-wrap:wrap; gap:6px; padding:8px 10px; }
  .prof-chip { background:rgba(79,142,247,0.08); border:1px solid rgba(79,142,247,0.2); color:var(--accent2); border-radius:20px; padding:4px 10px; font-size:0.75rem; cursor:pointer; transition:all 0.15s; font-family:'DM Mono',monospace; }
  .prof-chip:hover { background:rgba(79,142,247,0.18); border-color:var(--accent); }

  /* FILE UPLOAD */
  .upload-zone { border:2px dashed var(--border); border-radius:12px; padding:2.5rem; text-align:center; cursor:pointer; transition:all 0.2s; background:var(--s2); }
  .upload-zone:hover, .upload-zone.drag { border-color:var(--accent); background:rgba(79,142,247,0.04); }
  .upload-zone-icon { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); margin-bottom:0.75rem; letter-spacing:2px; }
  .upload-zone-title { font-size:0.95rem; font-weight:600; color:var(--text2); margin-bottom:6px; }
  .upload-zone-sub { font-size:0.78rem; color:var(--text3); }
  .upload-zone-sub b { color:var(--accent2); }
  .file-list { display:flex; flex-direction:column; gap:8px; margin-top:1rem; }
  .file-item { display:flex; align-items:center; gap:12px; background:var(--s2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; }
  .file-preview { width:40px; height:40px; border-radius:7px; object-fit:cover; flex-shrink:0; }
  .file-icon { width:40px; height:40px; border-radius:7px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:500; }
  .file-icon-pdf  { background:rgba(248,113,113,0.1); color:var(--red);     border:1px solid rgba(248,113,113,0.2); }
  .file-icon-ppt  { background:rgba(234,88,12,0.1);  color:#FB923C;        border:1px solid rgba(234,88,12,0.2);  }
  .file-icon-doc  { background:rgba(79,142,247,0.1); color:var(--accent2); border:1px solid rgba(79,142,247,0.2); }
  .file-icon-xls  { background:rgba(74,222,128,0.1); color:#4ADE80;        border:1px solid rgba(74,222,128,0.2); }
  .file-icon-nb   { background:rgba(251,211,77,0.1); color:var(--yellow);  border:1px solid rgba(251,211,77,0.2); }
  .file-info { flex:1; min-width:0; }
  .file-name { font-size:0.82rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .file-size { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); }
  .file-remove { background:none; border:none; color:var(--text3); cursor:pointer; font-size:0.75rem; transition:color 0.15s; padding:4px; }
  .file-remove:hover { color:var(--red); }
  .file-limit { font-size:0.72rem; color:var(--text3); font-family:'DM Mono',monospace; margin-top:6px; text-align:center; }

  /* SUMMARY */
  .summary-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border); }
  .summary-row:first-child { padding-top:0; }
  .summary-row:last-child { border-bottom:none; padding-bottom:0; }
  .summary-key { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:1px; }
  .summary-val { font-size:0.85rem; color:var(--text); font-weight:500; }

  /* PROGRESS */
  .progress-wrap { background:var(--s2); border-radius:100px; height:4px; overflow:hidden; margin-top:1rem; }
  .progress-bar { height:100%; background:linear-gradient(90deg,var(--accent),var(--teal)); border-radius:100px; transition:width 0.3s ease; }

  /* BUTTONS */
  .submit-section { display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-top:1.5rem; }
  .btn-back { background:none; border:1px solid var(--border); color:var(--text2); border-radius:9px; padding:11px 24px; font-size:0.875rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .btn-back:hover { border-color:var(--borderhi); color:var(--text); }
  .btn-submit { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:9px; padding:11px 28px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; position:relative; overflow:hidden; }
  .btn-submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .btn-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,142,247,0.4); }
  .btn-submit:disabled { opacity:0.5; cursor:not-allowed; }

  /* ALERT */
  .alert { padding:10px 14px; border-radius:8px; font-size:0.82rem; margin-bottom:1rem; font-family:'DM Mono',monospace; }
  .err  { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
  .warn { background:rgba(251,211,77,0.06); border:1px solid rgba(251,211,77,0.2); color:var(--yellow); }

  /* SUCCESS */
  .success-wrap { text-align:center; padding:3rem 2rem; }
  .success-icon { width:64px; height:64px; border-radius:16px; background:rgba(45,212,191,0.1); border:1px solid rgba(45,212,191,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem; font-family:'DM Mono',monospace; font-size:1.5rem; color:var(--teal2); }
  .success-title { font-size:1.3rem; font-weight:700; color:var(--white); margin-bottom:6px; }
  .success-desc { font-size:0.85rem; color:var(--text2); line-height:1.6; margin-bottom:2rem; }
  .success-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:9px; padding:11px 24px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; }
  .btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(79,142,247,0.4); }

  @media(max-width:768px) {
    .layout { padding:1.5rem 1rem; }
    .page-title { font-size:1.4rem; }
    .field-grid { grid-template-columns:1fr; }
    .stepper { gap:0; overflow-x:auto; }
    .s-info { display:none; }
    .submit-section { flex-direction:column-reverse; gap:8px; }
    .btn-back, .btn-submit { width:100%; text-align:center; }
    .upload-zone { padding:1.5rem 1rem; }
  }
  @media(max-width:480px) {
    .card { padding:1.25rem; }
    .success-actions { flex-direction:column; }
    .success-actions .btn-primary { width:100%; text-align:center; }
  }
`

const DOC_TYPES = [
  { k: 'examen',         l: 'Examen Final',     short: 'EXAM'  },
  { k: 'cc',             l: 'Contrôle Continu',  short: 'CC'    },
  { k: 'td',             l: 'Travail Dirigé',    short: 'TD'    },
  { k: 'tp',             l: 'Travail Pratique',  short: 'TP'    },
  { k: 'cours',          l: 'Cours',             short: 'COURS' },
  { k: 'corrige_examen', l: 'Corrigé Examen',    short: 'COR.'  },
  { k: 'corrige_td',     l: 'Corrigé TD',        short: 'C.TD'  },
  { k: 'corrige_tp',     l: 'Corrigé TP',        short: 'C.TP'  },
  { k: 'quiz',           l: 'Quiz / Interro',    short: 'QUIZ'  },
  { k: 'projet_final',  l: 'Projet Final',      short: 'PROJ'  },
]
const YEARS = ['2027/2028','2026/2027','2025/2026','2024/2025','2023/2024','2022/2023','2021/2022','2020/2021','2019/2020','2018/2019']
const SEMESTERS = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']
const fmt = (b) => b < 1024*1024 ? (b/1024).toFixed(1)+' KB' : (b/(1024*1024)).toFixed(1)+' MB'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
const ALLOWED_EXTS = new Set(['pdf','ppt','pptx','doc','docx','xls','xlsx','ipynb','jpg','jpeg','png','gif','webp','bmp','heic'])
const getExt = f => f.name.split('.').pop().toLowerCase()
const isAllowed = f => f.type.startsWith('image/') || ALLOWED_TYPES.has(f.type) || ALLOWED_EXTS.has(getExt(f))

const FILE_ICON = (f) => {
  if (f.type.startsWith('image/')) return null
  const ext = getExt(f)
  if (ext === 'pdf')               return { cls:'file-icon-pdf', label:'PDF' }
  if (['ppt','pptx'].includes(ext)) return { cls:'file-icon-ppt', label:'PPT' }
  if (['doc','docx'].includes(ext)) return { cls:'file-icon-doc', label:'DOC' }
  if (['xls','xlsx'].includes(ext)) return { cls:'file-icon-xls', label:'XLS' }
  if (ext === 'ipynb')             return { cls:'file-icon-nb',  label:'NB'  }
  return { cls:'file-icon-pdf', label: ext.toUpperCase().slice(0,4) }
}

export default function Upload() {
  const navigate = useNavigate()
  const fileRef = useRef()

  const [user,     setUser]     = useState(null)
  const [authLoad, setAuthLoad] = useState(true)
  const [step,     setStep]     = useState(1)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [progress, setProgress] = useState(0)
  const [success,  setSuccess]  = useState(false)
  const [uploadedModuleId, setUploadedModuleId] = useState(null)

  // Cascading selects
  const [unis,   setUnis]   = useState([])
  const [facs,   setFacs]   = useState([])
  const [fils,   setFils]   = useState([])
  const [selUni, setSelUni] = useState('')
  const [selFac, setSelFac] = useState('')
  const [selFil, setSelFil] = useState('')
  const [selSem, setSelSem] = useState('')
  const [selMod, setSelMod] = useState(null)

  const [modSearch,    setModSearch]    = useState('')
  const [modResults,   setModResults]   = useState([])

  // School request form
  const [showSchoolForm,  setShowSchoolForm]  = useState(false)
  const [schoolName,      setSchoolName]      = useState('')
  const [schoolCity,      setSchoolCity]      = useState('')
  const [schoolType,      setSchoolType]      = useState('public')
  const [schoolSent,      setSchoolSent]      = useState(false)

  // Points state for success screen
  const [earnedPoints, setEarnedPoints] = useState(null)

  // Doc info
  const [docType,   setDocType]   = useState('')
  const [year,      setYear]      = useState('')
  const [professor,        setProfessor]        = useState('')
  const [profSuggestions,  setProfSuggestions]  = useState([])
  const [showProfDD,       setShowProfDD]       = useState(false)
  const [docNumber, setDocNumber] = useState('')
  const [files,     setFiles]     = useState([])
  const [previews,  setPreviews]  = useState([])
  const [drag,      setDrag]      = useState(false)

  // Auth check — redirect to login if not logged in
  useEffect(() => {
    let done = false
    const loginRedirect = () => {
      if (!done) { done = true; navigate('/login', { state: { from: '/upload', message: 'Connecte-toi pour continuer' } }) }
    }
    // 3-second fallback in case getSession hangs
    const timeout = setTimeout(loginRedirect, 3000)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        if (done) return
        done = true
        if (!session?.user) {
          navigate('/login', { state: { from: '/upload', message: 'Connecte-toi pour continuer' } })
        } else {
          setUser(session.user)
          setAuthLoad(false)
        }
      })
      .catch(() => { clearTimeout(timeout); loginRedirect() })
  }, [])

  useEffect(() => {
    supabase.from('universities').select('*').order('name')
      .then(({ data }) => setUnis(data || []))
  }, [])

  useEffect(() => {
    if (!selUni) { setFacs([]); setSelFac(''); return }
    supabase.from('faculties').select('*').eq('university_id', selUni).order('name')
      .then(({ data }) => setFacs(data || []))
    setSelFac(''); setSelFil(''); setSelSem(''); setSelMod(null)
  }, [selUni])

  useEffect(() => {
    if (!selFac) { setFils([]); setSelFil(''); return }
    supabase.from('filieres').select('*').eq('faculty_id', selFac).order('name')
      .then(({ data }) => setFils(data || []))
    setSelFil(''); setSelSem(''); setSelMod(null)
  }, [selFac])

  // Module search
  useEffect(() => {
    if (!selFil || !selSem || modSearch.trim().length < 2) {
      setModResults([]); return
    }
    supabase.from('modules')
      .select('*')
      .eq('filiere_id', selFil)
      .eq('semester', selSem)
      .ilike('name', `%${modSearch.trim()}%`)
      .limit(8)
      .then(({ data }) => setModResults(data || []))
  }, [modSearch, selFil, selSem])

  // Fetch distinct professor names for the selected module
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

  // File handling
  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    const valid = arr.filter(isAllowed)
    if (valid.length !== arr.length) setError('Format non supporté. Acceptés : PDF, images, PPT, Word, Excel, Notebook (.ipynb)')
    else setError('')

    // Size check (50MB each)
    const tooLarge = valid.filter(f => f.size > 50 * 1024 * 1024)
    if (tooLarge.length) { setError(`Fichier trop grand (max 50MB): ${tooLarge[0].name}`); return }

    const combined = [...files, ...valid].slice(0, 20)
    setFiles(combined)

    // Generate previews for images
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

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  // School request submit
  const handleSchoolRequest = async () => {
    if (!schoolName.trim()) return
    await supabase.from('school_requests').insert({
      requested_by: user.id,
      school_name:  schoolName.trim(),
      city:         schoolCity.trim() || null,
      school_type:  schoolType,
      status:       'pending',
    })
    setSchoolSent(true)
  }

  // Step validations
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
    if (['examen','cc','corrige_examen'].includes(docType) && !year) {
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
        // Scale down more aggressively for large files
        const isLarge = file.size > 5 * 1024 * 1024
        const MAX = isLarge ? 1200 : 1600
        const QUALITY = isLarge ? 0.75 : 0.82
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else       { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          // Only use compressed version if it's actually smaller
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

  // For non-image docs: upload as-is (PDF/DOCX/PPTX are already internally compressed)
  const compressFile = (file) => {
    if (file.type.startsWith('image/')) return compressImage(file)
    return Promise.resolve(file)
  }

  // Final submit
  const handleSubmit = async () => {
    setLoading(true); setError(''); setProgress(5)
    try {
      // If custom module, insert it first
      let moduleId = selMod.id
      if (selMod.custom) {
        const { data: newMod, error: modErr } = await supabase.from('modules').insert({
          filiere_id: parseInt(selFil),
          semester:   selSem,
          name:       selMod.name,
          type:       'cours',
          verified:   false,
        }).select().single()
        if (modErr) throw new Error('Erreur création module: ' + modErr.message)
        moduleId = newMod.id
      }

      const uploadedFiles = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const compressed = await compressFile(file)
        const ext = file.name.split('.').pop()
        const path = `documents/${user.id}/${Date.now()}_${i}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('documents').upload(path, compressed, { cacheControl:'3600', upsert:false })
        if (upErr) throw new Error(`Upload échoué: ${upErr.message}`)
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        uploadedFiles.push({ url: publicUrl, name: file.name })
        setProgress(Math.round(10 + ((i+1)/files.length)*80))
      }

      const isPdf    = files.every(f => f.type === 'application/pdf')
      const isImages = files.every(f => f.type.startsWith('image/'))
      const firstExt = getExt(files[0])
      const allSameExt = files.every(f => getExt(f) === firstExt)
      const fileType = isPdf ? 'pdf' : isImages ? 'images' : allSameExt ? firstExt : 'mixed'
      const { data: docData, error: dbErr } = await supabase.from('documents').insert({
        module_id:     moduleId,
        uploader_id:   user.id,
        doc_type:      docType,
        doc_number:    docNumber.trim() || null,
        academic_year: year,
        professor:     professor.trim() || null,
        file_type:     fileType,
        files:         uploadedFiles.map(f => f.url),
        file_names:    uploadedFiles.map(f => f.name),
        pages_count:   files.length,
        is_flagged:    false,
        is_verified:   true,
        downloads:     0,
        likes:         0,
      }).select('id').single()
      if (dbErr) throw new Error(dbErr.message)

      // Award 50 points and increment uploads_count
      const { data: prof } = await supabase.from('user_profiles').select('points, uploads_count').eq('id', user.id).single()
      const newPoints = (prof?.points || 0) + 50
      await Promise.all([
        supabase.from('user_profiles').update({
          points:        newPoints,
          uploads_count: (prof?.uploads_count || 0) + 1,
        }).eq('id', user.id),
        supabase.from('points_log').insert({
          user_id: user.id, points: 50, reason: 'Upload de document', document_id: docData?.id,
        }),
      ])
      setEarnedPoints(newPoints)

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
    setProgress(0); setEarnedPoints(null)
    setModSearch(''); setError('')
    setShowSchoolForm(false); setSchoolName(''); setSchoolCity(''); setSchoolSent(false)
  }

  if (authLoad) return (
    <div className="page"><style>{css}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'DM Mono', fontSize:'0.75rem', color:'var(--text3)' }}>
        Chargement...
      </div>
    </div>
  )

  const STEPS = [
    { n:'01', label:'Localisation', sub:'École · Filière · Module' },
    { n:'02', label:'Document',     sub:'Type · Année · Fichier' },
    { n:'03', label:'Confirmation', sub:'Vérifier et envoyer' },
  ]

  return (
    <div className="page">
      <style>{css}</style>
      <Navbar activePage="upload" />

      <div className="layout">
        {success ? (
          <div className="card">
            <div className="success-wrap">
              <div className="success-icon">✓</div>
              <h2 className="success-title">Document uploadé !</h2>
              <p className="success-desc">
                Ton document est maintenant visible sur la plateforme.<br />
                <span style={{color:'var(--teal2)',fontWeight:600}}>+50 points</span> ajoutés à ton compte !
              </p>

              {/* Rank progress bar */}
              {earnedPoints !== null && (() => {
                const pts = earnedPoints
                const RANKS = [
                  { min:0,   max:99,  label:'Étudiant',     next:'Contributeur', cls:'rank-etudiant' },
                  { min:100, max:299, label:'Contributeur',  next:'Senpai',       cls:'rank-contrib'  },
                  { min:300, max:599, label:'Senpai',        next:'Légende',      cls:'rank-senpai'   },
                  { min:600, max:Infinity, label:'Légende',  next:null,           cls:'rank-legende'  },
                ]
                const r = RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0]
                const pct = r.max === Infinity ? 100 : Math.round(((pts - r.min) / (r.max - r.min + 1)) * 100)
                return (
                  <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem 1.25rem',marginBottom:'1.5rem',textAlign:'left'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,alignItems:'center'}}>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.65rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px'}}>Ton niveau</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.75rem',color:'var(--accent2)',fontWeight:700}}>{pts} pts</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.72rem',fontWeight:700,color:'var(--white)'}}>{r.label}</span>
                      {r.next && <span style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'var(--text3)'}}>→ {r.next} à {r.max + 1} pts</span>}
                    </div>
                    <div style={{background:'var(--border)',borderRadius:100,height:6,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,var(--accent),var(--teal))',borderRadius:100,transition:'width 0.6s ease'}}/>
                    </div>
                    {r.next && <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.6rem',color:'var(--text3)',marginTop:5}}>{r.max + 1 - pts} pts jusqu'au rang <b style={{color:'var(--accent2)'}}>{r.next}</b></div>}
                  </div>
                )
              })()}

              <div className="success-actions">
                <button className="btn-primary" onClick={() => navigate(`/module/${uploadedModuleId}`)}>
                  Voir le module
                </button>
                <button className="btn-back" onClick={resetForm}>
                  Uploader un autre
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="page-tag">// uploader un document</div>
            <h1 className="page-title">Partage tes annales</h1>
            <p className="page-desc">Aide ta promo en uploadant tes examens, CCs, TDs ou TPs. Chaque document te rapporte +50 points.</p>

            {/* STEPPER */}
            <div className="stepper">
              {STEPS.map((s, i) => (
                <div key={s.n} className="stepper-item">
                  <div className={`s-num ${step > i+1 ? 'done' : step === i+1 ? 'active' : 'pending'}`}>
                    {step > i+1 ? '✓' : s.n}
                  </div>
                  <div className="s-info">
                    <span className="s-label">{s.label}</span>
                    <span className="s-sub">{s.sub}</span>
                  </div>
                  {i < STEPS.length-1 && <div className={`s-line ${step > i+1 ? 'done' : ''}`} />}
                </div>
              ))}
            </div>

            {error && <div className="alert err">{error}</div>}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="card">
                <div className="card-title">// étape 01 — localisation du document</div>
                <div className="field-grid">
                  <div>
                    <label className="label">Université / École</label>
                    <select className="select" value={selUni} onChange={e => setSelUni(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {unis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Faculté / École</label>
                    <select className="select" value={selFac} onChange={e => setSelFac(e.target.value)} disabled={!selUni}>
                      <option value="">Sélectionner...</option>
                      {facs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field-grid">
                  <div>
                    <label className="label">Filière</label>
                    <select className="select" value={selFil} onChange={e => setSelFil(e.target.value)} disabled={!selFac}>
                      <option value="">Sélectionner...</option>
                      {fils.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Semestre</label>
                    <select className="select" value={selSem} onChange={e => { setSelSem(e.target.value); setSelMod(null); setModSearch(''); }} disabled={!selFil}>
                      <option value="">Sélectionner...</option>
                      {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Module</label>
                  {selMod ? (
                    <div className="module-selected">
                      <span className="module-selected-name">{selMod.name}</span>
                      <button className="module-selected-clear" onClick={() => { setSelMod(null); setModSearch(''); }}>Changer</button>
                    </div>
                  ) : (
                    <div className="module-search-wrap">
                      <input className="input"
                        placeholder={selFil && selSem ? 'Tape le nom du module...' : 'Sélectionne filière et semestre d\'abord'}
                        value={modSearch}
                        onChange={e => setModSearch(e.target.value)}
                        disabled={!selFil || !selSem}
                      />
                      {modResults.length > 0 && (
                        <div className="module-results">
                          {modResults.map(m => (
                            <div key={m.id} className="module-result"
                              onClick={() => { setSelMod(m); setModSearch(m.name); setModResults([]); }}>
                              <span className="module-result-name">{m.name}</span>
                              <span className="module-result-sem">{m.semester}</span>
                            </div>
                          ))}
                          <div className="module-result"
                            style={{borderTop:'1px dashed rgba(79,142,247,0.2)',color:'var(--accent2)'}}
                            onClick={() => { setSelMod({ id: null, name: modSearch.trim(), custom: true }); setModResults([]); }}>
                            <span style={{fontSize:'0.82rem'}}>+ Créer &quot;{modSearch.trim()}&quot; comme nouveau module</span>
                          </div>
                        </div>
                      )}
                      {modResults.length === 0 && modSearch.trim().length >= 2 && selFil && selSem && (
                        <div style={{marginTop:6}}>
                          <button
                            style={{width:'100%',background:'rgba(79,142,247,0.06)',border:'1px dashed rgba(79,142,247,0.3)',borderRadius:8,padding:'9px 12px',color:'var(--accent2)',fontSize:'0.82rem',fontFamily:'Outfit,sans-serif',cursor:'pointer',textAlign:'left',transition:'background 0.15s'}}
                            onClick={() => { setSelMod({ id: null, name: modSearch.trim(), custom: true }); setModResults([]); }}>
                            + Créer le module &quot;{modSearch.trim()}&quot; et continuer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="hint">Tape au moins 2 lettres pour rechercher</div>
                </div>

                {/* SCHOOL NOT FOUND */}
                <div style={{marginTop:'1.25rem',borderTop:'1px solid var(--border)',paddingTop:'1.1rem'}}>
                  {!showSchoolForm ? (
                    <button
                      style={{background:'none',border:'none',color:'var(--text3)',fontSize:'0.78rem',fontFamily:'DM Mono,monospace',cursor:'pointer',textDecoration:'underline',padding:0,transition:'color 0.15s'}}
                      onClick={() => setShowSchoolForm(true)}>
                      Mon établissement n'est pas dans la liste →
                    </button>
                  ) : schoolSent ? (
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.75rem',color:'var(--teal2)'}}>
                      ✓ Demande envoyée — l'établissement sera ajouté après vérification.
                    </div>
                  ) : (
                    <div style={{background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.15)',borderRadius:10,padding:'1rem 1.25rem'}}>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'0.62rem',color:'var(--accent2)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'0.875rem'}}>// demande d'ajout d'établissement</div>
                      <div className="field-grid">
                        <div>
                          <label className="label">Nom de l'établissement *</label>
                          <input className="input" placeholder="Ex: ENSA Kénitra, ENCG Casablanca..."
                            value={schoolName} onChange={e => setSchoolName(e.target.value)} />
                        </div>
                        <div>
                          <label className="label">Ville</label>
                          <input className="input" placeholder="Ex: Rabat, Casablanca..."
                            value={schoolCity} onChange={e => setSchoolCity(e.target.value)} />
                        </div>
                      </div>
                      <div className="field">
                        <label className="label">Type</label>
                        <select className="select" value={schoolType} onChange={e => setSchoolType(e.target.value)}>
                          <option value="public">Public</option>
                          <option value="private">Privé</option>
                          <option value="grande_ecole">Grande École</option>
                        </select>
                      </div>
                      <div style={{display:'flex',gap:8,alignItems:'center',marginTop:4}}>
                        <button
                          style={{background:'rgba(79,142,247,0.1)',border:'1px solid rgba(79,142,247,0.3)',color:'var(--accent2)',borderRadius:8,padding:'8px 20px',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}
                          onClick={handleSchoolRequest}>
                          Envoyer la demande
                        </button>
                        <button
                          style={{background:'none',border:'none',color:'var(--text3)',fontSize:'0.75rem',cursor:'pointer',fontFamily:'DM Mono,monospace'}}
                          onClick={() => setShowSchoolForm(false)}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="submit-section">
                  <button className="btn-back" onClick={() => navigate('/browse')}>Annuler</button>
                  <button className="btn-submit" onClick={validateStep1}>Continuer</button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="card">
                <div className="card-title">// étape 02 — informations du document</div>
                <div className="field-grid">
                  <div>
                    <label className="label">Type de document</label>
                    <select className="select" value={docType} onChange={e => setDocType(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {DOC_TYPES.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Année académique</label>
                    <select className="select" value={year} onChange={e => setYear(e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div style={{fontSize:'0.7rem',color:'#F87171',marginTop:4}}>
                      * Obligatoire pour examens, CCs et corrigés
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Professeur (optionnel)</label>
                  <div className="prof-wrap">
                    <input className="input" placeholder="Ex: Dr. Alaoui, Pr. Benali..."
                      value={professor}
                      onChange={e => setProfessor(e.target.value)}
                      onFocus={() => setShowProfDD(true)}
                      onBlur={() => setTimeout(() => setShowProfDD(false), 150)}
                    />
                    {showProfDD && profSuggestions.length > 0 && (() => {
                      const q = professor.trim().toLowerCase()
                      const filtered = q
                        ? profSuggestions.filter(n => n.toLowerCase().includes(q))
                        : profSuggestions
                      return filtered.length > 0 ? (
                        <div className="prof-dd">
                          <div className="prof-chips">
                            {filtered.map(name => (
                              <button key={name} type="button" className="prof-chip"
                                onMouseDown={e => { e.preventDefault(); setProfessor(name); setShowProfDD(false) }}>
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>

                {['td','tp','cours','corrige_td','corrige_tp'].includes(docType) && (
                  <div className="field">
                    <label className="label">
                      {docType === 'cours' ? 'Chapitre(s)' : 'Numéro'}
                    </label>
                    <input className="input"
                      placeholder={
                        docType === 'cours' ? 'Ex: Chapitre 1, Ch. 1-3, Ch. 6 - Spark' :
                        docType === 'td'    ? 'Ex: TD1, TD2, TD3...' :
                        docType === 'tp'    ? 'Ex: TP1, TP2...' :
                        'Ex: TD1, TP2...'
                      }
                      value={docNumber}
                      onChange={e => setDocNumber(e.target.value)}
                    />
                    <div className="hint">
                      {docType === 'cours'
                        ? 'Précise les chapitres couverts dans ce fichier'
                        : 'Aide les étudiants à identifier le bon fichier'}
                    </div>
                  </div>
                )}

                <div className="field">
                  <label className="label">Fichier(s)</label>
                  <div
                    className={`upload-zone ${drag ? 'drag' : ''}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={handleDrop}
                  >
                    <input ref={fileRef} type="file" multiple
                      accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.ipynb"
                      style={{ display:'none' }} onChange={e => handleFiles(e.target.files)} />
                    <div className="upload-zone-icon">// DRAG & DROP</div>
                    <div className="upload-zone-title">Glisse tes fichiers ici</div>
                    <div className="upload-zone-sub">
                      <b>PDF · Images · PPT · Word · Excel · Notebook</b> · Jusqu'à 20 fichiers · Max 50MB
                    </div>
                  </div>

                  {files.length > 0 && (
                    <>
                      <div className="file-list">
                        {files.map((f, i) => (
                          <div key={i} className="file-item">
                            {previews[i]
                              ? <img src={previews[i]} alt="" className="file-preview" />
                              : (() => { const ic = FILE_ICON(f); return ic ? <div className={`file-icon ${ic.cls}`}>{ic.label}</div> : <div className="file-icon file-icon-doc">IMG</div> })()
                            }
                            <div className="file-info">
                              <div className="file-name">{f.name}</div>
                              <div className="file-size">{fmt(f.size)}</div>
                              <div style={{fontSize:'0.62rem', fontFamily:'DM Mono,monospace', marginTop:2, color: f.type.startsWith('image/') ? 'var(--teal2)' : 'var(--text3)'}}>
                                {f.type.startsWith('image/')
                                  ? (f.size > 5*1024*1024 ? '// compression agressive activée' : '// compression auto')
                                  : (f.size > 20*1024*1024 ? '// fichier volumineux — upload direct' : '// upload direct')}
                              </div>
                            </div>
                            <button className="file-remove" onClick={() => removeFile(i)}>✕</button>
                          </div>
                        ))}
                      </div>
                      <div className="file-limit">{files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}</div>
                    </>
                  )}
                </div>

                <div className="submit-section">
                  <button className="btn-back" onClick={() => setStep(1)}>Retour</button>
                  <button className="btn-submit" onClick={validateStep2}>Continuer</button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="card">
                <div className="card-title">// étape 03 — confirmation</div>
                <div className="alert warn">Vérifie que tout est correct avant d'envoyer.</div>

                {[
                  ['Module', selMod?.name],
                  ['Semestre', selSem],
                  ['Type', DOC_TYPES.find(t => t.k === docType)?.l],
                  ['Année', year || '—'],
                  ['Professeur', professor || '—'],
                  ...(docNumber ? [['Numéro / Chapitre', docNumber]] : []),
                  ['Fichiers', `${files.length} fichier${files.length > 1 ? 's' : ''} (${files.map(f => fmt(f.size)).join(', ')})`],
                ].map(([k, v]) => (
                  <div key={k} className="summary-row">
                    <span className="summary-key">{k}</span>
                    <span className="summary-val">{v}</span>
                  </div>
                ))}

                {progress > 0 && progress < 100 && (
                  <div className="progress-wrap" style={{ marginTop:'1.5rem' }}>
                    <div className="progress-bar" style={{ width:`${progress}%` }} />
                  </div>
                )}

                <div className="submit-section">
                  <button className="btn-back" onClick={() => setStep(2)} disabled={loading}>Retour</button>
                  <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
                    {loading ? `Upload... ${progress}%` : 'Confirmer et envoyer'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}