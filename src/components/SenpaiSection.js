import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { SenpaiCard, Skeleton, Button } from '../design-system/ui'
import { notify } from '../design-system/toast'
import { levelFor } from '../lib/reputation'
import { helpWithLabel, responseLabel, contactSenpai, senpaiContactErrorMessage } from '../lib/senpai'
import { cachedRpc } from '../lib/rpcCache'

// Card list of up to 3 senpais for one filière, with a recruiting fallback when
// there are none. Used on Home, the Browse filière view and the onboarding reveal.
export default function SenpaiSection({ filiereId, filiereName, studentName, compact, recruitEligible, title }) {
  const [senpais, setSenpais] = useState(null)

  useEffect(() => {
    if (!filiereId) { setSenpais([]); return }
    setSenpais(null)
    cachedRpc(supabase, 'get_filiere_senpais', { p_filiere_id: filiereId }, 60000)
      .then(({ data, error }) => setSenpais(error ? [] : (data || [])))
  }, [filiereId])

  const handleContact = async (s) => {
    try {
      await contactSenpai(supabase, s, { studentName, filiereName })
    } catch (error) {
      notify.error(senpaiContactErrorMessage(error))
    }
  }

  if (senpais === null) return <Skeleton height={compact ? 56 : 76} />

  if (senpais.length === 0) {
    if (!recruitEligible) return null
    return (
      <div className="qz-senpai-empty">
        <p className="t-body-sm qz-muted">Pas encore de senpai pour ta filière.</p>
        <Button variant="secondary" size="sm" as={Link} to="/senpai?devenir=1">Deviens le premier</Button>
      </div>
    )
  }

  return (
    <div>
      {title && <span className="t-eyebrow qz-subtle" style={{ display: 'block', marginBottom: 8 }}>{title}</span>}
      {senpais.map((s) => {
        const lvl = levelFor(s.points)
        return (
          <SenpaiCard
            key={s.id}
            name={s.name || 'Étudiant'}
            founder={s.is_fondateur}
            tone={lvl.tone}
            icon={lvl.icon}
            levelName={lvl.name}
            semesterLabel={s.is_graduate ? 'Diplômé(e)' : s.semester_label}
            responseLabel={responseLabel(s.response_estimate)}
            helpWith={(s.help_with || []).map(helpWithLabel)}
            compact={compact}
            onContact={() => handleContact(s)}
          />
        )
      })}
    </div>
  )
}
