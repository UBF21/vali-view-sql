import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { customNodeTypes } from './nodes'
import type { SQLNodeData } from '@/types'

interface DiagramCanvasProps {
  nodes: Node<SQLNodeData>[]
  edges: Edge[]
  isLoading?: boolean
  className?: string
}

export function DiagramCanvas({ nodes: initialNodes, edges: initialEdges, isLoading, className }: DiagramCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    console.debug('[DiagramCanvas] node clicked:', node.id)
  }, [])

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
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--bg-primary)' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as SQLNodeData
            return data?.nodeType ? '#5DCAA5' : '#888'
          }}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        />
      </ReactFlow>
    </div>
  )
}
