import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import {
  Badge, SearchBar, Chip, StatStrip, DocumentRow, ModuleCard, SchoolCard, Skeleton, Card, Button, Banner, Icon, Avatar, ProgressBar,
} from '../design-system/ui'
import { notify } from '../design-system/toast'
import { levelFor } from '../lib/reputation'

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
  .home-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
  .home-pillar { display: flex; flex-direction: column; gap: var(--space-3); }
  @media (max-width: 900px) { .home-pillars { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .home-pillars { grid-template-columns: 1fr; } }
  .home-compare-table { width: 100%; border-collapse: collapse; }
  .home-compare-table th, .home-compare-table td { text-align: left; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border); font-size: 14px; }
  .home-compare-table th { font: 500 12px/16px var(--font-mono); text-transform: uppercase; letter-spacing: .04em; color: var(--text-subtle); }
  .home-compare-cell { display: flex; align-items: center; gap: var(--space-2); }
  .home-compare-cards { display: none; flex-direction: column; gap: var(--space-3); }
  @media (max-width: 640px) {
    .home-compare-table { display: none; }
    .home-compare-cards { display: flex; }
  }
  .home-compare-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); }
  .home-compare-card__row { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-2); }
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

  /* Personalised home (signed in) */
  .ph-layout { max-width: 1120px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-16); display: grid; grid-template-columns: 1fr 320px; gap: var(--space-8); align-items: start; }
  @media (max-width: 900px) { .ph-layout { grid-template-columns: 1fr; } }
  .ph-header { margin-bottom: var(--space-6); }
  .ph-header__row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
  .ph-search { margin: var(--space-4) 0 var(--space-8); }
  .ph-section { margin-bottom: var(--space-10); }
  .ph-section__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
  .ph-modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); }
  .ph-missing-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); }
  .ph-request-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
  .ph-request-row + .ph-request-row { border-top: 1px solid var(--border); }
  .ph-side { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: 80px; }
