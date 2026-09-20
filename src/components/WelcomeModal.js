import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const css = `
  .wm-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(2,4,10,0.92);
    backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: wm-fade-in 0.25s ease;
  }
  @keyframes wm-fade-in { from { opacity:0 } to { opacity:1 } }

  .wm-card {
    background: #070C18;
    border: 1px solid #1C2A45;
    border-radius: 20px;
    padding: 2rem 2rem 1.5rem;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    animation: wm-slide-up 0.28s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Outfit', sans-serif;
    position: relative;
    overflow: hidden;
  }
  @keyframes wm-slide-up { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }

  .wm-progress {
    position: absolute;
    top: 0; left: 0;
    height: 3px;
    background: linear-gradient(90deg, #4F8EF7, #4F8EF7);
    border-radius: 0 2px 2px 0;
    transition: width 0.3s ease;
  }

  .wm-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1.5rem;
  }
  .wm-logo {
    display: flex; align-items: center; gap: 10px;
  }
  .wm-logo-box {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg,#4F8EF7,#2DD4BF);
    display: flex; align-items: center; justify-content: center;
  }
  .wm-logo-text {
    font-family: 'DM Mono', monospace; font-size: 0.95rem; font-weight: 500; color: #fff;
  }
  .wm-logo-text b { color: #7BB3FF; font-weight: 500; }
  .wm-step-count {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: #4A5568;
    letter-spacing: 1px;
  }

  .wm-slide { animation: wm-slide-in 0.22s ease; }
  @keyframes wm-slide-in { from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:translateX(0) } }

  .wm-slide-icon {
    width: 56px; height: 56px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; margin: 0 auto 1rem;
  }
  .wm-slide-tag {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    color: #4F8EF7;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
    margin-bottom: 0.4rem;
  }
  .wm-slide-title {
    font-size: 1.2rem; font-weight: 700; color: #FFFFFF;
    text-align: center; margin-bottom: 0.6rem; line-height: 1.3;
  }
  .wm-slide-desc {
    font-size: 0.84rem; color: #94A3B8; text-align: center;
    line-height: 1.7; margin-bottom: 0.75rem;
  }

  .wm-features {
    display: flex; flex-direction: column; gap: 6px;
    margin-bottom: 1.5rem;
  }
  .wm-feat {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 10px;
    background: rgba(79,142,247,0.04);
    border: 1px solid rgba(28,42,69,0.5);
    border-radius: 8px;
    font-size: 0.78rem;
    color: #94A3B8;
  }
  .wm-feat-icon {
    width: 22px; height: 22px; border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; flex-shrink: 0;
  }
  .wm-feat b { color: #E2E8F0; font-weight: 600; }

  .wm-dots {
    display: flex; justify-content: center; gap: 5px; margin-bottom: 1rem;
  }
  .wm-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #1C2A45; transition: all 0.25s;
    border: none; padding: 0; cursor: pointer;
  }
  .wm-dot.on { background: #4F8EF7; width: 20px; border-radius: 3px; }
  .wm-dot.done { background: #4F8EF7; }

  .wm-actions { display: flex; gap: 8px; }
  .wm-back {
    background: none; border: 1px solid #1C2A45; color: #94A3B8;
    border-radius: 10px; padding: 11px 16px; font-size: 0.85rem;
    font-weight: 500; cursor: pointer; font-family: 'Outfit',sans-serif;
    transition: all 0.15s;
  }
  .wm-back:hover { border-color: #2D4A7A; color: #E2E8F0; }
  .wm-cta {
    flex: 1;
    background: linear-gradient(135deg,#4F8EF7,#3A6ED4);
    color: #fff; border: none; border-radius: 10px;
    padding: 11px; font-size: 0.88rem; font-weight: 600;
    cursor: pointer; font-family: 'Outfit',sans-serif;
    transition: opacity 0.15s;
  }
  .wm-cta:hover { opacity: 0.9; }
  .wm-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .wm-skip {
    display: block; text-align: center; margin-top: 8px;
    font-size: 0.72rem; color: #4A5568; background: none; border: none;
    cursor: pointer; font-family: 'Outfit',sans-serif; width: 100%;
    transition: color 0.15s;
  }
  .wm-skip:hover { color: #94A3B8; }

  .wm-uni-wrap { position: relative; margin-bottom: 1.25rem; }
  .wm-uni-input {
    width: 100%; background: #0C1222; border: 1px solid #1C2A45; border-radius: 10px;
    padding: 11px 14px; color: #E2E8F0; font-size: 0.875rem;
    font-family: 'Outfit',sans-serif; outline: none; transition: border-color 0.15s;
  }
  .wm-uni-input:focus { border-color: #4F8EF7; }
  .wm-uni-dd {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: #0C1222; border: 1px solid #1C2A45; border-radius: 10px;
    max-height: 180px; overflow-y: auto; z-index: 10;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
  }
  .wm-uni-dd-item {
    padding: 9px 14px; cursor: pointer; font-size: 0.85rem; color: #E2E8F0;
    font-family: 'Outfit',sans-serif; border-bottom: 1px solid #1C2A45; transition: background 0.1s;
  }
  .wm-uni-dd-item:last-child { border-bottom: none; }
  .wm-uni-dd-item:hover { background: rgba(79,142,247,0.08); }
  .wm-uni-dd-empty { padding: 9px 14px; font-size: 0.75rem; color: #4A5568; font-family: 'DM Mono',monospace; }

  @media(max-width:480px) {
    .wm-card { padding: 1.5rem 1.25rem 1.25rem; border-radius: 16px; }
    .wm-slide-title { font-size: 1.1rem; }
    .wm-slide-desc { font-size: 0.8rem; }
  }
`

