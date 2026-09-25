import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Avatar, Card, Tabs, Chip, Switch, EmptyState, Skeleton, LevelBadge, LevelProgress } from '../design-system/ui'
import { levelFor, formatPoints, PERIODS, RANKING_SCOPES, rankLabel, LEVELS, LEVEL_TONES } from '../lib/reputation'
import { semesterAtLeast } from '../lib/senpai'

const css = `
  .cl-header { max-width: 900px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-4); }
  .cl-body { max-width: 900px; margin: 0 auto; padding: 0 var(--space-6) var(--space-12); }
  .cl-my-card { display: flex; align-items: center; gap: var(--space-5); flex-wrap: wrap; margin-bottom: var(--space-6); }
  .cl-my-level { flex: 1; min-width: 220px; }
  .cl-my-top { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); flex-wrap: wrap; }
  .cl-my-stats { display: flex; gap: var(--space-6); flex-wrap: wrap; }
  .cl-my-stat__n { font: 600 20px/1.2 var(--font-mono); }
  .cl-controls { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4); }
  .cl-periods { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .cl-filter { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4); }
  .cl-rank { width: 26px; text-align: right; flex-shrink: 0; }
  .cl-points { flex-shrink: 0; text-align: right; }
  .cl-points__n { font: 600 15px/1.3 var(--font-mono); }
`

