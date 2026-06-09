import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:#02040A; color:#E2E8F0; font-family:'Outfit',sans-serif; }
`

const FEATURES = [
  ['📄', 'Expliqueur de documents'],
  ['❓', 'Générateur de quiz personnalisé'],
  ['📅', "Plan d'étude jour par jour"],
  ['🔍', 'Recherche dans les posts Senpai'],
  ['📊', 'Carte de difficulté par module'],
  ['💼', 'Aide CV + lettre de motivation stage'],
]

export default function AICoach() {
  return (
    <div style={{ minHeight:'100vh', background:'#02040A', display:'flex', flexDirection:'column' }}>
      <style>{css}</style>
      <Navbar activePage="ai" />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
        <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>

          <div style={{ width:72, height:72, borderRadius:18, background:'rgba(79,142,247,0.08)', border:'1px solid rgba(79,142,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem', fontSize:'2rem' }}>
            🤖
          </div>

          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.65rem', color:'#4F8EF7', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'0.75rem' }}>
            // bientôt disponible
          </div>

          <h1 style={{ fontSize:'1.75rem', fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.5px', marginBottom:'0.75rem', lineHeight:1.2 }}>
            L'IA Coach arrive<br />
            <span style={{ background:'linear-gradient(90deg,#7BB3FF,#2DD4BF)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              très bientôt.
            </span>
          </h1>

          <p style={{ fontSize:'0.9rem', color:'#94A3B8', lineHeight:1.7, marginBottom:'2rem' }}>
            Quiz intelligents, plans d'étude personnalisés, analyse de tes examens et bien plus.
            On prépare quelque chose de puissant.
          </p>

          <div style={{ background:'#070C18', border:'1px solid #1C2A45', borderRadius:14, padding:'1.25rem', marginBottom:'1.5rem', textAlign:'left' }}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.62rem', color:'#4A5568', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'1rem' }}>
              Ce qui arrive
            </div>
            {FEATURES.map(([icon, text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span>{icon}</span>
                <span style={{ fontSize:'0.82rem', color:'#94A3B8' }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:10, padding:'1rem', marginBottom:'1.5rem' }}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'0.7rem', color:'#7BB3FF', marginBottom:4 }}>
              Prix de lancement prévu
            </div>
            <div style={{ fontSize:'1.5rem', fontWeight:700, color:'#FFFFFF', fontFamily:'DM Mono,monospace' }}>
              39 MAD<span style={{ fontSize:'0.9rem', color:'#4A5568', fontWeight:400 }}>/mois</span>
            </div>
          </div>

          <button
            onClick={() => window.open("https://wa.me/212677246703?text=Bonjour, je veux être notifié quand l'IA Coach de 9rawZid9ra sera disponible", '_blank')}
            style={{ width:'100%', background:'linear-gradient(135deg,#4F8EF7,#3A6ED4)', color:'#FFFFFF', border:'none', borderRadius:10, padding:'13px', fontSize:'0.95rem', fontWeight:700, cursor:'pointer', fontFamily:"'Outfit',sans-serif", transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(79,142,247,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}
          >
            Me notifier au lancement
          </button>

        </div>
      </div>
    </div>
  )
}