const SLIDES = [
  {
    icon: '👋',
    bg: 'rgba(79,142,247,0.1)',
    tag: 'BIENVENUE',
    title: 'Bienvenue sur 9rawZid9ra !',
    desc: 'La plateforme 100% gratuite créée par un étudiant marocain pour aider les étudiants à trouver, partager et réussir.',
    features: [
      { icon: '📚', bg: 'rgba(79,142,247,0.1)', text: '<b>Examens, CCs, TDs, TPs</b> — tout est là' },
      { icon: '🎓', bg: 'rgba(79,142,247,0.1)', text: '<b>55+ universités</b> et écoles couvertes' },
      { icon: '🆓', bg: 'rgba(167,139,250,0.1)', text: '<b>Gratuit pour toujours</b> — pas d\'abonnement' },
    ],
  },
  {
    icon: '🔍',
    bg: 'rgba(79,142,247,0.1)',
    tag: 'PAGE EXPLORER',
    title: 'Trouve tes annales en secondes',
    desc: 'La page Explorer est ton point de départ pour trouver les documents de tes modules.',
    features: [
      { icon: '🏫', bg: 'rgba(79,142,247,0.1)', text: 'Filtre par <b>université → faculté → filière</b>' },
      { icon: '📅', bg: 'rgba(79,142,247,0.1)', text: 'Choisis ton <b>semestre</b> (S1 à S10)' },
      { icon: '📄', bg: 'rgba(251,191,36,0.1)', text: 'Filtre par <b>type</b> : examen, CC, TD, TP, cours...' },
      { icon: '➕', bg: 'rgba(167,139,250,0.1)', text: 'Module introuvable ? <b>Ajoute-le</b> directement' },
    ],
  },
  {
    icon: '📤',
    bg: 'rgba(79,142,247,0.1)',
    tag: 'PAGE UPLOADER',
    title: 'Partage et gagne des points',
    desc: 'Chaque document que tu uploades aide un autre étudiant. Et toi, tu gagnes des points.',
    features: [
      { icon: '⬆️', bg: 'rgba(79,142,247,0.1)', text: 'Upload un <b>PDF ou image</b> en 30 secondes' },
      { icon: '🏷️', bg: 'rgba(79,142,247,0.1)', text: 'Choisis le <b>module, semestre et type</b>' },
      { icon: '⭐', bg: 'rgba(251,191,36,0.1)', text: '<b>+50 points</b> par document uploadé' },
      { icon: '👀', bg: 'rgba(167,139,250,0.1)', text: 'Ton document est <b>visible immédiatement</b>' },
    ],
  },
  {
    icon: '💬',
    bg: 'rgba(167,139,250,0.1)',
    tag: 'SENPAI ZONE',
    title: 'La communauté étudiante',
    desc: 'Un forum où tu peux poser des questions, partager ton expérience et aider tes camarades.',
    features: [
      { icon: '❓', bg: 'rgba(79,142,247,0.1)', text: '<b>Pose une question</b> sur un module ou un prof' },
      { icon: '💡', bg: 'rgba(79,142,247,0.1)', text: '<b>Partage tes conseils</b> et astuces de révision' },
      { icon: '🔔', bg: 'rgba(251,191,36,0.1)', text: '<b>Reçois des notifs</b> quand on te répond' },
      { icon: '🏆', bg: 'rgba(167,139,250,0.1)', text: 'Les meilleurs posts montent en <b>votes</b>' },
    ],
  },
  {
    icon: '🤖',
    bg: 'rgba(79,142,247,0.1)',
    tag: 'IA COACH',
    title: 'Ton assistant de révision',
    desc: 'Un coach IA qui t\'aide à comprendre tes cours, résumer des chapitres et préparer tes examens.',
    features: [
      { icon: '📖', bg: 'rgba(79,142,247,0.1)', text: '<b>Explique-moi</b> ce chapitre en simple' },
      { icon: '📝', bg: 'rgba(79,142,247,0.1)', text: '<b>Résume</b> un cours ou un document' },
      { icon: '🧠', bg: 'rgba(251,191,36,0.1)', text: '<b>Quiz-moi</b> pour tester mes connaissances' },
    ],
  },
  {
    icon: '👤',
    bg: 'rgba(251,191,36,0.1)',
    tag: 'TON ESPACE',
    title: 'Profil, modules et notifications',
    desc: 'Ton espace personnel pour suivre tes contributions et rester connecté à la communauté.',
    features: [
      { icon: '📊', bg: 'rgba(79,142,247,0.1)', text: '<b>Mon profil</b> — tes stats, uploads et points' },
      { icon: '📌', bg: 'rgba(79,142,247,0.1)', text: '<b>Mes modules</b> — accès rapide aux modules sauvegardés' },
      { icon: '🔔', bg: 'rgba(251,191,36,0.1)', text: '<b>Notifications</b> — réponses, likes, nouveaux docs' },
      { icon: '👥', bg: 'rgba(167,139,250,0.1)', text: '<b>Suis des profils</b> et vois leur activité' },
    ],
  },
]

