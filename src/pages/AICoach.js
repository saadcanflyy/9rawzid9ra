import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { Paywall, Badge, Accordion } from '../design-system/ui'

const css = `
  .ac-layout { max-width: 480px; margin: 0 auto; padding: var(--space-16) var(--space-6) var(--space-16); }
  .ac-faq { margin-top: var(--space-12); }
  .ac-faq__list { margin-top: var(--space-4); }
`

const FAQS = [
  { q: "C'est quoi exactement ?", a: 'Un coach IA entraîné sur les annales de ta filière : il explique les examens pas à pas, génère des quiz à partir de tes cours et te propose un plan de révision avant les partiels.' },
  { q: 'Comment je paie ?', a: "Pour l'instant, l'activation se fait manuellement — inscris-toi sur la liste d'attente et on te contacte au lancement pour la mise en place du paiement." },
  { q: 'Le coach IA sera-t-il gratuit ?', a: 'La plateforme reste gratuite pour toujours. Le coach IA est un supplément : une version avec publicités sera disponible en plus de la formule à 39 MAD / mois.' },
]

export default function AICoach() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { document.title = 'AI Coach — 9rawZid9ra' }, [])

  const handleNotify = async () => {
    if (!user) return
    setBusy(true)
    await supabase.from('user_profiles')
      .update({ wants_ai_notification: true })
      .eq('id', user.id)
    setBusy(false)
    setDone(true)
  }

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="ai" />

      <div className="ac-layout">
        <Paywall
          title="AI Coach"
          price="39"
          features={[
            'Explications pas à pas des examens',
            'Quiz générés à partir de tes cours',
            'Plan de révision avant les exams',
            'Réponses en français et en darija',
          ]}
          cta={user ? 'Me prévenir au lancement' : 'Crée un compte pour être prévenu'}
          ctaAs={user ? undefined : Link}
          ctaHref={user ? undefined : '/register'}
          ctaLoading={busy}
          onCtaClick={user ? handleNotify : undefined}
          note="Une version gratuite avec publicités sera aussi disponible."
          footer={done ? (
            <div style={{ textAlign: 'center' }}>
              <Badge tone="success" icon="check">Tu es sur la liste</Badge>
              <p className="t-body-sm qz-muted" style={{ marginTop: 8 }}>On t'envoie un email au lancement.</p>
            </div>
          ) : undefined}
        >
          Ton coach de révision, entraîné sur les annales de ta filière.
        </Paywall>

        <div className="ac-faq">
          <span className="t-eyebrow qz-subtle">FAQ</span>
          <h2 className="t-h2">Questions fréquentes</h2>
          <div className="ac-faq__list">
            <Accordion items={FAQS} idPrefix="ac-faq" />
          </div>
        </div>
      </div>
    </div>
  )
}
