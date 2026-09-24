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

export default function PrivacyPolicy() {
  useEffect(() => { document.title = 'Politique de confidentialité — 9rawZid9ra' }, [])

  return (
    <div>
      <style>{css}</style>
      <Navbar />
      <div className="static-page">
        <span className="t-eyebrow qz-subtle">Confidentialité</span>
        <h1 className="t-h1">Politique de confidentialité</h1>
        <p className="t-caption qz-subtle static-page__updated">Dernière mise à jour : 18 juin 2026</p>

        <section>
          <h2 className="t-h2">1. Données collectées</h2>
          <p className="t-body-lg">Lorsque tu utilises 9rawZid9ra, nous collectons les informations suivantes :</p>
          <ul className="t-body-lg">
            <li><strong>Informations de compte :</strong> adresse e-mail, nom/prénom, université et filière.</li>
            <li><strong>Contenu uploadé :</strong> documents (examens, cours, TD, TP) que tu partages sur la plateforme.</li>
            <li><strong>Données d'utilisation :</strong> pages visitées, modules consultés, interactions avec la plateforme.</li>
            <li><strong>Données techniques :</strong> adresse IP, type de navigateur, système d'exploitation.</li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2">2. Utilisation des données</h2>
          <p className="t-body-lg">Tes données sont utilisées exclusivement pour :</p>
          <ul className="t-body-lg">
            <li>Le fonctionnement de la plateforme (authentification, gestion de compte, affichage de contenu).</li>
            <li>L'amélioration de l'expérience utilisateur et des fonctionnalités.</li>
            <li>La modération du contenu et la sécurité de la plateforme.</li>
            <li>L'envoi d'e-mails transactionnels (vérification de compte, notifications).</li>
          </ul>
          <p className="t-body-lg"><strong>Nous ne vendons jamais tes données personnelles à des tiers.</strong></p>
        </section>

        <section>
          <h2 className="t-h2">3. Cookies et technologies tierces</h2>
          <p className="t-body-lg">9rawZid9ra utilise les technologies suivantes :</p>
          <ul className="t-body-lg">
            <li><strong>Supabase :</strong> pour l'authentification et le stockage des données.</li>
            <li><strong>Google AdSense :</strong> pour l'affichage de publicités. Google utilise des cookies pour diffuser des annonces
              pertinentes. Tu peux gérer tes préférences publicitaires
              sur <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.</li>
            <li><strong>Google Search Console :</strong> pour le suivi de l'indexation et des performances de recherche.</li>
          </ul>
        </section>

        <section>
          <h2 className="t-h2">4. Partage des données</h2>
          <p className="t-body-lg">
            Tes données ne sont partagées qu'avec les services techniques nécessaires au fonctionnement de la plateforme
            (Supabase, Google). Aucune donnée n'est vendue ou transmise à des fins commerciales à des tiers.
          </p>
          <p className="t-body-lg">
            Les documents que tu uploades sont publiquement accessibles aux autres utilisateurs de la plateforme
            — c'est le principe même du partage de ressources.
          </p>
        </section>

        <section>
          <h2 className="t-h2">5. Conservation des données</h2>
          <p className="t-body-lg">
            Tes données sont conservées tant que ton compte est actif.
            Les documents uploadés restent disponibles même après la suppression de ton compte,
            sauf demande explicite de retrait.
          </p>
        </section>

        <section>
          <h2 className="t-h2">6. Tes droits</h2>
          <p className="t-body-lg">Conformément à la législation marocaine (loi 09-08), tu disposes des droits suivants :</p>
          <ul className="t-body-lg">
            <li><strong>Accès :</strong> demander une copie de tes données personnelles.</li>
            <li><strong>Rectification :</strong> corriger des informations inexactes.</li>
            <li><strong>Suppression :</strong> demander la suppression de ton compte et de tes données.</li>
            <li><strong>Opposition :</strong> t'opposer à l'utilisation de tes données à des fins spécifiques.</li>
          </ul>
          <p className="t-body-lg">
            Pour exercer tes droits, contacte-nous par e-mail
            à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="t-h2">7. Sécurité</h2>
          <p className="t-body-lg">
            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger tes données :
            chiffrement des mots de passe, connexions sécurisées (HTTPS), politiques de sécurité au niveau de la base de données (RLS).
          </p>
        </section>

        <section>
          <h2 className="t-h2">8. Contact</h2>
          <p className="t-body-lg">
            Pour toute question relative à cette politique de confidentialité, tu peux nous
            contacter à <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
