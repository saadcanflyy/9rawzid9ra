import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#0F0E17; --surface:#191826; --s2:#232232;
    --border:#2C2A42; --borderhi:#3D3B5C;
    --accent:#6366F1; --accent2:#818CF8; --teal:#6366F1; --teal2:#A5B4FC;
    --red:#F87171; --text:#EAE7FF; --text2:#A4A0C8; --text3:#666287; --white:#FFFFFF;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg:#F5F4FB;
      --surface:#FFFFFF;
      --s2:#F0EEF9;
      --border:#E3E0F0;
      --borderhi:#C9C4E3;
      --accent2:#4F46E5;
      --teal2:#4F46E5;
      --text:#1E1B2E;
      --text2:#5B5775;
      --text3:#8B87A3;
      --white:#17152B;
    }
  }

  html,body { background:var(--bg); font-family:'Outfit',sans-serif; min-height:100vh; }
  .page { min-height:100vh; display:grid; grid-template-columns:1fr 1fr; }
  .left { background:var(--surface); border-right:1px solid var(--border); padding:3rem; display:flex; flex-direction:column; position:relative; overflow:hidden; }
  .left::after { content:''; position:absolute; inset:0; background-image:radial-gradient(circle, rgba(99,102,241,0.1) 1px, transparent 1px); background-size:36px 36px; mask-image:radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%); pointer-events:none; }
  .left::before { content:''; position:absolute; bottom:-100px; right:-100px; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%); pointer-events:none; }
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
  .input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
  .input::placeholder { color:var(--text3); }
  .forgot { text-align:right; margin-top:6px; }
  .forgot button { font-size:0.72rem; color:var(--text3); background:none; border:none; cursor:pointer; font-family:'DM Mono',monospace; transition:color 0.15s; }
  .forgot button:hover { color:var(--accent2); }
  .submit { width:100%; background:linear-gradient(135deg,var(--accent),#4F46E5); color:var(--white); border:none; border-radius:10px; padding:13px; font-size:0.9rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; margin-top:1.5rem; position:relative; overflow:hidden; }
  .submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(99,102,241,0.4); }
  .submit:disabled { opacity:0.5; cursor:not-allowed; }
  .alert { padding:10px 14px; border-radius:8px; font-size:0.82rem; margin-bottom:1rem; font-family:'DM Mono',monospace; }
  .err  { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
  .info { background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); color:#818CF8; }
  .register-box { margin-top:1.5rem; padding:1.25rem; background:var(--surface); border:1px solid var(--border); border-radius:10px; text-align:center; }
  .register-box p { font-size:0.82rem; color:var(--text2); margin-bottom:0.75rem; }
  .register-box button { width:100%; background:none; border:1px solid var(--border); color:var(--text2); border-radius:8px; padding:9px; font-size:0.82rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .register-box button:hover { border-color:var(--accent); color:var(--accent2); }
  @keyframes spin { to { transform:rotate(360deg); } }
  .google-btn { width:100%; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 16px; font-size:0.88rem; font-weight:500; color:var(--text); cursor:pointer; font-family:'Outfit',sans-serif; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.15s; }
  .google-btn:hover:not(:disabled) { border-color:var(--borderhi); background:var(--s2); }
  .google-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .divider { display:flex; align-items:center; gap:12px; margin:1.25rem 0; }
  .divider-line { flex:1; height:1px; background:var(--border); }
  .divider-text { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); letter-spacing:1px; text-transform:uppercase; }
  @media(max-width:768px){ .page{grid-template-columns:1fr;} .left{display:none;} .right{padding:2rem 1.5rem;} }
`

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,         setError]         = useState('')
  const [banInfo,       setBanInfo]       = useState(null)
  const [failCount,     setFailCount]     = useState(0)
  const [googleLoading, setGoogleLoading] = useState(false)
  const isSubmittingRef = useRef(false)

  // Redirect if already logged in
  useEffect(() => {
    document.title = 'Se connecter — 9rawZid9ra'
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const dest = sessionStorage.getItem('redirectAfterLogin') || location.state?.from || '/'
        sessionStorage.removeItem('redirectAfterLogin')
        navigate(dest, { replace: true })
      }
    })

    // bfcache restore: browser restores frozen React state (loading=true, button disabled)
    // pageshow fires on bfcache hit; useEffect does NOT re-run — so we need this separately
    const handlePageShow = (e) => {
      if (e.persisted) {
        setLoading(false)
        isSubmittingRef.current = false
        supabase.auth.getSession().then(({ data: { session } }) => {
          const dest = sessionStorage.getItem('redirectAfterLogin') || location.state?.from || '/'
          if (session?.user) { sessionStorage.removeItem('redirectAfterLogin'); navigate(dest, { replace: true }) }
        })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, []) // eslint-disable-line

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    setError('')
    setBanInfo(null)
    if (!email.trim() || !password) return setError('Email et mot de passe requis.')
    isSubmittingRef.current = true
    setLoading(true)
    try {
      const { data, error: err } = await Promise.race([
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 10000)),
      ])
      if (err) {
        setFailCount(c => c + 1)
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
      const dest = sessionStorage.getItem('redirectAfterLogin') || location.state?.from || '/'
      sessionStorage.removeItem('redirectAfterLogin')
      navigate(dest, { replace: true })
    } catch (e) {
      if (e?.message === 'TIMEOUT') {
        setError('La connexion prend trop de temps. Vérifie ta connexion internet.')
      } else {
        setError('Erreur de connexion. Réessaie.')
      }
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
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.74rem', color:'#EAE7FF', marginBottom:4 }}>
                Raison : <span style={{ color:'#F87171' }}>{banInfo.reason || 'Non spécifiée'}</span>
              </div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.74rem', color:'#EAE7FF', marginBottom:8 }}>
                {banInfo.until
                  ? `Jusqu'au : ${new Date(banInfo.until).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })}`
                  : 'Bannissement permanent'}
              </div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.68rem', color:'#666287' }}>
                Contact : <a href="mailto:saadga2003@gmail.com" style={{ color:'#6366F1', textDecoration:'none' }}>saadga2003@gmail.com</a>
              </div>
            </div>
          )}
          <button className="google-btn" onClick={handleGoogle} disabled={googleLoading || loading} type="button">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.149 17.64 11.84 17.64 9.2z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
            </svg>
            {googleLoading ? 'Redirection...' : 'Continuer avec Google'}
          </button>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">ou</span>
            <div className="divider-line" />
          </div>

          {error && <div className="alert err">{error}</div>}
          {failCount >= 2 && (
            <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'0.78rem', color:'var(--text2)' }}>Mot de passe oublié ?</span>
              <button type="button"
                style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, padding:'6px 14px', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}
                onClick={() => navigate('/forgot-password')}>
                Réinitialiser
              </button>
            </div>
          )}
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
              {loading ? (
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <svg style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Connexion...
                </span>
              ) : 'Se connecter'}
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