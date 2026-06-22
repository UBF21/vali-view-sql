import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { History } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { DIALECTS } from './DialectSelector'

const DIALECT_META = Object.fromEntries(DIALECTS.map(d => [d.value, d]))

// ── Sub-components ────────────────────────────────────────────────────────────

function DialectBadge({ dialect }: { dialect: string }) {
  const meta = DIALECT_META[dialect]
  return (
    <span style={{
      fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
      background: meta?.bg ?? 'var(--elevated)',
      color: meta?.color ?? 'var(--text-1)',
      border: `1px solid ${meta?.border ?? 'var(--border)'}`,
    }}>
      {meta?.abbr ?? dialect.toUpperCase()}
    </span>
  )
}

export interface HistoryEntry { query: string; dialect: string; timestamp: number }

function DropdownHeader({ onClear }: { onClear: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 12px', borderBottom: '1px solid var(--border)',
      background: 'var(--elevated)', borderRadius: '8px 8px 0 0',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Recent Queries
      </span>
      <button onClick={onClear} aria-label="Clear history"
        style={{ fontSize: 10, color: '#E24B4A', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
        Clear
      </button>
    </div>
  )
}

function EntryRow({ entry, isLast, onClick }: { entry: HistoryEntry; isLast: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left',
      padding: '9px 12px', background: 'transparent', border: 'none',
      borderBottom: isLast ? 'none' : '1px solid var(--border)', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <DialectBadge dialect={entry.dialect} />
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <code style={{ fontSize: 11, color: 'var(--text-1)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.query.replace(/\s+/g, ' ').trim().substring(0, 90)}
      </code>
    </button>
  )
}

interface DropdownProps { rect: DOMRect; entries: HistoryEntry[]; onSelect: (e: HistoryEntry) => void; onClear: () => void }

function Dropdown({ rect, entries, onSelect, onClear }: DropdownProps) {
  return createPortal(
    <div style={{
      position: 'fixed', top: rect.bottom + 4, left: rect.left,
      width: 320, maxHeight: 320, overflowY: 'auto',
      background: 'var(--surface)', border: '1px solid var(--border-hi)',
      borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.28)', zIndex: 9999,
    }}>
      <DropdownHeader onClear={onClear} />
      {entries.map((e, i) => <EntryRow key={i} entry={e} isLast={i === entries.length - 1} onClick={() => onSelect(e)} />)}
    </div>,
    document.body,
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useDropdownAnchor() {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
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

  return { open, rect, btnRef, toggle, close: () => setOpen(false) }
}

// ── Public component ──────────────────────────────────────────────────────────

export function HistoryPicker() {
  const history = useAppStore((s) => s.history)
  const setQuery = useAppStore((s) => s.setQuery)
  const setDialect = useAppStore((s) => s.setDialect)
  const clearHistory = useAppStore((s) => s.clearHistory)
  const { open, rect, btnRef, toggle, close } = useDropdownAnchor()

  if (history.length === 0) return null

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label="View query history"
        aria-expanded={open} title="Recent queries"
        style={{
          background: 'var(--elevated)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
          fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5,
        }}>
        <History size={13} />{history.length}
      </button>
      {open && rect && (
        <Dropdown rect={rect} entries={history}
          onSelect={(e) => { setDialect(e.dialect as never); setQuery(e.query); close() }}
          onClear={() => { clearHistory(); close() }} />
      )}
    </>
  )
}
