import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Wordmark, Button, Input, Icon, ProgressBar, Sheet } from '../design-system/ui'

const SLIDES = [
  {
    icon: 'sparkle', tone: 'brand',
    tag: 'Bienvenue',
    title: 'Bienvenue sur 9rawZid9ra !',
    desc: 'La plateforme 100% gratuite créée par un étudiant marocain pour aider les étudiants à trouver, partager et réussir.',
    features: [
      { icon: 'file', strong: 'Examens, CC, TD, TP', rest: '— tout est là.' },
      { icon: 'search', strong: '55+ universités et écoles', rest: 'couvertes.' },
      { icon: 'check', strong: 'Gratuit pour toujours', rest: '— pas d’abonnement.' },
    ],
  },
  {
    icon: 'search', tone: 'brand',
    tag: 'Page Explorer',
    title: 'Trouve tes annales en secondes',
    desc: 'La page Explorer est ton point de départ pour trouver les documents de tes modules.',
    features: [
      { icon: 'search', strong: 'Filtre par université, faculté et filière', rest: '' },
      { icon: 'file', strong: 'Choisis ton semestre', rest: '(S1 à S12).' },
      { icon: 'inbox', strong: 'Filtre par type', rest: ': examen, CC, TD, TP, cours…' },
      { icon: 'plus', strong: 'Module introuvable ?', rest: 'Ajoute-le directement.' },
    ],
  },
  {
    icon: 'upload', tone: 'brand',
    tag: 'Page Uploader',
    title: 'Partage et gagne des points',
    desc: 'Chaque document que tu uploades aide un autre étudiant. Et toi, tu gagnes des points.',
    features: [
      { icon: 'upload', strong: 'Upload un PDF ou une image', rest: 'en 30 secondes.' },
      { icon: 'file', strong: 'Choisis le module, semestre et type', rest: '' },
      { icon: 'star', strong: '+50 points', rest: 'par document uploadé.' },
      { icon: 'eye', strong: 'Visible immédiatement', rest: 'par toute ta filière.' },
    ],
  },
  {
    icon: 'message', tone: 'accent',
    tag: 'Senpai Zone',
    title: 'La communauté étudiante',
    desc: 'Un forum où tu peux poser des questions, partager ton expérience et aider tes camarades.',
    features: [
      { icon: 'message', strong: 'Pose une question', rest: 'sur un module ou un prof.' },
      { icon: 'sparkle', strong: 'Partage tes conseils', rest: 'et astuces de révision.' },
      { icon: 'bell', strong: 'Reçois des notifs', rest: 'quand on te répond.' },
      { icon: 'up', strong: 'Les meilleurs posts', rest: 'montent en votes.' },
    ],
  },
  {
    icon: 'sparkle', tone: 'warning',
    tag: 'AI Coach',
    title: 'Ton assistant de révision',
    desc: 'Un coach IA qui t’aide à comprendre tes cours, résumer des chapitres et préparer tes examens.',
    features: [
      { icon: 'file', strong: 'Explique-moi', rest: 'ce chapitre en simple.' },
      { icon: 'reply', strong: 'Résume', rest: 'un cours ou un document.' },
      { icon: 'sparkle', strong: 'Quiz-moi', rest: 'pour tester mes connaissances.' },
    ],
  },
  {
    icon: 'user', tone: 'warning',
    tag: 'Ton espace',
    title: 'Profil, modules et notifications',
    desc: 'Ton espace personnel pour suivre tes contributions et rester connecté à la communauté.',
    features: [
      { icon: 'star', strong: 'Mon profil', rest: '— tes stats, uploads et points.' },
      { icon: 'bookmark', strong: 'Mes modules', rest: '— accès rapide aux modules sauvegardés.' },
      { icon: 'bell', strong: 'Notifications', rest: '— réponses, likes, nouveaux docs.' },
      { icon: 'message', strong: 'Suis des profils', rest: 'et vois leur activité.' },
    ],
  },
]

const TOTAL = SLIDES.length + 1

