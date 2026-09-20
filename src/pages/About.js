import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222;
    --border:#1C2A45;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }

  body { background:var(--bg); color:var(--text); font-family:'Outfit',sans-serif; }
  .about-page { min-height:100vh; }
  .about-hero {
    padding: 4rem 2rem 3rem;
    text-align: center;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .about-hero::before {
    content: '';
    position: absolute;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%);
    top: -150px; left: 50%; transform: translateX(-50%);
    pointer-events: none;
  }
  .about-eyebrow {
    position: relative;
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: var(--accent);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .about-h1 {
    position: relative;
    font-size: clamp(1.6rem,5vw,2.5rem);
    font-weight: 800;
    color: var(--white);
    letter-spacing: -1px;
    margin-bottom: 1rem;
  }
  .about-h1 span {
    background: linear-gradient(90deg, var(--accent2), var(--teal2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .about-intro {
    position: relative;
    max-width: 560px;
    margin: 0 auto;
    font-size: 1rem;
    color: var(--text2);
    line-height: 1.7;
  }

  .about-stats {
    display: flex;
    justify-content: center;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    max-width: 560px;
    margin: 2.5rem auto 0;
    position: relative;
  }
  .about-stat {
    flex: 1;
    padding: 1.2rem 0.5rem;
    text-align: center;
    background: var(--surface);
  }
  .about-stat-n {
    font-family: 'DM Mono', monospace;
    font-size: 1.5rem;
    font-weight: 500;
    background: linear-gradient(135deg, var(--accent2), var(--teal2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 3px;
  }
  .about-stat-l {
    font-size: 0.7rem;
    color: var(--text3);
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .about-content {
    max-width: 720px;
    margin: 0 auto;
    padding: 3rem 2rem 4rem;
  }
  .about-section {
    margin-bottom: 2.5rem;
  }
  .about-section-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .about-section-tag {
    font-family: 'DM Mono', monospace;
    font-size: 0.6rem;
    color: var(--accent);
    background: rgba(79,142,247,0.08);
    border: 1px solid rgba(79,142,247,0.15);
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 1px;
  }
  .about-section p {
    font-size: 0.88rem;
    color: var(--text2);
    line-height: 1.7;
    margin-bottom: 0.75rem;
  }
  .about-section a {
    color: var(--accent2);
    text-decoration: none;
  }
  .about-section a:hover { text-decoration: underline; }
  .about-cta {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }
  .about-btn {
    padding: 10px 22px;
    border-radius: 9px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    transition: all 0.15s;
    border: none;
  }
  .about-btn-primary {
    background: linear-gradient(135deg, var(--accent), #3A6ED4);
    color: #fff;
  }
  .about-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(79,142,247,0.35); }
  .about-btn-ghost {
    background: none;
    border: 1px solid var(--border);
    color: var(--text2);
  }
  .about-btn-ghost:hover { border-color: var(--accent); color: var(--accent2); }
`

export default function About() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ unis: 0, mods: 0, docs: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('universities').select('id', { count: 'exact', head: true }),
      supabase.from('modules').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
    ]).then(([u, m, d]) => {
      setStats({
        unis: u.count || 0,
        mods: m.count || 0,
        docs: d.count || 0,
      })
    })
  }, [])

  return (
    <div className="about-page">
      <style>{css}</style>
      <Navbar />
      <div className="about-hero">
        <div className="about-eyebrow">// à propos</div>
        <h1 className="about-h1">
          Créé par un étudiant,<br/>
          pour les <span>étudiants</span>
        </h1>
        <p className="about-intro">
          9rawZid9ra est la plateforme gratuite qui aide les étudiants marocains
          à accéder à des examens, cours et annales de leurs universités et écoles.
        </p>
        <div className="about-stats">
          <div className="about-stat">
            <div className="about-stat-n">{stats.unis}+</div>
            <div className="about-stat-l">Universités</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-n">{stats.mods.toLocaleString()}+</div>
            <div className="about-stat-l">Modules</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-n">{stats.docs.toLocaleString()}+</div>
            <div className="about-stat-l">Documents</div>
          </div>
        </div>
      </div>

      <div className="about-content">
        <div className="about-section">
          <div className="about-section-title">
            Notre mission
            <span className="about-section-tag">MISSION</span>
          </div>
          <p>
            Au Maroc, chaque année, des milliers d'étudiants cherchent des annales et des examens
            pour préparer leurs épreuves. Les ressources sont souvent dispersées dans des groupes WhatsApp,
            des drives personnels ou perdues d'une année à l'autre.
          </p>
          <p>
            9rawZid9ra centralise tout ça dans un seul endroit, gratuit et accessible à tous.
            Notre objectif est simple : qu'aucun étudiant ne se retrouve sans ressources pour réviser.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">
            L'histoire
            <span className="about-section-tag">STORY</span>
          </div>
          <p>
            9rawZid9ra est né d'un constat simple : quand tu es étudiant au Maroc, trouver
            un ancien examen pour réviser ne devrait pas être un parcours du combattant.
          </p>
          <p>
            Construit par un étudiant qui a vécu cette galère, cette plateforme est le résultat
            de centaines d'heures de développement, motivé par une seule idée — rendre l'accès
            au savoir plus facile pour tout le monde.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">
            Comment ça marche
            <span className="about-section-tag">HOW</span>
          </div>
          <p>
            C'est simple : tu sélectionnes ton université, ta filière et ton semestre.
            Tu trouves les modules correspondants avec tous les documents disponibles.
            Tu peux télécharger librement, et contribuer en uploadant tes propres ressources.
          </p>
          <p>
            Chaque contribution aide un autre étudiant à mieux se préparer.
            C'est le principe de 9rawZid9ra : <strong>lire, et partager pour que d'autres lisent aussi</strong>.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">
            Nous contacter
            <span className="about-section-tag">CONTACT</span>
          </div>
          <p>
            Une question, une suggestion, un bug à signaler ?
            N'hésite pas à nous contacter par e-mail
            à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a> ou
            via notre <a href="/contact" onClick={e => { e.preventDefault(); navigate('/contact') }}>page de contact</a>.
          </p>
          <div className="about-cta">
            <button className="about-btn about-btn-primary" onClick={() => navigate('/browse')}>
              Explorer les modules
            </button>
            <button className="about-btn about-btn-ghost" onClick={() => navigate('/contact')}>
              Nous contacter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
