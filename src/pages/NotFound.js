import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Button } from '../design-system/ui'

export default function NotFound() {
  useEffect(() => { document.title = 'Page introuvable — 9rawZid9ra' }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
      <EmptyState icon="alert" title="Page introuvable">
        <span className="t-eyebrow qz-subtle">404</span>
        <p className="t-body qz-muted">Le lien est peut-être cassé ou le module a été déplacé.</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
          <Button variant="primary" as={Link} to="/">Retour à l'accueil</Button>
          <Button variant="secondary" as={Link} to="/browse">Explorer</Button>
        </div>
      </EmptyState>
    </div>
  )
}
