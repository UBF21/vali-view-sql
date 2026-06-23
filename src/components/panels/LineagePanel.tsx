import { useAppStore } from '@/store/useAppStore'
import type { ColumnLineageEntry } from '@/lib/lineage/column-lineage'

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
      No lineage data. Enter a SELECT query to trace column origins.
    </div>
  )
}

function LineageTableHeader() {
  return (
    <thead>
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        {['Output', 'Expression', 'Source(s)'].map(h => (
          <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-3)', fontWeight: 600, fontSize: 10 }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function LineageRow({ entry, index }: { entry: ColumnLineageEntry; index: number }) {
  return (
    <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-1)', fontFamily: 'monospace' }}>
        {entry.outputAlias}
      </td>
      <td style={{ padding: '6px 8px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 10 }}>
        {entry.expression ?? '—'}
      </td>
      <td style={{ padding: '6px 8px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 10 }}>
        {entry.sources.map((s, si) => (
          <span key={si}>
            {s.table ? `${s.table}.` : ''}<span style={{ color: 'var(--a)' }}>{s.column}</span>
            {si < entry.sources.length - 1 ? ', ' : ''}
          </span>
        ))}
      </td>
    </tr>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export function LineagePanel() {
  const lineage = useAppStore((s) => s.columnLineage)

  if (lineage.length === 0) return <EmptyState />

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
        {lineage.length} output column{lineage.length !== 1 ? 's' : ''} traced
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <LineageTableHeader />
        <tbody>
          {lineage.map((entry, i) => (
            <LineageRow key={i} entry={entry} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
