import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Dialect } from '@/types'

// ── Dialect icons ─────────────────────────────────────────────────────────────

function PgIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#336791" />
      <ellipse cx="7.5" cy="13" rx="3.5" ry="4.5" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="24.5" cy="13" rx="3.5" ry="4.5" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="16" cy="14" rx="7.5" ry="7" fill="white" />
      <circle cx="13" cy="12.5" r="1.5" fill="#336791" />
      <circle cx="19" cy="12.5" r="1.5" fill="#336791" />
      <path d="M 12.5 18 Q 16 20.5 19.5 18" stroke="#336791" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 11 20 Q 8 24 10 27" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function MyIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#F97316" />
      <path d="M 5 22 Q 10 8 18 10 Q 24 12 26 8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 16 10 Q 17 4 20 8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 25 9 Q 29 6 30 11 Q 28 15 25 12" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="7" cy="20" r="1.8" fill="white" />
      <path d="M 12 16 Q 10 20 14 20" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function MsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#CC2927" />
      <ellipse cx="16" cy="9" rx="8" ry="3" fill="rgba(255,255,255,0.85)" />
      <rect x="8" y="9" width="16" height="12" fill="rgba(255,255,255,0.65)" />
      <ellipse cx="16" cy="21" rx="8" ry="3" fill="rgba(255,255,255,0.85)" />
      <ellipse cx="16" cy="15" rx="8" ry="2.2" fill="rgba(255,255,255,0.4)" />
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
  { value: 'postgresql', label: 'PostgreSQL', abbr: 'PG', desc: 'Open-source object-relational', color: '#5B9BD5', bg: 'rgba(91,155,213,0.14)',  border: 'rgba(91,155,213,0.30)',  Icon: PgIcon },
  { value: 'mysql',      label: 'MySQL',      abbr: 'MY', desc: 'Oracle open-source RDBMS',     color: '#F97316', bg: 'rgba(249,115,22,0.14)',  border: 'rgba(249,115,22,0.30)',  Icon: MyIcon },
  { value: 'sqlserver',  label: 'SQL Server', abbr: 'MS', desc: 'Microsoft enterprise RDBMS',   color: '#E04444', bg: 'rgba(224,68,68,0.14)',   border: 'rgba(224,68,68,0.30)',   Icon: MsIcon },
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
        borderRadius: 8, cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <active.Icon size={20} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{active.label}</span>
      <ChevronDown size={12} style={{ color: 'var(--text-3)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
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

function DialectDropdown({ value, onSelect }: { value: Dialect; onSelect: (d: Dialect) => void }) {
  return (
    <motion.div
      role="listbox"
      aria-label="Select SQL dialect"
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 220, zIndex: 200,
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

// ── Public component ──────────────────────────────────────────────────────────

interface DialectSelectorProps {
  value: Dialect
  onChange: (dialect: Dialect) => void
}

export function DialectSelector({ value, onChange }: DialectSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = DIALECTS.find(d => d.value === value) ?? DIALECTS[0]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = useCallback((d: Dialect) => { onChange(d); setOpen(false) }, [onChange])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <DialectTrigger active={active} open={open} onClick={() => setOpen(v => !v)} />
      <AnimatePresence>
        {open && <DialectDropdown value={value} onSelect={handleSelect} />}
      </AnimatePresence>
    </div>
  )
}
