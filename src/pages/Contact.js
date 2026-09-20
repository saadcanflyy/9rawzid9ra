import { useState } from 'react'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --surface:#070C18; --s2:#0C1222;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }

  body { background:var(--bg); color:var(--text); font-family:'Outfit',sans-serif; }
  .contact-page { min-height:100vh; }
  .contact-hero {
    padding: 3.5rem 2rem 2rem;
    text-align: center;
    border-bottom: 1px solid var(--border);
  }
  .contact-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: var(--accent);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .contact-h1 {
    font-size: clamp(1.4rem,4vw,2rem);
    font-weight: 700;
    color: var(--white);
    letter-spacing: -0.5px;
    margin-bottom: 0.5rem;
  }
  .contact-sub {
    font-size: 0.9rem;
    color: var(--text2);
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .contact-body {
    max-width: 800px;
    margin: 0 auto;
    padding: 2.5rem 2rem 4rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
  }
  @media(max-width:700px) {
    .contact-body { grid-template-columns: 1fr; }
  }

  .contact-channels {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .contact-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem;
    transition: border-color 0.15s;
  }
  .contact-card:hover { border-color: var(--borderhi); }
  .contact-card-label {
    font-family: 'DM Mono', monospace;
    font-size: 0.62rem;
    color: var(--text3);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }
  .contact-card-value {
    font-size: 0.92rem;
    color: var(--accent2);
    word-break: break-all;
  }
  .contact-card-value a {
    color: var(--accent2);
    text-decoration: none;
  }
  .contact-card-value a:hover { text-decoration: underline; }
  .contact-card-note {
    font-size: 0.75rem;
    color: var(--text3);
    margin-top: 0.35rem;
  }

  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .contact-form-title {
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: var(--accent);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }
  .contact-input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 10px 14px;
    font-size: 0.88rem;
    color: var(--text);
    font-family: 'Outfit', sans-serif;
    outline: none;
    transition: border-color 0.15s;
  }
  .contact-input:focus { border-color: var(--accent); }
  .contact-input::placeholder { color: var(--text3); }
  .contact-textarea {
    resize: vertical;
    min-height: 120px;
  }
  .contact-submit {
    background: linear-gradient(135deg, var(--accent), #3A6ED4);
    color: #fff;
    border: none;
    border-radius: 9px;
    padding: 11px 24px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    transition: all 0.15s;
    align-self: flex-start;
  }
  .contact-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(79,142,247,0.35); }
  .contact-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .contact-ok {
    font-family: 'DM Mono', monospace;
    font-size: 0.82rem;
    color: var(--teal2);
    background: rgba(79,142,247,0.06);
    border: 1px solid rgba(79,142,247,0.15);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .contact-err {
    font-size: 0.82rem;
    color: #F87171;
  }
`

export default function Contact() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy]       = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase
      .from('contact_messages')
      .insert({
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        message: message.trim().slice(0, 2000),
      })
    setBusy(false)
    if (err) {
      setError('Erreur lors de l\'envoi. Réessaie ou contacte-nous par e-mail.')
      return
    }
    setSent(true)
  }

  return (
    <div className="contact-page">
      <style>{css}</style>
      <Navbar />
      <div className="contact-hero">
        <div className="contact-eyebrow">// contact</div>
        <h1 className="contact-h1">Nous contacter</h1>
        <p className="contact-sub">
          Une question, une suggestion ou un problème ? On est là pour t'aider.
        </p>
      </div>
      <div className="contact-body">
        <div className="contact-channels">
          <div className="contact-card">
            <div className="contact-card-label">E-mail</div>
            <div className="contact-card-value">
              <a href="mailto:saadga2003@gmail.com">saadga2003@gmail.com</a>
            </div>
            <div className="contact-card-note">Réponse sous 24-48h</div>
          </div>
          <div className="contact-card">
            <div className="contact-card-label">WhatsApp</div>
            <div className="contact-card-value">
              <a href="https://wa.me/212677246703" target="_blank" rel="noopener noreferrer">
                +212 677 246 703
              </a>
            </div>
            <div className="contact-card-note">Disponible en journée</div>
          </div>
          <div className="contact-card">
            <div className="contact-card-label">PayPal — Soutenir le projet</div>
            <div className="contact-card-value">
              <a href="https://paypal.me/saadga2003" target="_blank" rel="noopener noreferrer">
                paypal.me/saadga2003
              </a>
            </div>
            <div className="contact-card-note">Chaque contribution aide à maintenir la plateforme gratuite</div>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-title">// envoyer un message</div>
          {sent ? (
            <div className="contact-ok">
              ✓ Message envoyé ! Merci, on te répondra rapidement.
            </div>
          ) : (
            <>
              <input
                className="contact-input"
                placeholder="Ton nom"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                required
              />
              <input
                className="contact-input"
                type="email"
                placeholder="Ton e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                maxLength={200}
                required
              />
              <textarea
                className="contact-input contact-textarea"
                placeholder="Ton message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                required
              />
              {error && <div className="contact-err">{error}</div>}
              <button
                className="contact-submit"
                type="submit"
                disabled={busy || !name.trim() || !email.trim() || !message.trim()}
              >
                {busy ? 'Envoi...' : 'Envoyer'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
