import { memo, useCallback } from 'react'
import type { CSSProperties } from 'react'
import {
  Table2, GitMerge, Filter, Sigma, ArrowRight, ArrowUpDown, Hash,
  Layers, RefreshCcw, Database, Code2, Variable, Diamond, Repeat2,
  GitBranch, Info,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { NodeType } from '@/types'

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  table:      <Table2 size={14} />,
  join:       <GitMerge size={14} />,
  filter:     <Filter size={14} />,
  aggregate:  <Sigma size={14} />,
  output:     <ArrowRight size={14} />,
  sort:       <ArrowUpDown size={14} />,
  limit:      <Hash size={14} />,
  subquery:   <Layers size={14} />,
  setop:      <GitBranch size={14} />,
  cte:        <RefreshCcw size={14} />,
  temp_table: <Database size={14} />,
  procedure:  <Code2 size={14} />,
  param:      <ArrowRight size={14} />,
  declare:    <Variable size={14} />,
  condition:  <Diamond size={14} />,
  loop:       <Repeat2 size={14} />,
}

export interface BaseNodeCardProps {
  nodeType: NodeType
  label: string
  detail?: string
  clause?: string
  accentColor: string
  textColor: string
  bgColor: string
  borderColor: string
  isActive?: boolean | null
  selected?: boolean
  children?: React.ReactNode
  diffStatus?: string
}

// ── Diff visual helpers ───────────────────────────────────────────────────────

interface DiffStyle {
  bg: string
  borderStyle: 'solid' | 'dashed'
  borderWidth: number
  opacity: number
  shadow: string
  badgeLabel: string
  badgeColor: string
  badgeBg: string
}

const DIFF_STYLES: Record<string, DiffStyle> = {
  added: {
    bg: 'rgba(34,197,94,0.10)',
    borderStyle: 'solid', borderWidth: 3, opacity: 1,
    shadow: '0 0 6px #22C55E, 0 0 18px #22C55E, 0 0 40px rgba(34,197,94,0.55), 0 0 70px rgba(34,197,94,0.25)',
    badgeLabel: '+ added', badgeColor: '#22C55E', badgeBg: 'rgba(34,197,94,0.18)',
  },
  removed: {
    bg: 'rgba(239,68,68,0.10)',
    borderStyle: 'dashed', borderWidth: 3, opacity: 0.65,
    shadow: '0 0 6px #EF4444, 0 0 18px #EF4444, 0 0 40px rgba(239,68,68,0.50), 0 0 70px rgba(239,68,68,0.20)',
    badgeLabel: '− removed', badgeColor: '#EF4444', badgeBg: 'rgba(239,68,68,0.18)',
  },
  changed: {
    bg: 'rgba(234,179,8,0.09)',
    borderStyle: 'solid', borderWidth: 3, opacity: 1,
    shadow: '0 0 6px #EAB308, 0 0 18px #EAB308, 0 0 40px rgba(234,179,8,0.50), 0 0 70px rgba(234,179,8,0.22)',
    badgeLabel: '~ changed', badgeColor: '#EAB308', badgeBg: 'rgba(234,179,8,0.18)',
  },
}

function DiffBadge({ status }: { status?: string }) {
  if (!status || status === 'same') return null
  const s = DIFF_STYLES[status]
  if (!s) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: '2px 6px', borderRadius: 4,
      color: s.badgeColor, background: s.badgeBg,
      border: `1px solid ${s.badgeColor}55`,
      fontFamily: '"JetBrains Mono", monospace',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {s.badgeLabel}
    </span>
  )
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function nodeClassNames(isActive?: boolean | null, selected?: boolean): string | undefined {
  return [
    isActive === true ? 'node-active' : undefined,
    selected ? 'node-selected' : undefined,
  ].filter(Boolean).join(' ') || undefined
}

interface ContainerStyleProps {
  accentColor: string; bgColor: string
  selected?: boolean;  isActive?: boolean | null
  diffStatus?: string
}

