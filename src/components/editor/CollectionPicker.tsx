import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { BookMarked, Search, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { SaveQueryForm } from './SaveQueryForm'
import { DIALECTS } from './DialectSelector'

const DIALECT_META = Object.fromEntries(DIALECTS.map(d => [d.value, d]))

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SavedQuery {
  id: string; name: string; sql: string; dialect: string; tags: string[]
}

export interface SavedCollection {
  id: string; name: string; queries: SavedQuery[]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DialectBadge({ dialect }: { dialect: string }) {
  const meta = DIALECT_META[dialect]
  return (
    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: meta?.bg ?? 'var(--elevated)', color: meta?.color ?? 'var(--text-1)', border: `1px solid ${meta?.border ?? 'var(--border)'}` }}>
      {meta?.abbr ?? dialect.toUpperCase()}
    </span>
  )
}

function QueryTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div style={{ marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {tags.map(t => (
        <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--elevated)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>{t}</span>
      ))}
    </div>
  )
}

function QueryRow({ query, isLast, onClick }: { query: SavedQuery; isLast: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: isLast ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <DialectBadge dialect={query.dialect} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{query.name}</span>
      </div>
      <code style={{ fontSize: 10, color: 'var(--text-2)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {query.sql.replace(/\s+/g, ' ').trim().substring(0, 80)}
      </code>
      <QueryTags tags={query.tags} />
    </button>
  )
}

function CollectionHeader({ col, onDelete }: { col: SavedCollection; onDelete: (id: string) => void }) {
  return (
    <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--elevated)' }}>
      <span>{col.name} ({col.queries.length})</span>
      {col.id !== 'col_recent_migrated' && (
        <button onClick={() => onDelete(col.id)} aria-label={`Delete collection ${col.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E24B4A', padding: 2 }}>
          <Trash2 size={10} />
        </button>
      )}
    </div>
  )
}

function CollectionGroup({ col, onSelect, onDelete }: { col: SavedCollection; onSelect: (q: SavedQuery) => void; onDelete: (id: string) => void }) {
  return (
    <div>
      <CollectionHeader col={col} onDelete={onDelete} />
      {col.queries.map((q, i) => (
        <QueryRow key={q.id} query={q} isLast={i === col.queries.length - 1} onClick={() => onSelect(q)} />
      ))}
    </div>
  )
}

function DropdownSearch({ search, onChange, onShowSave }: { search: string; onChange: (v: string) => void; onShowSave: () => void }) {
  return (
    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--elevated)', display: 'flex', gap: 6, alignItems: 'center' }}>
      <Search size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      <input value={search} onChange={e => onChange(e.target.value)} placeholder="Search queries..." autoFocus
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-1)' }} />
      <button onClick={onShowSave} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--a)', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>
        + Save
      </button>
    </div>
  )
}

function DropdownList({ filtered, search, onSelect, onDelete }: { filtered: SavedCollection[]; search: string; onSelect: (q: SavedQuery) => void; onDelete: (id: string) => void }) {
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {filtered.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
          {search ? 'No queries match your search' : 'No saved queries yet'}
        </div>
      )}
      {filtered.map(col => (
        <CollectionGroup key={col.id} col={col} onSelect={onSelect} onDelete={onDelete} />
      ))}
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function usePickerState() {
  const [open, setOpen]         = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [search, setSearch]     = useState('')
  const [rect, setRect]         = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = useCallback(() => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(v => !v)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return { open, setOpen, showSave, setShowSave, search, setSearch, rect, btnRef, toggle }
}

// ── Public component ──────────────────────────────────────────────────────────

export function CollectionPicker() {
  const collections      = useAppStore((s) => s.collections)
  const setQuery         = useAppStore((s) => s.setQuery)
  const setDialect       = useAppStore((s) => s.setDialect)
  const removeCollection = useAppStore((s) => s.removeCollection)
  const { open, setOpen, showSave, setShowSave, search, setSearch, rect, btnRef, toggle } = usePickerState()

  const totalQueries = collections.reduce((sum, c) => sum + c.queries.length, 0)
  const filtered = search.trim()
    ? collections.map(c => ({ ...c, queries: c.queries.filter(q => q.name.toLowerCase().includes(search.toLowerCase()) || q.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) })).filter(c => c.queries.length > 0)
    : collections

  const handleSelect = (q: SavedQuery) => { setDialect(q.dialect as never); setQuery(q.sql); setOpen(false) }

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label="Query collections" aria-expanded={open} title="Collections"
        style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <BookMarked size={13} />{totalQueries}
      </button>
      {open && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: 320, maxHeight: 400, background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showSave
            ? <SaveQueryForm onClose={() => setShowSave(false)} />
            : <><DropdownSearch search={search} onChange={setSearch} onShowSave={() => setShowSave(true)} /><DropdownList filtered={filtered} search={search} onSelect={handleSelect} onDelete={removeCollection} /></>
          }
        </div>,
        document.body,
      )}
    </>
  )
}
