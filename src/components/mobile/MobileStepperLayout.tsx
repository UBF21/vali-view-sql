import { useState, useCallback } from 'react'
import { Pencil, X } from 'lucide-react'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { StepperControls } from '@/components/diagram/StepperControls'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { HistoryPicker } from '@/components/editor/HistoryPicker'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { MobileBottomSheet } from './MobileBottomSheet'
import { useAppStore } from '@/store/useAppStore'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'
import type { StepAnimationState } from '@/hooks/useStepAnimation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MobileStepperLayoutProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  stepAnimation: StepAnimationState
  highlightClause?: string
}

// ── Private sub-components ────────────────────────────────────────────────────

function SqlFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open SQL editor"
      style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(13,13,22,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-hi)',
        borderRadius: 20, padding: '8px 14px',
        cursor: 'pointer', color: 'var(--text-1)',
        fontSize: 12, fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        fontFamily: 'inherit',
      }}
    >
      <Pencil size={13} />
      SQL
    </button>
  )
}

interface SheetHeaderProps {
  onClose: () => void
}

function SheetHeader({ onClose }: SheetHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        SQL Query
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <HistoryPicker />
        <ExamplePicker />
        <button
          onClick={onClose}
          style={{
            background: 'var(--elevated)', border: '1px solid var(--border)',
            borderRadius: 6, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-2)',
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function MobileStepperLayout({ nodes, edges, stepAnimation, highlightClause }: MobileStepperLayoutProps) {
  const query    = useAppStore(s => s.query)
  const setQuery = useAppStore(s => s.setQuery)
  const [editorOpen, setEditorOpen] = useState(false)

  const openEditor  = useCallback(() => setEditorOpen(true), [])
  const closeEditor = useCallback(() => setEditorOpen(false), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <DiagramCanvas nodes={nodes} edges={edges} />
        <SqlFab onClick={openEditor} />
      </div>

      <StepperControls state={stepAnimation} />

      <MobileBottomSheet open={editorOpen} onClose={closeEditor} maxHeight="70vh">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '8px 12px 12px' }}>
          <SheetHeader onClose={closeEditor} />
          <QueryEditor value={query} onChange={setQuery} style={{ flex: 1 }} highlightClause={highlightClause} />
        </div>
      </MobileBottomSheet>
    </div>
  )
}
