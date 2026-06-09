import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#02040A; --bg2:#080C14; --surface:#070C18; --s2:#0C1222; --s3:#111827;
    --border:#1C2A45; --borderhi:#2D4A7A;
    --accent:#4F8EF7; --accent2:#7BB3FF; --teal:#2DD4BF; --teal2:#5EEAD4;
    --text:#E2E8F0; --text2:#94A3B8; --text3:#4A5568; --white:#FFFFFF;
  }
  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--text); font-family:'Outfit',sans-serif; }
  .page { min-height:100vh; overflow-x:hidden; }

  /* HERO */
  .hero { position:relative; z-index:1; min-height:calc(100vh - 58px); display:flex; align-items:center; justify-content:center; padding:4rem 2rem 6rem; overflow:hidden; }
  .hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(59,130,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.06) 1px,transparent 1px); background-size:50px 50px; animation:gridMove 20s linear infinite; }
  @keyframes gridMove { 0%{transform:translateY(0)} 100%{transform:translateY(50px)} }
  .blob1 { position:absolute; width:600px; height:600px; border-radius:50%; background:radial-gradient(circle,rgba(79,142,247,0.12) 0%,transparent 70%); top:-100px; left:50%; transform:translateX(-50%); }
  .blob2 { position:absolute; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle,rgba(45,212,191,0.08) 0%,transparent 70%); bottom:100px; right:10%; }
  .hero-inner { position:relative; z-index:2; max-width:800px; text-align:center; }

  .status-chip { display:inline-flex; align-items:center; gap:8px; background:rgba(79,142,247,0.06); border:1px solid rgba(79,142,247,0.2); border-radius:100px; padding:5px 16px 5px 10px; margin-bottom:2rem; animation:fadeUp 0.5s ease both; }
  .status-dot { width:7px; height:7px; border-radius:50%; background:var(--teal); box-shadow:0 0 0 3px rgba(45,212,191,0.2); animation:sPulse 2s ease-in-out infinite; }
  @keyframes sPulse { 0%,100%{box-shadow:0 0 0 3px rgba(45,212,191,0.2)} 50%{box-shadow:0 0 0 6px rgba(45,212,191,0.05)} }
  .status-text { font-family:'DM Mono',monospace; font-size:0.72rem; color:var(--text2); letter-spacing:0.3px; }
  .status-text span { color:var(--teal2); }

  .hero-title { font-size:clamp(2.8rem,7vw,5.2rem); font-weight:800; line-height:1.07; letter-spacing:-2px; color:var(--white); margin-bottom:1.5rem; animation:fadeUp 0.5s 0.08s ease both; }
  .grad { background:linear-gradient(90deg,var(--accent2) 0%,var(--teal2) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; display:block; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  .hero-desc { max-width:520px; font-size:1.05rem; font-weight:400; color:var(--text2); line-height:1.75; margin:0 auto 2.5rem; animation:fadeUp 0.5s 0.16s ease both; }

  /* SEARCH */
  .search-wrap { width:100%; max-width:620px; animation:fadeUp 0.5s 0.24s ease both; margin:0 auto 1.25rem; }
  .search-bar { display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:5px 5px 5px 20px; gap:12px; transition:border-color 0.2s,box-shadow 0.2s; }
  .search-bar:focus-within { border-color:var(--accent); box-shadow:0 0 0 4px rgba(79,142,247,0.12),0 8px 32px rgba(79,142,247,0.08); }
  .search-ico { font-family:'DM Mono',monospace; font-size:0.875rem; color:var(--text3); flex-shrink:0; }
  .search-input { flex:1; background:none; border:none; outline:none; font-size:0.95rem; color:var(--text); font-family:'Outfit',sans-serif; padding:11px 0; }
  .search-input::placeholder { color:var(--text3); }
  .search-submit { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:11px 24px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; white-space:nowrap; position:relative; overflow:hidden; }
  .search-submit::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .search-submit:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,142,247,0.45); }

  .search-tags { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center; animation:fadeUp 0.5s 0.3s ease both; }
  .search-tag-label { font-size:0.78rem; color:var(--text3); font-family:'DM Mono',monospace; }
  .search-tag { background:none; border:1px solid var(--border); border-radius:6px; padding:4px 12px; font-size:0.75rem; color:var(--text2); cursor:pointer; transition:all 0.15s; font-family:'DM Mono',monospace; }
  .search-tag:hover { border-color:var(--accent); color:var(--accent2); background:rgba(79,142,247,0.06); }

  /* STATS */
  .stats-row { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; max-width:520px; margin:3rem auto 0; animation:fadeUp 0.5s 0.4s ease both; }
  .stat { flex:1; padding:1.2rem 0.5rem; text-align:center; position:relative; }
  .stat+.stat::before { content:''; position:absolute; left:0; top:18%; bottom:18%; width:1px; background:var(--border); }
  .stat-n { font-family:'DM Mono',monospace; font-size:1.5rem; font-weight:500; background:linear-gradient(135deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:3px; }
  .stat-l { font-size:0.7rem; color:var(--text3); font-weight:500; letter-spacing:0.5px; text-transform:uppercase; }

  /* SCHOOLS */
  .section { max-width:1200px; margin:0 auto; padding:5rem 2.5rem; }
  .section-eyebrow { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--accent); letter-spacing:3px; text-transform:uppercase; margin-bottom:0.75rem; }
  .section-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; }
  .section-title { font-size:1.75rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; line-height:1.2; }
  .section-title span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .section-link { font-size:0.8rem; color:var(--text2); cursor:pointer; background:none; border:1px solid var(--border); border-radius:8px; padding:8px 16px; font-family:'Outfit',sans-serif; transition:all 0.15s; }
  .section-link:hover { border-color:var(--accent); color:var(--accent2); }

  .school-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .school-card { background:var(--surface); padding:1.5rem; cursor:pointer; transition:background 0.15s; display:flex; flex-direction:column; gap:0.75rem; position:relative; }
  .school-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--accent),var(--teal)); transform:scaleX(0); transform-origin:left; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); }
  .school-card:hover { background:var(--s2); }
  .school-card:hover::after { transform:scaleX(1); }
  .school-row1 { display:flex; align-items:center; justify-content:space-between; }
  .school-abbr { font-family:'DM Mono',monospace; font-size:0.65rem; font-weight:500; color:var(--text3); letter-spacing:1.5px; text-transform:uppercase; }
  .school-badge { font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:500; padding:2px 8px; border-radius:4px; letter-spacing:0.5px; }
  .badge-pub  { background:rgba(45,212,191,0.08); color:var(--teal2); border:1px solid rgba(45,212,191,0.15); }
  .badge-priv { background:rgba(79,142,247,0.08); color:var(--accent2); border:1px solid rgba(79,142,247,0.15); }
  .badge-semi { background:rgba(123,179,255,0.08); color:#A5C8FF; border:1px solid rgba(123,179,255,0.15); }
  .school-name { font-size:0.95rem; font-weight:600; color:var(--white); line-height:1.35; }
  .school-meta { display:flex; align-items:center; gap:1rem; padding-top:0.75rem; border-top:1px solid var(--border); }
  .school-meta-item { font-size:0.72rem; color:var(--text3); }
  .school-meta-item b { color:var(--text2); font-weight:500; }
  .school-city { font-family:'DM Mono',monospace; font-size:0.7rem; color:var(--text3); margin-left:auto; }

  /* METRICS */
  .metrics { border-top:1px solid var(--border); border-bottom:1px solid var(--border); background:var(--surface); padding:4rem 2.5rem; }
  .metrics-inner { max-width:1000px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:2rem; }
  .metric-val { font-family:'DM Mono',monospace; font-size:2.2rem; font-weight:500; background:linear-gradient(135deg,var(--white),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:6px; }
  .metric-label { font-size:0.82rem; color:var(--text2); font-weight:500; margin-bottom:4px; }
  .metric-sub { font-size:0.72rem; color:var(--text3); font-family:'DM Mono',monospace; }

  /* HOW */
  .how-section { max-width:1000px; margin:0 auto; padding:5rem 2.5rem; }
  .steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:2rem; margin-top:2rem; }
  .step { position:relative; }
  .step-num { font-family:'DM Mono',monospace; font-size:0.65rem; color:var(--text3); margin-bottom:1rem; letter-spacing:1px; }
  .step-bar { height:3px; width:40px; border-radius:2px; background:linear-gradient(90deg,var(--accent),var(--teal)); margin-bottom:1rem; }
  .step-title { font-size:1rem; font-weight:600; color:var(--white); margin-bottom:8px; }
  .step-desc { font-size:0.82rem; color:var(--text2); line-height:1.7; }

  /* CTA */
  .cta-wrap { max-width:1200px; margin:0 auto; padding:0 2.5rem 5rem; }
  .cta-block { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:3.5rem; display:grid; grid-template-columns:1fr auto; gap:2rem; align-items:center; position:relative; overflow:hidden; }
  .cta-block::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent) 30%,var(--teal) 70%,transparent); }
  .cta-block::after { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 60% 80% at 0% 50%,rgba(79,142,247,0.06) 0%,transparent 60%); pointer-events:none; }
  .cta-label { font-family:'DM Mono',monospace; font-size:0.68rem; color:var(--accent); letter-spacing:2px; text-transform:uppercase; margin-bottom:0.75rem; }
  .cta-title { font-size:1.6rem; font-weight:700; color:var(--white); letter-spacing:-0.5px; margin-bottom:0.75rem; }
  .cta-title span { background:linear-gradient(90deg,var(--accent2),var(--teal2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .cta-desc { font-size:0.875rem; color:var(--text2); line-height:1.7; }
  .cta-actions { display:flex; flex-direction:column; gap:10px; align-items:flex-end; position:relative; z-index:1; }
  .btn-primary { background:linear-gradient(135deg,var(--accent),#3A6ED4); color:var(--white); border:none; border-radius:10px; padding:12px 28px; font-size:0.875rem; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; position:relative; overflow:hidden; white-space:nowrap; }
  .btn-primary::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.1),transparent); }
  .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(79,142,247,0.45); }
  .btn-outline { background:none; color:var(--text2); border:1px solid var(--border); border-radius:10px; padding:12px 28px; font-size:0.875rem; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all 0.2s; white-space:nowrap; }
  .btn-outline:hover { border-color:var(--accent); color:var(--accent2); }

  /* FOOTER */
  .footer { border-top:1px solid var(--border); background:var(--surface); }
  .footer-grid { max-width:1200px; margin:0 auto; padding:3rem 2.5rem 2rem; display:grid; grid-template-columns:1fr 1fr 1fr; gap:3rem; }
  @media(max-width:768px){ .footer-grid{ grid-template-columns:1fr; gap:2rem; padding:2rem 1.5rem 1.5rem; } }
  .footer-brand { font-family:'DM Mono',monospace; font-size:1rem; color:var(--text); }
  .footer-brand b { color:var(--accent2); font-weight:400; }
  .footer-tagline { font-size:0.78rem; color:var(--text3); margin-top:8px; line-height:1.6; }
  .footer-col-title { font-family:'DM Mono',monospace; font-size:0.62rem; color:var(--text3); letter-spacing:2px; text-transform:uppercase; margin-bottom:1rem; }
  .footer-link { display:block; font-size:0.82rem; color:var(--text2); cursor:pointer; transition:color 0.15s; font-weight:500; background:none; border:none; font-family:'Outfit',sans-serif; padding:0; margin-bottom:8px; text-align:left; }
  .footer-link:hover { color:var(--accent2); }
  .footer-bar { border-top:1px solid var(--border); padding:1rem 2.5rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .footer-copy { font-size:0.7rem; color:var(--text3); font-family:'DM Mono',monospace; }
  .footer-bar-links { display:flex; align-items:center; gap:1rem; }
  .footer-bar-link { font-size:0.7rem; color:var(--text3); background:none; border:none; cursor:pointer; font-family:'Outfit',sans-serif; transition:color 0.15s; padding:0; }
  .footer-bar-link:hover { color:var(--accent2); }
  .footer-dev { font-size:0.7rem; color:var(--text3); font-family:'DM Mono',monospace; }

  @media(max-width:768px) {
    .hero { padding:2.5rem 1.25rem 3.5rem; min-height:auto; }
    .hero-inner h1 { font-size:2.1rem; }
    .hero-inner p { font-size:0.85rem; }
    .school-grid { grid-template-columns:1fr 1fr; gap:1px; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .steps { grid-template-columns:1fr 1fr; gap:1.25rem; }
    .section { padding:3rem 1.25rem; }
    .cta-block { grid-template-columns:1fr; padding:2rem 1.5rem; }
    .cta-actions { align-items:stretch; flex-direction:row; flex-wrap:wrap; }
    .footer-bar { padding:1rem 1.25rem; }
  }
  @media(max-width:480px) {
    .hero-inner h1 { font-size:1.65rem; }
    .school-grid { grid-template-columns:1fr; }
    .stats-row { grid-template-columns:repeat(2,1fr); }
    .steps { grid-template-columns:1fr; }
    .search-row { flex-direction:column; gap:8px; }
    .cta-actions { flex-direction:column; }
    .btn-primary, .btn-outline { width:100%; text-align:center; }
  }
`

const SCHOOLS = [
  { id:1, name:'Université Mohammed V', abbr:'UM5', city:'Rabat', type:'public', facs:10, fils:28 },
  { id:2, name:'Université Ibn Tofail', abbr:'UIT', city:'Kénitra', type:'public', facs:5, fils:10 },
  { id:3, name:'École Marocaine des Sciences de l\'Ingénieur', abbr:'EMSI', city:'Rabat', type:'private', facs:1, fils:1 },
  { id:4, name:'École Sup. de Management, Télécommunication et Informatique', abbr:'SUPMTI', city:'Rabat', type:'private', facs:1, fils:2 },
  { id:5, name:'Université Internationale de Rabat', abbr:'UIR', city:'Rabat', type:'private', facs:1, fils:2 },
  { id:6, name:'Institut Supérieur de Commerce et d\'Administration', abbr:'ISCAE', city:'Rabat', type:'semi-public', facs:1, fils:1 },
]

const STEPS = [
  { n:'01', title:'Sélectionne ton école', desc:'Choisis parmi 19 établissements. Université publique ou école privée — tout est couvert.' },
  { n:'02', title:'Filtre par module', desc:'Navigue jusqu\'à ton semestre et module exact. 762+ modules structurés et vérifiés.' },
  { n:'03', title:'Accède aux documents', desc:'Examens finaux, contrôles continus, TDs, TPs — uploadés par la communauté.' },
  { n:'04', title:'Contribue & progresse', desc:'Upload tes propres annales, gagne des points et aide les étudiants de ta promo.' },
]

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [docCount, setDocCount] = useState(0)

  useEffect(() => {
    supabase.from('documents').select('*', { count:'exact', head:true })
      .eq('is_verified', true)
      .then(({ count }) => { if (count) setDocCount(count) })
  }, [])

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/browse${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
  }

  const TAGS = ['Analyse 1', 'Algorithmique', 'Droit Civil', 'Comptabilité', 'POO Java', 'Marketing']
  const badgeClass = t => t === 'public' ? 'badge-pub' : t === 'private' ? 'badge-priv' : 'badge-semi'
  const badgeLabel = t => t === 'public' ? 'PUBLIC' : t === 'private' ? 'PRIVÉ' : 'SEMI-PUB'

  return (
    <div className="page">
      <style>{css}</style>
      <Navbar activePage="home" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="blob1" />
        <div className="blob2" />
        <div className="hero-inner">
          <div className="status-chip">
            <div className="status-dot" />
            <span className="status-text">
              Plateforme marocaine d'annales &nbsp;—&nbsp; <span>100% gratuit</span>
            </span>
          </div>
          <h1 className="hero-title">
            Trouve tes annales
            <span className="grad">en 30 secondes.</span>
          </h1>
          <p className="hero-desc">
            Examens, CCs, TDs et TPs organisés par école, filière et semestre.
            Uploadés par des étudiants comme toi. Gratuit, rapide, structuré.
          </p>
          <div className="search-wrap">
            <form onSubmit={onSearch}>
              <div className="search-bar">
                <span className="search-ico">$_</span>
                <input className="search-input"
                  placeholder="Recherche un module... ex: Analyse 1, POO, Droit Commercial"
                  value={query} onChange={e => setQuery(e.target.value)} />
                <button type="submit" className="search-submit">Rechercher</button>
              </div>
            </form>
          </div>
          <div className="search-tags">
            <span className="search-tag-label">// tendances:</span>
            {TAGS.map(t => (
              <button key={t} className="search-tag"
                onClick={() => { setQuery(t); navigate(`/browse?q=${encodeURIComponent(t)}`) }}>
                {t}
              </button>
            ))}
          </div>
          <div className="stats-row">
            {[
              { n:'762+', l:'Modules' },
              { n: docCount || '0', l:'Documents' },
              { n:'19', l:'Établissements' },
              { n:'FREE', l:'Accès' },
            ].map(s => (
              <div key={s.l} className="stat">
                <div className="stat-n">{s.n}</div>
                <div className="stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHOOLS */}
      <section className="section">
        <div className="section-eyebrow">// établissements couverts</div>
        <div className="section-head">
          <h2 className="section-title">Couverture <span>complète</span><br />de la région</h2>
          <button className="section-link" onClick={() => navigate('/browse')}>Voir tous les modules</button>
        </div>
        <div className="school-grid">
          {SCHOOLS.map(s => (
            <div key={s.id} className="school-card" onClick={() => navigate(`/browse?uni=${s.id}`)}>
              <div className="school-row1">
                <span className="school-abbr">{s.abbr}</span>
                <span className={`school-badge ${badgeClass(s.type)}`}>{badgeLabel(s.type)}</span>
              </div>
              <div className="school-name">{s.name}</div>
              <div className="school-meta">
                <span className="school-meta-item"><b>{s.facs}</b> facultés</span>
                <span className="school-meta-item"><b>{s.fils}</b> filières</span>
                <span className="school-city">{s.city}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* METRICS */}
      <div className="metrics">
        <div className="metrics-inner">
          {[
            { v:'762+',  l:'Modules structurés',    s:'Organisés par filière et semestre' },
            { v:'19',    l:'Établissements',         s:'Toutes les grandes écoles' },
            { v:'48',    l:'Filières couvertes',     s:'Licence, Ingénieur, Master' },
            { v:'0 MAD', l:'Coût d\'accès',          s:'Gratuit pour tous les étudiants' },
          ].map(m => (
            <div key={m.l}>
              <div className="metric-val">{m.v}</div>
              <div className="metric-label">{m.l}</div>
              <div className="metric-sub">{m.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="how-section">
        <div className="section-eyebrow">// comment ça marche</div>
        <h2 className="section-title" style={{marginBottom:0}}>
          Simple.{' '}
          <span style={{background:'linear-gradient(90deg,#7BB3FF,#2DD4BF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
            Rapide. Gratuit.
          </span>
        </h2>
        <div className="steps">
          {STEPS.map(s => (
            <div key={s.n} className="step">
              <div className="step-num">ÉTAPE {s.n}</div>
              <div className="step-bar" />
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="cta-wrap">
        <div className="cta-block">
          <div>
            <div className="cta-label">// contribue à la communauté</div>
            <h2 className="cta-title">Tu as des annales ?<br /><span>Partage-les avec ta promo.</span></h2>
            <p className="cta-desc">
              Chaque document uploadé aide des dizaines d'étudiants. Upload tes examens,
              gagne des points. La plateforme grandit grâce à toi.
            </p>
          </div>
          <div className="cta-actions">
            <button className="btn-primary" onClick={() => navigate('/register')}>Créer un compte</button>
            <button className="btn-outline" onClick={() => navigate('/upload')}>Uploader un document</button>
          </div>
        </div>
      </div>

      {/* FLOATING TIP BUTTON */}
      <div style={{ position:'fixed', bottom:'2rem', right:'2rem', zIndex:100 }}>
        <button
          onClick={() => window.open('https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID', '_blank')}
          style={{ background:'linear-gradient(135deg,#FBD34D,#F59E0B)', color:'#02040A', border:'none', borderRadius:100, padding:'12px 20px', fontSize:'0.85rem', fontWeight:700, cursor:'pointer', fontFamily:"'Outfit',sans-serif", display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 20px rgba(251,211,77,0.35)', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(251,211,77,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0) scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(251,211,77,0.35)' }}
        >
          ☕ Soutenir le projet
        </button>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">9raw<b>Zid</b>9ra</div>
            <div className="footer-tagline">La plateforme de partage de documents pour les étudiants marocains.</div>
          </div>
          <div>
            <div className="footer-col-title">Liens</div>
            <button className="footer-link" onClick={() => navigate('/browse')}>Explorer les modules</button>
            <button className="footer-link" onClick={() => navigate('/upload')}>Uploader un document</button>
            <button className="footer-link" onClick={() => navigate('/senpai')}>Senpai Zone</button>
            <button className="footer-link" onClick={() => navigate('/ai')}>IA Coach</button>
          </div>
          <div>
            <div className="footer-col-title">Application mobile</div>
            <div style={{ background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:10, padding:'1rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.82rem', color:'#94A3B8', marginBottom:8 }}>📱 L'app mobile arrive bientôt sur iOS & Android.</div>
              <button
                onClick={() => window.open("https://wa.me/212677246703?text=Je veux être notifié quand l'app 9rawZid9ra sera disponible", '_blank')}
                style={{ background:'rgba(79,142,247,0.12)', border:'1px solid rgba(79,142,247,0.25)', color:'#7BB3FF', borderRadius:7, padding:'6px 14px', fontSize:'0.78rem', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:600 }}
              >Me notifier</button>
            </div>
            <div style={{ fontSize:'0.72rem', color:'#4A5568', fontFamily:'DM Mono,monospace' }}>
              Développé par <span style={{ color:'#7BB3FF' }}>GAGA Saad</span>
            </div>
            <div style={{ fontSize:'0.7rem', color:'#4A5568', marginTop:2, fontFamily:'DM Mono,monospace' }}>saadga2003@gmail.com</div>
          </div>
        </div>
        <div className="footer-bar">
          <div className="footer-copy">© 2025 9rawZid9ra — Fait pour les étudiants marocains</div>
          <div className="footer-bar-links">
            <button className="footer-bar-link" onClick={() => window.open('https://wa.me/212677246703', '_blank')}>WhatsApp</button>
            <button className="footer-bar-link" onClick={() => window.location.href='mailto:saadga2003@gmail.com'}>Contact</button>
          </div>
        </div>
      </footer>
    </div>
  )
}