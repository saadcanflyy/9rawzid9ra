import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { Input, Chip, Badge, Icon } from '../design-system/ui'
import { professorNameParts, isUsableProfessorName } from '../lib/professorName'

// Combobox: search_professors() for existing profiles, propose_professor() to add a new
// pending one. Value shape: { id, display_name } | null.
export default function ProfessorPicker({ label = 'Professeur (optionnel)', value, onChange, universityId, facultyId, disableAdd }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [highlight, setHighlight] = useState(-1)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef(null)

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) { setOptions([]); return }
    const t = setTimeout(() => {
      supabase.rpc('search_professors', { p_query: trimmed, p_university_id: universityId || null, p_limit: 6 })
        .then(({ data }) => setOptions(data || []))
    }, 200)
    return () => clearTimeout(t)
  }, [trimmed, universityId])

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const canAdd = !disableAdd && isUsableProfessorName(trimmed) && !options.some(o => (o.display_name || '').toLowerCase() === trimmed.toLowerCase())
  const listLength = options.length + (canAdd ? 1 : 0)

  const selectExisting = (opt) => {
    onChange({ id: opt.id, display_name: opt.display_name })
    setQuery(''); setOpen(false); setHighlight(-1)
  }

  const selectAdd = async () => {
    setBusy(true)
    const { data: id, error } = await supabase.rpc('propose_professor', {
      p_name: trimmed, p_university_id: universityId || null, p_faculty_id: facultyId || null,
    })
    setBusy(false)
    if (error) return
    onChange({ id, display_name: professorNameParts(trimmed).displayName })
    setQuery(''); setOpen(false); setHighlight(-1)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(h + 1, listLength - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight < 0) return
      if (highlight < options.length) selectExisting(options[highlight])
      else selectAdd()
    } else if (e.key === 'Escape') { setOpen(false); setHighlight(-1) }
  }

  if (value && (value.id || value.display_name)) {
    return (
      <div className="qz-field">
        <label className="qz-label">{label}</label>
        <div>
          <Chip onClick={() => onChange(null)}>{value.display_name} <Icon name="x" size={12} /></Chip>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="qz-professor-picker">
      <Input
        label={label}
        placeholder="Ex : Dr. Alaoui, Pr. Benali…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="professor-picker-listbox"
        aria-autocomplete="list"
        aria-activedescendant={highlight >= 0 ? `pp-opt-${highlight}` : undefined}
      />
      {open && trimmed.length >= 2 && listLength > 0 && (
        <div id="professor-picker-listbox" role="listbox" className="qz-dropdown qz-professor-picker__list">
          {options.map((o, i) => (
            <button key={o.id} id={`pp-opt-${i}`} type="button" role="option" aria-selected={highlight === i}
              className="qz-dropdown__item" style={{ width: '100%', background: highlight === i ? 'var(--surface-2)' : undefined }}
              onMouseEnter={() => setHighlight(i)} onMouseDown={() => selectExisting(o)}>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <div className="t-body">{o.display_name}</div>
                <div className="t-caption qz-subtle">
                  {[o.university_name,
                    o.documents_count != null ? `${o.documents_count} document${o.documents_count > 1 ? 's' : ''}` : null,
                    o.modules_count != null ? `${o.modules_count} module${o.modules_count > 1 ? 's' : ''}` : null]
                    .filter(Boolean).join(' · ')}
                </div>
              </div>
              {o.status === 'pending' && <Badge tone="neutral">À vérifier</Badge>}
            </button>
          ))}
          {canAdd && (
            <button id={`pp-opt-${options.length}`} type="button" role="option" aria-selected={highlight === options.length}
              className="qz-dropdown__item" style={{ width: '100%', background: highlight === options.length ? 'var(--surface-2)' : undefined }}
              onMouseEnter={() => setHighlight(options.length)} onMouseDown={selectAdd} disabled={busy}>
              <div style={{ textAlign: 'left' }}>
                <div className="t-body">Ajouter « {professorNameParts(trimmed).displayName} »</div>
                <div className="t-caption qz-subtle">Il sera vérifié par l'équipe.</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
