// src/components/mobile/MobileNavSheet.tsx
import { BookOpen, GitCompare, Play } from 'lucide-react'
import { MobileBottomSheet } from './MobileBottomSheet'
import { useAppStore } from '@/store/useAppStore'
import { DialectSelector } from '@/components/editor/DialectSelector'
import type { AppMode, Dialect } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MobileNavSheetProps {
  open: boolean
  onClose: () => void
}

interface ModeItem {
  id: AppMode
  icon: React.ReactNode
  label: string
  desc: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODES: ModeItem[] = [
  { id: 'explain', icon: <BookOpen size={18} />, label: 'Explain', desc: 'Visualize SQL as diagram' },
  { id: 'diff',    icon: <GitCompare size={18} />, label: 'Diff',   desc: 'Compare two queries' },
  { id: 'stepper', icon: <Play size={18} />,       label: 'Stepper', desc: 'Step through execution' },
]

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ ...SECTION_LABEL_STYLE, ...style }}>{children}</p>
  )
}

function ModeButton({ item, active, onClick }: { item: ModeItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: active ? 'var(--a-soft)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ color: active ? 'var(--a)' : 'var(--text-2)', flexShrink: 0 }}>{item.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--a)' : 'var(--text-1)' }}>{item.label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{item.desc}</div>
      </div>
    </button>
  )
}

function ModeList({ mode, onSelect }: { mode: AppMode; onSelect: (m: AppMode) => void }) {
  return (
    <>
      <SectionLabel style={{ padding: '4px 16px 8px' }}>Switch mode</SectionLabel>
      {MODES.map(m => (
        <ModeButton key={m.id} item={m} active={mode === m.id} onClick={() => onSelect(m.id)} />
      ))}
    </>
  )
}

function DialectSection({ dialect, onChange, query, onQueryChange }: { dialect: Dialect; onChange: (d: Dialect) => void; query: string; onQueryChange: (q: string) => void }) {
  return (
    <div style={{ margin: '8px 16px 0', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <SectionLabel style={{ marginBottom: 8 }}>Dialect</SectionLabel>
      <DialectSelector value={dialect} onChange={onChange} query={query} onQueryChange={onQueryChange} />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function MobileNavSheet({ open, onClose }: MobileNavSheetProps) {
  const mode       = useAppStore(s => s.mode)
  const setMode    = useAppStore(s => s.setMode)
  const dialect    = useAppStore(s => s.dialect)
  const setDialect = useAppStore(s => s.setDialect)
  const query      = useAppStore(s => s.query)
  const setQuery   = useAppStore(s => s.setQuery)

  const handleModeSelect = (m: AppMode) => { setMode(m); onClose() }

  return (
    <MobileBottomSheet open={open} onClose={onClose} maxHeight="60vh">
      <div style={{ padding: '4px 0 8px', overflowY: 'auto' }}>
        <ModeList mode={mode} onSelect={handleModeSelect} />
        <DialectSection dialect={dialect} onChange={setDialect} query={query} onQueryChange={setQuery} />
        <div style={{ height: 'env(safe-area-inset-bottom, 8px)' }} />
      </div>
    </MobileBottomSheet>
  )
}
