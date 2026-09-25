import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { SearchBar, Sheet } from '../design-system/ui'
import { parseQuery, getRecentSearches, addRecentSearch } from '../lib/searchParser'

const POPULAR = ['Analyse 1', 'Algorithmique', 'Droit Civil', 'Comptabilité', 'POO Java', 'Marketing']
const KIND_LABEL = { module: 'Modules', filiere: 'Filières', university: 'Écoles' }

export default function SearchAutocomplete({ inputRef: externalRef, placeholder, shortcut, variant, onSubmit: externalOnSubmit, embedded }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [highlight, setHighlight] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const localRef = useRef(null)
  const inputRef = externalRef || localRef
  const wrapRef = useRef(null)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const parsed = parseQuery(value)
  const trimmed = value.trim()

  useEffect(() => {
    if (trimmed.length < 2) { setSuggestions([]); return }
    const t = setTimeout(() => {
      supabase.rpc('search_suggest', { p_prefix: trimmed }).then(({ data }) => setSuggestions(data || []))
    }, 150)
    return () => clearTimeout(t)
  }, [trimmed])

  const showAsSheet = isMobile && !embedded

  useEffect(() => {
    if (!open || showAsSheet) return
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, showAsSheet])

  const recent = trimmed === '' ? getRecentSearches() : []
  const flatList = trimmed === ''
    ? [...recent.map((r) => ({ kind: 'recent', label: r })), ...POPULAR.map((p) => ({ kind: 'recent', label: p }))]
    : suggestions

  const openResult = (item) => {
    if (!item) return
    if (item.kind === 'recent') {
      addRecentSearch(item.label)
      if (externalOnSubmit) externalOnSubmit(item.label)
      else navigate(`/browse?q=${encodeURIComponent(item.label)}`)
      setValue(''); setOpen(false)
      return
    }
    addRecentSearch(value)
    if (item.kind === 'module') navigate(`/module/${item.slug || item.id}`)
    else if (item.kind === 'filiere') navigate(`/browse?fil=${item.id}`)
    else if (item.kind === 'university') navigate(`/browse?uni=${item.id}`)
    setValue(''); setOpen(false)
  }

  const submitFreeText = () => {
    if (!trimmed) return
    addRecentSearch(trimmed)
    if (externalOnSubmit) externalOnSubmit(trimmed)
    else navigate(`/browse?q=${encodeURIComponent(trimmed)}`)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, flatList.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') {
      if (highlight >= 0 && flatList[highlight]) openResult(flatList[highlight])
      else submitFreeText()
    } else if (e.key === 'Escape') { setOpen(false); setHighlight(-1) }
  }

  const renderRow = (item, i) => (
    <button
      key={`${item.kind}-${item.id ?? item.label}`}
      id={`sa-opt-${i}`}
      type="button"
      role="option"
      aria-selected={highlight === i}
      className="qz-dropdown__item"
      style={{ width: '100%', background: highlight === i ? 'var(--surface-2)' : undefined }}
      onMouseEnter={() => setHighlight(i)}
      onMouseDown={() => openResult(item)}
    >
      <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
        <div>{item.label}</div>
        {item.sublabel && <div className="t-caption qz-subtle">{item.sublabel}</div>}
      </div>
      {item.docs_count != null && <span className="t-mono qz-subtle">{item.docs_count}</span>}
    </button>
  )

  const body = (
    <>
      {parsed.chips.length > 0 && (
        <div className="t-caption qz-subtle" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          Compris : {parsed.chips.map((c) => c.label).join(' · ')}
        </div>
      )}
      {trimmed === '' ? (
        <>
          {recent.length > 0 && <div className="t-eyebrow qz-subtle" style={{ padding: '8px 12px 4px' }}>Recherches récentes</div>}
          {recent.map((r, i) => renderRow({ kind: 'recent', label: r }, i))}
          <div className="t-eyebrow qz-subtle" style={{ padding: '8px 12px 4px' }}>Populaire</div>
          {POPULAR.map((p, i) => renderRow({ kind: 'recent', label: p }, recent.length + i))}
        </>
      ) : suggestions.length > 0 ? (
        ['module', 'filiere', 'university'].map((kind) => {
          const items = suggestions.filter((s) => s.kind === kind)
          if (items.length === 0) return null
          return (
            <div key={kind}>
              <div className="t-eyebrow qz-subtle" style={{ padding: '8px 12px 4px' }}>{KIND_LABEL[kind]}</div>
              {items.map((item) => renderRow(item, suggestions.indexOf(item)))}
            </div>
          )
        })
      ) : (
        <div style={{ padding: '8px 12px' }}><span className="t-body-sm qz-subtle">Entrée pour rechercher « {value} »</span></div>
      )}
    </>
  )

  const searchBarEl = (
    <SearchBar
      inputRef={inputRef}
      variant={variant}
      placeholder={placeholder}
      shortcut={shortcut}
      value={value}
      onChange={(e) => { setValue(e.target.value); setOpen(true); setHighlight(-1) }}
      onFocus={() => setOpen(true)}
      onKeyDown={onKeyDown}
      onSubmit={submitFreeText}
      role="combobox"
      aria-expanded={open}
      aria-controls="search-autocomplete-listbox"
      aria-autocomplete="list"
      aria-activedescendant={highlight >= 0 ? `sa-opt-${highlight}` : undefined}
    />
  )

  if (showAsSheet) {
    return (
      <div ref={wrapRef}>
        {searchBarEl}
        {open && (
          <Sheet title="Rechercher" onClose={() => setOpen(false)}>
            <div id="search-autocomplete-listbox" role="listbox">{body}</div>
          </Sheet>
        )}
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {searchBarEl}
      {open && (
        <div id="search-autocomplete-listbox" role="listbox" className="qz-dropdown qz-dropdown--wide"
          style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, width: 'auto', maxHeight: 360, overflowY: 'auto' }}>
          {body}
        </div>
      )}
    </div>
  )
}
