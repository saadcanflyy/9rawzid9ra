import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Avatar, Badge, Card, StatStrip, Chip, Skeleton, EmptyState, Button, DocType, QualityBadge, Select } from '../design-system/ui'
import { notify } from '../design-system/toast'
import { displayStatus, qualityLevel } from '../lib/quality'
import { DOC_TYPE_LABELS } from '../lib/searchParser'
import { trapFocus, focusFirst } from '../design-system/focusTrap'

const EXAM_STYLE_LABELS = {
  close_to_td: 'Proche des TD',
  close_to_course: 'Proche du cours',
  problem_solving: 'Résolution de problèmes',
  theory: 'Théorique',
  mixed: 'Mixte',
}

const css = `
  .pp-layout { max-width: 900px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-12); }
  .pp-header { display: flex; align-items: flex-start; gap: var(--space-5); flex-wrap: wrap; }
  .pp-header__badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .pp-section { margin-top: var(--space-8); }
  .pp-modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-4); margin-top: var(--space-4); }
  .pp-module-card { display: flex; flex-direction: column; gap: 4px; }
  .pp-history-row { display: flex; gap: var(--space-4); padding: var(--space-3) 0; border-top: 1px solid var(--border); }
  .pp-history-row:first-child { border-top: 0; }
  .pp-history-year { width: 90px; flex-shrink: 0; font: 600 14px/1.4 var(--font-mono); color: var(--text-subtle); }
  .pp-exam-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .pp-exam-bar-label { width: 180px; flex-shrink: 0; font-size: 13px; color: var(--text-muted); }
  .pp-exam-bar-track { flex: 1; height: 8px; background: var(--surface-2); border-radius: var(--radius-full); overflow: hidden; }
  .pp-exam-bar-fill { height: 100%; background: var(--brand); }
  .pp-type-filters { display: flex; gap: 8px; flex-wrap: wrap; margin: var(--space-4) 0; }
  .pp-feedback-field { margin-top: var(--space-4); }
`

function ProfessorFeedbackModal({ modules, onClose, onSubmit }) {
  const modalRef = useRef(null)
  const [moduleId, setModuleId] = useState('')
  const [examStyle, setExamStyle] = useState(null)
  const [materialsHelp, setMaterialsHelp] = useState(null)
  const [difficulty, setDifficulty] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const untrap = modalRef.current ? trapFocus(modalRef.current) : null
    const t = setTimeout(() => { if (modalRef.current) focusFirst(modalRef.current, modalRef.current) }, 0)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); if (untrap) untrap() }
  }, [onClose])

  const submit = async () => {
    setBusy(true)
    await onSubmit({ moduleId: moduleId ? parseInt(moduleId, 10) : null, examStyle, materialsHelp, difficulty })
    setBusy(false)
  }

  return (
    <div className="qz-scrim" onClick={onClose}>
      <div className="qz-modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pp-feedback-t" onClick={e => e.stopPropagation()}>
        <h2 className="qz-modal__title" id="pp-feedback-t">Donner mon avis</h2>
        <div className="qz-modal__body" style={{ color: 'var(--text)' }}>
          {modules?.length > 0 && (
            <Select label="Module (optionnel)" value={moduleId} onChange={e => setModuleId(e.target.value)}
              options={[{ value: '', label: '—' }, ...modules.map(m => ({ value: m.id, label: m.name }))]} />
          )}
          <div className="pp-feedback-field">
            <span className="t-label">Style d'examen</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {Object.entries(EXAM_STYLE_LABELS).map(([key, label]) => (
                <Chip key={key} selected={examStyle === key} onClick={() => setExamStyle(key)}>{label}</Chip>
              ))}
            </div>
          </div>
          <div className="pp-feedback-field">
            <span className="t-label">Les documents d'ici t'ont aidé ?</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Chip selected={materialsHelp === true} onClick={() => setMaterialsHelp(true)}>Oui</Chip>
              <Chip selected={materialsHelp === false} onClick={() => setMaterialsHelp(false)}>Non</Chip>
            </div>
          </div>
          <div className="pp-feedback-field">
            <span className="t-label">Difficulté ressentie</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Chip key={n} selected={difficulty === n} onClick={() => setDifficulty(n)}>{n}</Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="qz-modal__actions">
          <button type="button" className="qz-btn qz-btn--secondary" onClick={onClose}>Annuler</button>
          <button type="button" className="qz-btn qz-btn--primary" disabled={busy} onClick={submit}>Envoyer</button>
        </div>
      </div>
    </div>
  )
}

