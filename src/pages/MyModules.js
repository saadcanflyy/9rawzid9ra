import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:#02040A; color:#E2E8F0; font-family:'Outfit',sans-serif; min-height:100vh; }

  .mm-page { min-height:100vh; background:#02040A; }

  .mm-header {
    max-width:860px; margin:0 auto; padding:2rem 1.25rem 1rem;
  }
  .mm-label {
    font-family:'DM Mono',monospace; font-size:0.6rem; color:#4A5568;
    letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;
  }
  .mm-title {
    font-size:1.6rem; font-weight:700; color:#FFFFFF; margin-bottom:6px;
  }
  .mm-sub { font-size:0.85rem; color:#4A5568; }

  .mm-grid {
    max-width:860px; margin:0 auto; padding:0 1.25rem 3rem;
    display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px;
  }

  .mm-card {
    background:#070C18; border:1px solid #1C2A45; border-radius:12px;
    padding:16px 18px; display:flex; flex-direction:column; gap:10px;
    transition:border-color 0.15s;
    cursor:pointer;
  }
  .mm-card:hover { border-color:#2D4A7A; }

  .mm-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
  .mm-card-name { font-size:0.95rem; font-weight:600; color:#FFFFFF; line-height:1.35; }
  .mm-card-remove {
    flex-shrink:0; background:none; border:none; color:#4A5568; cursor:pointer;
    padding:2px; border-radius:4px; display:flex; align-items:center;
    transition:color 0.15s;
  }
  .mm-card-remove:hover { color:#F87171; }

  .mm-card-tags { display:flex; flex-wrap:wrap; gap:6px; }
  .mm-tag {
    font-family:'DM Mono',monospace; font-size:0.6rem; font-weight:500;
    padding:3px 8px; border-radius:4px; letter-spacing:0.5px;
  }
  .mm-tag-sem { background:rgba(79,142,247,0.1); color:#7BB3FF; border:1px solid rgba(79,142,247,0.2); }
  .mm-tag-fil { background:rgba(45,212,191,0.08); color:#2DD4BF; border:1px solid rgba(45,212,191,0.15); }
  .mm-tag-uni { background:rgba(148,163,184,0.08); color:#94A3B8; border:1px solid rgba(148,163,184,0.12); }

  .mm-card-footer {
    display:flex; align-items:center; justify-content:space-between;
    border-top:1px solid #1C2A45; padding-top:10px;
    font-family:'DM Mono',monospace; font-size:0.65rem; color:#4A5568;
  }

  .mm-empty {
    max-width:500px; margin:4rem auto; padding:0 1.25rem;
    text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px;
  }
  .mm-empty-icon { font-size:2.5rem; opacity:0.3; }
  .mm-empty-title { font-size:1.1rem; font-weight:600; color:#E2E8F0; }
  .mm-empty-sub { font-size:0.82rem; color:#4A5568; line-height:1.6; }
  .mm-empty-btn {
    margin-top:8px; background:linear-gradient(135deg,#4F8EF7,#3A6ED4);
    color:#fff; border:none; border-radius:9px; padding:'10px 24px';
    font-size:0.875rem; font-weight:600; cursor:pointer;
    font-family:'Outfit',sans-serif; padding:10px 24px;
  }
`

export default function MyModules() {
  const navigate = useNavigate()
  const [bookmarks, setBookmarks] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/login', { state: { from: '/my-modules' } }); return }
      loadBookmarks(user.id)
    })
  }, []) // eslint-disable-line

  const loadBookmarks = async (uid) => {
    const { data } = await supabase
      .from('module_bookmarks')
      .select(`
        id, created_at,
        modules(
          id, name, semester,
          filieres(name, faculties(universities(name)))
        )
      `)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (data) {
      const valid = data.filter(b => b.modules)
      // fetch doc counts
      const moduleIds = valid.map(b => b.modules.id)
      let counts = {}
      if (moduleIds.length) {
        const { data: docs } = await supabase
          .from('documents')
          .select('module_id')
          .in('module_id', moduleIds)
          .eq('is_verified', true)
        if (docs) docs.forEach(d => { counts[d.module_id] = (counts[d.module_id] || 0) + 1 })
      }
      setBookmarks(valid.map(b => ({ ...b, docCount: counts[b.modules.id] || 0 })))
    }
    setLoading(false)
  }

  const handleRemove = async (e, bookmarkId) => {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('module_bookmarks').delete().eq('id', bookmarkId).eq('user_id', user.id)
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
  }

  return (
    <div className="mm-page">
      <style>{css}</style>
      <Navbar />

      <div className="mm-header">
        <div className="mm-label">// mes modules</div>
        <div className="mm-title">Modules sauvegardés</div>
        {!loading && bookmarks.length > 0 && (
          <div className="mm-sub">{bookmarks.length} module{bookmarks.length > 1 ? 's' : ''} sauvegardé{bookmarks.length > 1 ? 's' : ''}</div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', fontFamily:'DM Mono,monospace', fontSize:'0.72rem', color:'#4A5568' }}>
          // chargement...
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="mm-empty">
          <div className="mm-empty-icon">🔖</div>
          <div className="mm-empty-title">Aucun module sauvegardé</div>
          <div className="mm-empty-sub">
            Sauvegarde des modules depuis leur page pour les retrouver ici rapidement.
          </div>
          <button className="mm-empty-btn" onClick={() => navigate('/browse')}>
            Explorer les modules
          </button>
        </div>
      ) : (
        <div className="mm-grid">
          {bookmarks.map(b => {
            const mod = b.modules
            const fil = mod.filieres
            const filName = fil?.name
            const uniName = fil?.faculties?.universities?.name
            return (
              <div key={b.id} className="mm-card" onClick={() => navigate(`/module/${mod.id}`)}>
                <div className="mm-card-top">
                  <div className="mm-card-name">{mod.name}</div>
                  <button
                    className="mm-card-remove"
                    title="Retirer des favoris"
                    onClick={e => handleRemove(e, b.id)}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="mm-card-tags">
                  <span className="mm-tag mm-tag-sem">{mod.semester}</span>
                  {filName && <span className="mm-tag mm-tag-fil">{filName}</span>}
                  {uniName && <span className="mm-tag mm-tag-uni">{uniName}</span>}
                </div>
                <div className="mm-card-footer">
                  <span>{b.docCount} document{b.docCount !== 1 ? 's' : ''}</span>
                  <span style={{ color:'#1C2A45' }}>→</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