const TOTAL = SLIDES.length + 1

export default function WelcomeModal() {
  const navigate = useNavigate()
  const [show,        setShow]        = useState(false)
  const [slide,       setSlide]       = useState(0)
  const [showUniStep, setShowUniStep] = useState(false)

  const [unis,       setUnis]       = useState([])
  const [uniSearch,  setUniSearch]  = useState('')
  const [showUniDd,  setShowUniDd]  = useState(false)
  const [selUni,     setSelUni]     = useState('')
  const [uniSaving,  setUniSaving]  = useState(false)

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

  return (
    <>
      <style>{css}</style>
      <div className="wm-overlay" onClick={dismiss}>
        <div className="wm-card" onClick={e => e.stopPropagation()}>
          <div className="wm-progress" style={{ width: `${progress}%` }} />

          <div className="wm-header">
            <div className="wm-logo">
              <div className="wm-logo-box">
                <svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <text x="16" y="22" textAnchor="middle" fontFamily="'DM Mono',monospace" fontWeight="800" fontSize="14" fill="#ffffff" letterSpacing="-0.5">9Z</text>
                </svg>
              </div>
              <span className="wm-logo-text">9raw<b>Zid</b>9ra</span>
            </div>
            <span className="wm-step-count">{currentStep + 1} / {TOTAL}</span>
          </div>

          {showUniStep ? (
            <div className="wm-slide" key="uni">
              <div className="wm-slide-icon" style={{ background:'rgba(79,142,247,0.1)' }}>🎓</div>
              <div className="wm-slide-tag">DERNIÈRE ÉTAPE</div>
              <div className="wm-slide-title">Quelle est ton université ?</div>
              <div className="wm-slide-desc">
                On personnalise ta page Explorer pour afficher directement les modules de ton établissement.
              </div>

              <div className="wm-uni-wrap">
                <input
                  className="wm-uni-input"
                  placeholder="Cherche ton université..."
                  value={selUni ? (unis.find(u => String(u.id) === selUni)?.name ?? uniSearch) : uniSearch}
                  onChange={e => { setUniSearch(e.target.value); setSelUni(''); setShowUniDd(true) }}
                  onFocus={() => setShowUniDd(true)}
                  onBlur={() => setTimeout(() => setShowUniDd(false), 150)}
                />
                {showUniDd && (
                  <div className="wm-uni-dd">
                    {filteredUnis.length > 0
                      ? filteredUnis.map(u => (
                          <div key={u.id} className="wm-uni-dd-item"
                            onMouseDown={() => { setSelUni(String(u.id)); setUniSearch(u.name); setShowUniDd(false) }}>
                            {u.name}
                          </div>
                        ))
                      : <div className="wm-uni-dd-empty">// Aucun résultat — tu pourras l'ajouter plus tard</div>
                    }
                  </div>
                )}
              </div>

              <div className="wm-dots">
                {SLIDES.map((_, i) => (
                  <button key={i} className="wm-dot done" onClick={() => { setShowUniStep(false); setSlide(i) }} />
                ))}
                <button className="wm-dot on" />
              </div>

              <div className="wm-actions">
                <button className="wm-back" onClick={back}>←</button>
                <button className="wm-cta" onClick={saveUni} disabled={uniSaving}>
                  {uniSaving ? 'Enregistrement...' : selUni ? 'C\'est parti ! →' : 'Passer et explorer →'}
                </button>
              </div>
              <button className="wm-skip" onClick={dismiss}>Fermer le guide</button>
            </div>
          ) : (
            <div className="wm-slide" key={slide}>
              <div className="wm-slide-icon" style={{ background: SLIDES[slide].bg }}>{SLIDES[slide].icon}</div>
              <div className="wm-slide-tag">{SLIDES[slide].tag}</div>
              <div className="wm-slide-title">{SLIDES[slide].title}</div>
              <div className="wm-slide-desc">{SLIDES[slide].desc}</div>

              <div className="wm-features">
                {SLIDES[slide].features.map((f, i) => (
                  <div key={i} className="wm-feat">
                    <div className="wm-feat-icon" style={{ background: f.bg }}>{f.icon}</div>
                    <span dangerouslySetInnerHTML={{ __html: f.text }} />
                  </div>
                ))}
              </div>

              <div className="wm-dots">
                {SLIDES.map((_, i) => (
                  <button key={i} className={`wm-dot ${i === slide ? 'on' : i < slide ? 'done' : ''}`}
                    onClick={() => setSlide(i)} />
                ))}
                <button className="wm-dot" onClick={() => setShowUniStep(true)} />
              </div>

              <div className="wm-actions">
                {slide > 0 && <button className="wm-back" onClick={back}>←</button>}
                <button className="wm-cta" onClick={next}>
                  {slide < SLIDES.length - 1 ? 'Suivant →' : 'Presque fini →'}
                </button>
              </div>
              <button className="wm-skip" onClick={dismiss}>Fermer le guide</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
