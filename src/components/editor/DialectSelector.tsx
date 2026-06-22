import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { siPostgresql, siMysql } from 'simple-icons'
import type { Dialect } from '@/types'

// ── Dialect icons ─────────────────────────────────────────────────────────────

function SimpleIcon({ icon, size = 24, color }: { icon: { path: string }; size?: number; color: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <path d={icon.path} />
    </svg>
  )
}

function PgIcon({ size = 24 }: { size?: number }) {
  return <SimpleIcon icon={siPostgresql} size={size} color={`#${siPostgresql.hex}`} />
}

function MyIcon({ size = 24 }: { size?: number }) {
  return <SimpleIcon icon={siMysql} size={size} color={`#${siMysql.hex}`} />
}

function MsIcon({ size = 24 }: { size?: number }) {
  return <img src="/icons/sqlserver.png" width={size} height={size} alt="SQL Server" style={{ objectFit: 'contain' }} />
}

// ── Dialect config ────────────────────────────────────────────────────────────

export interface DialectOption {
  value: Dialect
  label: string
  abbr: string
  desc: string
  color: string
  bg: string
  border: string
  Icon: (props: { size?: number }) => React.ReactElement
}

export const DIALECTS: DialectOption[] = [
  { value: 'postgresql', label: 'PostgreSQL', abbr: 'PG', desc: 'Open-source object-relational', color: `#${siPostgresql.hex}`, bg: 'rgba(65,105,225,0.12)', border: 'rgba(65,105,225,0.30)', Icon: PgIcon },
  { value: 'mysql',      label: 'MySQL',      abbr: 'MY', desc: 'Oracle open-source RDBMS',     color: `#${siMysql.hex}`,      bg: 'rgba(68,121,161,0.12)', border: 'rgba(68,121,161,0.30)', Icon: MyIcon },
  { value: 'sqlserver',  label: 'SQL Server', abbr: 'MS', desc: 'Microsoft enterprise RDBMS',   color: '#CC2927',               bg: 'rgba(204,41,39,0.12)',  border: 'rgba(204,41,39,0.30)',  Icon: MsIcon },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function DialectTrigger({ active, open, onClick }: { active: DialectOption; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`SQL dialect: ${active.label}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '4px 9px 4px 6px',
        background: 'var(--elevated)', border: '1px solid var(--border-hi)',
        borderRadius: 8, cursor: 'pointer', userSelect: 'none',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <active.Icon size={20} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{active.label}</span>
      <ChevronDown size={12} style={{ color: 'var(--text-3)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0, pointerEvents: 'none' }} />
    </button>
  )
}

function DialectRow({ d, isActive, onSelect }: { d: DialectOption; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      role="option"
      aria-selected={isActive}
      onClick={onSelect}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
        background: isActive ? 'var(--a-soft)' : 'transparent',
        border: isActive ? '1px solid var(--a-border)' : '1px solid transparent',
        transition: 'background 0.12s',
        userSelect: 'none',
      }}
    >
      <d.Icon size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--a)' : 'var(--text-1)' }}>{d.label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{d.desc}</div>
      </div>
      {isActive && <Check size={13} style={{ color: 'var(--a)', flexShrink: 0 }} />}
    </button>
  )
}

interface DropCoords { top: number; right: number }

function DialectDropdown({ value, onSelect, coords }: { value: Dialect; onSelect: (d: Dialect) => void; coords: DropCoords }) {
  return (
    <motion.div
      role="listbox"
      aria-label="Select SQL dialect"
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'fixed', top: coords.top, right: coords.right,
        width: 220, zIndex: 9999,
        background: 'var(--surface)', border: '1px solid var(--border-hi)',
        borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', padding: 4,
      }}
    >
      {DIALECTS.map(d => (
        <DialectRow key={d.value} d={d} isActive={d.value === value} onSelect={() => onSelect(d.value)} />
      ))}
    </motion.div>
  )
}

// ── Dropdown state hook ───────────────────────────────────────────────────────

function useDropdown(ref: React.RefObject<HTMLDivElement | null>, onChange: (d: Dialect) => void) {
  const [open, setOpen] = useState(false)
  const [dropCoords, setDropCoords] = useState<DropCoords | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open, ref])

  useEffect(() => {
    if (!open || !ref.current) { setDropCoords(null); return }
    const r = ref.current.getBoundingClientRect()
    setDropCoords({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }, [open, ref])

  const handleSelect = useCallback((d: Dialect) => { onChange(d); setOpen(false) }, [onChange])
  return { open, setOpen, dropCoords, handleSelect }
}

// ── Public component ──────────────────────────────────────────────────────────

interface DialectSelectorProps {
  value: Dialect
  onChange: (dialect: Dialect) => void
}

export function DialectSelector({ value, onChange }: DialectSelectorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const active = DIALECTS.find(d => d.value === value) ?? DIALECTS[0]
  const { open, setOpen, dropCoords, handleSelect } = useDropdown(ref, onChange)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <DialectTrigger active={active} open={open} onClick={() => setOpen(v => !v)} />
      {createPortal(
        <AnimatePresence>
          {open && dropCoords && <DialectDropdown value={value} onSelect={handleSelect} coords={dropCoords} />}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
