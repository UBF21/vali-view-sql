import { useEffect, useCallback, useRef, type CSSProperties } from 'react'
import {
  ReactFlow, Controls,
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeMouseHandler,
  type OnNodesChange, type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { customNodeTypes } from './nodes'
import { NodeInfoPanel } from './NodeInfoPanel'
import { useAppStore } from '@/store/useAppStore'
import { useSQLParseAnim } from '@/hooks/useSQLParseAnim'
import type { SQLNodeData } from '@/types'

interface DiagramCanvasProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  className?: string
}

interface FlowCanvasProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  onNodesChange: OnNodesChange<Node<SQLNodeData>>
  onEdgesChange: OnEdgesChange
  containerRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

const FLOW_STYLE: CSSProperties = {
  background: 'var(--void)',
  backgroundImage: [
    'radial-gradient(ellipse at 50% 40%, rgba(200,136,10,.04) 0%, transparent 55%)',
    'radial-gradient(ellipse at 80% 80%, rgba(139,124,248,.04) 0%, transparent 50%)',
    'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: 'cover, cover, 22px 22px',
}

const VIGNETTE_STYLE: CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
  background: 'radial-gradient(ellipse at center, transparent 40%, var(--canvas-vignette) 100%)',
}

function FlowCanvas({ nodes, edges, onNodesChange, onEdgesChange, containerRef, className }: FlowCanvasProps) {
  const setInfoNode = useAppStore((s) => s.setInfoNode)
  const handleNodeClick = useCallback<NodeMouseHandler<Node<SQLNodeData>>>((_evt, node) => {
    setInfoNode({ nodeType: node.data.nodeType, label: node.data.label, detail: node.data.detail ?? '', clause: node.data.clause })
  }, [setInfoNode])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={customNodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick} fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3} maxZoom={2} proOptions={{ hideAttribution: true }}
        style={FLOW_STYLE}
      >
        <Controls />
      </ReactFlow>
      <div style={VIGNETTE_STYLE} />
      <NodeInfoPanel />
    </div>
  )
}

export function DiagramCanvas({ nodes: initialNodes, edges: initialEdges, className }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const containerRef    = useRef<HTMLDivElement>(null)
  const pendingNodesRef = useRef<typeof initialNodes | null>(null)
  const pendingEdgesRef = useRef<typeof initialEdges | null>(null)
  const { isAnimating } = useSQLParseAnim(containerRef)

  useEffect(() => {
    if (isAnimating) { pendingNodesRef.current = initialNodes; return }
    setNodes(pendingNodesRef.current ?? initialNodes)
    pendingNodesRef.current = null
  }, [initialNodes, isAnimating, setNodes])

  useEffect(() => {
    if (isAnimating) { pendingEdgesRef.current = initialEdges; return }
    setEdges(pendingEdgesRef.current ?? initialEdges)
    pendingEdgesRef.current = null
  }, [initialEdges, isAnimating, setEdges])

  return (
    <FlowCanvas
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      containerRef={containerRef} className={className}
    />
  )
}
