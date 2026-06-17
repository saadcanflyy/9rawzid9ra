import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:#02040A; color:#E2E8F0; font-family:'Outfit',sans-serif; }

  .ai-page { min-height:100vh; background:#02040A; display:flex; flex-direction:column; overflow:hidden; position:relative; }

  /* ambient glow layers */
  .ai-glow1 {
    position:absolute; width:600px; height:600px; border-radius:50%;
    background:radial-gradient(circle, rgba(79,142,247,0.09) 0%, transparent 70%);
    top:-120px; left:50%; transform:translateX(-50%);
    pointer-events:none;
  }
  .ai-glow2 {
    position:absolute; width:400px; height:400px; border-radius:50%;
    background:radial-gradient(circle, rgba(45,212,191,0.07) 0%, transparent 70%);
    bottom:60px; right:10%; pointer-events:none;
  }

  .ai-inner {
    flex:1; display:flex; align-items:center; justify-content:center;
    padding:3rem 1.5rem; position:relative; z-index:1;
  }

  .ai-card { max-width:440px; width:100%; text-align:center; }

  /* pulsing orb */
  .ai-orb {
    width:80px; height:80px; border-radius:50%; margin:0 auto 2rem;
    background:radial-gradient(circle at 35% 35%, rgba(123,179,255,0.3), rgba(79,142,247,0.06));
    border:1px solid rgba(79,142,247,0.25);
    display:flex; align-items:center; justify-content:center;
    position:relative;
    animation:orb-pulse 3s ease-in-out infinite;
  }
  .ai-orb::before {
    content:''; position:absolute; inset:-6px; border-radius:50%;
    border:1px solid rgba(79,142,247,0.1);
    animation:orb-ring 3s ease-in-out infinite;
  }
  .ai-orb::after {
    content:''; position:absolute; inset:-14px; border-radius:50%;
    border:1px solid rgba(79,142,247,0.05);
    animation:orb-ring 3s ease-in-out infinite 0.3s;
  }
  @keyframes orb-pulse {
    0%,100% { box-shadow:0 0 24px rgba(79,142,247,0.15), 0 0 60px rgba(79,142,247,0.06); }
    50%      { box-shadow:0 0 36px rgba(79,142,247,0.28), 0 0 80px rgba(79,142,247,0.12); }
  }
  @keyframes orb-ring {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.3; transform:scale(1.08); }
  }

  /* eyebrow label */
  .ai-eyebrow {
    font-family:'DM Mono',monospace; font-size:0.62rem; color:rgba(79,142,247,0.7);
    letter-spacing:3px; text-transform:uppercase; margin-bottom:1.25rem;
    animation:fadeUp 0.6s 0.1s ease both;
  }

  /* main title */
  .ai-title {
    font-size:clamp(2rem,6vw,3rem); font-weight:800; letter-spacing:-1.5px;
    color:#FFFFFF; line-height:1.1; margin-bottom:1.5rem;
    animation:fadeUp 0.6s 0.2s ease both;
  }
  .ai-title-grad {
    background:linear-gradient(90deg,#7BB3FF 0%,#2DD4BF 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:shimmer-grad 4s ease-in-out infinite alternate;
  }
  @keyframes shimmer-grad {
    0%   { filter:brightness(1); }
    100% { filter:brightness(1.3) saturate(1.2); }
  }

  /* subtitle */
  .ai-sub {
    font-size:0.88rem; color:#4A5568; line-height:1.75;
    margin-bottom:2.5rem; max-width:320px; margin-left:auto; margin-right:auto;
    animation:fadeUp 0.6s 0.3s ease both;
  }

  /* CTA button */
  .ai-btn-wrap { animation:fadeUp 0.6s 0.4s ease both; }
  .ai-btn {
    display:inline-flex; align-items:center; gap:10px;
    background:linear-gradient(135deg,#4F8EF7,#3A6ED4);
    color:#fff; border:none; border-radius:12px;
    padding:14px 32px; font-size:0.95rem; font-weight:700;
    cursor:pointer; font-family:'Outfit',sans-serif;
    transition:all 0.2s; position:relative; overflow:hidden;
    box-shadow:0 4px 20px rgba(79,142,247,0.3);
  }
  .ai-btn::before {
    content:''; position:absolute; inset:0;
    background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent);
  }
  .ai-btn:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(79,142,247,0.45); }
  .ai-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

  /* success / login prompts */
  .ai-success {
    display:inline-flex; align-items:center; gap:8px;
    background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.2);
    border-radius:12px; padding:14px 28px;
    font-family:'DM Mono',monospace; font-size:0.82rem; color:#5EEAD4;
    animation:fadeUp 0.4s ease both;
  }
  .ai-login-hint {
    margin-top:1rem; font-family:'DM Mono',monospace; font-size:0.72rem; color:#4A5568;
    animation:fadeUp 0.4s ease both;
  }
  .ai-login-hint a { color:#7BB3FF; cursor:pointer; background:none; border:none; font:inherit; padding:0; }
  .ai-login-hint a:hover { color:#fff; }

  /* bottom morse-style dots */
  .ai-dots {
    display:flex; justify-content:center; gap:6px; margin-top:2.5rem;
    animation:fadeUp 0.6s 0.5s ease both;
  }
  .ai-dot {
    width:5px; height:5px; border-radius:50%;
    background:rgba(79,142,247,0.25);
  }
  .ai-dot:nth-child(2) { background:rgba(79,142,247,0.5); animation:dot-blink 2s 0.4s ease-in-out infinite; }
  .ai-dot:nth-child(3) { background:rgba(45,212,191,0.4); animation:dot-blink 2s 0.8s ease-in-out infinite; }
  @keyframes dot-blink { 0%,100%{opacity:0.3} 50%{opacity:1} }

  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
`

export default function AICoach() {
  const navigate = useNavigate()
  const [busy,    setBusy]    = useState(false)
  const [done,    setDone]    = useState(false)
  const [noUser,  setNoUser]  = useState(false)

  useEffect(() => { document.title = 'IA Coach — 9rawZid9ra' }, [])

  const handleNotify = async () => {
    setBusy(true)
    setNoUser(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setBusy(false); setNoUser(true); return }
    await supabase.from('user_profiles')
      .update({ wants_ai_notification: true })
      .eq('id', session.user.id)
    setBusy(false)
    setDone(true)
  }

  return (
    <div className="ai-page">
      <style>{css}</style>
      <div className="ai-glow1" />
      <div className="ai-glow2" />
      <Navbar activePage="ai" />

      <div className="ai-inner">
        <div className="ai-card">

          <div className="ai-orb">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C16 4 10 10 10 18C10 21.3 12.7 24 16 24C19.3 24 22 21.3 22 18C22 10 16 4 16 4Z"
                fill="url(#orb-g)" opacity="0.9"/>
              <path d="M11 20C11 20 8 17 8 13" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="16" cy="18" r="3" fill="rgba(255,255,255,0.9)"/>
              <defs>
                <linearGradient id="orb-g" x1="16" y1="4" x2="16" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7BB3FF"/>
                  <stop offset="100%" stopColor="#2DD4BF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="ai-eyebrow">// En développement</div>

          <h1 className="ai-title">
            Bientôt<br/>
            <span className="ai-title-grad">disponible.</span>
          </h1>

          <p className="ai-sub">
            Quelque chose de puissant arrive.<br/>Sois le premier à le savoir.
          </p>

          <div className="ai-btn-wrap">
            {done ? (
              <div className="ai-success">✓ Tu seras notifié au lancement</div>
            ) : (
              <button className="ai-btn" onClick={handleNotify} disabled={busy}>
                {busy ? '...' : '🔔 Me notifier au lancement'}
              </button>
            )}
            {noUser && (
              <div className="ai-login-hint">
                <button className="a" onClick={() => navigate('/login')} style={{ background:'none', border:'none', color:'#7BB3FF', cursor:'pointer', fontFamily:'inherit', fontSize:'inherit', padding:0 }}>
                  Connecte-toi
                </button>
                {' '}pour enregistrer ta notification
              </div>
            )}
          </div>

          <div className="ai-dots">
            <div className="ai-dot"/>
            <div className="ai-dot"/>
            <div className="ai-dot"/>
            <div className="ai-dot"/>
            <div className="ai-dot"/>
          </div>

        </div>
      </div>
    </div>
  )
}
