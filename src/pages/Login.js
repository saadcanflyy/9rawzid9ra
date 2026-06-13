import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --red:#F87171; --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  html,body { background:var(--bg); font-family:'Outfit',sans-serif; min-height:100vh; }
  .page { min-height:100vh; display:grid; grid-template-columns:1fr 1fr; }
  .left { background:var(--surface); border-right:1px solid var(--border); padding:3rem; display:flex; flex-direction:column; position:relative; overflow:hidden; }
  .left::after { content:''; position:absolute; inset:0; background-image:radial-gradient(circle, rgba(79,142,247,0.1) 1px, transparent 1px); background-size:36px 36px; mask-image:radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%); pointer-events:none; }
  .left::before { content:''; position:absolute; bottom:-100px; right:-100px; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle, rgba(45,212,191,0.06) 0%, transparent 70%); pointer-events:none; }
  .left-inner { position:relative; z-index:1; flex:1; display:flex; flex-direction:column; }
  .logo { display:flex; align-items:center; gap:10px; cursor:pointer; }
  .logo-box { width:30px; height:30px; border-radius:7px; background:linear-gradient(135deg,var(--accent),var(--teal)); }
  .logo-text { font-family:'DM Mono',monospace; font-size:0.9rem; color:var(--white); }
  .logo-text b { color:var(--accent2); font-weight:500; }
  .left-body { margin-top:auto; padding-top:3rem; }
  .left-tag { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--teal2); letter-spacing:2px; text-transform:uppercase; margin-bottom:1.25rem; }
  .left-title { font-size:2rem; font-weight:700; color:var(--white); letter-spacing:-0.75px; line-height:1.2; margin-bottom:1rem; }
  .left-title span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .left-desc { font-size:0.875rem; color:var(--text2); line-height:1.7; margin-bottom:2rem; }
  .terminal { background:var(--bg); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .t-bar { display:flex; align-items:center; gap:6px; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--s2); }
  .t-dot { width:8px; height:8px; border-radius:50%; }
  .t-r{background:#F87171;} .t-y{background:#FBD34D;} .t-g{background:#4ADE80;}
  .t-title { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); margin-left:auto; }
  .t-body { padding:1rem 1.25rem; font-family:'DM Mono',monospace; font-size:0.75rem; line-height:1.8; }
  .t-line { display:flex; gap:10px; }
  .t-p{color:var(--accent);} .t-c{color:var(--text2);} .t-o{color:var(--teal2);} .t-cm{color:var(--text3);}
  .t-cur { display:inline-block; width:8px; height:14px; background:var(--accent); animation:blink 1s infinite; vertical-align:middle; margin-left:2px; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .right { padding:3rem; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .form-wrap { width:100%; max-width:380px; }
  .form-title { font-size:1.5rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; margin-bottom:0.5rem; }
  .form-sub { font-size:0.85rem; color:var(--text2); margin-bottom:2rem; }
  .form-sub button { color:var(--accent2); cursor:pointer; background:none; border:none; font-size:0.85rem; font-family:'Outfit',sans-serif; padding:0; }
  .form-sub button:hover { text-decoration:underline; }
  .field { margin-bottom:1rem; }
  .label { display:block; font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.5rem; }
  .input { width:100%; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-size:0.9rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s, box-shadow 0.15s; }
  .input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.1); }
  .input::placeholder { color:var(--text3); }
  .forgot { text-align:right; margin-top:6px; }
  .forgot button { font-size:0.72rem; color:var(--text3); background:none; border:none; cursor:pointer; font-family:'DM Mono',monospace; transition:color 0.15s; }
  .forgot button:hover { color:var(--accent2); }
  .submit { width:100%; background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:13px; font-size:0.9rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; margin-top:1.5rem; position:relative; overflow:hidden; }
  .submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,142,247,0.4); }
  .submit:disabled { opacity:0.5; cursor:not-allowed; }
  .alert { padding:10px 14px; border-radius:8px; font-size:0.82rem; margin-bottom:1rem; font-family:'DM Mono',monospace; }
  .err  { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
  .info { background:rgba(79,142,247,0.08); border:1px solid rgba(79,142,247,0.2); color:#7BB3FF; }
  .register-box { margin-top:1.5rem; padding:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:10px; text-align:center; }
  .register-box p { font-size:0.82rem; color:var(--text2); margin-bottom:0.75rem; }
  .register-box button { width:100%; background:none; border:1px solid var(--border); color:var(--text2); border-radius:8px; padding:9px; font-size:0.82rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .register-box button:hover { border-color:var(--accent); color:var(--accent2); }
  @media(max-width:768px){ .page{grid-template-columns:1fr;} .left{display:none;} .right{padding:2rem 1.5rem;} }
`

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [banInfo, setBanInfo] = useState(null)
  const isSubmittingRef = useRef(false)

  // Redirect if already logged in
  useEffect(() => {
    document.title = 'Se connecter — 9rawZid9ra'
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const from = location.state?.from || '/'
        navigate(from, { replace: true })
      }
    })

    // bfcache restore: browser restores frozen React state (loading=true, button disabled)
    // pageshow fires on bfcache hit; useEffect does NOT re-run — so we need this separately
    const handlePageShow = (e) => {
      if (e.persisted) {
        setLoading(false)
        isSubmittingRef.current = false
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) navigate(location.state?.from || '/', { replace: true })
        })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, []) // eslint-disable-line

  const handleLogin = async (e) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    setError('')
    setBanInfo(null)
    if (!email.trim() || !password) return setError('Email et mot de passe requis.')
    isSubmittingRef.current = true
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      })
      if (err) {
        setError('Email ou mot de passe incorrect.')
        return
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_banned, banned_until, ban_reason')
        .eq('id', data.user.id)
        .single()
      if (profile?.is_banned) {
        const isPerm = !profile.banned_until
        const isFuture = profile.banned_until && new Date(profile.banned_until) > new Date()
        if (isPerm || isFuture) {
          // Don't call signOut here — App.js checkBan will sign out and show BanScreen
          setBanInfo({ reason: profile.ban_reason, until: profile.banned_until })
          return
        }
      }
      const from = location.state?.from || '/'
      navigate(from, { replace: true })
    } catch {
      setError('Erreur de connexion. Réessaie.')
    } finally {
      isSubmittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <style>{css}</style>
      <div className="left">
        <div className="left-inner">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-box" />
            <span className="logo-text">9raw<b>Zid</b>9ra</span>
          </div>
          <div className="left-body">
            <div className="left-tag">// content de te revoir</div>
            <h2 className="left-title">Connecte-toi et<br /><span>continue à apprendre.</span></h2>
            <p className="left-desc">Accède à tous tes documents, ton historique et tes points accumulés.</p>
            <div className="terminal">
              <div className="t-bar">
                <div className="t-dot t-r" /><div className="t-dot t-y" /><div className="t-dot t-g" />
                <span className="t-title">session — 9rawZid9ra</span>
              </div>
              <div className="t-body">
                <div className="t-line"><span className="t-p">$</span><span className="t-c"> auth login --user student</span></div>
                <div className="t-line"><span className="t-o">✓ Credentials verified</span></div>
                <div className="t-line"><span className="t-o">✓ Session initialized</span></div>
                <div className="t-line"><span className="t-o">✓ Loading your documents...</span></div>
                <div className="t-line"><span className="t-cm"># 898 modules available</span></div>
                <div className="t-line"><span className="t-p">$</span><span className="t-cur" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="right">
        <div className="form-wrap">
          <h2 className="form-title">Se connecter</h2>
          <p className="form-sub">
            Pas encore de compte ?{' '}
            <button onClick={() => navigate('/register', { state: { from: location.state?.from } })}>
              S'inscrire gratuitement
            </button>
          </p>
          {location.state?.message && <div className="alert info">{location.state.message}</div>}
          {banInfo && (
            <div style={{ background:'rgba(248,113,113,0.07)', border:'1px solid rgba(248,113,113,0.35)', borderRadius:10, padding:'1rem 1.25rem', marginBottom:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:'1.1rem' }}>🚫</span>
                <span style={{ fontWeight:700, color:'#F87171', fontSize:'0.92rem' }}>Compte suspendu</span>
              </div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.74rem', color:'#E2E8F0', marginBottom:4 }}>
                Raison : <span style={{ color:'#F87171' }}>{banInfo.reason || 'Non spécifiée'}</span>
              </div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.74rem', color:'#E2E8F0', marginBottom:8 }}>
                {banInfo.until
                  ? `Jusqu'au : ${new Date(banInfo.until).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })}`
                  : 'Bannissement permanent'}
              </div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.68rem', color:'#4A5568' }}>
                Contact : <a href="mailto:saadga2003@gmail.com" style={{ color:'#4F8EF7', textDecoration:'none' }}>saadga2003@gmail.com</a>
              </div>
            </div>
          )}
          {error && <div className="alert err">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="field">
              <label className="label">Adresse email</label>
              <input className="input" type="email" placeholder="ton@email.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label className="label">Mot de passe</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
              <div className="forgot">
                <button type="button" onClick={() => navigate('/forgot-password')}>
                  Mot de passe oublié ?
                </button>
              </div>
            </div>
            <button type="submit" className="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <div className="register-box">
            <p>Nouveau sur 9rawZid9ra ?</p>
            <button onClick={() => navigate('/register')}>Créer un compte gratuit</button>
          </div>
        </div>
      </div>
    </div>
  )
}