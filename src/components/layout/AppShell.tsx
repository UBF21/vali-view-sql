import { useAppStore } from '@/store/useAppStore'
import { Header } from './Header'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { PanelRight } from './PanelRight'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

export function AppShell() {
  const query = useAppStore((s) => s.query)
  const setQuery = useAppStore((s) => s.setQuery)
  const parseResult = useAppStore((s) => s.parseResult)
  const isLoading = useAppStore((s) => s.isLoading)

  const nodes: Node<SQLNodeData>[] = parseResult?.nodes ?? []
  const edges: Edge[] = parseResult?.edges ?? []

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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel: SQL editor */}
        <div
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
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            SQL Query
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
        </div>

        {/* Right panel: glossary / issues / suggestions */}
        <PanelRight />
      </div>
    </div>
  )
}
