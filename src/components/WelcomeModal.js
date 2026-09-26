import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Wordmark, Button, Input, Chip, Switch, Icon, ProgressBar, Sheet } from '../design-system/ui'
import { notify } from '../design-system/toast'
import SenpaiSection from './SenpaiSection'
import { useAuth } from '../context/AuthContext'

const TOTAL_STEPS = 5

export default function WelcomeModal() {
  const { refreshProfile } = useAuth()
  const [show, setShow] = useState(false)
  const [userId, setUserId] = useState(null)
  const [step, setStep] = useState(1)

  // Step 1 — école
  const [uniSearch, setUniSearch] = useState('')
  const [uniResults, setUniResults] = useState([])
  const [selUni, setSelUni] = useState(null)
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolCity, setNewSchoolCity] = useState('')
  const [addingSchool, setAddingSchool] = useState(false)

  // Step 2 — filière
  const [facs, setFacs] = useState([])
  const [selFac, setSelFac] = useState(null)
  const [fils, setFils] = useState([])
  const [selFil, setSelFil] = useState(null)
  const [showAddFiliere, setShowAddFiliere] = useState(false)
  const [newFiliereName, setNewFiliereName] = useState('')
  const [newFiliereSem, setNewFiliereSem] = useState('')
  const [addingFiliere, setAddingFiliere] = useState(false)

  // Step 3 — semestre
  const [semester, setSemester] = useState('')
  const [followModules, setFollowModules] = useState(true)

  // Step 4 — c'est prêt
  const [completing, setCompleting] = useState(false)
  const [followedCount, setFollowedCount] = useState(0)
  const [previewModules, setPreviewModules] = useState([])

  // "Changer" / "Choisir ma filière" on Home re-opens the wizard on demand,
  // regardless of the "already seen" flags (same pattern as open-messenger in Navbar).
  useEffect(() => {
    const handler = () => { setStep(1); setShow(true) }
    window.addEventListener('open-onboarding', handler)
    return () => window.removeEventListener('open-onboarding', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      setUserId(session.user.id)
      const key = `9rz_onboarding_seen_${session.user.id}`
      const skey = `9rz_onboarding_session_${session.user.id}`
      if (localStorage.getItem(key) || sessionStorage.getItem(skey)) return
      const { data: prof } = await supabase.from('user_profiles').select('onboarded_at').eq('id', session.user.id).single()
      if (prof?.onboarded_at) { localStorage.setItem(key, '1'); return }
      setShow(true)
    })
  }, [])

  // Instant school search (debounced)
  useEffect(() => {
    if (!show || showAddSchool || uniSearch.trim().length < 2) { setUniResults([]); return }
    const t = setTimeout(() => {
      supabase.from('universities').select('id, name, city').ilike('name', `%${uniSearch.trim()}%`).limit(8)
        .then(({ data }) => setUniResults(data || []))
    }, 250)
    return () => clearTimeout(t)
  }, [uniSearch, show, showAddSchool])

  useEffect(() => {
    if (!selUni) { setFacs([]); setSelFac(null); return }
    supabase.from('faculties').select('id, name, type').eq('university_id', selUni.id).order('name')
      .then(({ data }) => {
        const list = data || []
        setFacs(list)
        setSelFac(list.length === 1 && list[0].type === 'root' ? list[0] : null)
      })
  }, [selUni])

  useEffect(() => {
    if (!selFac) { setFils([]); return }
    supabase.from('filieres').select('id, name, abbreviation, total_semesters').eq('faculty_id', selFac.id).order('name')
      .then(({ data }) => setFils(data || []))
  }, [selFac])

  const dismiss = (keepPermanently) => {
    if (userId) {
      sessionStorage.setItem(`9rz_onboarding_session_${userId}`, '1')
      if (keepPermanently) localStorage.setItem(`9rz_onboarding_seen_${userId}`, '1')
    }
    setShow(false)
  }
  // Skipping with at least a school chosen counts as enough progress not to nag every session;
  // skipping with nothing chosen only silences this tab, and the modal reappears next session.
  const skip = () => dismiss(!!selUni)

  const addSchool = async () => {
    if (!newSchoolName.trim()) return
    setAddingSchool(true)
    const name = newSchoolName.trim().slice(0, 120)
    const city = newSchoolCity.trim().slice(0, 80) || null
    const { data: newUni, error } = await supabase.from('universities').insert({ name, city, type: 'public' }).select().single()
    if (!error) {
      supabase.from('school_requests').insert({
        requested_by: userId, school_name: name, city, school_type: 'public', request_type: 'independent', status: 'approved',
      }).then()
    }
    setAddingSchool(false)
    if (error) { notify.error(error.message); return }
    setSelUni(newUni)
    setShowAddSchool(false)
    setNewSchoolName(''); setNewSchoolCity('')
  }

  const addFiliere = async () => {
    if (!newFiliereName.trim() || !selFac) return
    setAddingFiliere(true)
    const name = newFiliereName.trim().slice(0, 120)
    const totalSem = newFiliereSem ? parseInt(newFiliereSem, 10) : 6
    const { data: newFil, error } = await supabase.from('filieres')
      .insert({ faculty_id: selFac.id, name, total_semesters: totalSem }).select().single()
    if (!error) {
      supabase.from('filiere_suggestions').insert({
        suggested_by: userId, faculty_id: selFac.id, name, total_semesters: totalSem, status: 'approved',
      }).then()
    }
    setAddingFiliere(false)
    if (error) { notify.error(error.message); return }
    setFils(f => [...f, newFil])
    setSelFil(newFil)
    setShowAddFiliere(false)
    setNewFiliereName(''); setNewFiliereSem('')
  }

  const finish = async () => {
    setCompleting(true)
    const { data: count, error } = await supabase.rpc('complete_onboarding', {
      p_university_id: selUni?.id || null,
      p_faculty_id: selFac?.id || null,
      p_filiere_id: selFil?.id || null,
      p_semester: semester || null,
      p_follow_modules: followModules,
    })
    if (error) { notify.error(error.message); setCompleting(false); return }
    // Pull the new filiere/semestre into the context straight away, so the home
    // page behind the modal is already personalised when the last slide closes.
    await refreshProfile()
    setFollowedCount(count || 0)
    if (selFil && semester) {
      const { data: mods } = await supabase.from('modules').select('id, name, docs_count')
        .eq('filiere_id', selFil.id).eq('semester', semester).limit(3)
      setPreviewModules(mods || [])
    }
    setCompleting(false)
    if (userId) localStorage.setItem(`9rz_onboarding_seen_${userId}`, '1')
    setStep(4)
  }

  if (!show) return null

  const needsFacultyChoice = facs.length > 1 || (facs.length === 1 && facs[0].type !== 'root')
  const semesterOptions = Array.from({ length: selFil?.total_semesters || 10 }, (_, i) => `S${i + 1}`)

  return (
    <Sheet onClose={() => dismiss(false)}>
      <div className="qz-wm">
        <div className="qz-wm__head">
          <Wordmark />
          <span className="t-mono qz-subtle">{step} / {TOTAL_STEPS}</span>
        </div>
        <ProgressBar value={(step / TOTAL_STEPS) * 100} />

        {step === 1 && (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="search" /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>Étape 1</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>Ton école</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>On personnalise ta page d'accueil avec les modules de ton établissement.</p>

            {showAddSchool ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
                <Input label="Nom de l'école" value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} />
                <Input label="Ville" optional value={newSchoolCity} onChange={e => setNewSchoolCity(e.target.value)} />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="ghost" onClick={() => setShowAddSchool(false)}>Annuler</Button>
                  <Button variant="primary" loading={addingSchool} disabled={!newSchoolName.trim()} onClick={addSchool}>Ajouter</Button>
                </div>
              </div>
            ) : (
              <>
                <Input placeholder="Cherche ton université ou école…" value={selUni ? selUni.name : uniSearch}
                  onChange={e => { setUniSearch(e.target.value); setSelUni(null) }} />
                {uniResults.length > 0 && !selUni && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxHeight: 220, overflowY: 'auto' }}>
                    {uniResults.map(u => (
                      <button key={u.id} type="button" className="qz-dropdown__item" style={{ width: '100%' }} onClick={() => { setSelUni(u); setUniSearch('') }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>{u.name}</div>
                          {u.city && <div className="t-caption qz-subtle">{u.city}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="link" onClick={() => setShowAddSchool(true)}>Mon école n'est pas là</Button>
              </>
            )}

            <div className="qz-wm__actions">
              <Button variant="primary" block disabled={!selUni} onClick={() => setStep(2)}>Continuer</Button>
            </div>
            <Button variant="link" block onClick={skip}>Passer</Button>
          </div>
        )}

        {step === 2 && (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="file" /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>Étape 2</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>Ta filière</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>{selUni?.name}</p>

            {needsFacultyChoice && !selFac ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxHeight: 260, overflowY: 'auto' }}>
                {facs.map(f => (
                  <button key={f.id} type="button" className="qz-dropdown__item" style={{ width: '100%' }} onClick={() => setSelFac(f)}>{f.name}</button>
                ))}
              </div>
            ) : showAddFiliere ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
                <Input label="Nom de la filière" value={newFiliereName} onChange={e => setNewFiliereName(e.target.value)} />
                <Input label="Nombre de semestres" optional type="number" min="1" max="12" value={newFiliereSem} onChange={e => setNewFiliereSem(e.target.value)} />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="ghost" onClick={() => setShowAddFiliere(false)}>Annuler</Button>
                  <Button variant="primary" loading={addingFiliere} disabled={!newFiliereName.trim()} onClick={addFiliere}>Ajouter</Button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxHeight: 220, overflowY: 'auto' }}>
                  {fils.map(f => (
                    <button key={f.id} type="button" className="qz-dropdown__item"
                      style={{ width: '100%', background: selFil?.id === f.id ? 'var(--brand-soft)' : undefined }}
                      onClick={() => setSelFil(f)}>
                      {f.name}{f.abbreviation ? ` (${f.abbreviation})` : ''}
                    </button>
                  ))}
                  {fils.length === 0 && <p className="t-body-sm qz-subtle" style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>Aucune filière trouvée.</p>}
                </div>
                <Button variant="link" onClick={() => setShowAddFiliere(true)}>Ma filière n'est pas là</Button>
              </>
            )}

            <div className="qz-wm__actions">
              <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
              <Button variant="primary" block disabled={!selFil} onClick={() => setStep(3)}>Continuer</Button>
            </div>
            <Button variant="link" block onClick={skip}>Passer</Button>
          </div>
        )}

        {step === 3 && (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="bookmark" /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>Étape 3</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>Ton semestre</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>{selFil?.name}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center' }}>
              {semesterOptions.map(s => (
                <Chip key={s} selected={semester === s} onClick={() => setSemester(s)}>{s}</Chip>
              ))}
            </div>

            <Switch label="Suivre automatiquement les modules de ce semestre" checked={followModules} onChange={e => setFollowModules(e.target.checked)} />

            <div className="qz-wm__actions">
              <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
              <Button variant="primary" block loading={completing} disabled={!semester} onClick={finish}>Continuer</Button>
            </div>
            <Button variant="link" block onClick={skip}>Passer</Button>
          </div>
        )}

        {step === 4 && (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name="heart" /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>Ton senpai</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>Voici ton senpai de filière</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>
              Un étudiant bénévole de {selFil?.name || 'ta filière'} qui répond aux questions sur les examens, les modules et l'orientation.
            </p>
            <div style={{ width: '100%' }}>
              <SenpaiSection filiereId={selFil?.id} recruitEligible />
            </div>
            <div className="qz-wm__actions">
              <Button variant="primary" block onClick={() => setStep(5)}>Continuer</Button>
            </div>
            <Button variant="link" block onClick={() => setStep(5)}>Plus tard</Button>
          </div>
        )}

        {step === 5 && (
          <div className="qz-wm__slide">
            <span className="qz-icon-tile" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><Icon name="check" /></span>
            <span className="t-eyebrow qz-subtle" style={{ textAlign: 'center' }}>C'est prêt</span>
            <h2 className="t-h2" style={{ textAlign: 'center' }}>Ton espace est prêt !</h2>
            <p className="t-body qz-muted" style={{ textAlign: 'center' }}>
              {followedCount > 0 ? `${followedCount} module${followedCount > 1 ? 's' : ''} suivi${followedCount > 1 ? 's' : ''}.` : 'Ta page d\'accueil est personnalisée.'}
            </p>

            {previewModules.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%' }}>
                {previewModules.map(m => (
                  <div key={m.id} className="qz-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)' }}>
                    <span className="t-label">{m.name}</span>
                    <span className="t-caption qz-subtle">{m.docs_count || 0} doc{(m.docs_count || 0) !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="qz-wm__actions">
              <Button variant="primary" block onClick={() => dismiss(true)}>Voir mon espace</Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
