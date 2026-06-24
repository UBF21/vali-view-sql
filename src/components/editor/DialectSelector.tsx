import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, ArrowLeftRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConversionModal } from './ConversionModal'
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

function SqLiteIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#0F80CC" />
      <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace">SQ</text>
    </svg>
  )
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
  { value: 'sqlite',     label: 'SQLite',     abbr: 'SQ', desc: 'Embedded file-based database', color: '#0F80CC',               bg: 'rgba(15,128,204,0.12)', border: 'rgba(15,128,204,0.30)', Icon: SqLiteIcon },
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

const DROPDOWN_H = DIALECTS.length * 61 + 8

interface DropCoords { top?: number; bottom?: number; right: number }

function DialectDropdown({ value, onSelect, coords }: { value: Dialect; onSelect: (d: Dialect) => void; coords: DropCoords }) {
  const openUp = coords.bottom !== undefined
  return (
    <motion.div
      role="listbox"
      aria-label="Select SQL dialect"
      initial={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'fixed', top: coords.top, bottom: coords.bottom, right: coords.right,
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
    const right = window.innerWidth - r.right
    const spaceBelow = window.innerHeight - r.bottom
    setDropCoords(
      spaceBelow < DROPDOWN_H + 12
        ? { bottom: window.innerHeight - r.top + 6, right }
        : { top: r.bottom + 6, right },
    )
  }, [open, ref])

  const handleSelect = useCallback((d: Dialect) => { onChange(d); setOpen(false) }, [onChange])
  return { open, setOpen, dropCoords, handleSelect }
}

// ── Sub-components (public area) ──────────────────────────────────────────────

function DialectPicker({ value, onChange }: { value: Dialect; onChange: (d: Dialect) => void }) {
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

function ConvertButton({ value, query, onQueryChange, onChange }: {
  value:          Dialect
  query:          string
  onQueryChange?: (q: string) => void
  onChange:       (d: Dialect) => void
}) {
  const [open, setOpen] = useState(false)
  const hasQuery = query.trim().length > 0
  return (
    <>
      <button
        onClick={() => hasQuery && setOpen(true)}
        disabled={!hasQuery}
        aria-label="Convert SQL to another dialect"
        title={hasQuery ? 'Convert to another dialect' : 'Type a SQL query first to convert'}
        style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: hasQuery ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)', opacity: hasQuery ? 1 : 0.45 }}
      >
        <ArrowLeftRight size={12} />
      </button>
      <ConversionModal
        open={open}
        fromDialect={value}
        sourceSql={query}
        onClose={() => setOpen(false)}
        onApply={(sql, dialect) => { onQueryChange?.(sql); onChange(dialect) }}
      />
    </>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

interface DialectSelectorProps {
  value:          Dialect
  onChange:       (dialect: Dialect) => void
  query?:         string
  onQueryChange?: (q: string) => void
}

export function DialectSelector({ value, onChange, query = '', onQueryChange }: DialectSelectorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <DialectPicker value={value} onChange={onChange} />
      <ConvertButton value={value} query={query} onQueryChange={onQueryChange} onChange={onChange} />
    </div>
  )
}
