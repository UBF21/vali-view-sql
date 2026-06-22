import { useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { customNodeTypes } from './nodes'
import { NodeInfoPanel } from './NodeInfoPanel'
import { useAppStore } from '@/store/useAppStore'
import type { SQLNodeData } from '@/types'

interface DiagramCanvasProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  isLoading?: boolean
  isDiff?: boolean
  className?: string
}

export function DiagramCanvas({ nodes: initialNodes, edges: initialEdges, isLoading, className }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const setInfoNode = useAppStore((s) => s.setInfoNode)

  useEffect(() => { setNodes(initialNodes) }, [initialNodes, setNodes])
  useEffect(() => { setEdges(initialEdges) }, [initialEdges, setEdges])

  const handleNodeClick = useCallback<NodeMouseHandler<Node<SQLNodeData>>>((_evt, node) => {
    setInfoNode({
      nodeType: node.data.nodeType,
      label: node.data.label,
      detail: node.data.detail ?? '',
      clause: node.data.clause,
    })
  }, [setInfoNode])

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(2px)',
              borderRadius: 8,
            }}
          >
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 24px', fontSize: 13,
              color: 'var(--text-primary)',
            }}>
              Parsing SQL...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={customNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{
          background: 'var(--void)',
          backgroundImage: [
            'radial-gradient(ellipse at 50% 40%, rgba(200,136,10,.04) 0%, transparent 55%)',
            'radial-gradient(ellipse at 80% 80%, rgba(139,124,248,.04) 0%, transparent 50%)',
            'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: 'cover, cover, 22px 22px',
        }}
      >
        <Controls />
      </ReactFlow>
      {/* Radial vignette — dark mode only via CSS token */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 40%, var(--canvas-vignette) 100%)',
        }}
      />

      {/* Node info panel — slides in from right */}
      <NodeInfoPanel />
    </div>
  )
}
