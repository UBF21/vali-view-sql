import { useAppStore } from '@/store/useAppStore'
import { Header } from './Header'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { PanelRight } from './PanelRight'
import { DiffEditor } from '@/components/editor/DiffEditor'
import { useDiff } from '@/hooks/useDiff'
import { buildSteps, decorateNodesForStep, decorateEdgesForStep } from '@/lib/stepper/execution-steps'
import { useStepAnimation } from '@/hooks/useStepAnimation'
import { StepperControls } from '@/components/diagram/StepperControls'
import { ExportButton } from '@/components/diagram/ExportButton'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { HistoryPicker } from '@/components/editor/HistoryPicker'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

export function AppShell() {
  const query = useAppStore((s) => s.query)
  const setQuery = useAppStore((s) => s.setQuery)
  const parseResult = useAppStore((s) => s.parseResult)
  const isLoading = useAppStore((s) => s.isLoading)
  const mode = useAppStore((s) => s.mode)
  const diffData = useDiff()

  const nodes: Node<SQLNodeData>[] = parseResult?.nodes ?? []
  const edges: Edge[] = parseResult?.edges ?? []

  const steps = parseResult ? buildSteps(parseResult) : []
  const stepAnimation = useStepAnimation(steps)

  const stepNodes = parseResult
    ? decorateNodesForStep(parseResult, steps, stepAnimation.currentIndex)
    : []
  const stepEdges = parseResult
    ? decorateEdgesForStep(parseResult, steps, stepAnimation.currentIndex)
    : []

  if (mode === 'stepper') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left panel: SQL editor */}
          <div style={{
            width: 340, flexShrink: 0, borderRight: '1px solid var(--border)',
            padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SQL Query
            </div>
            <QueryEditor value={query} onChange={setQuery} style={{ flex: 1 }} />
          </div>
          {/* Diagram + stepper controls */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <DiagramCanvas nodes={stepNodes} edges={stepEdges} isLoading={isLoading} />
            </div>
            <StepperControls state={stepAnimation} />
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'diff') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Header />
        {/* Editores */}
        <div style={{ height: 180, flexShrink: 0, padding: 12, borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
          <DiffEditor />
        </div>
        {/* Dos diagramas */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, borderRight: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', zIndex: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Query A
            </div>
            <DiagramCanvas
              nodes={diffData?.nodesA ?? []}
              edges={[]}
              isDiff
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', zIndex: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Query B
            </div>
            <DiagramCanvas
              nodes={diffData?.nodesB ?? []}
              edges={[]}
              isDiff
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <Header />

      <div className="app-shell-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel: SQL editor */}
        <div
          className="app-shell-left"
          style={{
            width: 380,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SQL Query
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <HistoryPicker />
              <ExamplePicker />
            </div>
          </div>
          <QueryEditor
            value={query}
            onChange={setQuery}
            style={{ flex: 1 }}
          />
        </div>

        {/* Center: diagram */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {nodes.length === 0 && !isLoading && (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8, opacity: 0.4,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <span style={{ fontSize: 36 }}>⊞</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Type a SQL query to visualize it
              </span>
            </div>
          )}
          <div style={{ width: '100%', height: '100%' }}>
            <DiagramCanvas
              nodes={nodes}
              edges={edges}
              isLoading={isLoading}
            />
          </div>
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5 }}>
            <ExportButton />
          </div>
        </div>

        {/* Right panel: glossary / issues / suggestions */}
        <PanelRight />
      </div>
    </div>
  )
}
