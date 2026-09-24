import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { Card, Input, Select, Button, Banner, Icon } from '../design-system/ui'
import { notify } from '../design-system/toast'

const css = `
  .contact-page { max-width: 960px; margin: 0 auto; padding: var(--space-16) var(--space-6) var(--space-16); }
  .contact-page__intro { margin: var(--space-3) 0 var(--space-10); max-width: 520px; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); align-items: start; }
  .contact-channels { display: flex; flex-direction: column; gap: var(--space-4); }
  .contact-channel { display: flex; gap: var(--space-3); align-items: flex-start; }
  .contact-form { display: flex; flex-direction: column; gap: var(--space-4); }
  @media (max-width: 760px) { .contact-grid { grid-template-columns: 1fr; } }
`

const SUBJECTS = [
  { value: '', label: '— Choisir —' },
  { value: 'ecole', label: 'Ajouter mon école' },
  { value: 'probleme', label: 'Signaler un problème' },
  { value: 'partenariat', label: 'Partenariat' },
  { value: 'autre', label: 'Autre' },
]

export default function Contact() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy]       = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { document.title = 'Contact — 9rawZid9ra' }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !subject || !message.trim()) return
    setBusy(true)
    setError('')
    const subjectLabel = SUBJECTS.find(s => s.value === subject)?.label
    const { error: err } = await supabase
      .from('contact_messages')
      .insert({
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        message: `[${subjectLabel}] ${message.trim()}`.slice(0, 2000),
      })
    setBusy(false)
    if (err) {
      setError("Erreur lors de l'envoi. Réessaie ou contacte-nous par e-mail.")
      return
    }
    notify.success('Message envoyé', 'On te répond sous 48 h.')
    setSent(true)
  }

  return (
    <div>
      <style>{css}</style>
      <Navbar />
      <div className="contact-page">
        <span className="t-eyebrow qz-subtle">Contact</span>
        <h1 className="t-h1">Contacte-nous</h1>
        <p className="t-body-lg qz-muted contact-page__intro">
          Une école manquante, un bug, une idée ? On répond vite.
        </p>

        <div className="contact-grid">
          <div className="contact-channels">
            <Card>
              <div className="contact-channel">
                <div className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="message" /></div>
                <div>
                  <span className="t-eyebrow qz-subtle">E-mail</span>
                  <p className="t-label"><a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a></p>
                  <p className="t-caption qz-subtle">Réponse sous 24-48h</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="contact-channel">
                <div className="qz-icon-tile" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><Icon name="send" /></div>
                <div>
                  <span className="t-eyebrow qz-subtle">WhatsApp</span>
                  <p className="t-label"><a href="https://wa.me/212677246703" target="_blank" rel="noopener noreferrer">+212 677 246 703</a></p>
                  <p className="t-caption qz-subtle">Disponible en journée</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="contact-channel">
                <div className="qz-icon-tile" style={{ background: 'var(--founder-soft)', color: 'var(--founder)' }}><Icon name="heart" /></div>
                <div>
                  <span className="t-eyebrow qz-subtle">PayPal — Soutenir le projet</span>
                  <p className="t-label"><a href="https://paypal.me/saadga2003" target="_blank" rel="noopener noreferrer">paypal.me/saadga2003</a></p>
                  <p className="t-caption qz-subtle">Chaque contribution aide à maintenir la plateforme gratuite</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            {sent ? (
              <Banner tone="success">Message envoyé ! Merci, on te répondra sous 48 h.</Banner>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <span className="t-eyebrow qz-subtle">Envoyer un message</span>
                <Input label="Nom" value={name} onChange={e => setName(e.target.value)} maxLength={100} required />
                <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} required />
                <Select label="Sujet" value={subject} onChange={e => setSubject(e.target.value)} options={SUBJECTS} required />
                <Input label="Message" multiline value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} counter required />
                {error && <p className="t-body-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
                <Button type="submit" variant="primary" loading={busy} disabled={busy || !name.trim() || !email.trim() || !subject || !message.trim()}>Envoyer</Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
