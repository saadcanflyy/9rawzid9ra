import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { StatStrip, Avatar, Card, Button } from '../design-system/ui'

const css = `
  .static-page { max-width: 680px; margin: 0 auto; padding: var(--space-16) var(--space-6) var(--space-16); }
  .static-page__intro { margin: var(--space-3) 0 var(--space-8); }
  .static-page section { margin-top: var(--space-12); }
  .static-page section:first-of-type { margin-top: var(--space-8); }
  .static-page section p { margin-top: var(--space-3); }
  .static-page a { color: var(--brand-text); text-decoration: none; }
  .static-page a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .about-who { display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-4); }
  .about-cta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-4); }
`

export default function About() {
  const [stats, setStats] = useState({ unis: 0, mods: 0, docs: 0 })

  useEffect(() => {
    document.title = 'À propos — 9rawZid9ra'
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
    <div>
      <style>{css}</style>
      <Navbar />
      <div className="static-page">
        <span className="t-eyebrow qz-subtle">À propos</span>
        <h1 className="t-h1">Créé par un étudiant, pour les étudiants</h1>
        <p className="t-body-lg qz-muted static-page__intro">
          9rawZid9ra est la plateforme gratuite qui aide les étudiants marocains
          à accéder à des examens, cours et annales de leurs universités et écoles.
        </p>

        <StatStrip items={[
          { value: stats.unis, label: 'Universités' },
          { value: stats.mods.toLocaleString(), label: 'Modules' },
          { value: stats.docs.toLocaleString(), label: 'Documents' },
        ]} />

        <section>
          <h2 className="t-h2">Pourquoi 9rawZid9ra</h2>
          <p className="t-body-lg">
            Au Maroc, chaque année, des milliers d'étudiants cherchent des annales et des examens
            pour préparer leurs épreuves. Les ressources sont souvent dispersées dans des groupes WhatsApp,
            des drives personnels ou perdues d'une année à l'autre.
          </p>
          <p className="t-body-lg">
            9rawZid9ra centralise tout ça dans un seul endroit, gratuit et accessible à tous.
            Notre objectif est simple : qu'aucun étudiant ne se retrouve sans ressources pour réviser.
          </p>
        </section>

        <section>
          <h2 className="t-h2">L'histoire</h2>
          <p className="t-body-lg">
            9rawZid9ra est né d'un constat simple : quand tu es étudiant au Maroc, trouver
            un ancien examen pour réviser ne devrait pas être un parcours du combattant.
          </p>
          <p className="t-body-lg">
            Construit par un étudiant qui a vécu cette galère, cette plateforme est le résultat
            de centaines d'heures de développement, motivé par une seule idée — rendre l'accès
            au savoir plus facile pour tout le monde.
          </p>
        </section>

        <section>
          <h2 className="t-h2">Comment ça marche</h2>
          <p className="t-body-lg">
            C'est simple : tu sélectionnes ton université, ta filière et ton semestre.
            Tu trouves les modules correspondants avec tous les documents disponibles.
            Tu peux télécharger librement, et contribuer en uploadant tes propres ressources.
          </p>
          <p className="t-body-lg">
            Chaque contribution aide un autre étudiant à mieux se préparer.
            C'est le principe de 9rawZid9ra : <strong>lire, et partager pour que d'autres lisent aussi</strong>.
          </p>
        </section>

        <section>
          <h2 className="t-h2">Nous contacter</h2>
          <p className="t-body-lg">
            Une question, une suggestion, un bug à signaler ?
            N'hésite pas à nous contacter par e-mail
            à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a> ou
            via notre <Link to="/contact">page de contact</Link>.
          </p>
        </section>

        <section>
          <h2 className="t-h2">Qui est derrière</h2>
          <div className="about-who">
            <Avatar name="Saad" size="lg" founder />
            <div>
              <p className="t-label">Saad, créateur de 9rawZid9ra</p>
              <p className="t-body-sm qz-muted">Étudiant qui a construit cette plateforme pour résoudre son propre problème.</p>
            </div>
          </div>
        </section>

        <section>
          <Card>
            <h2 className="t-h2">Prêt à commencer ?</h2>
            <p className="t-body-lg qz-muted">Explore les modules de ta filière ou partage un document pour aider d'autres étudiants.</p>
            <div className="about-cta">
              <Button variant="primary" as={Link} to="/browse">Explorer</Button>
              <Button variant="secondary" as={Link} to="/upload">Partager un document</Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
