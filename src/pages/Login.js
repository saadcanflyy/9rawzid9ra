import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Turnstile, { captchaEnabled, CAPTCHA_ERROR } from '../components/Turnstile'
import AuthLayout from '../components/AuthLayout'
import { Button, Input, Icon, Badge } from '../design-system/ui'
import { SESSION_EXPIRED_MESSAGE } from '../lib/session'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  // handleStaleSession() redirects here with ?expired=1 after dropping a dead token.
  const [error, setError] = useState(
    () => new URLSearchParams(window.location.search).get('expired') ? SESSION_EXPIRED_MESSAGE : ''
  )
  const [banInfo, setBanInfo] = useState(null)
  const [failCount, setFailCount] = useState(0)
  const [captchaToken, setCaptchaToken] = useState(null)
  const captchaRef = useRef(null)
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
    if (captchaEnabled() && !captchaToken) return setError(CAPTCHA_ERROR)
    isSubmittingRef.current = true
    setLoading(true)
    try {
      const { error: err } = await Promise.race([
        supabase.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 10000)),
      ])
      if (err) {
        setFailCount(c => c + 1)
        setError('Email ou mot de passe incorrect.')
        return
      }
      const { data: banRows } = await supabase.rpc('get_my_ban_status')
      const profile = banRows?.[0]
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
      captchaRef.current?.reset(); setCaptchaToken(null)
      isSubmittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <AuthLayout footer={
      <p className="t-body-sm qz-muted">
        Pas encore de compte ? <Link to="/register" state={{ from: location.state?.from }} style={{ color: 'var(--brand-text)' }}>Créer un compte</Link>
      </p>
    }>
      <h2 className="t-h2">Content de te revoir</h2>
      <p className="t-body-sm qz-muted" style={{ margin: '4px 0 var(--space-6)' }}>Connecte-toi pour télécharger et partager.</p>

      {location.state?.message && (
        <div className="qz-banner" style={{ marginBottom: 'var(--space-4)' }}><Icon name="info" /><span>{location.state.message}</span></div>
      )}

      {banInfo && (
        <div className="qz-card" style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)', marginBottom: 'var(--space-4)' }}>
          <Badge tone="danger" icon="alert">Compte suspendu</Badge>
          <p className="t-body-sm" style={{ margin: 'var(--space-2) 0 4px' }}>Raison : {banInfo.reason || 'Non spécifiée'}</p>
          <p className="t-body-sm qz-muted" style={{ marginBottom: 8 }}>
            {banInfo.until
              ? `Jusqu'au ${new Date(banInfo.until).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })}`
              : 'Bannissement permanent'}
          </p>
          <span className="t-caption qz-subtle">Contact : <a href="mailto:saadga2003@gmail.com" style={{ color: 'var(--brand-text)' }}>saadga2003@gmail.com</a></span>
        </div>
      )}

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
      {failCount >= 2 && (
        <div className="qz-banner" style={{ marginBottom: 'var(--space-4)', justifyContent: 'space-between' }}>
          <span>Mot de passe oublié ?</span>
          <Button variant="primary" size="sm" type="button" onClick={() => navigate('/forgot-password')}>Réinitialiser</Button>
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Input label="Adresse email" type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        <Input
          label="Mot de passe" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)}
          endAction={<button type="button" className="qz-iconbtn" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}><Icon name="eye" size={16} /></button>}
        />
        <div style={{ textAlign: 'right', marginTop: 6 }}>
          <Button variant="link" size="sm" type="button" onClick={() => navigate('/forgot-password')}>Mot de passe oublié ?</Button>
        </div>
        <Turnstile widgetRef={captchaRef} onToken={setCaptchaToken} />
        <Button type="submit" variant="primary" size="lg" block loading={loading} style={{ marginTop: 'var(--space-6)' }}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </AuthLayout>
  )
}
