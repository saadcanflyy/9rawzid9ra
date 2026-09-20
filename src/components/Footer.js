import { useNavigate, useLocation } from 'react-router-dom'

const css = `
  .site-footer {
    background: #100F1A;
    border-top: 1px solid #2C2A42;
    padding: 2.5rem 2rem 1.5rem;
    font-family: 'Outfit', sans-serif;
  }
  .ft-inner {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2rem;
  }
  .ft-brand {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .ft-logo {
    font-family: 'DM Mono', monospace;
    font-size: 0.92rem;
    font-weight: 500;
    color: #FFFFFF;
    letter-spacing: -0.3px;
  }
  .ft-logo b { color: #818CF8; font-weight: 700; }
  .ft-tagline {
    font-size: 0.78rem;
    color: #666287;
    max-width: 260px;
    line-height: 1.5;
  }
  .ft-links {
    display: flex;
    gap: 2.5rem;
    flex-wrap: wrap;
  }
  .ft-col-title {
    font-family: 'DM Mono', monospace;
    font-size: 0.62rem;
    color: #666287;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .ft-col { display: flex; flex-direction: column; gap: 0.45rem; }
  .ft-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.82rem;
    color: #A4A0C8;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    text-align: left;
    transition: color 0.15s;
  }
  .ft-link:hover { color: #EAE7FF; }
  .ft-bottom {
    max-width: 900px;
    margin: 1.5rem auto 0;
    padding-top: 1rem;
    border-top: 1px solid rgba(44,42,66,0.5);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .ft-copy {
    font-family: 'DM Mono', monospace;
    font-size: 0.68rem;
    color: #666287;
  }
  .ft-heart { color: #F87171; }
  @media(max-width:600px) {
    .ft-inner { flex-direction: column; gap: 1.5rem; }
    .ft-links { gap: 1.5rem; }
  }
`

const HIDDEN_ON = ['/login', '/register', '/forgot-password']

export default function Footer() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (HIDDEN_ON.includes(pathname)) return null

  return (
    <>
      <style>{css}</style>
      <footer className="site-footer">
        <div className="ft-inner">
          <div className="ft-brand">
            <div className="ft-logo">9raw<b>Zid</b>9ra</div>
            <div className="ft-tagline">
              La plateforme gratuite pour les étudiants marocains.
              Partage et télécharge des examens, cours et annales.
            </div>
          </div>
          <div className="ft-links">
            <div className="ft-col">
              <div className="ft-col-title">Plateforme</div>
              <button className="ft-link" onClick={() => navigate('/browse')}>Explorer</button>
              <button className="ft-link" onClick={() => navigate('/upload')}>Uploader</button>
              <button className="ft-link" onClick={() => navigate('/senpai')}>Senpai Zone</button>
            </div>
            <div className="ft-col">
              <div className="ft-col-title">Infos</div>
              <button className="ft-link" onClick={() => navigate('/about')}>À propos</button>
              <button className="ft-link" onClick={() => navigate('/contact')}>Contact</button>
            </div>
            <div className="ft-col">
              <div className="ft-col-title">Légal</div>
              <button className="ft-link" onClick={() => navigate('/privacy-policy')}>Confidentialité</button>
              <button className="ft-link" onClick={() => navigate('/terms')}>Conditions</button>
            </div>
          </div>
        </div>
        <div className="ft-bottom">
          <span className="ft-copy">© 2026 9rawZid9ra</span>
          <span className="ft-copy">
            fait avec <span className="ft-heart">♥</span> pour les étudiants marocains
          </span>
        </div>
      </footer>
    </>
  )
}
