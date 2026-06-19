import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function HistoryPicker() {
  const history = useAppStore((s) => s.history)
  const setQuery = useAppStore((s) => s.setQuery)
  const setDialect = useAppStore((s) => s.setDialect)
  const clearHistory = useAppStore((s) => s.clearHistory)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (history.length === 0) return null

  const DIALECT_LABEL: Record<string, string> = {
    postgresql: 'PG', mysql: 'MY', sqlserver: 'SS',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="View query history"
        title="Recent queries"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}
      >
        🕐 {history.length}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          width: 320, maxHeight: 300, overflowY: 'auto',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recent Queries
            </span>
            <button
              onClick={() => { clearHistory(); setOpen(false) }}
              aria-label="Clear history"
              style={{ fontSize: 10, color: '#E24B4A', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            >
              Clear
            </button>
          </div>
          {history.map((entry, i) => (
            <button
              key={i}
              onClick={() => { setDialect(entry.dialect); setQuery(entry.query); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3,
                  background: 'var(--accent)', color: '#fff', fontWeight: 700,
                }}>
                  {DIALECT_LABEL[entry.dialect] ?? entry.dialect}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <code style={{
                fontSize: 11, color: 'var(--text-primary)', display: 'block',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 280,
              }}>
                {entry.query.replace(/\s+/g, ' ').trim().substring(0, 80)}
              </code>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
