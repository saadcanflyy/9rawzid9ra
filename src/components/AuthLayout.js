import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { Wordmark, Card, StatStrip, Icon } from '../design-system/ui'

const css = `
  .auth-layout { min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; gap: var(--space-12); padding: var(--space-12) var(--space-6) var(--space-8); }
  @media (max-width: 768px) { .auth-layout { padding: var(--space-8) var(--space-4); } }
  .auth-layout__col { width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: var(--space-6); }
  .auth-layout__card { width: 100%; }
  .auth-layout__card .qz-card { padding: var(--space-8); }
  @media (max-width: 640px) { .auth-layout__card .qz-card { padding: var(--space-6); } }
  .auth-layout__footer { text-align: center; }
  .auth-layout__side { display: none; }
  @media (min-width: 1024px) { .auth-layout__side { display: block; width: 300px; margin-top: 56px; } }
  .auth-layout__benefits { list-style: none; margin: 0 0 var(--space-4); padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
  .auth-layout__benefits li { display: flex; align-items: flex-start; gap: var(--space-2); }
  .auth-layout__benefits svg { color: var(--success); flex-shrink: 0; margin-top: 2px; }
`

export default function AuthLayout({ children, footer }) {
  const [docCount, setDocCount] = useState(null)
  const [uniCount, setUniCount] = useState(null)

  useEffect(() => {
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_verified', true).then(({ count }) => setDocCount(count || 0))
    supabase.from('universities').select('*', { count: 'exact', head: true }).then(({ count }) => setUniCount(count || 0))
  }, [])

  return (
    <div className="auth-layout">
      <style>{css}</style>
      <div className="auth-layout__col">
        <Wordmark size="lg" linkAs={Link} href="/" />
        <div className="auth-layout__card"><Card>{children}</Card></div>
        {footer && <div className="auth-layout__footer">{footer}</div>}
      </div>
      <div className="auth-layout__side">
        <Card>
          <ul className="auth-layout__benefits">
            <li><Icon name="check" /><span className="t-body-sm qz-muted">Examens et corrigés de ta filière</span></li>
            <li><Icon name="check" /><span className="t-body-sm qz-muted">{uniCount != null ? `${uniCount} établissements` : 'Plusieurs établissements'}</span></li>
            <li><Icon name="check" /><span className="t-body-sm qz-muted">Gratuit pour toujours</span></li>
          </ul>
          <StatStrip items={[
            { value: docCount != null ? docCount : '—', label: 'Documents' },
            { value: uniCount != null ? uniCount : '—', label: 'Établissements' },
          ]} />
        </Card>
      </div>
    </div>
  )
}
