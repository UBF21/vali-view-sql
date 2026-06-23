import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ComplexityLevel, ComplexityBreakdown } from '@/lib/complexity/complexity-score'

export const LEVEL_COLOR: Record<ComplexityLevel, string> = {
  'Simple':       '#1D9E75',
  'Moderate':     '#EF9F27',
  'Complex':      '#E07B39',
  'Very Complex': '#E24B4A',
}

type BreakdownRow = [string, number, number]

function buildRows(b: ComplexityBreakdown): BreakdownRow[] {
  return ([
    ['Tables',     b.tableCount,     1  ],
    ['JOINs',      b.joinCount,      1  ],
    ['Subqueries', b.subqueryCount,  3  ],
    ['CTEs',       b.cteCount,       1  ],
    ['Set ops',    b.setOpCount,     1  ],
    ['Procedures', b.procedureCount, 3  ],
    ['Aggregates', b.aggregateCount, 0.5],
    ['Conditions', b.conditionCount, 1  ],
    ['Loops',      b.loopCount,      2  ],
  ] as BreakdownRow[]).filter(([, count]) => count > 0)
}

interface BreakdownPanelProps {
  breakdown: ComplexityBreakdown
  score: number
  color: string
}

function BreakdownPanel({ breakdown, score, color }: BreakdownPanelProps) {
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, marginTop: 4,
      background: 'var(--surface)', border: '1px solid var(--border-hi)',
      borderRadius: 8, padding: '10px 12px', minWidth: 200,
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 11,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
        Complexity Breakdown
      </div>
      {buildRows(breakdown).map(([label, count, weight]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: 'var(--text-2)' }}>
          <span>{label} × {count}</span>
          <span style={{ color: 'var(--text-3)' }}>+{Math.round(count * weight * 10) / 10}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
        <span>Total score</span>
        <span style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

export function ComplexityBadge() {
  const [open, setOpen] = useState(false)
  const result = useAppStore((s) => s.complexityResult)
  if (!result) return null

  const color = LEVEL_COLOR[result.level]

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={`Query complexity: ${result.level}`}
        style={{
          background: 'var(--surface)', border: `1px solid ${color}`,
          borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `0 0 8px ${color}33`,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{result.level}</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{result.score}</span>
      </button>
      {open && <BreakdownPanel breakdown={result.breakdown} score={result.score} color={color} />}
    </div>
  )
}
