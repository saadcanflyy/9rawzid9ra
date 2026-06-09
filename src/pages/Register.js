import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  .left::before { content:''; position:absolute; top:-100px; left:-100px; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%); pointer-events:none; }
  .left-inner { position:relative; z-index:1; flex:1; display:flex; flex-direction:column; }
  .logo { display:flex; align-items:center; gap:10px; cursor:pointer; }
  .logo-box { width:30px; height:30px; border-radius:7px; background:linear-gradient(135deg,var(--accent),var(--teal)); }
  .logo-text { font-family:'DM Mono',monospace; font-size:0.9rem; color:var(--white); }
  .logo-text b { color:var(--accent2); font-weight:500; }
  .left-body { margin-top:auto; padding-top:3rem; }
  .left-tag { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:1.25rem; }
  .left-title { font-size:2rem; font-weight:700; color:var(--white); letter-spacing:-0.75px; line-height:1.2; margin-bottom:1rem; }
  .left-title span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .left-desc { font-size:0.875rem; color:var(--text2); line-height:1.7; margin-bottom:2rem; }
  .features { display:flex; flex-direction:column; gap:10px; }
  .feature { display:flex; align-items:center; gap:10px; }
  .feature-dot { width:6px; height:6px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--teal)); flex-shrink:0; }
  .feature-text { font-size:0.82rem; color:var(--text2); }

  .right { padding:3rem; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .form-wrap { width:100%; max-width:400px; }

  .form-title { font-size:1.5rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; margin-bottom:0.5rem; }
  .form-sub { font-size:0.85rem; color:var(--text2); margin-bottom:2rem; }
  .form-sub button { color:var(--accent2); cursor:pointer; background:none; border:none; font-size:0.85rem; font-family:'Outfit',sans-serif; padding:0; }
  .form-sub button:hover { text-decoration:underline; }

  .field { margin-bottom:1rem; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:1rem; }
  .label { display:block; font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.5rem; }
  .input { width:100%; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-size:0.9rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s, box-shadow 0.15s; }
  .input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.1); }
  .input::placeholder { color:var(--text3); }
  .select { width:100%; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-size:0.9rem; font-family:'Outfit',sans-serif; outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234A5568' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; transition:border-color 0.15s; }
  .select:focus { border-color:var(--accent); outline:none; }
  .select option { background:var(--s2); }
  .hint { font-size:0.7rem; color:var(--text3); margin-top:5px; font-family:'DM Mono',monospace; }

  .submit { width:100%; background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:13px; font-size:0.9rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; margin-top:1.5rem; position:relative; overflow:hidden; }
  .submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,142,247,0.4); }
  .submit:disabled { opacity:0.5; cursor:not-allowed; }

  .alert { padding:10px 14px; border-radius:8px; font-size:0.82rem; margin-bottom:1rem; font-family:'DM Mono',monospace; line-height:1.5; }
  .err { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
  .ok  { background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.2); color:var(--teal2); }

  .success-wrap { text-align:center; padding:2rem 0; }
  .success-icon { width:64px; height:64px; border-radius:16px; background:rgba(45,212,191,0.1); border:1px solid rgba(45,212,191,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 1.25rem; font-size:1.75rem; }
  .success-title { font-size:1.3rem; font-weight:700; color:var(--white); margin-bottom:0.5rem; }
  .success-desc { font-size:0.85rem; color:var(--text2); line-height:1.6; }

  /* OTP STEP */
  .otp-icon { width:64px; height:64px; border-radius:18px; background:rgba(79,142,247,0.08); border:1px solid rgba(79,142,247,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; font-size:1.75rem; }
  .otp-title { font-size:1.4rem; font-weight:700; color:var(--white); margin-bottom:0.5rem; text-align:center; }
  .otp-sub { font-size:0.85rem; color:var(--text2); line-height:1.6; text-align:center; margin-bottom:1.75rem; }
  .otp-email { color:var(--accent2); font-weight:600; }
  .otp-input { width:100%; background:var(--surface); border:1px solid var(--borderhi); border-radius:12px; padding:16px 20px; color:var(--white); font-size:1.6rem; font-family:'DM Mono',monospace; outline:none; text-align:center; letter-spacing:10px; transition:border-color 0.15s, box-shadow 0.15s; }
  .otp-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.12); }
  .otp-input::placeholder { color:var(--text3); letter-spacing:4px; font-size:1.2rem; }
  .otp-hint { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--text3); text-align:center; margin-top:8px; }
  .otp-resend { background:none; border:none; color:var(--accent2); font-size:0.82rem; cursor:pointer; font-family:'Outfit',sans-serif; padding:0; transition:opacity 0.15s; }
  .otp-resend:hover { opacity:0.7; }
  .otp-back { background:none; border:none; color:var(--text3); font-size:0.78rem; cursor:pointer; font-family:'DM Mono',monospace; padding:0; margin-top:1rem; display:block; width:100%; text-align:center; transition:color 0.15s; }
  .otp-back:hover { color:var(--text2); }

  @media(max-width:768px){ .page{grid-template-columns:1fr;} .left{display:none;} .right{padding:2rem 1.5rem;} }
  @media(max-width:480px){ .field-row{grid-template-columns:1fr;} .right{padding:1.5rem 1rem;} }
