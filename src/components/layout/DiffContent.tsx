import { DiffEditor } from '@/components/editor/DiffEditor'
import { DiffSummaryBar } from '@/components/diagram/DiffSummaryBar'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { useDiff } from '@/hooks/useDiff'

export function DiffContent() {
  const { diff: diffData, diffError } = useDiff()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Editores side-by-side */}
      <div style={{ flex: '0 0 200px', padding: 12, borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
        <DiffEditor />
      </div>

      {/* Barra de estado del diff */}
      <DiffSummaryBar diff={diffData?.diff} />

      {/* Error de parse */}
      {diffError && (
        <div style={{ padding: '6px 12px', background: 'var(--color-error, #e53e3e)', color: '#fff', fontSize: 12, flexShrink: 0 }}>
          Parse error: {diffError}
        </div>
      )}

      {/* Leyenda de colores */}
      <DiffLegend />

      {/* Dos diagramas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DiagramA nodesA={diffData?.nodesA} edgesA={diffData?.edgesA} />
        <DiagramB nodesB={diffData?.nodesB} edgesB={diffData?.edgesB} />
      </div>
    </div>
  )
}

function DiffLegend() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center',
      padding: '4px 16px', borderBottom: '1px solid var(--border)',
      background: 'var(--elevated)', flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Legend:</span>
      {[
        { color: '#22C55E', label: 'Added' },
        { color: '#EF4444', label: 'Removed' },
        { color: '#EAB308', label: 'Changed' },
      ].map(({ color, label }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function DiagramLabel({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: 12, zIndex: 5,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: color, color: '#fff',
        borderRadius: 4, padding: '2px 7px',
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        {text}
      </span>
    </div>
  )
}

function EmptyDiagram({ hint }: { hint: string }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, opacity: 0.35, pointerEvents: 'none',
    }}>
      <span style={{ fontSize: 28 }}>⬡</span>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{hint}</span>
    </div>
  )
}

function DiagramA({ nodesA, edgesA }: { nodesA?: unknown[]; edgesA?: unknown[] }) {
  const hasNodes = (nodesA?.length ?? 0) > 0
  return (
    <div style={{ flex: 1, borderRight: '1px solid var(--border)', position: 'relative' }}>
      <DiagramLabel text="Query A" color="rgba(91,155,213,0.85)" />
      {hasNodes
        ? <DiagramCanvas nodes={(nodesA ?? []) as never} edges={(edgesA ?? []) as never} />
        : <EmptyDiagram hint="Paste SQL in Query A editor" />}
    </div>
  )
}

function DiagramB({ nodesB, edgesB }: { nodesB?: unknown[]; edgesB?: unknown[] }) {
  const hasNodes = (nodesB?.length ?? 0) > 0
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <DiagramLabel text="Query B" color="rgba(249,115,22,0.85)" />
      {hasNodes
        ? <DiagramCanvas nodes={(nodesB ?? []) as never} edges={(edgesB ?? []) as never} />
        : <EmptyDiagram hint="Paste SQL in Query B editor" />}
    </div>
  )
}
