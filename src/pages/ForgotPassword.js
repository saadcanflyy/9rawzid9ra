import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import AuthLayout from '../components/AuthLayout'
import { Button, Input, Tabs, Icon } from '../design-system/ui'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=email, 2=otp+newpass, 3=success
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const isSendingRef = useRef(false)
  const isResettingRef = useRef(false)

  useEffect(() => {
    document.title = 'Mot de passe oublié — 9rawZid9ra'
  }, [])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const handleSendOtp = async (e) => {
    e.preventDefault(); setError('')
    if (isSendingRef.current) return
    if (!email.trim()) return setError("L'adresse email est requise.")
    isSendingRef.current = true
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (err) { setError(err.message); return }
      setStep(2); setResendTimer(60)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      isSendingRef.current = false
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault(); setError('')
    if (isResettingRef.current) return
    const token = otp.join('')
    if (token.length < 6) return setError('Saisis les 6 chiffres du code.')
    const pwdOk = newPass.length >= 8 && /[a-zA-Z]/.test(newPass) && /[0-9]/.test(newPass)
    if (!pwdOk) return setError('Mot de passe : 8 caractères minimum, une lettre et un chiffre.')
    if (newPass !== confirmPass) return setError('Les mots de passe ne correspondent pas.')
    isResettingRef.current = true
    setLoading(true)
    try {
      const { error: otpErr } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'recovery' })
      if (otpErr) { setError('Code incorrect ou expiré.'); return }
      const { error: passErr } = await supabase.auth.updateUser({ password: newPass })
      if (passErr) { setError(passErr.message); return }
      setStep(3)
    } catch {
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
    } finally {
      isResettingRef.current = false
      setLoading(false)
    }
  }

  const handleOtpInput = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) document.getElementById(`rotp-${i + 1}`)?.focus()
  }
  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next)
      document.getElementById(`rotp-${i - 1}`)?.focus()
    }
  }
  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      const next = Array(6).fill('')
      pasted.split('').forEach((d, i) => { next[i] = d })
      setOtp(next)
      document.getElementById(`rotp-${Math.min(pasted.length, 5)}`)?.focus()
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    await supabase.auth.resetPasswordForEmail(email.trim())
    setResendTimer(60); setOtp(['', '', '', '', '', '']); setError('')
  }

  const mm = String(Math.floor(resendTimer / 60)).padStart(1, '0')
  const ss = String(resendTimer % 60).padStart(2, '0')

  return (
    <AuthLayout>
      <Tabs label="Étape" variant="pill" value={String(step)} items={[
        { id: '1', label: 'Email' }, { id: '2', label: 'Code' }, { id: '3', label: 'Nouveau mot de passe' },
      ]} />

      {step === 1 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="t-eyebrow qz-subtle">Récupération du compte</span>
          <h2 className="t-h2" style={{ marginTop: 4 }}>Mot de passe oublié ?</h2>
          <p className="t-body-sm qz-muted" style={{ margin: '4px 0 var(--space-6)' }}>Saisis ton adresse email et on t'envoie un code à 6 chiffres pour réinitialiser ton mot de passe.</p>
          {error && <div className="qz-banner qz-banner--danger" style={{ marginBottom: 'var(--space-4)' }}><Icon name="alert" /><span>{error}</span></div>}
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <Input label="Adresse email" type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <Button type="submit" variant="primary" size="lg" block loading={loading}>{loading ? 'Envoi du code…' : 'Envoyer le code'}</Button>
          </form>
          <Button variant="secondary" block style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/login')}>Retour à la connexion</Button>
        </div>
      )}

      {step === 2 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="t-eyebrow qz-subtle">Vérification + nouveau mot de passe</span>
          <h2 className="t-h2" style={{ marginTop: 4 }}>Nouveau mot de passe</h2>
          <p className="t-body-sm qz-muted" style={{ margin: '4px 0 8px' }}>Code envoyé à <span className="t-label" style={{ color: 'var(--text)' }}>{email}</span></p>
          {error && <div className="qz-banner qz-banner--danger" style={{ margin: 'var(--space-3) 0' }}><Icon name="alert" /><span>{error}</span></div>}
          <form onSubmit={handleReset}>
            <label className="qz-label" style={{ display: 'block', margin: 'var(--space-4) 0 var(--space-2)' }}>Code de vérification</label>
            <div className="qz-otp-row">
              {otp.map((d, i) => (
                <input key={i} id={`rotp-${i}`} className="qz-otp-box t-stat" maxLength={1} value={d}
                  onChange={e => handleOtpInput(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined} inputMode="numeric" autoFocus={i === 0} />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
              <span className="t-caption qz-subtle">Pas reçu ? </span>
              <Button variant="link" size="sm" type="button" onClick={handleResend} disabled={resendTimer > 0}>
                {resendTimer > 0 ? `Renvoyer dans ${mm}:${ss}` : 'Renvoyer'}
              </Button>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Input
                label="Nouveau mot de passe" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)}
                endAction={<button type="button" className="qz-iconbtn" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Masquer' : 'Afficher'}><Icon name="eye" size={16} /></button>}
              />
            </div>
            <Input label="Confirmer le mot de passe" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              hint="8 caractères minimum, une lettre et un chiffre." />

            <Button type="submit" variant="primary" size="lg" block loading={loading} style={{ marginTop: 'var(--space-6)' }}>
              {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
          <Button variant="secondary" block style={{ marginTop: 'var(--space-3)' }} onClick={() => { setStep(1); setError(''); setOtp(['', '', '', '', '', '']) }}>
            Modifier l'adresse email
          </Button>
        </div>
      )}

      {step === 3 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <span className="qz-icon-tile" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><Icon name="check" /></span>
          <span className="t-eyebrow qz-subtle" style={{ display: 'block', marginTop: 'var(--space-4)' }}>Mot de passe mis à jour</span>
          <h2 className="t-h2" style={{ marginTop: 4 }}>C'est fait</h2>
          <p className="t-body-sm qz-muted" style={{ margin: '4px 0 var(--space-6)' }}>Ton mot de passe a été réinitialisé avec succès. Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
          <Button variant="primary" size="lg" block onClick={() => navigate('/login')}>Se connecter</Button>
        </div>
      )}
    </AuthLayout>
  )
}
