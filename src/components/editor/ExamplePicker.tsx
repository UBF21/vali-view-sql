import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { EXAMPLES } from '@/lib/examples'
import type { Dialect } from '@/types'

const DIALECT_LABEL: Record<Dialect, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlserver: 'SQL Server',
}

function useDropdownClose(ref: React.RefObject<HTMLDivElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, ref])
}

function ExampleItem({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="example-item" style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
      background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
      cursor: 'pointer', transition: 'background 0.1s',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{description}</div>
    </button>
  )
}

function DropdownList({ dialect, onPick }: { dialect: Dialect; onPick: (sql: string) => void }) {
  const examples = EXAMPLES.filter(e => e.dialect === dialect)
  return (
    <div>
      <div style={{
        padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)',
      }}>
        {DIALECT_LABEL[dialect]}
      </div>
      {examples.map(ex => (
        <ExampleItem key={ex.id} title={ex.title} description={ex.description} onClick={() => onPick(ex.sql)} />
      ))}
    </div>
  )
}

function Dropdown({ pos, dialect, onPick }: { pos: { top: number; left: number }; dialect: Dialect; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: 300, maxHeight: 380,
      overflowY: 'auto', background: 'var(--surface, var(--bg-surface))',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>
      <DropdownList dialect={dialect} onPick={onPick} />
    </div>
  )
}

export function ExamplePicker() {
  const setQuery = useAppStore(s => s.setQuery)
  const dialect = useAppStore(s => s.dialect)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const close = useCallback(() => setOpen(false), [])
  useDropdownClose(ref, open, close)

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  const handlePick = useCallback((sql: string) => { setQuery(sql); setOpen(false) }, [setQuery])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button ref={btnRef} onClick={handleOpen} aria-label="Pick an example SQL query" style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
        color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        Examples <ChevronDown size={12} />
      </button>
      {open && <Dropdown pos={pos} dialect={dialect} onPick={handlePick} />}
    </div>
  )
}