export default function Classement() {
  const { user, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState('students')
  const [period, setPeriod] = useState('week')
  const [scope, setScope] = useState(searchParams.get('scope') || 'global')
  const [facultyOnlyMySchool, setFacultyOnlyMySchool] = useState(false)
  const [myUniId, setMyUniId] = useState(null)
  const [myFacultyId, setMyFacultyId] = useState(null)
  const [students, setStudents] = useState([])
  const [schools, setSchools] = useState([])
  const [faculties, setFaculties] = useState([])
  const [myRep, setMyRep] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Classement — 9rawZid9ra' }, [])

  // A scope passed in the URL (e.g. from a "top contributor" notification) only makes sense once.
  useEffect(() => { if (searchParams.get('scope')) setSearchParams({}, { replace: true }) }, []) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    supabase.from('user_profiles').select('university_id, faculty_id').eq('id', user.id).single()
      .then(({ data }) => { setMyUniId(data?.university_id || null); setMyFacultyId(data?.faculty_id || null) })
  }, [user])

  useEffect(() => {
    if (!user) { setMyRep(null); return }
    supabase.rpc('get_my_reputation', { p_period: period }).then(({ data, error }) => {
      if (!error) setMyRep(data?.[0] || null)
    })
  }, [user, period])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_period: period,
      p_university_id: scope === 'university' ? myUniId : null,
      p_faculty_id: scope === 'faculty' ? myFacultyId : null,
      p_limit: 50,
    })
    if (!error) setStudents(data || [])
    setLoading(false)
  }, [period, scope, myUniId, myFacultyId])

  const loadSchools = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_university_leaderboard', { p_period: period, p_limit: 20 })
    if (!error) setSchools(data || [])
    setLoading(false)
  }, [period])

  const loadFaculties = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_faculty_leaderboard', {
      p_period: period,
      p_university_id: facultyOnlyMySchool ? myUniId : null,
      p_limit: 20,
    })
    if (!error) setFaculties(data || [])
    setLoading(false)
  }, [period, facultyOnlyMySchool, myUniId])

  useEffect(() => { if (tab === 'students') loadStudents() }, [tab, loadStudents])
  useEffect(() => { if (tab === 'schools') loadSchools() }, [tab, loadSchools])
  useEffect(() => { if (tab === 'faculties') loadFaculties() }, [tab, loadFaculties])

  const periodLabel = PERIODS.find(p => p.id === period)?.label || ''
  const availableScopes = RANKING_SCOPES.filter(s => s.id === 'global' || (s.id === 'university' && myUniId) || (s.id === 'faculty' && myFacultyId))

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="classement" />

      <div className="cl-header">
        <span className="t-eyebrow qz-subtle">Classement</span>
        <h1 className="t-h1" style={{ margin: '4px 0 4px' }}>Qui contribue le plus ?</h1>
        <p className="t-body qz-muted">Points gagnés en partageant, en aidant et en vérifiant des documents.</p>
        {user && semesterAtLeast(profile?.current_semester, 3) && (
          <p className="t-caption qz-subtle" style={{ marginTop: 'var(--space-2)' }}>
            Tu aides déjà ta promo. <Link to="/senpai?devenir=1">Deviens senpai de ta filière</Link>.
          </p>
        )}
      </div>

      <div className="cl-body">
        {user && myRep && (() => {
          const lvl = levelFor(myRep.total_points)
          return (
            <Card className="cl-my-card">
              <Avatar name={profile?.name} size="lg" founder={profile?.is_fondateur} />
              <div className="cl-my-level">
                <div className="cl-my-top">
                  <span className="t-label">{profile?.name || 'Toi'}</span>
                  <LevelBadge tone={lvl.tone} icon={lvl.icon} name={myRep.level_name} />
                </div>
                <LevelProgress progress={lvl.progress} tone={lvl.tone} label={
                  myRep.next_level_min != null
                    ? `${formatPoints(myRep.next_level_min - myRep.total_points)} points avant ${lvl.nextName}`
                    : 'Niveau maximum atteint'
                } />
              </div>
              <div className="cl-my-stats">
                <div>
                  <div className="cl-my-stat__n">{formatPoints(myRep.total_points)}</div>
                  <div className="t-caption qz-subtle">Points total</div>
                </div>
                <div>
                  <div className="cl-my-stat__n">{rankLabel(myRep.period_rank) || '—'}</div>
                  <div className="t-caption qz-subtle">{periodLabel}</div>
                </div>
                {myRep.university_rank && (
                  <div>
                    <div className="cl-my-stat__n">{rankLabel(myRep.university_rank)}</div>
                    <div className="t-caption qz-subtle">Mon école</div>
                  </div>
                )}
                {myRep.faculty_rank && (
                  <div>
                    <div className="cl-my-stat__n">{rankLabel(myRep.faculty_rank)}</div>
                    <div className="t-caption qz-subtle">Ma faculté</div>
                  </div>
                )}
              </div>
            </Card>
          )
        })()}

        <div className="cl-controls">
          <Tabs label="Classement" value={tab} onChange={setTab} items={[
            { id: 'students', label: 'Étudiants' },
            { id: 'schools', label: 'Écoles' },
            { id: 'faculties', label: 'Facultés' },
          ]} />
          <div className="cl-periods">
            {PERIODS.map(p => (
              <Chip key={p.id} selected={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</Chip>
            ))}
          </div>
        </div>

        {tab === 'students' && user && availableScopes.length > 1 && (
          <div className="cl-filter">
            {availableScopes.map(s => (
              <Chip key={s.id} selected={scope === s.id} onClick={() => setScope(s.id)}>{s.label}</Chip>
            ))}
          </div>
        )}

        {tab === 'faculties' && myUniId && (
          <div className="cl-filter">
            <Switch label="Mon école uniquement" checked={facultyOnlyMySchool} onChange={e => setFacultyOnlyMySchool(e.target.checked)} />
          </div>
        )}

        {loading ? <Skeleton height={400} /> : tab === 'students' ? (
          students.length === 0 ? (
            <EmptyState icon="star" title="Personne n'a encore gagné de points sur cette période" />
          ) : (
            <Card flush>
              {students.map(s => (
                <Link key={s.user_id} to={`/user/${s.user_id}`} className="qz-row">
                  <span className="t-mono qz-subtle cl-rank">{s.rank}</span>
                  <Avatar name={s.name} size="sm" founder={s.is_fondateur} />
                  <div className="qz-row__main">
                    <p className="qz-row__title">{s.name || 'Anonyme'}</p>
                    <div className="qz-meta">
                      <span>{s.university_name || '—'}</span>
                      <LevelBadge tone={LEVEL_TONES[s.level]} icon={LEVELS.find(l => l.level === s.level)?.icon} name={s.level_name} />
                      {s.badges_count > 0 && <span>{s.badges_count} badge{s.badges_count > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="cl-points">
                    <div className="cl-points__n">{formatPoints(s.period_points)}</div>
                    <div className="t-caption qz-subtle">pts</div>
                  </div>
                </Link>
              ))}
            </Card>
          )
        ) : tab === 'schools' ? (
          schools.length === 0 ? (
            <EmptyState icon="shield" title="Aucune école n'a encore de points sur cette période" />
          ) : (
            <Card flush>
              {schools.map(u => (
                <div key={u.university_id} className="qz-row">
                  <span className="t-mono qz-subtle cl-rank">{u.rank}</span>
                  <div className="qz-row__main">
                    <p className="qz-row__title">{u.university_name}</p>
                    <div className="qz-meta">
                      <span>{u.city || '—'}</span>
                      <span>{u.contributors} contributeur{u.contributors > 1 ? 's' : ''}</span>
                      <span>{u.documents_count} documents</span>
                    </div>
                  </div>
                  <div className="cl-points">
                    <div className="cl-points__n">{formatPoints(u.period_points)}</div>
                    <div className="t-caption qz-subtle">pts</div>
                  </div>
                </div>
              ))}
            </Card>
          )
        ) : (
          faculties.length === 0 ? (
            <EmptyState icon="shield" title="Aucune faculté n'a encore de points sur cette période" />
          ) : (
            <Card flush>
              {faculties.map(f => (
                <div key={f.faculty_id} className="qz-row">
                  <span className="t-mono qz-subtle cl-rank">{f.rank}</span>
                  <div className="qz-row__main">
                    <p className="qz-row__title">{f.faculty_name}</p>
                    <div className="qz-meta">
                      <span>{f.university_name}</span>
                      <span>{f.contributors} contributeur{f.contributors > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="cl-points">
                    <div className="cl-points__n">{formatPoints(f.period_points)}</div>
                    <div className="t-caption qz-subtle">pts</div>
                  </div>
                </div>
              ))}
            </Card>
          )
        )}
      </div>
    </div>
  )
}
