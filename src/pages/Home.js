import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { Badge, SearchBar, Chip, StatStrip, DocumentRow, SchoolCard, Skeleton, Card, Button, Banner, Icon, Avatar } from '../design-system/ui'
import { notify } from '../design-system/toast'

const css = `
  .home-hero { padding: var(--space-16) var(--space-6) var(--space-12); text-align: center; }
  .home-hero__inner { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
  .home-hero__search { width: 100%; max-width: 620px; margin-top: var(--space-3); }
  .home-hero__tags { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-2); margin-top: var(--space-2); }
  .home-stats { max-width: 720px; margin: var(--space-8) auto 0; padding: 0 var(--space-6); }
  .home-suggest { max-width: 960px; margin: var(--space-6) auto 0; padding: 0 var(--space-6); }
  .home-suggest__row { display: flex; align-items: center; gap: var(--space-4); }
  .home-suggest__info { flex: 1; min-width: 0; }
  .home-section { max-width: 1120px; margin: 0 auto; padding: var(--space-16) var(--space-6); }
  .home-section__head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap; }
  .home-schools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-4); }
  .home-metrics { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--surface); padding: var(--space-12) var(--space-6); }
  .home-metrics__inner { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-8); }
  .home-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-6); margin-top: var(--space-6); }
  .home-step { display: flex; flex-direction: column; gap: var(--space-2); }
  .home-cta { display: grid; grid-template-columns: 1fr auto; gap: var(--space-6); align-items: center; padding: var(--space-8); }
  .home-cta__actions { display: flex; flex-direction: column; gap: var(--space-2); align-items: flex-end; }
  .home-faq__list { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
  .home-faq__q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); background: none; border: 0; cursor: pointer; padding: var(--space-2) 0; text-align: left; }
  .home-faq__chev { display: inline-flex; transition: transform .15s; color: var(--text-subtle); }
  .home-faq__chev--open { transform: rotate(180deg); }
  .home-faq__a { margin-top: var(--space-2); }
  @media (max-width: 640px) {
    .home-hero { padding: var(--space-12) var(--space-4) var(--space-8); }
    .home-cta { grid-template-columns: 1fr; }
    .home-cta__actions { align-items: stretch; }
    .home-section { padding: var(--space-12) var(--space-4); }
  }
`

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'
const TAGS = ['Analyse 1', 'Algorithmique', 'Droit Civil', 'Comptabilité', 'POO Java', 'Marketing']

const STEPS = [
  { n: '01', title: 'Sélectionne ton école', desc: 'Choisis ton université ou école. Publique ou privée — tout est couvert.' },
  { n: '02', title: 'Filtre par module', desc: 'Navigue jusqu’à ton semestre et ton module exact.' },
  { n: '03', title: 'Accède aux documents', desc: 'Examens finaux, contrôles continus, TDs, TPs — partagés par la communauté.' },
  { n: '04', title: 'Contribue & progresse', desc: 'Partage tes propres annales, gagne des points et aide les étudiants de ta promo.' },
]

const FAQS = [
  { q: 'Comment trouver les examens de mon université ?', a: <>Clique sur <b>Explorer</b> dans la barre de navigation, puis sélectionne ton université dans la liste. Tu peux ensuite filtrer par faculté, filière et semestre pour trouver exactement ce que tu cherches — examens, contrôles continus, TDs et TPs.</> },
  { q: 'Comment partager mes documents ?', a: <>Crée un compte gratuitement, puis clique sur <b>Partager</b>. Sélectionne l’université, la filière, le module et le semestre correspondants, puis dépose ton fichier. Tes documents sont vérifiés avant publication pour garantir la qualité.</> },
  { q: '9rawZid9ra est-il gratuit ?', a: <>Oui, 100% gratuit et sans publicité intrusive. Télécharge autant d’examens, de TDs et de cours que tu veux sans limite. La plateforme est entièrement financée par la communauté.</> },
  { q: 'Quelles universités et écoles sont disponibles ?', a: <>Plusieurs établissements marocains sont référencés : universités publiques, grandes écoles d’ingénieurs, écoles de commerce et instituts privés. Si ton école est absente, tu peux la demander directement dans l’explorateur.</> },
]

const fmtAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'à l\'instant'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

export default function Home() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [docCount, setDocCount] = useState(0)
  const [uniCount, setUniCount] = useState(null)
  const [modCount, setModCount] = useState(null)
  const [filiereCount, setFiliereCount] = useState(null)
  const [weekDelta, setWeekDelta] = useState(null)
  const [recentDocs, setRecentDocs] = useState([])
  const [recentReady, setRecentReady] = useState(false)
  const [activeTag, setActiveTag] = useState(-1)
  const [schools, setSchools] = useState([])
  const [schoolsReady, setSchoolsReady] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const searchInputRef = useRef(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [suggestFollowing, setSuggestFollowing] = useState(false)
  const [suggestDismissed, setSuggestDismissed] = useState(() =>
    localStorage.getItem('suggest_admin_dismissed') === 'true'
  )
  const [uploadNudgeDismissed, setUploadNudgeDismissed] = useState(
    () => localStorage.getItem('9rz_upload_nudge') === '1'
  )

  useEffect(() => {
    document.title = '9rawZid9ra — Annales & examens pour étudiants marocains'
    supabase.from('documents').select('*', { count: 'exact', head: true })
      .eq('is_verified', true)
      .then(({ count }) => { if (count) setDocCount(count) })

    supabase.from('universities').select('*', { count: 'exact', head: true }).then(({ count }) => setUniCount(count || 0))
    supabase.from('modules').select('*', { count: 'exact', head: true }).then(({ count }) => setModCount(count || 0))
    supabase.from('filieres').select('*', { count: 'exact', head: true }).then(({ count }) => setFiliereCount(count || 0))

    // Real weekly delta — computed from documents.created_at
    supabase.from('documents').select('created_at').eq('is_verified', true)
      .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
      .then(({ data }) => {
        const rows = data || []
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
        const thisWeek = rows.filter(r => r.created_at > cutoff).length
        const prevWeek = rows.length - thisWeek
        setWeekDelta(prevWeek > 0 || thisWeek > 0 ? thisWeek - prevWeek : null)
      })

    // Real recent-activity feed
    supabase.from('documents')
      .select('id, doc_type, academic_year, created_at, modules(id, name, slug)')
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setRecentDocs(data || []); setRecentReady(true) })

    // Real establishments teaser, ranked by real filière count (no fabricated stats)
    supabase.from('universities').select('id, name').order('name').then(async ({ data: unis }) => {
      if (!unis || unis.length === 0) { setSchoolsReady(true); return }
      const { data: facs } = await supabase.from('faculties').select('id, university_id')
      const { data: fils } = await supabase.from('filieres').select('id, faculty_id')
      const facByUni = {}
      for (const f of (facs || [])) { (facByUni[f.university_id] = facByUni[f.university_id] || []).push(f.id) }
      const withCounts = unis.map(u => {
        const facIds = new Set(facByUni[u.id] || [])
        const filieresCount = (fils || []).filter(x => facIds.has(x.faculty_id)).length
        return { ...u, filieresCount }
      })
      withCounts.sort((a, b) => b.filieresCount - a.filieresCount)
      setSchools(withCounts.slice(0, 6))
      setSchoolsReady(true)
    })
  }, [])

  useEffect(() => {
    if (user) loadFollowingState(user.id)
  }, [user?.id]) // eslint-disable-line

  // Real ⌘K / Ctrl+K shortcut — focuses the hero search input
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const loadFollowingState = async (uid) => {
    const { count } = await supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid)
    setFollowingCount(count || 0)
    const { data: alreadyF } = await supabase.from('user_follows').select('id').eq('follower_id', uid).eq('following_id', ADMIN_ID).maybeSingle()
    setSuggestFollowing(!!alreadyF)
  }

  const handleSuggestFollow = async () => {
    if (!user || suggestFollowing) return
    await supabase.from('user_follows').insert({ follower_id: user.id, following_id: ADMIN_ID })
    setSuggestFollowing(true)
    notify.success('Abonné avec succès')
  }

  const dismissSuggest = () => {
    setSuggestDismissed(true)
    localStorage.setItem('suggest_admin_dismissed', 'true')
  }

  const showSuggest = user && followingCount === 0 && !suggestDismissed

  const onSearch = (value) => {
    navigate(`/browse${value && value.trim() ? `?q=${encodeURIComponent(value.trim())}` : ''}`)
  }
  const submitTag = (t) => navigate(`/browse?q=${encodeURIComponent(t)}`)

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="home" />

      {user && !uploadNudgeDismissed && profile?.uploads_count === 0 && (
        <Banner action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="primary" size="sm" as={Link} to="/upload">Partager</Button>
            <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Fermer" onClick={() => { setUploadNudgeDismissed(true); localStorage.setItem('9rz_upload_nudge', '1') }} />
          </div>
        }>
          Partage ton premier document et gagne <b>50 points</b>.
        </Banner>
      )}

      <section className="home-hero">
        <div className="home-hero__inner">
          <Badge tone="accent" dot>{docCount || 0} documents{weekDelta ? ` · +${weekDelta} cette semaine` : ''}</Badge>
          <h1 className="t-display">Tes annales, sans chercher.</h1>
          <p className="t-body-lg qz-muted">
            Examens, CC, TD, TP et cours de ta filière, partagés par les étudiants{uniCount ? ` de ${uniCount} établissements` : ''}. Gratuit.
          </p>
          <p className="t-body-sm qz-subtle">9ra w zid 9ra — par des étudiants, pour des étudiants.</p>

          <div className="home-hero__search">
            <SearchBar inputRef={searchInputRef} placeholder="Module, filière ou école… ex. Analyse S2" shortcut="⌘K" onSubmit={onSearch} />
          </div>

          <div className="home-hero__tags">
            <span className="t-caption qz-subtle">Populaire :</span>
            {TAGS.map((t, i) => (
              <Chip key={t} selected={activeTag === i} onMouseEnter={() => setActiveTag(i)} onClick={() => submitTag(t)}>{t}</Chip>
            ))}
          </div>
        </div>
      </section>

      <div className="home-stats">
        <StatStrip items={[
          { value: modCount != null ? modCount.toLocaleString() : '—', label: 'Modules' },
          { value: uniCount != null ? uniCount : '—', label: 'Établissements' },
          { value: docCount || 0, label: 'Documents', delta: weekDelta ? `+${weekDelta} cette semaine` : undefined },
          { value: '0 MAD', label: 'Toujours gratuit' },
        ]} />
      </div>

      {showSuggest && (
        <div className="home-suggest">
          <Card>
            <div className="home-suggest__row">
              <Avatar name="Saad" size="md" />
              <div className="home-suggest__info">
                <span className="t-eyebrow qz-subtle">Suggestion</span>
                <p className="t-label">Saad, créateur de 9rawZid9ra</p>
                <p className="t-body-sm qz-muted">Suis-le pour rester informé des nouveautés.</p>
              </div>
              <Button variant={suggestFollowing ? 'secondary' : 'primary'} size="sm" disabled={suggestFollowing} onClick={handleSuggestFollow}>{suggestFollowing ? 'Suivi' : 'Suivre'}</Button>
              <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Masquer" onClick={dismissSuggest} />
            </div>
          </Card>
        </div>
      )}

      <section className="home-section">
        <div className="home-section__head">
          <div>
            <span className="t-eyebrow qz-subtle">Nouveau</span>
            <h2 className="t-h2">Récemment ajoutés</h2>
          </div>
          <Button variant="link" as={Link} to="/browse">Tout voir</Button>
        </div>
        {!recentReady ? (
          <div className="qz-list">
            {[...Array(3)].map((_, i) => <div key={i} style={{ padding: 'var(--space-4)' }}><Skeleton height={40} /></div>)}
          </div>
        ) : recentDocs.length > 0 ? (
          <div className="qz-list">
            {recentDocs.map(d => (
              <DocumentRow
                key={d.id}
                href={`/module/${d.modules?.slug || d.modules?.id}`}
                linkAs={Link}
                hideActions
                type={d.doc_type}
                title={d.modules?.name || 'Module'}
                year={d.academic_year}
                ago={fmtAgo(d.created_at)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <div>
            <span className="t-eyebrow qz-subtle">Établissements couverts</span>
            <h2 className="t-h2">Couverture complète de la région</h2>
          </div>
          <Button variant="secondary" as={Link} to="/browse">Voir tous les modules</Button>
        </div>
        <div className="home-schools-grid">
          {!schoolsReady ? (
            [...Array(6)].map((_, i) => <Card key={i}><Skeleton height={80} /></Card>)
          ) : (
            schools.map(s => (
              <SchoolCard key={s.id} linkAs={Link} href={`/browse?uni=${s.id}`} name={s.name} filieres={s.filieresCount} />
            ))
          )}
        </div>
      </section>

      <div className="home-metrics">
        <div className="home-metrics__inner">
          {[
            { v: modCount != null ? modCount.toLocaleString() : '—', l: 'Modules structurés', s: 'Organisés par filière et semestre' },
            { v: uniCount != null ? uniCount : '—', l: 'Établissements', s: 'Toutes les grandes écoles' },
            { v: filiereCount != null ? filiereCount : '—', l: 'Filières couvertes', s: 'Licence, Ingénieur, Master' },
            { v: '0 MAD', l: 'Coût d’accès', s: 'Gratuit pour tous les étudiants' },
          ].map(m => (
            <div key={m.l}>
              <div className="t-stat">{m.v}</div>
              <div className="t-body-sm qz-muted">{m.l}</div>
              <div className="t-caption qz-subtle">{m.s}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="home-section">
        <span className="t-eyebrow qz-subtle">Comment ça marche</span>
        <h2 className="t-h2">Simple. Rapide. Gratuit.</h2>
        <div className="home-steps">
          {STEPS.map(s => (
            <div key={s.n} className="home-step">
              <span className="t-eyebrow qz-subtle">Étape {s.n}</span>
              <h3 className="t-h3">{s.title}</h3>
              <p className="t-body-sm qz-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Card className="home-cta">
          <div>
            <span className="t-eyebrow qz-subtle">Rejoins la communauté</span>
            <h2 className="t-h2">Partage un examen, aide toute ta promo.</h2>
            <p className="t-body qz-muted">Chaque document partagé aide des dizaines d'étudiants. Partage tes examens, gagne des points.</p>
          </div>
          <div className="home-cta__actions">
            {user ? (
              <>
                <Button variant="primary" size="lg" as={Link} to="/upload">Partager un document</Button>
                <Button variant="secondary" size="lg" as={Link} to="/my-modules">Mes modules</Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="lg" as={Link} to="/register">Créer un compte gratuit</Button>
                <Button variant="secondary" size="lg" as={Link} to="/browse">Explorer</Button>
              </>
            )}
          </div>
        </Card>
      </section>

      <section className="home-section home-faq">
        <span className="t-eyebrow qz-subtle">FAQ</span>
        <h2 className="t-h2">Questions fréquentes</h2>
        <div className="home-faq__list">
          {FAQS.map((f, i) => (
            <div className="qz-card" key={i}>
              <button type="button" className="home-faq__q" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className="t-label">{f.q}</span>
                <span className={`home-faq__chev${openFaq === i ? ' home-faq__chev--open' : ''}`}><Icon name="down" /></span>
              </button>
              {openFaq === i && <p className="t-body qz-muted home-faq__a">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
