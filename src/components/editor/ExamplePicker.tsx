import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { EXAMPLES } from '@/lib/examples'
import type { Dialect } from '@/types'

export function ExamplePicker() {
  const setQuery = useAppStore((s) => s.setQuery)
  const setDialect = useAppStore((s) => s.setDialect)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const examples = EXAMPLES  // show all; group by dialect visually

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const pick = (ex: typeof EXAMPLES[0]) => {
    setDialect(ex.dialect as Dialect)
    setQuery(ex.sql)
    setOpen(false)
  }

  const grouped = ['postgresql', 'mysql', 'sqlserver'] as Dialect[]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Pick an example SQL query"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        Examples ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          width: 300,
          maxHeight: 380,
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 100,
        }}>
          {grouped.map(d => {
            const group = examples.filter(e => e.dialect === d)
            const DIALECT_LABEL: Record<Dialect, string> = {
              postgresql: 'PostgreSQL',
              mysql: 'MySQL',
              sqlserver: 'SQL Server',
            }
            return (
              <div key={d}>
                <div style={{
                  padding: '6px 12px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                }}>
                  {DIALECT_LABEL[d]}
                </div>
                {group.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => pick(ex)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {ex.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {ex.description}
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
