import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const css = `
  .wm-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(2,4,10,0.88);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: wm-fade-in 0.25s ease;
  }
  @keyframes wm-fade-in { from { opacity:0 } to { opacity:1 } }

  .wm-card {
    background: #070C18;
    border: 1px solid #1C2A45;
    border-radius: 18px;
    padding: 2rem 2rem 1.75rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    animation: wm-slide-up 0.28s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Outfit', sans-serif;
  }
  @keyframes wm-slide-up { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }

  .wm-logo {
    display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem;
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

  .wm-slide-icon {
    width: 64px; height: 64px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.75rem; margin: 0 auto 1.25rem;
  }
  .wm-slide-title {
    font-size: 1.25rem; font-weight: 700; color: #FFFFFF;
    text-align: center; margin-bottom: 0.6rem;
  }
  .wm-slide-desc {
    font-size: 0.85rem; color: #94A3B8; text-align: center;
    line-height: 1.65; margin-bottom: 1.75rem; min-height: 60px;
  }

  .wm-dots {
    display: flex; justify-content: center; gap: 6px; margin-bottom: 1.25rem;
  }
  .wm-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #1C2A45; transition: all 0.2s;
    border: none; padding: 0; cursor: pointer;
  }
  .wm-dot.on { background: #4F8EF7; width: 18px; border-radius: 3px; }

  .wm-cta {
    width: 100%;
    background: linear-gradient(135deg,#4F8EF7,#3A6ED4);
    color: #fff; border: none; border-radius: 10px;
    padding: 12px; font-size: 0.9rem; font-weight: 600;
    cursor: pointer; font-family: 'Outfit',sans-serif;
    transition: opacity 0.15s;
  }
  .wm-cta:hover { opacity: 0.9; }
  .wm-skip {
    display: block; text-align: center; margin-top: 10px;
    font-size: 0.75rem; color: #4A5568; background: none; border: none;
    cursor: pointer; font-family: 'Outfit',sans-serif; width: 100%;
    transition: color 0.15s;
  }
  .wm-skip:hover { color: #94A3B8; }
`

const SLIDES = [
  {
    icon: '🔍',
    bg: 'rgba(79,142,247,0.1)',
    title: 'Trouve tes annales',
    desc: 'Cherche par école, filière et semestre. Accède aux examens, CCs, TDs et TPs uploadés par la communauté.',
    cta: 'Suivant →',
  },
  {
    icon: '⬆️',
    bg: 'rgba(45,212,191,0.1)',
    title: 'Partage tes docs',
    desc: 'Upload tes annales, gagne +50 points par document et aide les étudiants de ta promo à réussir.',
    cta: 'Suivant →',
  },
  {
    icon: '💬',
    bg: 'rgba(167,139,250,0.1)',
    title: 'Rejoins la communauté',
    desc: 'Dans la Senpai Zone, partage ton expérience, tes conseils et tes astuces avec tes camarades.',
    cta: 'C\'est parti !',
  },
]

export default function WelcomeModal() {
  const navigate = useNavigate()
  const [show,  setShow]  = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      const key = `9rz_welcomed_${session.user.id}`
      if (!localStorage.getItem(key)) setShow(true)
    })
  }, [])

  const dismiss = () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) localStorage.setItem(`9rz_welcomed_${session.user.id}`, '1')
    })
    setShow(false)
  }

  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1)
    else dismiss()
  }

  if (!show) return null

  const s = SLIDES[slide]

  return (
    <>
      <style>{css}</style>
      <div className="wm-overlay" onClick={dismiss}>
        <div className="wm-card" onClick={e => e.stopPropagation()}>
          <div className="wm-logo">
            <div className="wm-logo-box">
              <svg width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <text x="16" y="22" textAnchor="middle" fontFamily="'DM Mono',monospace" fontWeight="800" fontSize="14" fill="#ffffff" letterSpacing="-0.5">9Z</text>
              </svg>
            </div>
            <span className="wm-logo-text">9raw<b>Zid</b>9ra</span>
          </div>

          <div className="wm-slide-icon" style={{ background: s.bg }}>{s.icon}</div>
          <div className="wm-slide-title">{s.title}</div>
          <div className="wm-slide-desc">{s.desc}</div>

          <div className="wm-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={`wm-dot ${i === slide ? 'on' : ''}`} onClick={() => setSlide(i)} />
            ))}
          </div>

          <button className="wm-cta" onClick={next}>{s.cta}</button>
          <button className="wm-skip" onClick={dismiss}>Passer — je connais déjà</button>
        </div>
      </div>
    </>
  )
}