`

export default function Register() {
  const navigate = useNavigate()
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState(false)
  const [step,         setStep]         = useState('form')
  const [otpCode,      setOtpCode]      = useState('')
  const [otpLoading,   setOtpLoading]   = useState(false)
  const [otpError,     setOtpError]     = useState('')
  const [pwdError,     setPwdError]     = useState('')
  const [universities, setUniversities] = useState([])
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', university_id:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase.from('universities').select('id, name, city').order('name')
      .then(({ data }) => setUniversities(data || []))
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setPwdError('')
    if (!form.name.trim())              return setError('Le nom est requis.')
    if (!form.email.trim())             return setError("L'email est requis.")
    const pwdOk = form.password.length >= 8 && /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password)
    if (!pwdOk) return setPwdError('Le mot de passe doit contenir au moins une lettre et un chiffre')
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas.')

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { name: form.name.trim(), university_id: form.university_id || null } },
    })
    setLoading(false)
    if (err) { setError(err.message); return }

    if (data?.user && !data?.session) {
      setStep('otp')
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/'), 1800)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otpCode.length !== 6) return setOtpError('Entrez le code à 6 chiffres.')
    setOtpLoading(true)
    setOtpError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: form.email.trim(),
      token: otpCode,
      type: 'signup',
    })
    setOtpLoading(false)
    if (err) { setOtpError(err.message); return }
    setSuccess(true)
    setTimeout(() => navigate('/'), 1800)
  }

  const handleResend = async () => {
    await supabase.auth.resend({ type: 'signup', email: form.email.trim() })
    setOtpError('')
    setOtpCode('')
  }

  return (
    <div className="page">
      <style>{css}</style>

      <div className="left">
        <div className="left-inner">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-box"/><span className="logo-text">9raw<b>Zid</b>9ra</span>
          </div>
          <div className="left-body">
            <div className="left-tag">// rejoins la communauté</div>
            <h2 className="left-title">Des milliers d'étudiants<br /><span>réussissent ensemble.</span></h2>
            <p className="left-desc">Accède à des centaines d'annales organisées par école, filière et semestre. Gratuit, rapide, fait pour toi.</p>
            <div className="features">
              {[
                '762+ modules couverts dans la région',
                'Examens, CCs, TDs et TPs disponibles',
                'Upload et gagne des points',
                '100% gratuit, sans abonnement',
              ].map(f => (
                <div key={f} className="feature">
                  <div className="feature-dot"/>
                  <span className="feature-text">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="right">
        <div className="form-wrap">
          {success ? (
            <div className="success-wrap">
              <div className="success-icon">🎉</div>
              <h2 className="success-title">Compte créé avec succès !</h2>
              <p className="success-desc">Bienvenue sur 9rawZid9ra.<br />Redirection en cours...</p>
            </div>
          ) : step === 'otp' ? (
            <>
              <div className="otp-icon">📬</div>
              <h2 className="otp-title">Vérifie ton email</h2>
              <p className="otp-sub">
                Un code à 6 chiffres a été envoyé à<br />
                <span className="otp-email">{form.email}</span>
              </p>
              {otpError && <div className="alert err">{otpError}</div>}
              <form onSubmit={handleVerifyOtp}>
                <input
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
                <div className="otp-hint">Valable 10 minutes · Vérifie tes spams</div>
                <button type="submit" className="submit" disabled={otpLoading || otpCode.length !== 6}>
                  {otpLoading ? 'Vérification...' : 'Confirmer le code'}
                </button>
              </form>
              <div style={{ textAlign:'center', marginTop:'1.25rem' }}>
                <button className="otp-resend" onClick={handleResend}>Renvoyer le code</button>
                <button className="otp-back" onClick={() => { setStep('form'); setOtpCode(''); setOtpError('') }}>
                  ← Modifier l'email
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="form-title">Créer un compte</h2>
              <p className="form-sub">Déjà inscrit ? <button onClick={() => navigate('/login')}>Se connecter</button></p>
              {error && <div className="alert err">{error}</div>}
              <form onSubmit={handleRegister}>
                <div className="field">
                  <label className="label">Nom complet</label>
                  <input className="input" placeholder="Ex: Yassine Alaoui"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Adresse email</label>
                  <input className="input" type="email" placeholder="ton@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Université (optionnel)</label>
                  <select className="select" value={form.university_id} onChange={e => set('university_id', e.target.value)}>
                    <option value="">Sélectionne ton université</option>
                    {universities.map(u => (
                      <option key={u.id} value={u.id}>{u.name}{u.city ? ` (${u.city})` : ''}</option>
                    ))}
                  </select>
                  <div className="hint">Tu ne trouves pas ton université ? Elle sera ajoutée bientôt.</div>
                </div>
                <div className="field-row">
                  <div>
                    <label className="label">Mot de passe</label>
                    <input className="input" type="password" placeholder="••••••••"
                      value={form.password} onChange={e => { set('password', e.target.value); setPwdError('') }} />
                  </div>
                  <div>
                    <label className="label">Confirmer</label>
                    <input className="input" type="password" placeholder="••••••••"
                      value={form.confirm} onChange={e => set('confirm', e.target.value)} />
                  </div>
                </div>
                {pwdError
                  ? <div style={{ fontSize:'0.75rem', color:'#F87171', marginTop:6, fontFamily:"'Outfit',sans-serif" }}>{pwdError}</div>
                  : <div className="hint">Minimum 8 caractères, une lettre et un chiffre</div>
                }
                <button type="submit" className="submit" disabled={loading}>
                  {loading ? 'Création du compte...' : 'Créer mon compte'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