export default function ProfessorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [prof, setProf] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [docFilter, setDocFilter] = useState('all')
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase.rpc('get_professor', { p_id: parseInt(id, 10) }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) { setNotFound(true); setLoading(false); return }
      if (data.redirected_from) { navigate(`/professeur/${data.id}`, { replace: true }); return }
      setProf(data)
      document.title = `${data.display_name} — examens et documents | 9rawZid9ra`
      setLoading(false)
    })
    return () => { active = false }
  }, [id, navigate])

  const submitFeedback = async (payload) => {
    const { error } = await supabase.from('professor_feedback').upsert({
      professor_id: prof.id, user_id: user.id, module_id: payload.moduleId,
      exam_style: payload.examStyle, materials_help: payload.materialsHelp, difficulty: payload.difficulty,
    }, { onConflict: 'professor_id,user_id,module_id' })
    if (error) { notify.error(error.message); return }
    notify.success('Merci pour ton avis !')
    setShowFeedback(false)
  }

  if (loading) {
    return (
      <div>
        <style>{css}</style>
        <Navbar />
        <div className="pp-layout">
          <Skeleton height={120} />
          <div style={{ marginTop: 'var(--space-6)' }}><Skeleton height={240} /></div>
        </div>
      </div>
    )
  }

  if (notFound || !prof) {
    return (
      <div>
        <style>{css}</style>
        <Navbar />
        <div className="pp-layout"><EmptyState icon="user" title="Professeur introuvable" /></div>
      </div>
    )
  }

  const docTypes = [...new Set(prof.documents.map(d => d.doc_type))]
  const filteredDocs = docFilter === 'all' ? prof.documents : prof.documents.filter(d => d.doc_type === docFilter)
  const examTotal = prof.feedback.exam_style ? Object.values(prof.feedback.exam_style).reduce((a, b) => a + b, 0) : 0

  return (
    <div>
      <style>{css}</style>
      <Navbar />

      <div className="pp-layout">
        <div className="pp-header">
          <Avatar name={prof.display_name.replace(/^Pr\.\s*/, '')} size="xl" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="pp-header__badges">
              <h1 className="t-h1" style={{ marginRight: 4 }}>{prof.display_name}</h1>
              {prof.status === 'verified'
                ? <Badge tone="success" icon="check">Profil vérifié</Badge>
                : <Badge tone="neutral">Profil en attente de vérification</Badge>}
            </div>
            {(prof.university || prof.faculty) && (
              <p className="t-body qz-muted">Enseigne à {[prof.university?.name, prof.faculty?.name].filter(Boolean).join(' · ')}</p>
            )}
            {prof.aliases?.length > 1 && (
              <p className="t-caption qz-subtle" style={{ marginTop: 4 }}>
                Aussi écrit : {prof.aliases.filter(a => a !== prof.display_name).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <StatStrip items={[
            { value: prof.documents.length, label: 'Documents' },
            { value: prof.modules.length, label: 'Modules' },
            { value: prof.teaching_history.length, label: 'Années' },
          ]} />
        </div>

        {prof.modules.length > 0 && (
          <div className="pp-section">
            <h2 className="t-h2">Modules</h2>
            <div className="pp-modules-grid">
              {prof.modules.map(m => {
                const years = (m.years || []).slice().sort()
                return (
                  <Card key={m.id} href={`/module/${m.slug || m.id}`} linkAs={Link} className="pp-module-card">
                    <span className="t-eyebrow qz-subtle">S{m.semester}</span>
                    <h3 className="t-h3" style={{ margin: 0 }}>{m.name}</h3>
                    <p className="t-body-sm qz-muted" style={{ margin: 0 }}>{m.filiere}</p>
                    <div className="qz-meta">
                      <span>{m.documents} document{m.documents > 1 ? 's' : ''}</span>
                      {years.length > 0 && <span>{years[0]}{years.length > 1 ? ` → ${years[years.length - 1]}` : ''}</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {prof.teaching_history.length > 0 && (
          <div className="pp-section">
            <h2 className="t-h2">Historique</h2>
            <p className="t-caption qz-subtle">D'après les documents partagés sur 9rawZid9ra</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              {prof.teaching_history.map(h => (
                <div key={h.academic_year} className="pp-history-row">
                  <span className="pp-history-year">{h.academic_year}</span>
                  <span className="t-body-sm">{h.modules.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {prof.documents.length > 0 && (
          <div className="pp-section">
            <h2 className="t-h2">Documents</h2>
            {docTypes.length > 1 && (
              <div className="pp-type-filters">
                <Chip selected={docFilter === 'all'} onClick={() => setDocFilter('all')}>Tous</Chip>
                {docTypes.map(t => <Chip key={t} selected={docFilter === t} onClick={() => setDocFilter(t)}>{DOC_TYPE_LABELS[t] || t}</Chip>)}
              </div>
            )}
            <div className="qz-list">
              {filteredDocs.map(doc => {
                const s = displayStatus(doc)
                const level = qualityLevel(doc)
                return (
                  <Link key={doc.id} to={`/module/${doc.module_slug || doc.module_id}`} className="qz-row">
                    <DocType type={doc.doc_type} size="lg" />
                    <div className="qz-row__main">
                      <p className="qz-row__title">{doc.title}</p>
                      <div className="qz-meta">
                        {doc.academic_year && <span>{doc.academic_year}</span>}
                        <span>{doc.module_name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {s && <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge>}
                      {level && <QualityBadge score={doc.quality_score ?? 0} label={level.label} tone={level.tone} />}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="pp-section">
          <h2 className="t-h2">Avis des étudiants</h2>
          {prof.feedback.hidden ? (
            <p className="t-body-sm qz-muted" style={{ marginTop: 8 }}>Pas encore assez d'avis (minimum 3) pour les afficher.</p>
          ) : (
            <Card style={{ marginTop: 'var(--space-3)' }}>
              {examTotal > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <span className="t-eyebrow qz-subtle">Style d'examen</span>
                  <div style={{ marginTop: 8 }}>
                    {Object.entries(EXAM_STYLE_LABELS).map(([key, label]) => {
                      const n = prof.feedback.exam_style[key] || 0
                      if (n === 0) return null
                      const pct = Math.round((n / examTotal) * 100)
                      return (
                        <div key={key} className="pp-exam-bar-row">
                          <span className="pp-exam-bar-label">{label}</span>
                          <div className="pp-exam-bar-track"><div className="pp-exam-bar-fill" style={{ width: pct + '%' }} /></div>
                          <span className="t-caption qz-subtle">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {prof.feedback.materials_help_pct != null && (
                <p className="t-body-sm" style={{ marginBottom: 8 }}>
                  Les documents 9rawZid9ra aident à préparer ses examens : <b>{prof.feedback.materials_help_pct}%</b>
                </p>
              )}
              {prof.feedback.difficulty_avg != null && (
                <p className="t-body-sm">Difficulté ressentie : <b>{String(prof.feedback.difficulty_avg).replace('.', ',')} / 5</b></p>
              )}
            </Card>
          )}
          {user && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button variant="secondary" onClick={() => setShowFeedback(true)}>Donner mon avis</Button>
            </div>
          )}
        </div>
      </div>

      {showFeedback && (
        <ProfessorFeedbackModal modules={prof.modules} onClose={() => setShowFeedback(false)} onSubmit={submitFeedback} />
      )}
    </div>
  )
}
