import { Component } from 'react'

// Without this, any render-time exception unmounts the whole SPA and leaves a
// blank white page — which is exactly what the `RANKS is not defined` bug would
// have done to every uploader. Reports to Sentry when a DSN is configured.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info)
    if (window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: { componentStack: info?.componentStack } })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="qz-error-boundary">
        <div className="qz-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <h1 className="t-h2">Une erreur s'est produite</h1>
          <p className="t-body qz-muted" style={{ margin: 'var(--space-3) 0 var(--space-5)' }}>
            Quelque chose s'est mal passé de notre côté. Recharge la page — si ça continue, écris-nous.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="qz-btn qz-btn--primary" onClick={() => window.location.reload()}>
              Recharger la page
            </button>
            <a className="qz-btn qz-btn--secondary" href="/">Retour à l'accueil</a>
          </div>
        </div>
      </div>
    )
  }
}
