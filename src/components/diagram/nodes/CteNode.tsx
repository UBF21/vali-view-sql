import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { NODE_COLORS } from './index'
import type { SQLNodeData } from '@/types'

export const CteNode = memo(function CteNode({ data, selected }: NodeProps<Node<SQLNodeData>>) {
  const colors = NODE_COLORS.cte
  return (
    <div style={{
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 200, maxWidth: 260,
      opacity: data.isActive === false ? 0.3 : 1,
      transition: 'opacity 0.3s',
      outline: selected ? `2px solid ${colors.border}` : 'none', outlineOffset: 2,
    }}>
      <Handle type="source" position={Position.Bottom} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{colors.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <p style={{ fontSize: 11, color: colors.text, margin: 0, lineHeight: 1.4, opacity: 0.75 }}>{data.detail}</p>
    </div>
  )
})
