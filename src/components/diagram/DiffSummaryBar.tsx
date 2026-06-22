import type { DiffResult } from '@/types'

interface DiffPillProps {
  label: string
  color: string
  bg: string
}

function DiffPill({ label, color, bg }: DiffPillProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, color, background: bg,
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  )
}

function DiffPills({ diff }: { diff: DiffResult }) {
  const noChange = diff.addedNodes.length === 0
    && diff.removedNodes.length === 0
    && diff.changedNodes.length === 0

  if (noChange) {
    return <DiffPill label="No differences" color="var(--text-3, #888)" bg="rgba(128,128,128,0.12)" />
  }
  return (
    <>
      {diff.addedNodes.length > 0 && (
        <DiffPill label={`+${diff.addedNodes.length} added`} color="#22C55E" bg="rgba(34,197,94,0.1)" />
      )}
      {diff.removedNodes.length > 0 && (
        <DiffPill label={`-${diff.removedNodes.length} removed`} color="#EF4444" bg="rgba(239,68,68,0.1)" />
      )}
      {diff.changedNodes.length > 0 && (
        <DiffPill label={`~${diff.changedNodes.length} changed`} color="#EAB308" bg="rgba(234,179,8,0.1)" />
      )}
    </>
  )
}

const barStyle: React.CSSProperties = {
  height: 32, flexShrink: 0,
  display: 'flex', alignItems: 'center',
  padding: '0 14px', gap: 8,
  borderTop: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  background: 'var(--elevated, var(--surface))',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500,
  color: 'var(--text-3, var(--text-secondary))',
  marginRight: 4, whiteSpace: 'nowrap',
}

interface DiffSummaryBarProps {
  diff: DiffResult | undefined
}

export function DiffSummaryBar({ diff }: DiffSummaryBarProps) {
  if (!diff) {
    return (
      <div style={barStyle} aria-label="Diff status">
        <span style={labelStyle}>Paste SQL in both editors to compare</span>
      </div>
    )
  }
  return (
    <div style={barStyle} aria-label="Diff summary" role="status">
      <span style={labelStyle}>Query A → Query B</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <DiffPills diff={diff} />
      </div>
    </div>
  )
}
