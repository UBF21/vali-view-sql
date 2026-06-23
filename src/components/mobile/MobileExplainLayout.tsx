import { useMemo } from 'react'
import { Code2, Network, BookOpen } from 'lucide-react'
import { MobileSwipeLayout } from './MobileSwipeLayout'
import { QueryEditor } from '@/components/editor/QueryEditor'
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas'
import { PanelRight } from '@/components/layout/PanelRight'
import { ExportButton } from '@/components/diagram/ExportButton'
import { CollectionPicker } from '@/components/editor/CollectionPicker'
import { ExamplePicker } from '@/components/editor/ExamplePicker'
import { useAppStore } from '@/store/useAppStore'
import type { Node, Edge } from '@xyflow/react'
import type { SQLNodeData } from '@/types'

interface MobileExplainLayoutProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  highlightClause?: string
}

// ── Private view components ───────────────────────────────────────────────────

interface EditorViewProps {
  query: string
  setQuery: (v: string) => void
  dialect: import('@/types').Dialect
  highlightClause?: string
}

function EditorView({ query, setQuery, dialect, highlightClause }: EditorViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 12, gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <CollectionPicker />
        <ExamplePicker />
      </div>
      <QueryEditor value={query} onChange={setQuery} dialect={dialect} style={{ flex: 1 }} highlightClause={highlightClause} />
    </div>
  )
}

interface DiagramViewProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
}

function DiagramView({ nodes, edges }: DiagramViewProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <DiagramCanvas nodes={nodes} edges={edges} />
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5 }}>
        <ExportButton />
      </div>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function MobileExplainLayout({ nodes, edges, highlightClause }: MobileExplainLayoutProps) {
  const query = useAppStore(s => s.query)
  const setQuery = useAppStore(s => s.setQuery)
  const dialect = useAppStore(s => s.dialect)

  const views = useMemo(() => [
    {
      key: 'editor',
      label: 'Editor',
      icon: <Code2 size={13} />,
      content: <EditorView query={query} setQuery={setQuery} dialect={dialect} highlightClause={highlightClause} />,
    },
    {
      key: 'diagram',
      label: 'Diagram',
      icon: <Network size={13} />,
      content: <DiagramView nodes={nodes} edges={edges} />,
    },
    {
      key: 'analysis',
      label: 'Analysis',
      icon: <BookOpen size={13} />,
      content: <PanelRight />,
    },
  ], [query, setQuery, dialect, nodes, edges, highlightClause])

  return <MobileSwipeLayout views={views} defaultIndex={1} />
}
