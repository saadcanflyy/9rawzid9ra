import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222;
    --border:#1C2A45;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal2:#5EEAD4;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  body { background:var(--bg); color:var(--text); font-family:'Outfit',sans-serif; }
  .legal-page { min-height:100vh; }
  .legal-hero {
    padding: 3.5rem 2rem 2rem;
    text-align: center;
    border-bottom: 1px solid var(--border);
  }
  .legal-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: var(--accent);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .legal-h1 {
    font-size: clamp(1.4rem,4vw,2rem);
    font-weight: 700;
    color: var(--white);
    letter-spacing: -0.5px;
    margin-bottom: 0.5rem;
  }
  .legal-updated {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    color: var(--text3);
  }
  .legal-body {
    max-width: 720px;
    margin: 0 auto;
    padding: 2.5rem 2rem 4rem;
  }
  .legal-body h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--white);
    margin: 2rem 0 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(28,42,69,0.4);
  }
  .legal-body h2:first-child { border-top: none; margin-top: 0; padding-top: 0; }
  .legal-body p {
    font-size: 0.88rem;
    color: var(--text2);
    line-height: 1.7;
    margin-bottom: 0.75rem;
  }
  .legal-body ul {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
  }
  .legal-body li {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.7;
    padding-left: 1.2rem;
    position: relative;
  }
  .legal-body li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--text3);
  }
  .legal-body a {
    color: var(--accent2);
    text-decoration: none;
  }
  .legal-body a:hover { text-decoration: underline; }
  .legal-body strong { color: var(--text); font-weight: 600; }
`

export default function Terms() {
  return (
    <div className="legal-page">
      <style>{css}</style>
      <Navbar />
      <div className="legal-hero">
        <div className="legal-eyebrow">// conditions</div>
        <h1 className="legal-h1">Conditions d'Utilisation</h1>
        <div className="legal-updated">Dernière mise à jour : 18 juin 2026</div>
      </div>
      <div className="legal-body">
        <h2>1. Objet de la plateforme</h2>
        <p>
          9rawZid9ra est une plateforme gratuite permettant aux étudiants marocains de partager
          et télécharger des ressources pédagogiques : examens, contrôles continus, travaux dirigés,
          travaux pratiques, cours et corrigés.
        </p>
        <p>
          En utilisant la plateforme, vous acceptez les présentes conditions d'utilisation dans leur intégralité.
        </p>

        <h2>2. Inscription et compte</h2>
        <ul>
          <li>L'inscription est gratuite et ouverte à toute personne disposant d'une adresse e-mail valide.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants de connexion.</li>
          <li>Les informations fournies lors de l'inscription doivent être exactes et à jour.</li>
          <li>Un seul compte par personne est autorisé.</li>
        </ul>

        <h2>3. Contenu et responsabilité des utilisateurs</h2>
        <p>En uploadant du contenu sur 9rawZid9ra, vous vous engagez à :</p>
        <ul>
          <li>Ne pas publier de contenu protégé par des droits d'auteur sans autorisation (livres complets, manuels commerciaux, etc.).</li>
          <li>Ne pas publier de contenu inapproprié, offensant, discriminatoire ou illégal.</li>
          <li>Fournir des informations exactes sur les documents (module, semestre, type de document).</li>
          <li>Ne pas utiliser la plateforme à des fins de spam, de publicité ou de harcèlement.</li>
        </ul>
        <p>
          Les documents partagés (examens, TD, TP, cours) sont considérés comme des ressources
          pédagogiques à vocation éducative. L'utilisateur reste responsable du contenu qu'il publie.
        </p>

        <h2>4. Modération</h2>
        <p>
          La modération sur 9rawZid9ra est <strong>réactive</strong> : les documents et messages
          sont examinés suite à des signalements des utilisateurs ou lors de contrôles réguliers
          par l'équipe d'administration.
        </p>
        <ul>
          <li>Tout contenu signalé est examiné par un administrateur ou modérateur.</li>
          <li>Les contenus enfreignant les règles sont supprimés sans préavis.</li>
          <li>Les décisions de modération sont prises de bonne foi et dans l'intérêt de la communauté.</li>
        </ul>

        <h2>5. Suspension et résiliation de compte</h2>
        <p>9rawZid9ra se réserve le droit de suspendre ou supprimer un compte en cas de :</p>
        <ul>
          <li>Violation répétée des conditions d'utilisation.</li>
          <li>Publication de contenu inapproprié ou illégal.</li>
          <li>Comportement abusif envers d'autres utilisateurs.</li>
          <li>Utilisation de la plateforme à des fins malveillantes (spam, phishing, etc.).</li>
        </ul>
        <p>
          La suspension peut être temporaire ou permanente selon la gravité de l'infraction.
          L'utilisateur sera informé par e-mail de la raison et de la durée de la suspension.
        </p>

        <h2>6. Propriété intellectuelle</h2>
        <p>
          Le code source, le design, le nom et le logo de 9rawZid9ra sont la propriété de leurs créateurs.
          Les documents partagés par les utilisateurs restent la responsabilité de leurs auteurs respectifs.
        </p>

        <h2>7. Limitation de responsabilité</h2>
        <ul>
          <li>9rawZid9ra est fourni « tel quel », sans garantie de disponibilité permanente.</li>
          <li>Nous ne garantissons pas l'exactitude ou la qualité des documents partagés par les utilisateurs.</li>
          <li>Nous ne sommes pas responsables des dommages résultant de l'utilisation de la plateforme
            ou des documents téléchargés.</li>
          <li>Nous nous réservons le droit de modifier, suspendre ou arrêter le service à tout moment.</li>
        </ul>

        <h2>8. Publicité</h2>
        <p>
          La plateforme peut afficher des publicités via Google AdSense pour financer son fonctionnement.
          Ces publicités sont gérées par Google et soumises à leurs propres conditions d'utilisation.
        </p>

        <h2>9. Modifications</h2>
        <p>
          Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment.
          Les utilisateurs seront informés des modifications importantes.
          L'utilisation continue de la plateforme après modification vaut acceptation des nouvelles conditions.
        </p>

        <h2>10. Contact</h2>
        <p>
          Pour toute question relative à ces conditions, contactez-nous
          à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>.
        </p>
      </div>
    </div>
  )
}
