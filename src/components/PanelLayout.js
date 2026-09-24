import { Link, useNavigate } from 'react-router-dom'
import { Wordmark, Badge, Icon, Tabs, EmptyState, Button } from '../design-system/ui'

export default function PanelLayout({ role, tabs, activeTab, onTabChange, userName, title, subtitle, actions, denied, children }) {
  const navigate = useNavigate()

  if (denied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <EmptyState icon="alert" title="Accès réservé">
          <span className="t-eyebrow qz-subtle">403</span>
          <Button variant="primary" onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </EmptyState>
      </div>
    )
  }

  const roleLabel = role === 'admin' ? 'Admin' : 'Modérateur'
  const roleTone = role === 'admin' ? 'brand' : 'accent'

  return (
    <div className="qz-panel">
      <aside className="qz-panel__rail">
        <div className="qz-panel__rail-head">
          <Wordmark linkAs={Link} href="/" />
          <Badge tone={roleTone}>{roleLabel}</Badge>
        </div>
        <nav className="qz-panel__nav" aria-label="Navigation du panneau">
          {tabs.map(t => (
            <button
              key={t.id} type="button" className="qz-panel__item"
              aria-current={activeTab === t.id ? 'page' : undefined}
              onClick={() => onTabChange(t.id)}
            >
              <Icon name={t.icon} />
              <span className="qz-panel__item-label">{t.label}</span>
              {t.count > 0 && <Badge tone="danger">{t.count}</Badge>}
            </button>
          ))}
        </nav>
        <div className="qz-panel__rail-foot">
          {userName && <div className="qz-panel__user">{userName}</div>}
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Retour au site</Button>
        </div>
      </aside>

      <div className="qz-panel__topbar">
        <div className="qz-panel__topbar-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Wordmark linkAs={Link} href="/" />
            <Badge tone={roleTone}>{roleLabel}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Retour au site</Button>
        </div>
        <Tabs label="Navigation du panneau" items={tabs} value={activeTab} onChange={onTabChange} />
      </div>

      <main className="qz-panel__main">
        <div className="qz-panel__container">
          {(title || actions) && (
            <div className="qz-panel__header">
              <div>
                {title && <h1 className="t-h1">{title}</h1>}
                {subtitle && <p className="t-body qz-muted" style={{ marginTop: 4 }}>{subtitle}</p>}
              </div>
              {actions && <div className="qz-panel__header-actions">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
