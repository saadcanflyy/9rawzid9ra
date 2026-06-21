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

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <style>{css}</style>
      <Navbar />
      <div className="legal-hero">
        <div className="legal-eyebrow">// confidentialité</div>
        <h1 className="legal-h1">Politique de Confidentialité</h1>
        <div className="legal-updated">Dernière mise à jour : 18 juin 2026</div>
      </div>
      <div className="legal-body">
        <h2>1. Données collectées</h2>
        <p>
          Lorsque vous utilisez 9rawZid9ra, nous collectons les informations suivantes :
        </p>
        <ul>
          <li><strong>Informations de compte :</strong> adresse e-mail, nom/prénom, université et filière.</li>
          <li><strong>Contenu uploadé :</strong> documents (examens, cours, TD, TP) que vous partagez sur la plateforme.</li>
          <li><strong>Données d'utilisation :</strong> pages visitées, modules consultés, interactions avec la plateforme.</li>
          <li><strong>Données techniques :</strong> adresse IP, type de navigateur, système d'exploitation.</li>
        </ul>

        <h2>2. Utilisation des données</h2>
        <p>Vos données sont utilisées exclusivement pour :</p>
        <ul>
          <li>Le fonctionnement de la plateforme (authentification, gestion de compte, affichage de contenu).</li>
          <li>L'amélioration de l'expérience utilisateur et des fonctionnalités.</li>
          <li>La modération du contenu et la sécurité de la plateforme.</li>
          <li>L'envoi d'e-mails transactionnels (vérification de compte, notifications).</li>
        </ul>
        <p>
          <strong>Nous ne vendons jamais vos données personnelles à des tiers.</strong>
        </p>

        <h2>3. Cookies et technologies tierces</h2>
        <p>9rawZid9ra utilise les technologies suivantes :</p>
        <ul>
          <li><strong>Supabase :</strong> pour l'authentification et le stockage des données.</li>
          <li><strong>Google AdSense :</strong> pour l'affichage de publicités. Google utilise des cookies pour diffuser des annonces
            pertinentes. Vous pouvez gérer vos préférences publicitaires
            sur <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.</li>
          <li><strong>Google Search Console :</strong> pour le suivi de l'indexation et des performances de recherche.</li>
        </ul>

        <h2>4. Partage des données</h2>
        <p>
          Vos données ne sont partagées qu'avec les services techniques nécessaires au fonctionnement de la plateforme
          (Supabase, Google). Aucune donnée n'est vendue ou transmise à des fins commerciales à des tiers.
        </p>
        <p>
          Les documents que vous uploadez sont publiquement accessibles aux autres utilisateurs de la plateforme
          — c'est le principe même du partage de ressources.
        </p>

        <h2>5. Conservation des données</h2>
        <p>
          Vos données sont conservées tant que votre compte est actif.
          Les documents uploadés restent disponibles même après la suppression de votre compte,
          sauf demande explicite de retrait.
        </p>

        <h2>6. Vos droits</h2>
        <p>Conformément à la législation marocaine (loi 09-08), vous disposez des droits suivants :</p>
        <ul>
          <li><strong>Accès :</strong> demander une copie de vos données personnelles.</li>
          <li><strong>Rectification :</strong> corriger des informations inexactes.</li>
          <li><strong>Suppression :</strong> demander la suppression de votre compte et de vos données.</li>
          <li><strong>Opposition :</strong> vous opposer à l'utilisation de vos données à des fins spécifiques.</li>
        </ul>
        <p>
          Pour exercer vos droits, contactez-nous par e-mail
          à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>.
        </p>

        <h2>7. Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
          chiffrement des mots de passe, connexions sécurisées (HTTPS), politiques de sécurité au niveau de la base de données (RLS).
        </p>

        <h2>8. Contact</h2>
        <p>
          Pour toute question relative à cette politique de confidentialité, vous pouvez nous
          contacter à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>.
        </p>
      </div>
    </div>
  )
}
