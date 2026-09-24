import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Wordmark } from '../design-system/ui'

const HIDDEN_ON = ['/login', '/register', '/forgot-password']

export default function Footer() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (HIDDEN_ON.includes(pathname)) return null

  return (
    <footer className="qz-footer">
      <div className="qz-footer__inner">
        <div className="qz-footer__brand">
          <Wordmark linkAs={Link} href="/" size="lg" />
          <p className="t-body-sm qz-muted">
            Annales, examens et cours pour les étudiants marocains. Gratuit, pour toujours.
          </p>
        </div>
        <div className="qz-footer__links">
          <div className="qz-footer__col">
            <span className="t-eyebrow qz-subtle">Plateforme</span>
            <button type="button" onClick={() => navigate('/browse')}>Explorer</button>
            <button type="button" onClick={() => navigate('/upload')}>Partager</button>
            <button type="button" onClick={() => navigate('/senpai')}>Senpai Zone</button>
          </div>
          <div className="qz-footer__col">
            <span className="t-eyebrow qz-subtle">Infos</span>
            <button type="button" onClick={() => navigate('/about')}>À propos</button>
            <button type="button" onClick={() => navigate('/contact')}>Contact</button>
          </div>
          <div className="qz-footer__col">
            <span className="t-eyebrow qz-subtle">Légal</span>
            <button type="button" onClick={() => navigate('/privacy-policy')}>Confidentialité</button>
            <button type="button" onClick={() => navigate('/terms')}>Conditions</button>
          </div>
        </div>
      </div>
      <div className="qz-footer__bottom">
        <span className="t-caption qz-subtle">© 2026 9rawZid9ra</span>
        <span className="t-caption qz-subtle">Fait pour les étudiants marocains</span>
      </div>
    </footer>
  )
}
