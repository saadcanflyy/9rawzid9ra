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
    max-width: 420px;
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
    width: 36px; height: 36px; border-radius: 9px;
    background: linear-gradient(135deg,#4F8EF7,#2DD4BF);
  }
  .wm-logo-text {
    font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 500; color: #fff;
  }
  .wm-logo-text b { color: #7BB3FF; font-weight: 500; }

  .wm-title {
    font-size: 1.35rem; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;
  }
  .wm-sub {
    font-size: 0.85rem; color: #4A5568; margin-bottom: 1.75rem; line-height: 1.5;
  }

  .wm-steps { display: flex; flex-direction: column; gap: 12px; margin-bottom: 1.75rem; }
  .wm-step {
    display: flex; align-items: flex-start; gap: 14px;
    background: #0C1222; border: 1px solid #1C2A45;
    border-radius: 12px; padding: 13px 15px;
    cursor: pointer; transition: border-color 0.15s;
    text-align: left; width: 100%;
  }
  .wm-step:hover { border-color: #2D4A7A; }
  .wm-step-icon {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
  }
  .wm-step-body { flex: 1; min-width: 0; }
  .wm-step-label {
    font-size: 0.9rem; font-weight: 600; color: #E2E8F0; margin-bottom: 2px;
  }
  .wm-step-desc { font-size: 0.78rem; color: #4A5568; line-height: 1.4; }

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

const STEPS = [
  {
    icon: '🔍',
    bg: 'rgba(79,142,247,0.1)',
    label: 'Explorer les modules',
    desc: 'Trouve les annales, TDs, TPs et cours par école, filière et semestre.',
    path: '/browse',
  },
  {
    icon: '⬆️',
    bg: 'rgba(45,212,191,0.1)',
    label: 'Uploader un document',
    desc: 'Partage tes docs avec la communauté et gagne des points de contribution.',
    path: '/upload',
  },
  {
    icon: '💬',
    bg: 'rgba(167,139,250,0.1)',
    label: 'Senpai Zone',
    desc: 'Lis les conseils de tes aînés sur les modules — ou partage ta propre expérience.',
    path: '/senpai',
  },
]

export default function WelcomeModal() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

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

  const goTo = (path) => { dismiss(); navigate(path) }

  if (!show) return null

  return (
    <>
      <style>{css}</style>
      <div className="wm-overlay" onClick={dismiss}>
        <div className="wm-card" onClick={e => e.stopPropagation()}>
          <div className="wm-logo">
            <div className="wm-logo-box" />
            <span className="wm-logo-text">9raw<b>Zid</b>9ra</span>
          </div>

          <div className="wm-title">Bienvenue !</div>
          <div className="wm-sub">
            La plateforme marocaine des annales et ressources étudiantes. Voici comment commencer :
          </div>

          <div className="wm-steps">
            {STEPS.map(s => (
              <button key={s.path} className="wm-step" onClick={() => goTo(s.path)}>
                <div className="wm-step-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div className="wm-step-body">
                  <div className="wm-step-label">{s.label}</div>
                  <div className="wm-step-desc">{s.desc}</div>
                </div>
                <span style={{ color:'#2D4A7A', fontSize:'1rem', flexShrink:0 }}>→</span>
              </button>
            ))}
          </div>

          <button className="wm-cta" onClick={dismiss}>C'est parti !</button>
          <button className="wm-skip" onClick={dismiss}>Passer — je connais déjà</button>
        </div>
      </div>
    </>
  )
}