function resolveDiffStyle(diffStatus?: string): DiffStyle | null {
  if (!diffStatus || diffStatus === 'same') return null
  return DIFF_STYLES[diffStatus] ?? null
}
function resolveBorder(accentColor: string, ds: DiffStyle | null, selected?: boolean): string {
  const width = ds?.borderWidth ?? (selected ? 2 : 1.5)
  const style = ds?.borderStyle ?? 'solid'
  return `${width}px ${style} ${accentColor}`
}
function resolveOpacity(isActive?: boolean | null, ds?: DiffStyle | null): number {
  if (isActive === false) return 0.3
  return ds?.opacity ?? 1
}
function resolveBoxShadow(ds: DiffStyle | null, selected?: boolean): string | undefined {
  if (ds?.shadow) return ds.shadow
  return selected ? undefined : '0 2px 8px rgba(0,0,0,0.2)'
}

function nodeContainerStyle({ accentColor, bgColor, selected, isActive, diffStatus }: ContainerStyleProps): CSSProperties {
  const ds = resolveDiffStyle(diffStatus)
  return {
    '--node-accent': accentColor,
    background: ds?.bg ?? bgColor,
    border: resolveBorder(accentColor, ds, selected),
    borderRadius: 8, minWidth: 240, maxWidth: 320, cursor: 'pointer',
    opacity: resolveOpacity(isActive, ds),
    transition: 'opacity 0.3s, border 0.15s, box-shadow 0.15s',
    boxShadow: resolveBoxShadow(ds, selected),
    overflow: 'hidden',
  } as CSSProperties
}

// ── Sub-components ────────────────────────────────────────────────────────────

const INFO_BTN_STYLE: CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4, cursor: 'pointer', color: 'inherit',
  padding: '2px 4px', flexShrink: 0, display: 'flex',
  alignItems: 'center', opacity: 0.75, transition: 'opacity 0.15s, background 0.15s',
}

function InfoButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} aria-label="Show node info" style={INFO_BTN_STYLE}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = '1'; b.style.background = 'rgba(255,255,255,0.14)' }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = '0.75'; b.style.background = 'rgba(255,255,255,0.07)' }}
    >
      <Info size={11} />
    </button>
  )
}

function NodeHeader({ nodeType, label, textColor, hasDetail, onInfoClick, diffStatus }: {
  nodeType: NodeType; label: string; textColor: string
  hasDetail: boolean; onInfoClick: (e: React.MouseEvent) => void
  diffStatus?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px 14px', borderBottom: hasDetail ? '1px solid var(--border)' : undefined }}>
      <span style={{ color: textColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {NODE_ICONS[nodeType]}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: textColor, fontFamily: '"JetBrains Mono", monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <DiffBadge status={diffStatus} />
      <InfoButton onClick={onInfoClick} />
    </div>
  )
}

function NodeBody({ detail }: { detail: string }) {
  return (
    <div style={{ padding: '8px 14px 12px 14px' }}>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.55 }}>
        {detail}
      </p>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export const BaseNodeCard = memo(function BaseNodeCard({
  nodeType, label, detail, clause, accentColor, textColor, bgColor, isActive, selected, children, diffStatus,
}: BaseNodeCardProps) {
  const setInfoNode = useAppStore((s) => s.setInfoNode)

  const handleInfoBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setInfoNode({ nodeType, label, detail: detail ?? '', clause })
  }, [setInfoNode, nodeType, label, detail, clause])

  return (
    <div className={nodeClassNames(isActive, selected)}
      style={nodeContainerStyle({ accentColor, bgColor, selected, isActive, diffStatus })}>
      <NodeHeader nodeType={nodeType} label={label} textColor={textColor}
        hasDetail={!!detail} onInfoClick={handleInfoBtn} diffStatus={diffStatus} />
      {detail && <NodeBody detail={detail} />}
      {children}
    </div>
  )
})
