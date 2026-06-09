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
  .page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem; position:relative; overflow:hidden; }
  .page::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle, rgba(79,142,247,0.07) 1px, transparent 1px); background-size:36px 36px; mask-image:radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%); }
  .page::after { content:''; position:absolute; top:-200px; left:50%; transform:translateX(-50%); width:600px; height:600px; border-radius:50%; background:radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%); pointer-events:none; }

  .card { position:relative; z-index:1; background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:2.5rem; width:100%; max-width:420px; }
  .card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, var(--accent) 30%, var(--teal) 70%, transparent); }

  .logo { display:flex; align-items:center; gap:10px; cursor:pointer; margin-bottom:2rem; }
  .logo-box { width:28px; height:28px; border-radius:6px; background:linear-gradient(135deg,var(--accent),var(--teal)); }
  .logo-text { font-family:'DM Mono',monospace; font-size:0.88rem; color:var(--white); }
  .logo-text b { color:var(--accent2); font-weight:500; }

  .steps { display:flex; align-items:center; gap:8px; margin-bottom:2rem; }
  .step-dot { width:8px; height:8px; border-radius:50%; background:var(--border); transition:all 0.3s; }
  .step-dot.done { background:var(--teal); }
  .step-dot.active { background:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.2); }
  .step-line { flex:1; height:1px; background:var(--border); }
  .step-line.done { background:linear-gradient(90deg,var(--teal),var(--accent)); }

  .card-tag { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:0.75rem; }
  .card-title { font-size:1.4rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; margin-bottom:0.5rem; }
  .card-desc { font-size:0.85rem; color:var(--text2); line-height:1.6; margin-bottom:1.75rem; }

  .label { display:block; font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:0.5rem; }
  .input { width:100%; background:var(--s2); border:1px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-size:0.9rem; font-family:'Outfit',sans-serif; outline:none; transition:border-color 0.15s, box-shadow 0.15s; margin-bottom:1.25rem; }
  .input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.1); }
  .input::placeholder { color:var(--text3); }

  .submit { width:100%; background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:13px; font-size:0.9rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; position:relative; overflow:hidden; }
  .submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,142,247,0.4); }
  .submit:disabled { opacity:0.5; cursor:not-allowed; }

  .back-btn { width:100%; background:none; border:1px solid var(--border); color:var(--text2); border-radius:10px; padding:11px; font-size:0.875rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.15s; margin-top:10px; }
  .back-btn:hover { border-color:var(--borderhi); color:var(--text); }

  .alert { padding:10px 14px; border-radius:8px; font-size:0.82rem; margin-bottom:1.25rem; font-family:'DM Mono',monospace; line-height:1.5; }
  .err { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); color:var(--red); }
  .ok  { background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.2); color:var(--teal2); }

  /* OTP */
  .otp-email { font-family:'DM Mono',monospace; font-size:0.82rem; color:var(--accent2); background:rgba(79,142,247,0.06); border:1px solid rgba(79,142,247,0.15); border-radius:6px; padding:4px 12px; display:inline-block; margin-bottom:1.5rem; }
  .otp-inputs { display:flex; gap:8px; justify-content:center; margin-bottom:1.5rem; }
  .otp-box { width:48px; height:58px; background:var(--s2); border:1px solid var(--border); border-radius:10px; text-align:center; font-size:1.3rem; font-weight:700; color:var(--white); font-family:'DM Mono',monospace; outline:none; transition:border-color 0.15s, box-shadow 0.15s; }
  .otp-box:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(79,142,247,0.12); }
  .otp-box.filled { border-color:rgba(79,142,247,0.4); background:rgba(79,142,247,0.04); }
  .otp-resend { font-size:0.78rem; color:var(--text3); font-family:'DM Mono',monospace; text-align:center; margin-top:1rem; }
  .otp-resend button { color:var(--accent2); background:none; border:none; cursor:pointer; font-family:'DM Mono',monospace; font-size:0.78rem; }
  .otp-resend button:disabled { opacity:0.4; cursor:not-allowed; }

  /* New password fields */
  .pw-field { margin-bottom:1rem; }
  .hint { font-size:0.7rem; color:var(--text3); margin-top:4px; font-family:'DM Mono',monospace; }

  /* Success */
  .success-icon { width:56px; height:56px; border-radius:14px; background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.2); display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem; font-family:'DM Mono',monospace; font-size:1.3rem; color:var(--teal2); }