`

const ADMIN_ID = '84c11086-6041-4118-8f4c-138a0664966f'
const TAGS = ['Analyse 1', 'Algorithmique', 'Droit Civil', 'Comptabilité', 'POO Java', 'Marketing']

const PILLARS = [
  { icon: 'file', title: 'Tout est rangé', desc: 'Université → filière → semestre → module. Fini de scroller 3 000 messages Telegram.' },
  { icon: 'check', title: 'Des documents fiables', desc: 'Chaque document a un score qualité, les avis des étudiants et un badge Vérifié.' },
  { icon: 'search', title: 'Une recherche qui comprend', desc: 'Tape « exam réseau GI 2024 » : on comprend le type, la filière et l’année.' },
  { icon: 'star', title: 'Par et pour les étudiants', desc: 'Tu partages, tu aides ta promo, tu gagnes des points et des badges.' },
]

const COMPARE_ROWS = [
  { label: 'Retrouver un examen de 2023', them: 'Perdu dans le fil', us: 'Rangé par module et année' },
  { label: 'Savoir si c’est le bon fichier', them: 'Aucune idée', us: 'Score qualité + avis' },
  { label: 'Accès', them: 'Il faut être dans le groupe', us: 'Ouvert à tous, gratuit' },
  { label: 'Corrigés', them: 'Rares', us: 'Filtrables en un clic' },
  { label: 'Recherche', them: 'Aucune', us: 'Par type, année, semestre' },
]

const STEPS = [
  { n: '01', title: 'Choisis ta filière', desc: 'Sélectionne ton école, ta filière et ton semestre — ta page d’accueil se personnalise.' },
  { n: '02', title: 'Trouve ou partage', desc: 'Télécharge ce dont tu as besoin, ou partage tes propres annales en 30 secondes.' },
  { n: '03', title: 'Aide ta promo et monte de niveau', desc: 'Chaque contribution gagne des points, des badges et fait avancer toute ta filière.' },
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
  const { user } = useAuth()
  return user ? <PersonalizedHome /> : <VisitorHome />
}

function VisitorHome() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [stats, setStats] = useState(null)
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

    supabase.rpc('get_platform_stats').then(({ data, error }) => {
      if (!error && data) { setStats(data); return }
      // Fallback while the onboarding migration isn't applied yet.
      Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('universities').select('*', { count: 'exact', head: true }),
        supabase.from('modules').select('*', { count: 'exact', head: true }),
        supabase.from('filieres').select('*', { count: 'exact', head: true }),
      ]).then(([docs, unis, mods, fils]) => {
        setStats({
          documents: docs.count || 0, universities: unis.count || 0,
          modules: mods.count || 0, filieres: fils.count || 0,
          documents_this_week: 0, contributors: 0,
        })
      })
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
          <Badge tone="accent" dot>{stats?.documents ?? 0} documents{stats?.documents_this_week ? ` · +${stats.documents_this_week} cette semaine` : ''}</Badge>
          <h1 className="t-display">Le réseau organisé du savoir étudiant marocain.</h1>
          <p className="t-body-lg qz-muted">
            Examens, CC, TD, TP et corrigés, rangés par école, filière, semestre et module — partagés et vérifiés par les étudiants.
          </p>

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
          { value: stats?.modules != null ? stats.modules.toLocaleString() : '—', label: 'Modules' },
          { value: stats?.universities ?? '—', label: 'Établissements' },
          { value: stats?.documents ?? 0, label: 'Documents' },
          { value: stats?.contributors ?? '—', label: 'Contributeurs' },
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
        <span className="t-eyebrow qz-subtle">Pourquoi 9rawZid9ra ?</span>
        <h2 className="t-h2" style={{ marginBottom: 'var(--space-6)' }}>Ce que Google et les groupes WhatsApp ne t'offrent pas</h2>
        <div className="home-pillars">
          {PILLARS.map(p => (
            <Card key={p.title} className="home-pillar">
              <span className="qz-icon-tile" style={{ background: 'var(--brand-soft)', color: 'var(--brand-text)' }}><Icon name={p.icon} /></span>
              <h3 className="t-h3">{p.title}</h3>
              <p className="t-body-sm qz-muted">{p.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Card>
          <h2 className="t-h2" style={{ marginBottom: 'var(--space-5)' }}>Groupes WhatsApp vs 9rawZid9ra</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="home-compare-table">
              <thead><tr><th>Critère</th><th>Groupes WhatsApp / Telegram</th><th>9rawZid9ra</th></tr></thead>
              <tbody>
                {COMPARE_ROWS.map(r => (
                  <tr key={r.label}>
                    <td className="t-label">{r.label}</td>
                    <td><span className="home-compare-cell"><span style={{ color: 'var(--text-subtle)', display: 'inline-flex' }}><Icon name="x" size={16} /></span><span className="qz-muted">{r.them}</span></span></td>
                    <td><span className="home-compare-cell"><span style={{ color: 'var(--success)', display: 'inline-flex' }}><Icon name="check" size={16} /></span>{r.us}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="home-compare-cards">
            {COMPARE_ROWS.map(r => (
              <div className="home-compare-card" key={r.label}>
                <span className="t-label">{r.label}</span>
                <div className="home-compare-card__row"><span style={{ color: 'var(--text-subtle)', display: 'inline-flex' }}><Icon name="x" size={16} /></span><span className="t-body-sm qz-muted">{r.them}</span></div>
                <div className="home-compare-card__row"><span style={{ color: 'var(--success)', display: 'inline-flex' }}><Icon name="check" size={16} /></span><span className="t-body-sm">{r.us}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </section>

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
            { v: stats?.modules != null ? stats.modules.toLocaleString() : '—', l: 'Modules structurés', s: 'Organisés par filière et semestre' },
            { v: stats?.universities ?? '—', l: 'Établissements', s: 'Toutes les grandes écoles' },
            { v: stats?.filieres ?? '—', l: 'Filières couvertes', s: 'Licence, Ingénieur, Master' },
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
            <Button variant="primary" size="lg" as={Link} to="/register">Créer un compte gratuit</Button>
            <Button variant="secondary" size="lg" as={Link} to="/browse">Explorer</Button>
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

function PersonalizedHome() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const searchInputRef = useRef(null)

  const load = () => {
    supabase.rpc('get_home_feed').then(({ data, error }) => {
      if (!error) setFeed(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    document.title = '9rawZid9ra — Ton espace'
    load()
  }, []) // eslint-disable-line

  const onSearch = (value) => {
    navigate(`/browse${value && value.trim() ? `?q=${encodeURIComponent(value.trim())}` : ''}`)
  }

  const openOnboarding = () => window.dispatchEvent(new CustomEvent('open-onboarding'))

  const firstName = (profile?.name || 'toi').split(' ')[0]
  const p = feed?.profile
  const rep = feed?.reputation
  const level = rep ? levelFor(rep.total_points) : null

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="home" />

      <div className="ph-layout">
        <div>
          <div className="ph-header">
            {p?.onboarded ? (
              <span className="t-eyebrow qz-subtle">
                {[p.filiere_abbreviation || p.filiere_name, p.semester, p.university_name].filter(Boolean).join(' · ')}
              </span>
            ) : null}
            <div className="ph-header__row">
              <h1 className="t-h1">Salut {firstName}</h1>
              {p?.onboarded && <Button variant="link" size="sm" onClick={openOnboarding}>Changer</Button>}
            </div>
          </div>

          <div className="ph-search">
            <SearchBar variant="compact" inputRef={searchInputRef} placeholder="Module, filière ou école…" onSubmit={onSearch} />
          </div>

          {!loading && !p?.onboarded && (
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <Banner action={<Button variant="primary" size="sm" onClick={openOnboarding}>Choisir ma filière</Button>}>
                Dis-nous ta filière pour voir tes modules.
              </Banner>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[...Array(3)].map((_, i) => <Card key={i}><Skeleton height={100} /></Card>)}
            </div>
          ) : p?.onboarded ? (
            <>
              {feed.my_modules?.length > 0 && (
                <section className="ph-section">
                  <div className="ph-section__head">
                    <h2 className="t-h2">Tes modules {p.semester ? `— ${p.semester}` : ''}</h2>
                    <Button variant="link" size="sm" as={Link} to="/my-modules">Tout voir</Button>
                  </div>
                  <div className="ph-modules-grid">
                    {feed.my_modules.slice(0, 6).map(m => (
                      <ModuleCard key={m.id} linkAs={Link} href={`/module/${m.slug || m.id}`}
                        name={m.name} semester={m.semester} types={m.doc_types || []} docs={m.docs_count}
                        completeness={Math.round(((m.doc_types?.length || 0) / 10) * 100)}
                        bookmarked={m.followed} />
                    ))}
                  </div>
                </section>
              )}

              {feed.recent_documents?.length > 0 && (
                <section className="ph-section">
                  <div className="ph-section__head"><h2 className="t-h2">Nouveau dans ta filière</h2></div>
                  <div className="qz-list">
                    {feed.recent_documents.map(d => (
                      <DocumentRow key={d.id} linkAs={Link} href={`/module/${d.module_slug || d.module_id}`} hideActions
                        type={d.doc_type} title={d.title || d.module_name} year={d.academic_year} verified={d.status === 'verified'} />
                    ))}
                  </div>
                </section>
              )}

              {feed.missing?.length > 0 && (
                <section className="ph-section">
                  <div className="ph-section__head"><h2 className="t-h2">Sois le premier</h2></div>
                  <p className="t-body-sm qz-muted" style={{ marginBottom: 'var(--space-4)' }}>Les 100 premiers contributeurs de 9rawZid9ra reçoivent le badge Fondateur.</p>
                  <div className="ph-missing-grid">
                    {feed.missing.map(m => (
                      <Card key={m.id}>
                        <p className="t-label">{m.name}</p>
                        <p className="t-caption qz-subtle" style={{ margin: '4px 0 var(--space-3)' }}>Aucun document{m.open_requests > 0 ? ` · ${m.open_requests} demande${m.open_requests > 1 ? 's' : ''}` : ''}</p>
                        <Button variant="secondary" size="sm" as={Link} to={`/upload?module=${m.id}`}>Partager</Button>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {feed.requests?.length > 0 && (
                <section className="ph-section">
                  <div className="ph-section__head"><h2 className="t-h2">Ta promo demande</h2></div>
                  <Card style={{ padding: 0 }}>
                    {feed.requests.map(r => (
                      <div className="ph-request-row" key={r.id}>
                        <Badge>{r.doc_type}</Badge>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="t-label">{r.module_name}</p>
                          <p className="t-caption qz-subtle">{r.votes} vote{r.votes !== 1 ? 's' : ''}</p>
                        </div>
                        <Button variant="secondary" size="sm" as={Link} to={`/upload?module=${r.module_id}`}>J'ai ce document</Button>
                      </div>
                    ))}
                  </Card>
                </section>
              )}
            </>
          ) : null}
        </div>

        <div className="ph-side">
          {level && (
            <Card>
              <span className="t-eyebrow qz-subtle">Réputation</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: 'var(--space-2) 0' }}>
                <span className="t-h3">{level.name}</span>
                <span className="t-mono qz-subtle">{rep.total_points} pts</span>
              </div>
              <ProgressBar value={level.progress * 100} />
              {level.next && <p className="t-caption qz-subtle" style={{ marginTop: 6 }}>Encore {level.toNext} points pour {level.nextName}</p>}
              <div style={{ marginTop: 'var(--space-4)' }}><Button variant="secondary" size="sm" block as={Link} to="/profile">Voir mon profil</Button></div>
            </Card>
          )}
          <Card>
            <span className="t-eyebrow qz-subtle">Rejoins la communauté</span>
            <p className="t-body-sm qz-muted" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>Partage un document et aide ta promo.</p>
            <Button variant="secondary" size="sm" block as={Link} to="/upload">Partager un document</Button>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}