export default function WelcomeModal() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [slide, setSlide] = useState(0)
  const [showUniStep, setShowUniStep] = useState(false)

  const [unis, setUnis] = useState([])
  const [uniSearch, setUniSearch] = useState('')
  const [showUniDd, setShowUniDd] = useState(false)
  const [selUni, setSelUni] = useState('')
  const [uniSaving, setUniSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const key = `9rz_welcomed_v2_${session.user.id}`
      if (!localStorage.getItem(key)) setShow(true)
    })
    supabase.from('universities').select('id, name').order('name').then(({ data }) => setUnis(data || []))
  }, [])

  const dismiss = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) localStorage.setItem(`9rz_welcomed_v2_${session.user.id}`, '1')
    })
    setShow(false)
  }

  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1)
    else setShowUniStep(true)
  }

  const back = () => {
    if (showUniStep) { setShowUniStep(false); setSlide(SLIDES.length - 1) }
    else if (slide > 0) setSlide(s => s - 1)
  }

  const saveUni = async () => {
    if (!selUni) { dismiss(); return }
    setUniSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('user_profiles').update({ university_id: parseInt(selUni) }).eq('id', session.user.id)
    }
    setUniSaving(false)
    dismiss()
    navigate('/browse')
  }

  if (!show) return null

  const currentStep = showUniStep ? SLIDES.length : slide
  const progress = ((currentStep + 1) / TOTAL) * 100
  const filteredUnis = unis.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase()))
  const s = SLIDES[slide]

  return (
    <Sheet onClose={dismiss}>
      <div className="qz-wm">
        <div className="qz-wm__head">
          <Wordmark />
          <span className="t-mono qz-subtle">{currentStep + 1} / {TOTAL}</span>
        </div>
        <ProgressBar value={progress} />

        {showUniStep ? (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="user" /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>Dernière étape</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>Quelle est ton université ?</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>
              On personnalise ta page Explorer pour afficher directement les modules de ton établissement.
            </p>

            <div style={{ position: 'relative' }}>
              <Input
                placeholder="Cherche ton université…"
                value={selUni ? (unis.find(u => String(u.id) === selUni)?.name ?? uniSearch) : uniSearch}
                onChange={e => { setUniSearch(e.target.value); setSelUni(''); setShowUniDd(true) }}
                onFocus={() => setShowUniDd(true)}
                onBlur={() => setTimeout(() => setShowUniDd(false), 150)}
              />
              {showUniDd && (
                <div className="qz-dropdown" style={{ position: 'absolute', left: 0, right: 0, width: 'auto' }}>
                  {filteredUnis.length > 0
                    ? filteredUnis.map(u => (
                        <button type="button" key={u.id} className="qz-dropdown__item"
                          onMouseDown={() => { setSelUni(String(u.id)); setUniSearch(u.name); setShowUniDd(false) }}>
                          {u.name}
                        </button>
                      ))
                    : <div style={{ padding: '8px 12px' }}><span className="t-body-sm qz-subtle">Aucun résultat — tu pourras l'ajouter plus tard</span></div>
                  }
                </div>
              )}
            </div>

            <div className="qz-wm__actions">
              <Button variant="ghost" onClick={back}>Retour</Button>
              <Button variant="primary" block loading={uniSaving} onClick={saveUni}>
                {selUni ? 'C’est parti' : 'Passer et explorer'}
              </Button>
            </div>
            <Button variant="link" block onClick={dismiss}>Fermer le guide</Button>
          </div>
        ) : (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: `var(--${s.tone}-soft)`, color: s.tone === 'brand' ? 'var(--brand-text)' : `var(--${s.tone})` }}><Icon name={s.icon} /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>{s.tag}</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>{s.title}</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>{s.desc}</p>

            <ul className="qz-checks">
              {s.features.map((f, i) => (
                <li key={i}><Icon name={f.icon} /><span><b>{f.strong}</b> {f.rest}</span></li>
              ))}
            </ul>

            <div className="qz-wm__actions">
              {slide > 0 && <Button variant="ghost" onClick={back}>Retour</Button>}
              <Button variant="primary" block onClick={next}>
                {slide < SLIDES.length - 1 ? 'Suivant' : 'Presque fini'}
              </Button>
            </div>
            <Button variant="link" block onClick={dismiss}>Fermer le guide</Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
