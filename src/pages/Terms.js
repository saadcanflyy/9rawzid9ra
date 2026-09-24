import { useEffect } from 'react'
import Navbar from '../components/Navbar'

const css = `
  .static-page { max-width: 680px; margin: 0 auto; padding: var(--space-16) var(--space-6) var(--space-16); }
  .static-page__updated { margin-top: var(--space-2); }
  .static-page section { margin-top: var(--space-12); }
  .static-page section:first-of-type { margin-top: var(--space-8); }
  .static-page section p { margin-top: var(--space-3); }
  .static-page ul { list-style: none; margin: var(--space-3) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
  .static-page li { position: relative; padding-left: var(--space-4); }
  .static-page li::before { content: '—'; position: absolute; left: 0; color: var(--text-subtle); }
  .static-page a { color: var(--brand-text); text-decoration: none; }
  .static-page a:hover { text-decoration: underline; text-underline-offset: 3px; }
`

export default function Terms() {
  useEffect(() => { document.title = "Conditions d'utilisation — 9rawZid9ra" }, [])

  return (
    <div>
      <style>{css}</style>
      <Navbar />
      <div className="static-page">
        <span className="t-eyebrow qz-subtle">Conditions</span>
        <h1 className="t-h1">Conditions d'utilisation</h1>
        <p className="t-caption qz-subtle static-page__updated">Dernière mise à jour : 18 juin 2026</p>

        <section>
          <h2 className="t-h2">1. Objet de la plateforme</h2>
          <p className="t-body-lg">
            9rawZid9ra est une plateforme gratuite permettant aux étudiants marocains de partager
            et télécharger des ressources pédagogiques : examens, contrôles continus, travaux dirigés,
            travaux pratiques, cours et corrigés.
          </p>
          <p className="t-body-lg">
            En utilisant la plateforme, tu acceptes les présentes conditions d'utilisation dans leur intégralité.
          </p>
        </section>

        <section>
          <h2 className="t-h2">2. Inscription et compte</h2>
          <ul className="t-body-lg">
            <li>L'inscription est gratuite et ouverte à toute personne disposant d'une adresse e-mail valide.</li>
            <li>Tu es responsable de la confidentialité de tes identifiants de connexion.</li>
            <li>Les informations fournies lors de l'inscription doivent être exactes et à jour.</li>
            <li>Un seul compte par personne est autorisé.</li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2">3. Contenu et responsabilité des utilisateurs</h2>
          <p className="t-body-lg">En uploadant du contenu sur 9rawZid9ra, tu t'engages à :</p>
          <ul className="t-body-lg">
            <li>Ne pas publier de contenu protégé par des droits d'auteur sans autorisation (livres complets, manuels commerciaux, etc.).</li>
            <li>Ne pas publier de contenu inapproprié, offensant, discriminatoire ou illégal.</li>
            <li>Fournir des informations exactes sur les documents (module, semestre, type de document).</li>
            <li>Ne pas utiliser la plateforme à des fins de spam, de publicité ou de harcèlement.</li>
          </ul>
          <p className="t-body-lg">
            Les documents partagés (examens, TD, TP, cours) sont considérés comme des ressources
            pédagogiques à vocation éducative. L'utilisateur reste responsable du contenu qu'il publie.
          </p>
        </section>

        <section>
          <h2 className="t-h2">4. Modération</h2>
          <p className="t-body-lg">
            La modération sur 9rawZid9ra est <strong>réactive</strong> : les documents et messages
            sont examinés suite à des signalements des utilisateurs ou lors de contrôles réguliers
            par l'équipe d'administration.
          </p>
          <ul className="t-body-lg">
            <li>Tout contenu signalé est examiné par un administrateur ou modérateur.</li>
            <li>Les contenus enfreignant les règles sont supprimés sans préavis.</li>
            <li>Les décisions de modération sont prises de bonne foi et dans l'intérêt de la communauté.</li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2">5. Suspension et résiliation de compte</h2>
          <p className="t-body-lg">9rawZid9ra se réserve le droit de suspendre ou supprimer un compte en cas de :</p>
          <ul className="t-body-lg">
            <li>Violation répétée des conditions d'utilisation.</li>
            <li>Publication de contenu inapproprié ou illégal.</li>
            <li>Comportement abusif envers d'autres utilisateurs.</li>
            <li>Utilisation de la plateforme à des fins malveillantes (spam, phishing, etc.).</li>
          </ul>
          <p className="t-body-lg">
            La suspension peut être temporaire ou permanente selon la gravité de l'infraction.
            L'utilisateur sera informé par e-mail de la raison et de la durée de la suspension.
          </p>
        </section>

        <section>
          <h2 className="t-h2">6. Propriété intellectuelle</h2>
          <p className="t-body-lg">
            Le code source, le design, le nom et le logo de 9rawZid9ra sont la propriété de leurs créateurs.
            Les documents partagés par les utilisateurs restent la responsabilité de leurs auteurs respectifs.
          </p>
        </section>

        <section>
          <h2 className="t-h2">7. Limitation de responsabilité</h2>
          <ul className="t-body-lg">
            <li>9rawZid9ra est fourni « tel quel », sans garantie de disponibilité permanente.</li>
            <li>Nous ne garantissons pas l'exactitude ou la qualité des documents partagés par les utilisateurs.</li>
            <li>Nous ne sommes pas responsables des dommages résultant de l'utilisation de la plateforme ou des documents téléchargés.</li>
            <li>Nous nous réservons le droit de modifier, suspendre ou arrêter le service à tout moment.</li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2">8. Publicité</h2>
          <p className="t-body-lg">
            La plateforme peut afficher des publicités via Google AdSense pour financer son fonctionnement.
            Ces publicités sont gérées par Google et soumises à leurs propres conditions d'utilisation.
          </p>
        </section>

        <section>
          <h2 className="t-h2">9. Modifications</h2>
          <p className="t-body-lg">
            Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment.
            Les utilisateurs seront informés des modifications importantes.
            L'utilisation continue de la plateforme après modification vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section>
          <h2 className="t-h2">10. Contact</h2>
          <p className="t-body-lg">
            Pour toute question relative à ces conditions, contacte-nous
            à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
