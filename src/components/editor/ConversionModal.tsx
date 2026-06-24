import { useState, useEffect, useRef } from 'react'
import { X, ArrowRight, Copy, Check, CheckCircle2, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { highlightSQL } from '@/lib/highlight/sql-highlight'
import { motion, AnimatePresence } from 'framer-motion'
import { convertDialect } from '@/lib/converter/dialect-converter'
import type { ConversionChange } from '@/lib/converter/dialect-converter'
import type { Dialect } from '@/types'
import { DIALECTS } from './DialectSelector'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConversionModalProps {
  open:        boolean
  fromDialect: Dialect
  sourceSql:   string
  onClose:     () => void
  onApply:     (sql: string, dialect: Dialect) => void
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  zIndex: 999, background: 'var(--surface)', border: '1px solid var(--border-hi)',
  borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
  width: 'min(560px, 95vw)', maxHeight: 'min(80vh, calc(100dvh - 32px))',
  display: 'flex', flexDirection: 'column', outline: 'none',
}

const PANEL_ANIM = {
  initial: { opacity: 0, scale: 0.95, y: -10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15 },
} as const

const SELECT_DROPDOWN_STYLE: React.CSSProperties = {
  position: 'absolute', top: '100%', right: 0, marginTop: 4,
  background: 'var(--surface)', border: '1px solid var(--border-hi)',
  borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  minWidth: 120, zIndex: 10, overflow: 'hidden',
}

// ── TargetDialectSelect ────────────────────────────────────────────────────────

function SelectTrigger({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      data-testid="dialect-select-trigger"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 8px 3px 6px', borderRadius: 5, background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', cursor: 'pointer' }}
    >
      {label}
      <ChevronDown size={11} style={{ color: 'var(--text-3)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
    </button>
  )
}

function SelectOptions({ targets, value, onSelect }: {
  targets: { value: Dialect; label: string }[]
  value:   Dialect
  onSelect: (d: Dialect) => void
}) {
  return (
    <div role="listbox" style={SELECT_DROPDOWN_STYLE}>
      {targets.map(t => (
        <button
          key={t.value}
          role="option"
          aria-selected={t.value === value}
          data-value={t.value}
          onClick={() => onSelect(t.value)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', background: t.value === value ? 'var(--a-soft)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: t.value === value ? 'var(--a)' : 'var(--text-1)', fontFamily: 'inherit' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function TargetDialectSelect({ targets, value, onChange }: {
  targets: { value: Dialect; label: string }[]
  value:   Dialect
  onChange: (d: Dialect) => void
}) {
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

  const label = targets.find(t => t.value === value)?.label ?? value

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <SelectTrigger label={label} open={open} onClick={() => setOpen(v => !v)} />
      {open && <SelectOptions targets={targets} value={value} onSelect={d => { onChange(d); setOpen(false) }} />}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      data-testid="conversion-modal-backdrop"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 998 }}
    />
  )
}

function ModalHeader({ fromLabel, toDialect, targets, onToChange, onClose }: {
  fromLabel:  string
  toDialect:  Dialect
  targets:    { value: Dialect; label: string }[]
  onToChange: (d: Dialect) => void
  onClose:    () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>Convert dialect</span>
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fromLabel}</span>
      <ArrowRight size={13} style={{ color: 'var(--text-3)' }} />
      <TargetDialectSelect targets={targets} value={toDialect} onChange={onToChange} />
      <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
        <X size={15} />
      </button>
    </div>
  )
}

function ChangesSummary({ changes, toLabel }: { changes: ConversionChange[]; toLabel: string }) {
  if (changes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--elevated)', borderBottom: '1px solid var(--border)' }}>
        <CheckCircle2 size={14} style={{ color: '#5DCAA5', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>No conversions needed — SQL is already compatible with <strong style={{ color: 'var(--text-1)' }}>{toLabel}</strong>.</span>
      </div>
    )
  }
  return (
    <div style={{ padding: '8px 16px', background: 'var(--elevated)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>
        {changes.length} transformation{changes.length !== 1 ? 's' : ''} applied
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {changes.slice(0, 6).map((c, i) => (
          <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 12, background: 'rgba(93,202,165,0.12)', color: '#5DCAA5', border: '1px solid rgba(93,202,165,0.3)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {c.rule}
          </span>
        ))}
        {changes.length > 6 && <span style={{ fontSize: 10, color: 'var(--text-3)', padding: '2px 4px' }}>+{changes.length - 6} more</span>}
      </div>
    </div>
  )
}

function SqlPreview({ sql }: { sql: string }) {
  return (
    <pre style={{ flex: 1, overflowY: 'auto', margin: 0, padding: '12px 16px', fontSize: 12, fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace', color: 'var(--text-1)', background: 'var(--surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }}
    />
  )
}

function ModalFooter({ copied, onCopy, onApply }: { copied: boolean; onCopy: () => void; onApply: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <button onClick={onCopy} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, background: 'var(--elevated)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        <span role="status" aria-live="polite" aria-atomic="true">{copied ? 'Copied!' : 'Copy'}</span>
      </button>
      <button onClick={onApply} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, background: 'var(--a)', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#000' }}>
        Use this query
      </button>
    </div>
  )
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useTargetDialect(fromDialect: Dialect) {
  const targets = DIALECTS.filter(d => d.value !== fromDialect)
  const [toDialect, setToDialect] = useState<Dialect>(targets[0]?.value ?? 'mysql')
  useEffect(() => {
    const t = DIALECTS.filter(d => d.value !== fromDialect)
    if (t[0]) setToDialect(t[0].value)
  }, [fromDialect])
  return { targets, toDialect, setToDialect }
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return { copied, handleCopy }
}

function useEscapeKey(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
}

// ── Modal panel ────────────────────────────────────────────────────────────────

function ModalPanel({ fromDialect, sourceSql, onClose, onApply }: Omit<ConversionModalProps, 'open'>) {
  const { targets, toDialect, setToDialect } = useTargetDialect(fromDialect)
  const { convertedSQL, changes } = convertDialect(sourceSql, fromDialect, toDialect)
  const { copied, handleCopy } = useCopy(convertedSQL)
  const panelRef = useRef<HTMLDivElement>(null)
  const fromLabel = DIALECTS.find(d => d.value === fromDialect)?.label ?? fromDialect
  const toLabel   = DIALECTS.find(d => d.value === toDialect)?.label   ?? toDialect

  useEffect(() => { panelRef.current?.focus() }, [])

  return (
    <motion.div ref={panelRef} tabIndex={-1} {...PANEL_ANIM}
      role="dialog" aria-modal="true" aria-label="Convert SQL dialect" style={MODAL_STYLE}
    >
      <ModalHeader fromLabel={fromLabel} toDialect={toDialect} targets={targets} onToChange={setToDialect} onClose={onClose} />
      <ChangesSummary changes={changes} toLabel={toLabel} />
      <SqlPreview sql={convertedSQL} />
      <ModalFooter copied={copied} onCopy={handleCopy} onApply={() => { onApply(convertedSQL, toDialect); onClose() }} />
    </motion.div>
  )
}

// ── Public component ───────────────────────────────────────────────────────────

export function ConversionModal({ open, fromDialect, sourceSql, onClose, onApply }: ConversionModalProps) {
  useEscapeKey(open, onClose)
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClose={onClose} />
          <ModalPanel fromDialect={fromDialect} sourceSql={sourceSql} onClose={onClose} onApply={onApply} />
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
