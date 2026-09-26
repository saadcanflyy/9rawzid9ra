import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const captchaEnabled = () => Boolean(SITE_KEY)

let scriptPromise = null
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = SCRIPT_SRC
      el.async = true
      el.defer = true
      el.onload = resolve
      el.onerror = () => { scriptPromise = null; reject(new Error('turnstile_load_failed')) }
      document.head.appendChild(el)
    })
  }
  return scriptPromise
}

/**
 * Cloudflare Turnstile. Renders nothing at all until REACT_APP_TURNSTILE_SITE_KEY
 * is set, so sign-up and login keep working exactly as before while the key is
 * still missing — important, because Supabase's own bot protection must only be
 * switched on once this is live in production.
 *
 * onToken(token | null) fires on solve, expiry and error.
 * Pass a ref to reset the widget after a failed submit (tokens are single-use).
 */
export default function Turnstile({ onToken, widgetRef }) {
  const holder = useRef(null)
  const idRef = useRef(null)
  const cbRef = useRef(onToken)
  cbRef.current = onToken

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    loadTurnstile()
      .then(() => {
        if (cancelled || !holder.current || idRef.current !== null) return
        idRef.current = window.turnstile.render(holder.current, {
          sitekey: SITE_KEY,
          language: 'fr',
          callback: (token) => cbRef.current?.(token),
          'expired-callback': () => cbRef.current?.(null),
          'error-callback': () => cbRef.current?.(null),
        })
        if (widgetRef) {
          widgetRef.current = {
            reset: () => { try { window.turnstile.reset(idRef.current) } catch {} },
          }
        }
      })
      .catch(() => cbRef.current?.(null))

    return () => {
      cancelled = true
      if (idRef.current !== null) {
        try { window.turnstile.remove(idRef.current) } catch {}
        idRef.current = null
      }
    }
  }, [widgetRef])

  if (!SITE_KEY) return null
  return <div ref={holder} style={{ marginBottom: 'var(--space-3)' }} />
}

export const CAPTCHA_ERROR = 'Vérification anti-robot échouée. Recharge la page et réessaie.'
