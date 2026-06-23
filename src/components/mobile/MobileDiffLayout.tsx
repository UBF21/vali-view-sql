import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { MobileSwipeLayout } from './MobileSwipeLayout'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { DiffSummaryBar } from '@/components/diagram/DiffSummaryBar'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { useDiff } from '@/hooks/useDiff'
import { useAppStore } from '@/store/useAppStore'
import type { SQLNodeData, DiffResult } from '@/types'

// ── Private sub-components ────────────────────────────────────────────────────

interface QueryPaneProps {
  value: string
  onChange: (v: string) => void
  dialect: import('@/types').Dialect
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
}

function QueryPane({ value, onChange, dialect, nodes, edges }: QueryPaneProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: '0 0 38%', padding: 10, overflow: 'hidden' }}>
        <QueryEditor value={value} onChange={onChange} dialect={dialect} style={{ height: '100%' }} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid var(--border)', position: 'relative' }}>
        <DiagramCanvas nodes={nodes} edges={edges} />
      </div>
    </div>
  )
}

// ── Private hook: builds the two SwipeView definitions ────────────────────────

interface DiffViewsInput {
  query: string
  queryB: string
  setQuery: (v: string) => void
  setQueryB: (v: string) => void
  dialect: import('@/types').Dialect
  nodesA: Node<SQLNodeData>[]
  edgesA: Edge[]
  nodesB: Node<SQLNodeData>[]
  edgesB: Edge[]
}

function useDiffViews({ query, queryB, setQuery, setQueryB, dialect, nodesA, edgesA, nodesB, edgesB }: DiffViewsInput) {
  return useMemo(() => [
    {
      key: 'queryA', label: 'Query A', color: '#3B82F6',
      content: <QueryPane value={query} onChange={setQuery} dialect={dialect} nodes={nodesA} edges={edgesA} />,
    },
    {
      key: 'queryB', label: 'Query B', color: '#F97316',
      content: <QueryPane value={queryB} onChange={setQueryB} dialect={dialect} nodes={nodesB} edges={edgesB} />,
    },
  ], [query, queryB, setQuery, setQueryB, dialect, nodesA, edgesA, nodesB, edgesB])
}

// ── Public component ──────────────────────────────────────────────────────────

export function MobileDiffLayout() {
  const query    = useAppStore(s => s.query)
  const queryB   = useAppStore(s => s.queryB)
  const setQuery  = useAppStore(s => s.setQuery)
  const setQueryB = useAppStore(s => s.setQueryB)
  const dialect   = useAppStore(s => s.dialect)
  const { diff: diffData } = useDiff()

  const nodesA = (diffData?.nodesA ?? []) as Node<SQLNodeData>[]
  const edgesA = (diffData?.edgesA ?? []) as Edge[]
  const nodesB = (diffData?.nodesB ?? []) as Node<SQLNodeData>[]
  const edgesB = (diffData?.edgesB ?? []) as Edge[]

  const views = useDiffViews({ query, queryB, setQuery, setQueryB, dialect, nodesA, edgesA, nodesB, edgesB })
  const summaryDiff = diffData?.diff as DiffResult | undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <DiffSummaryBar diff={summaryDiff} />
      <MobileSwipeLayout views={views} defaultIndex={0} />
    </div>
  )
}
