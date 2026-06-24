import { useState, useRef, useCallback, useEffect } from 'react'
import { Code2, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { SNIPPETS } from '@/lib/snippets'

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

function useSnippetPicker() {
  const setPendingSnippet = useAppStore(s => s.setPendingSnippet)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDropdownClose(ref, open, close)

  const handleOpen = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }, [])

  const handlePick = useCallback((sql: string) => {
    setPendingSnippet(sql)
    setOpen(false)
  }, [setPendingSnippet])

  return { open, pos, ref, btnRef, handleOpen, handlePick }
}

function SnippetItem({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
      background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{description}</div>
    </button>
  )
}

function Dropdown({ pos, onPick }: { pos: { top: number; left: number }; onPick: (sql: string) => void }) {
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left, width: 260, maxHeight: 340,
      overflowY: 'auto', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9999,
    }}>
      <div style={{
        padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)',
      }}>
        Templates
      </div>
      {SNIPPETS.map(s => (
        <SnippetItem key={s.id} title={s.title} description={s.description} onClick={() => onPick(s.sql)} />
      ))}
    </div>
  )
}

export function SnippetPicker() {
  const { open, pos, ref, btnRef, handleOpen, handlePick } = useSnippetPicker()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Insert a SQL snippet"
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6,
          padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <Code2 size={11} /> Snippets <ChevronDown size={12} />
      </button>
      {open && <Dropdown pos={pos} onPick={handlePick} />}
    </div>
  )
}
