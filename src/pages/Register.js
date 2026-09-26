import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Turnstile, { captchaEnabled, CAPTCHA_ERROR } from '../components/Turnstile'
import AuthLayout from '../components/AuthLayout'
import { Button, Input, Select, Icon } from '../design-system/ui'

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState('form')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const captchaRef = useRef(null)
  const [resendTimer, setResendTimer] = useState(0)
  const [pwdError, setPwdError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [universities, setUniversities] = useState([])
  const [googleLoading, setGoogleLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', university_id: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    document.title = 'Créer un compte — 9rawZid9ra'
    supabase.from('universities').select('id, name, city').order('name')
      .then(({ data }) => setUniversities(data || []))
  }, [])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    setError('')
    setPwdError('')
    if (!form.name.trim()) return setError('Le nom est requis.')
    if (captchaEnabled() && !captchaToken) return setError(CAPTCHA_ERROR)
    if (!form.email.trim()) return setError("L'email est requis.")
    const pwdOk = form.password.length >= 8 && /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password)
    if (!pwdOk) return setPwdError('Le mot de passe doit contenir au moins une lettre et un chiffre')
    if (form.password !== form.confirm) return setError('Les mots de passe ne correspondent pas.')

    isSubmittingRef.current = true
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { captchaToken, data: { name: form.name.trim(), university_id: form.university_id || null } },
      })
      if (err) {
        const msg = err.message.toLowerCase()
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          setError('Un compte avec cet email existe déjà.')
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Trop de tentatives. Réessaie dans quelques minutes.')
        } else {
          setError('Erreur lors de la création du compte. Réessaie.')
        }
        return
      }
      if (data?.user && !data?.session) {
        setStep('otp')
        setResendTimer(60)
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/'), 1800)
      }
    } catch {
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      captchaRef.current?.reset(); setCaptchaToken(null)
      isSubmittingRef.current = false
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const token = otp.join('')
    if (token.length !== 6) return setOtpError('Entrez le code à 6 chiffres.')
    setOtpLoading(true)
    setOtpError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: form.email.trim(),
      token,
      type: 'signup',
    })
    setOtpLoading(false)
    if (err) { setOtpError(err.message); return }
    setSuccess(true)
    setTimeout(() => navigate('/'), 1800)
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    await supabase.auth.resend({ type: 'signup', email: form.email.trim() })
    setOtpError('')
    setOtp(['', '', '', '', '', ''])
    setResendTimer(60)
  }

  const handleOtpInput = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) document.getElementById(`sotp-${i + 1}`)?.focus()
  }
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next)
      document.getElementById(`sotp-${i - 1}`)?.focus()
    }
  }
  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      const next = Array(6).fill('')
      pasted.split('').forEach((d, i) => { next[i] = d })
      setOtp(next)
      document.getElementById(`sotp-${Math.min(pasted.length, 5)}`)?.focus()
    }
  }

  const mm = String(Math.floor(resendTimer / 60)).padStart(1, '0')
  const ss = String(resendTimer % 60).padStart(2, '0')

  return (
    <AuthLayout footer={!success && step === 'form' && (
      <p className="t-body-sm qz-muted">Déjà inscrit ? <Link to="/login" style={{ color: 'var(--brand-text)' }}>Se connecter</Link></p>
    )}>
      {success ? (
        <div style={{ textAlign: 'center' }}>
          <span className="qz-icon-tile qz-icon-tile--lg" style={{ background: 'var(--success-soft)', color: 'var(--success)', margin: '0 auto var(--space-4)' }}><Icon name="check" /></span>
          <h2 className="t-h2">Compte créé avec succès</h2>
          <p className="t-body qz-muted" style={{ marginTop: 'var(--space-2)' }}>Bienvenue sur 9rawZid9ra. Redirection en cours…</p>
        </div>
      ) : step === 'otp' ? (
        <>
          <span className="qz-icon-tile qz-icon-tile--lg" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)', margin: '0 auto var(--space-4)' }}><Icon name="message" /></span>
          <h2 className="t-h2" style={{ textAlign: 'center' }}>Vérifie ta boîte mail</h2>
          <p className="t-body-sm qz-muted" style={{ textAlign: 'center', margin: '4px 0 var(--space-6)' }}>
            Code envoyé à <span className="t-label" style={{ color: 'var(--text)' }}>{form.email}</span>
          </p>
          {otpError && <div className="qz-banner qz-banner--danger" style={{ marginBottom: 'var(--space-4)' }}><Icon name="alert" /><span>{otpError}</span></div>}
          <form onSubmit={handleVerifyOtp}>
            <div className="qz-otp-row">
              {otp.map((d, i) => (
                <input key={i} id={`sotp-${i}`} className="qz-otp-box t-stat" maxLength={1} value={d}
                  onChange={e => handleOtpInput(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined} inputMode="numeric" autoFocus={i === 0} />
              ))}
            </div>
            <p className="t-caption qz-subtle" style={{ textAlign: 'center', margin: '0 0 var(--space-5)' }}>Tu n'as pas reçu le code ? Vérifie tes spams.</p>
            <Button type="submit" variant="primary" size="lg" block loading={otpLoading} disabled={otp.join('').length !== 6}>Vérifier</Button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <Button variant="link" size="sm" onClick={handleResend} disabled={resendTimer > 0}>
              {resendTimer > 0 ? `Renvoyer dans ${mm}:${ss}` : 'Renvoyer le code'}
            </Button>
          </div>
          <Button variant="ghost" block onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setOtpError('') }} style={{ marginTop: 'var(--space-2)' }}>
            J'ai fait une erreur dans mon email
          </Button>
        </>
      ) : (
        <>
          <h2 className="t-h2">Crée ton compte</h2>
          <p className="t-body-sm qz-muted" style={{ margin: '4px 0 var(--space-6)' }}>30 secondes, et c'est gratuit.</p>

          <Button variant="secondary" size="lg" block onClick={handleGoogle} disabled={googleLoading || loading} type="button">
            <span style={{ display: 'inline-flex', marginRight: 4 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.149 17.64 11.84 17.64 9.2z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" />
              </svg>
            </span>
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </Button>

          <div className="qz-divider"><span className="t-caption qz-subtle">ou</span></div>

          {error && <div className="qz-banner qz-banner--danger" style={{ marginBottom: 'var(--space-4)' }}><Icon name="alert" /><span>{error}</span></div>}
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Input label="Nom complet" placeholder="Ex : Yassine Alaoui" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Input label="Adresse email" type="email" placeholder="ton@email.com" value={form.email} onChange={e => set('email', e.target.value)} hint="On t'envoie un code de vérification." />
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Select label="Établissement" optional value={form.university_id} onChange={e => set('university_id', e.target.value)}
                options={[{ value: '', label: 'Sélectionne ton université' }, ...universities.map(u => ({ value: u.id, label: u.name + (u.city ? ` (${u.city})` : '') }))]} />
              <span className="qz-hint">Tu ne trouves pas ton école ? Elle sera ajoutée bientôt.</span>
            </div>
            <div className="qz-field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input label="Mot de passe" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                onChange={e => { set('password', e.target.value); setPwdError('') }}
                endAction={<button type="button" className="qz-iconbtn" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Masquer' : 'Afficher'}><Icon name="eye" size={16} /></button>} />
              <Input label="Confirmer" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
            </div>
            {pwdError ? <span className="qz-hint qz-hint--error">{pwdError}</span> : <span className="qz-hint">8 caractères minimum.</span>}
            <Turnstile widgetRef={captchaRef} onToken={setCaptchaToken} />
            <Button type="submit" variant="primary" size="lg" block loading={loading} style={{ marginTop: 'var(--space-6)' }}>
              {loading ? 'Création du compte…' : 'Créer mon compte'}
            </Button>
            <p className="t-caption qz-subtle" style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
              En continuant, tu acceptes les <Link to="/terms" style={{ color: 'var(--brand-text)' }}>Conditions</Link> et la <Link to="/privacy-policy" style={{ color: 'var(--brand-text)' }}>Politique de confidentialité</Link>.
            </p>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