`

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=email, 2=otp+newpass, 3=success
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['','','','','',''])
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // Step 1 — Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault(); setError('')
    if (!email.trim()) return setError("L'adresse email est requise.")
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (err) { setError(err.message); setLoading(false); return }
    setStep(2); setResendTimer(60); setLoading(false)
  }

  // Step 2 — Verify OTP + set new password
  const handleReset = async (e) => {
    e.preventDefault(); setError('')
    const token = otp.join('')
    if (token.length < 6) return setError('Saisis les 6 chiffres du code.')
    if (newPass.length < 6) return setError('Mot de passe: minimum 6 caractères.')
    if (newPass !== confirmPass) return setError('Les mots de passe ne correspondent pas.')
    setLoading(true)

    // First verify OTP
    const { error: otpErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'recovery',
    })
    if (otpErr) { setError('Code incorrect ou expiré.'); setLoading(false); return }

    // Then update password
    const { error: passErr } = await supabase.auth.updateUser({ password: newPass })
    if (passErr) { setError(passErr.message); setLoading(false); return }

    setStep(3); setLoading(false)
  }

  const handleOtpInput = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) document.getElementById(`rotp-${i+1}`)?.focus()
  }

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i-1] = ''; setOtp(next)
      document.getElementById(`rotp-${i-1}`)?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0,6)
    if (pasted) {
      const next = Array(6).fill('')
      pasted.split('').forEach((d,i) => { next[i] = d })
      setOtp(next)
      document.getElementById(`rotp-${Math.min(pasted.length, 5)}`)?.focus()
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    await supabase.auth.resetPasswordForEmail(email.trim())
    setResendTimer(60); setOtp(['','','','','','']); setError('')
  }

  return (
    <div className="page">
      <style>{css}</style>
      <div className="card">
        <div className="logo" onClick={() => navigate('/')}>
          <div className="logo-box"/>
          <span className="logo-text">9raw<b>Zid</b>9ra</span>
        </div>

        {/* Steps indicator */}
        <div className="steps">
          <div className={`step-dot ${step>=1?'done':''} ${step===1?'active':''}`}/>
          <div className={`step-line ${step>=2?'done':''}`}/>
          <div className={`step-dot ${step>=2?'done':''} ${step===2?'active':''}`}/>
          <div className={`step-line ${step>=3?'done':''}`}/>
          <div className={`step-dot ${step>=3?'active':''}`}/>
        </div>

        {/* STEP 1 — Enter email */}
        {step === 1 && (
          <>
            <div className="card-tag">// récupération du compte</div>
            <h2 className="card-title">Mot de passe oublié ?</h2>
            <p className="card-desc">Saisis ton adresse email et on t'envoie un code à 6 chiffres pour réinitialiser ton mot de passe.</p>
            {error && <div className="alert err">{error}</div>}
            <form onSubmit={handleSendOtp}>
              <label className="label">Adresse email</label>
              <input className="input" type="email" placeholder="ton@email.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus/>
              <button type="submit" className="submit" disabled={loading}>
                {loading ? 'Envoi du code...' : 'Envoyer le code'}
              </button>
            </form>
            <button className="back-btn" onClick={() => navigate('/login')}>
              Retour à la connexion
            </button>
          </>
        )}

        {/* STEP 2 — OTP + new password */}
        {step === 2 && (
          <>
            <div className="card-tag">// vérification + nouveau mot de passe</div>
            <h2 className="card-title">Nouveau mot de passe</h2>
            <p className="card-desc" style={{marginBottom:'0.5rem'}}>Code envoyé à:</p>
            <span className="otp-email">{email}</span>
            {error && <div className="alert err">{error}</div>}
            <form onSubmit={handleReset}>
              <label className="label" style={{marginBottom:'0.75rem',display:'block'}}>Code de vérification</label>
              <div className="otp-inputs">
                {otp.map((d,i) => (
                  <input key={i} id={`rotp-${i}`}
                    className={`otp-box ${d?'filled':''}`}
                    maxLength={1} value={d}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    onPaste={i===0 ? handlePaste : undefined}
                    inputMode="numeric"
                    autoFocus={i===0}
                  />
                ))}
              </div>
              <div className="otp-resend" style={{marginBottom:'1.5rem'}}>
                Pas reçu ?{' '}
                <button type="button" onClick={handleResend} disabled={resendTimer>0}>
                  {resendTimer>0 ? `Renvoyer dans ${resendTimer}s` : 'Renvoyer'}
                </button>
              </div>

              <div className="pw-field">
                <label className="label">Nouveau mot de passe</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={newPass} onChange={e => setNewPass(e.target.value)}
                  style={{marginBottom:0}}/>
              </div>
              <div className="pw-field">
                <label className="label">Confirmer le mot de passe</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  style={{marginBottom:0}}/>
                <div className="hint">Minimum 6 caractères</div>
              </div>

              <button type="submit" className="submit" disabled={loading} style={{marginTop:'1.25rem'}}>
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
            <button className="back-btn" onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); }}>
              Modifier l'adresse email
            </button>
          </>
        )}

        {/* STEP 3 — Success */}
        {step === 3 && (
          <>
            <div className="success-icon">✓</div>
            <div className="card-tag">// mot de passe mis à jour</div>
            <h2 className="card-title">C'est fait !</h2>
            <p className="card-desc">Ton mot de passe a été réinitialisé avec succès. Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
            <button className="submit" onClick={() => navigate('/login')}>
              Se connecter
            </button>
          </>
        )}
      </div>
    </div>
  )
}