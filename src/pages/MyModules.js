import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar'
import { ModuleCard, EmptyState, Button, Card, Skeleton, Toast } from '../design-system/ui'

const css = `
  .mm-header { max-width: 960px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-4); }
  .mm-grid { max-width: 960px; margin: 0 auto; padding: 0 var(--space-6) var(--space-12); display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-4); }
`

export default function MyModules() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Mes modules — 9rawZid9ra'
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) { sessionStorage.setItem('redirectAfterLogin', '/my-modules'); navigate('/login', { state: { from: '/my-modules' } }); return }
      setUserId(user.id)
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
      const moduleIds = valid.map(b => b.modules.id)
      let statsByMod = {}
      if (moduleIds.length) {
        const { data: docs } = await supabase
          .from('documents')
          .select('module_id, doc_type')
          .in('module_id', moduleIds)
          .eq('is_verified', true)
        for (const d of (docs || [])) {
          if (!statsByMod[d.module_id]) statsByMod[d.module_id] = { types: new Set(), count: 0 }
          statsByMod[d.module_id].types.add(d.doc_type)
          statsByMod[d.module_id].count++
        }
      }
      setBookmarks(valid.map(b => ({ ...b, stats: statsByMod[b.modules.id] || { types: new Set(), count: 0 } })))
    }
    setLoading(false)
  }

  const handleRemove = async (b) => {
    setBookmarks(prev => prev.filter(x => x.id !== b.id))
    await supabase.from('module_bookmarks').delete().eq('id', b.id).eq('user_id', userId)

    toast.custom((t) => (
      <div style={{ opacity: t.visible ? 1 : 0, transition: 'opacity .15s ease' }}>
        <Toast tone="info" title="Module retiré">
          <Button variant="link" size="sm" onClick={async () => {
            toast.dismiss(t.id)
            const { data: restored } = await supabase
              .from('module_bookmarks').insert({ user_id: userId, module_id: b.modules.id })
              .select('id, created_at').single()
            if (restored) setBookmarks(prev => [{ ...b, id: restored.id, created_at: restored.created_at }, ...prev])
          }}>Annuler</Button>
        </Toast>
      </div>
    ), { duration: 5000 })
  }

  return (
    <div>
      <style>{css}</style>
      <Navbar activePage="my-modules" />

      <div className="mm-header">
        <span className="t-eyebrow qz-subtle">Mes modules</span>
        <h1 className="t-h1" style={{ margin: '4px 0 4px' }}>Modules suivis</h1>
        <p className="t-body qz-muted">Retrouve tes modules et les nouveaux documents en un clic.</p>
      </div>

      {loading ? (
        <div className="mm-grid">
          {[...Array(6)].map((_, i) => <Card key={i}><Skeleton height={110} /></Card>)}
        </div>
      ) : bookmarks.length === 0 ? (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-12) var(--space-6)' }}>
          <EmptyState icon="bookmark" title="Tu ne suis aucun module">
            Suis tes modules pour recevoir les nouveaux examens et les retrouver ici.
            <div style={{ marginTop: 'var(--space-4)' }}><Button variant="primary" as={Link} to="/browse">Explorer les modules</Button></div>
          </EmptyState>
        </div>
      ) : (
        <div className="mm-grid">
          {bookmarks.map(b => {
            const mod = b.modules
            const fil = mod.filieres
            return (
              <ModuleCard
                key={b.id}
                linkAs={Link}
                href={`/module/${mod.id}`}
                name={mod.name}
                semester={mod.semester}
                school={fil?.faculties?.universities?.name}
                filiere={fil?.name}
                types={[...b.stats.types]}
                docs={b.stats.count}
                completeness={Math.round((b.stats.types.size / 10) * 100)}
                action={
                  <Button
                    variant="ghost" size="sm" iconOnly icon="x"
                    aria-label={`Ne plus suivre ${mod.name}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(b) }}
                  />
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
